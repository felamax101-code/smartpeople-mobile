import { useCallback, useEffect, useRef, useState } from "react"
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TextInput,
  Keyboard,
  NativeSyntheticEvent,
  NativeScrollEvent

} from "react-native"
import { useQueryClient } from "@tanstack/react-query"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import { useAuthStore } from "@/stores/auth.store"
import { useConversationDetail } from "@/hooks/useConversationDetail"
import { useWebSocket } from "@/hooks/useWebSocket"
import { useConversations } from "@/hooks/useConversations"
import { useGroupManagement } from "@/hooks/useGroupManagement"
import { MessageBubble } from "@/components/messages/MessageBubble"
import { MessageInput, PickedMediaAsset } from "@/components/messages/MessageInput"
import { TypingIndicator } from "@/components/messages/TypingIndicator"
import { ConnectionBanner } from "@/components/messages/ConnectionBanner"
import { messagingService, Message } from "@/services/messaging.service"
import { feedService } from "@/services/feed.service"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { Image } from "expo-image"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getAvatarColor } from "@/hooks/useUserGenerateAvatarColor"
import { AnimatedBanner, BannerState, BannerType } from "@/components/activityIndicator/AnimatedBanner"
import { useToast } from "@/components/activityIndicator/ToastProvider"
import { MediaViewer } from "@/components/messages/MedaView"



const getInitials = (name: string) =>
  name.trim().split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")

export default function ConversationScreen() {
  const theme = useTheme()
  const { id: conversationId } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuthStore()
  const flatListRef = useRef<FlatList>(null)
  const messageInputRef = useRef<{ focus: () => void }>(null)

  // ── message long-press dropdown (delete, etc.) 
  // Single shared menu for the whole screen — MessageBubble reports where
  // it was long-pressed via onLongPressMenu, this renders the dropdown.
  const queryClient = useQueryClient()

  const { clearUnread, updateGroupInfo, removeConversation, updateConversationPreview } = useConversations()
  const { leaveGroup } = useGroupManagement()
  const { showToast } = useToast()
  const [isOtherOnline, setIsOtherOnline] = useState(false)
  const [menuVisible, setMenuVisible] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [otherReason, setOtherReason] = useState("")
  const [isReporting, setIsReporting] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [isBlocking, setIsBlocking] = useState(false)
  const [isUnBlocking, setIsUnBlocking] = useState(false)
  const [blockReportReason, setBlockReportReason] = useState("")
  const [otherBlockReason, setOtherBlockReason] = useState("")
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [fullScreenMedia, setFullScreenMedia] = useState<Message | null>(null)
  const {
    messages,
    
    isLoading,
    uploadProgress,
    sendMessage,
    isSending,
    appendMessage,
    handleReadReceipt,
    isLoadingMore,
    hasMoreMessages,
    loadOlderMessages,
    handleOfferUpdate,
    handleMessageDeleted,
    handleTyping,
    typingUsers,
    respondToOffer,
    deleteMessage,
    sendError,
    isError,
    refetch,
    handleReactionUpdate,
    toggleReaction,
    replyingTo,
    startReply,
    cancelReply,
    deleteForMe,
    
    showBanner: showBannerMessage,
    
  } = useConversationDetail(conversationId)


  // ── conversation + derived data 
  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: messagingService.getConversations,
  })

  const conversation = conversations?.find((c) => c.id === conversationId)
  const isGroup = conversation?.is_group ?? false

  // DM only — the single other participant
  const other = !isGroup
    ? conversation?.participants?.find((p) => p.id !== user?.id)
    : null

  // Group only — whether the current user is an admin
  // checked via the is_admin flag on the participant object
  const isAdmin = isGroup
    ? conversation?.participants?.find((p) => p.id === user?.id)?.is_admin ?? false
    : false

  // Group only — member count excluding self
  const memberCount = isGroup
    ? (conversation?.participants?.length ?? 0)
    : 0

  const isTargetBlocked = !isGroup && messages.length > 0
    ? (messages[0] as Message).is_target_blocked ?? false
    : false

  const blockReason = (sendError as any)?.response?.data?.detail ?? null

  // post context — DM only
  const { data: post } = useQuery({
    queryKey: ["post-context", conversation?.post_id],
    queryFn: () => feedService.getPostById(conversation?.post_id ?? ""),
    enabled: !!conversation?.post_id && !isGroup,
  })


  const REPORT_REASONS = [
    "Spam or scam", "Fake Account", "Harassment",
    "Inappropriate Content", "Inappropriate Behavior", "Impersonation", "Other",
  ]
  const handleWSEventRef = useRef<(event: any) => void>(null)

  // ── WebSocket events 
  handleWSEventRef.current = useCallback((event: any) => {
    switch (event.type) {
      case "message":
        appendMessage(event.data)
      // updateConversationPreview(event.data)

      case "typing":
        if (event.data.conversation_id === conversationId) {
          handleTyping(event.data.user_id, event.data.is_typing)
        }
        break

      case "read":
        // works for both DM (reader_id) and group (readers array)
        // useConversationDetail.handleReadReceipt handles both shapes
        handleReadReceipt(event.data)
        break

      case "offer_update":
        handleOfferUpdate(event.data.message_id, event.data.offer_data)
        break

      // ── DM only events 
      case "online":
        // only meaningful in DMs — group members don't have a single online status
        if (!isGroup && event.data.user_id === other?.id) {
          setIsOtherOnline(true)
        }
        break

      case "offline":
        if (!isGroup && event.data.user_id === other?.id) {
          setIsOtherOnline(false)
        }
        break

      // ── shared: soft-deleted message 
      // Server publishes this when any participant deletes a message
      case "message_deleted":
        if (event.data.conversation_id === conversationId) {
          handleMessageDeleted(event.data.message_id)
        }
        break

      // ── group only events 
      case "group_updated":
        // admin renamed the group or changed avatar — update list + local state
        updateGroupInfo(event.data)
        // invalidate so the header picks up the new name immediately
        queryClient.invalidateQueries({ queryKey: ["conversations"] })
        break

      case "group_member_added":
        // someone was added — refresh so participant count and list are correct
        queryClient.invalidateQueries({ queryKey: ["conversations"] })
        queryClient.invalidateQueries({ queryKey: ["group-members", conversationId] })
        break

      case "group_member_removed":
        if (event.data.removed_user_id === user?.id) {
          // current user was kicked — leave the screen immediately
          showBanner("success", "You have been removed from this group.",)

          router.replace("/messages")

          removeConversation(conversationId)
        } else {
          queryClient.invalidateQueries({ queryKey: ["conversations"] })
          queryClient.invalidateQueries({ queryKey: ["group-members", conversationId] })
        }
        break
      case "reaction_added":
      case "reaction_removed":
        if (event.data.message_id) {
          handleReactionUpdate(event.data)
        }
        break
    }
  }, [
    conversationId, isGroup, other?.id, user?.id,
    handleTyping, handleReadReceipt, handleOfferUpdate,
    handleMessageDeleted, updateGroupInfo, removeConversation,
    queryClient,
  ])
  useEffect(() => {
    if (showBannerMessage.show) {
      showBanner(
        showBannerMessage.type, showBannerMessage.message
      )
    }

  }, [showBannerMessage]
  )
  const stableHandler = useCallback((event: any) => {
    handleWSEventRef.current?.(event)
  }, [])
  const { status, retry, sendTyping } = useWebSocket({
    userId: user?.id ?? "",
    onEvent: stableHandler,
  })

  // ── DM actions 
  const handleDeleteConversation = async () => {
    setMenuVisible(false)
    try {
      const data = await messagingService.deleteConversation(conversationId)
      if (data.success === true) {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.removeQueries({ queryKey: ["messages", conversationId] });
        router.back()
      } else {
        showBanner("error", "Something went wrong. Try again")
      }

    } catch (e) {
      const detail = "Something went wrong. Try again"
      showBanner("error", detail)
    }
  }

  const handleReport = () => {
    setMenuVisible(false)
    setShowReportModal(true)
  }


  const handleBlockUser = () => {
    setMenuVisible(false)
    setShowBlockModal(true)
  }

  const handleUnBlockUser = async () => {
    try {
      setIsUnBlocking(true)
      await feedService.unblokUser(other?.id)
      await queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })
      await queryClient.invalidateQueries({ queryKey: ["conversations"] })
      showBanner("success", `${other?.username} unblocked`)
    } catch (e: any) {
      const msg = e.response?.data?.detail ?? "Failed to unblock. Try again."
      showBanner("error", msg)
    } finally {
      setIsUnBlocking(false)
    }
  }
  const showBanner = useCallback((type: BannerType, message: string) => {
    setBanner({ id: Date.now(), type, message });
  }, []);
  const handleBlockSubmit = async () => {
    try {
      setIsBlocking(true)
      await feedService.blokUser(other?.id, other?.username, blockReportReason, otherBlockReason)
      await queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })
      await queryClient.invalidateQueries({ queryKey: ["conversations"] })
      setShowBlockModal(false)
      setBlockReportReason("")
      setOtherBlockReason("")
      showBanner("success", `${other?.username} blocked`)
    } catch (e: any) {
      const msg = e.response?.data?.detail ?? "Failed to block. Try again."
      showBanner("error", msg)
    } finally {
      setIsBlocking(false)
    }
  }



  const handleReportSubmit = async () => {
    if (!reportReason.trim()) return
    try {
      setIsReporting(true)
      await feedService.reportFromMessage(other?.id, reportReason, otherReason)
      setShowReportModal(false)
      setReportReason("")
      setOtherReason("")
      showBanner("success", "Thank you, we'll review this report.")
    } catch (e: any) {
      const msg = e.response?.data?.detail ?? "Failed to submit report."
      showBanner("error", msg)
    } finally {
      setIsReporting(false)
    }
  }

  // ── Group actions 
  const handleLeaveGroup = () => {
    setMenuVisible(false)
    showToast({
      title: "Leave group",
      message: `Leave ${conversation?.group_name ?? "this group"}? You won't receive new messages.`,
      onConfirm: () => {
        leaveGroup(conversationId, {
          onSuccess: () => {
            removeConversation(conversationId)
            router.replace("/messages")
          },
        })
      }

    })
  }

  // navigates to the group settings screen 
  // admins see full settings; members see read-only info
  const handleGroupSettings = () => {
    setMenuVisible(false)
    router.push(`/(messages)/group/${conversationId}/settings` as any)
  }

  // ── lifecycle ─
  useEffect(() => {
    clearUnread(conversationId)
  }, [conversationId, clearUnread])
const lastMessageIdRef = useRef<string | null>(null)

useEffect(() => {
  if (isLoading || messages.length === 0) return

  const currentLastId = messages[messages.length - 1].id
  const isAppend = currentLastId !== lastMessageIdRef.current
  const isFirstLoad = lastMessageIdRef.current === null

  if (isAppend) {
    setTimeout(
      () => flatListRef.current?.scrollToEnd({ animated: !isFirstLoad }),
      0
    )
  }
  // if !isAppend, messages changed because older ones were prepended —
  // maintainVisibleContentPosition on the FlatList keeps the view anchored,
  // no scroll call needed here.

  lastMessageIdRef.current = currentLastId
}, [messages, isLoading])

  // KeyboardAvoidingView resizes the list correctly when the keyboard opens,
  // but the scroll offset doesn't follow — the last message ends up hidden
  // behind the input bar until something scrolls it into view. Do that here.
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow"
    const sub = Keyboard.addListener(showEvent, () => {
      flatListRef.current?.scrollToEnd({ animated: true })
    })
    return () => sub.remove()
  }, [])

  // Auto-focus the input when the screen opens (skip if the conversation is
  // blocked, since the input bar isn't rendered in that case). The delay
  // gives the screen transition time to settle before the keyboard pops up.
  useEffect(() => {
    // if (!isLoading && !isTargetBlocked) {
    if (!isTargetBlocked) {
      const t = setTimeout(() => messageInputRef.current?.focus(), 400)
      return () => clearTimeout(t)
    }
  }, [])






  const handleOpneMedia = useCallback((message: Message) => {
    setFullScreenMedia(message)
  }, [])
  const handleScroll = useCallback(
  (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (e.nativeEvent.contentOffset.y <= 80 && !isLoadingMore && hasMoreMessages) {
      loadOlderMessages()
    }
  },
  [isLoadingMore, hasMoreMessages, loadOlderMessages]
)

  // ── send handlers 
  const handleSendText = useCallback((text: string) => {
    sendMessage({ message_type: "text", body: text })
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
  }, [sendMessage])

  const handleSendOffer = useCallback((amount: number) => {
    sendMessage({ message_type: "offer", offer_data: { amount, currency: "Ksh", status: "pending" } })
  }, [sendMessage])
  const handleSendMedia = useCallback((assets: PickedMediaAsset[]) => {
    assets.forEach((asset) => {
      sendMessage(
        {
          message_type: asset.type,
          media_url: asset.uri,
          media_height: asset.height,
          media_width: asset.width,
          media_duration: asset.duration,
          mimType: asset.mimeType

        }
      )
    })

  }, [sendMessage])

  const handleTypingEvent = useCallback((isTyping: boolean) => {
    sendTyping(conversationId, isTyping)
  }, [sendTyping, conversationId])

  // ── date separators 
  const renderDateSeparator = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let label = date.toLocaleDateString("en-KE", { month: "short", day: "numeric" })
    if (date.toDateString() === today.toDateString()) label = "Today"
    if (date.toDateString() === yesterday.toDateString()) label = "Yesterday"

    return (
      <View style={styles.dateSeparator}>
        <View style={[styles.dateLine, { backgroundColor: theme.border }]} />
        <Text style={[styles.dateLabel, { color: theme.textMuted }]}>{label}</Text>
        <View style={[styles.dateLine, { backgroundColor: theme.border }]} />
      </View>
    )
  }

  const messagesWithDates = (messages ?? []).reduce<Array<Message | { type: "date"; date: string }>>(
    (acc, message, index) => {
      const msgDate = new Date(message.created_at).toDateString()
      const prevDate = index > 0 ? new Date(messages[index - 1].created_at).toDateString() : null
      if (msgDate !== prevDate) acc.push({ type: "date", date: message.created_at })
      acc.push(message)
      return acc
    },
    []
  )
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      {banner && (
        <AnimatedBanner
          key={banner.id}
          type={banner.type}
          message={banner.message}
          onHide={() => setBanner(null)}
        />
      )}
      {menuVisible && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        />
      )}

      <View style={[styles.header, { borderBottomColor: theme.border }]}>

        {/* back button — */}
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.backIcon, { color: theme.textPrimary }]}>←</Text>
        </TouchableOpacity>

        {isGroup ? (
          // ── Group header 
          // Tapping navigates to the group settings/info screen
          <TouchableOpacity
            style={styles.headerUser}
            onPress={handleGroupSettings}
          >
            {(conversation?.group_avatar === null || conversation?.group_avatar === undefined || !conversation.group_avatar.trim()) ?
              (<View style={[styles.usernamePlcaholder, { backgroundColor: `${getAvatarColor(conversation?.group_name ?? "G")}` }]}>
                <Text> {getInitials(conversation?.group_name ?? "G")}</Text>
              </View>
              ) : (

                // admin has set a custom group photo — show it
                <Image
                  source={{ uri: conversation.group_avatar }}
                  style={styles.headerAvatar}
                  contentFit="cover"
                />)}


            <View>
              <Text style={[styles.headerUsername, { color: theme.textPrimary }]} numberOfLines={1}>
                {conversation?.group_name ?? "Group"}
              </Text>
              {/* member count — tapping the header opens the members list */}
              <Text style={[styles.headerStatus, { color: theme.textMuted }]}>
                {memberCount} members
              </Text>
            </View>
          </TouchableOpacity>

        ) : (
          // ── DM header  
          <TouchableOpacity
            style={styles.headerUser}
            onPress={() => other && router.push(`/profile/${other.username}`)}
          >

            {(other?.avatar === null || other?.avatar === undefined || !other.avatar.trim()) ?
              (<View style={[styles.usernamePlcaholder, { backgroundColor: `${getAvatarColor(other?.username ?? "DM")}` }]}>
                <Text>{other?.username.charAt(0)}</Text>
              </View>
              ) : (

                <Image
                  source={{ uri: other?.avatar ?? undefined }}
                  style={styles.headerAvatar}
                  contentFit="cover"
                />
              )}

            <View>
              <Text style={[styles.headerUsername, { color: theme.textPrimary }]}>
                @{other?.username ?? "..."}
              </Text>
              <Text style={[styles.headerStatus, { color: Colors.success }]}>
                {isOtherOnline ? "● Online" : "● Offline"}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* All messages button — same for both */}
        <TouchableOpacity
          style={[styles.headerActionBtn, { borderColor: theme.border }]}
          onPress={() => router.push("/messages")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.headerActionText, { color: theme.textPrimary }]}>All</Text>
        </TouchableOpacity>

        {/* ── More (⋯) button + branched dropdown  */}
        <View>
          <TouchableOpacity
            style={[styles.headerActionBtn, { borderColor: theme.border }]}
            onPress={() => setMenuVisible((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.moreIcon, { color: theme.textPrimary }]}>⋯</Text>
          </TouchableOpacity>

          {menuVisible && (
            <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}

            >
              <View style={[styles.dropdown, { backgroundColor: theme.surface, borderColor: theme.border }]}>

                {isGroup ? (
                  // ── Group dropdown 
                  <>
                    {/* Group Info / Settings — available to all members
                        Admin sees rename + manage members
                        Regular member sees read-only member list
                        Both route to the same screen — it branches internally */}
                    <TouchableOpacity style={styles.dropdownItem} onPress={handleGroupSettings}>
                      <Text style={[styles.dropdownItemText, { color: theme.textPrimary }]}>
                        👥  {isAdmin ? "Group Settings" : "View Members"}
                      </Text>
                    </TouchableOpacity>

                    <View style={[styles.dropdownDivider, { backgroundColor: theme.border }]} />

                    {/* Leave group — available to everyone including admins
                        Admin leaving triggers auto-promotion on the server */}
                    <TouchableOpacity style={styles.dropdownItem} onPress={handleLeaveGroup}>
                      <Text style={[styles.dropdownItemText, { color: Colors.error ?? "#EF4444" }]}>
                        Leave group
                      </Text>
                    </TouchableOpacity>
                  </>

                ) : (
                  // ── DM dropdown  
                  <>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => showToast({
                      title: "Delete message?",
                      message: "This will be deleted for everyone. Are you sure?",
                      onConfirm: () => { handleDeleteConversation() }

                    })}>
                      <Text style={[styles.dropdownItemText, { color: Colors.error ?? "#EF4444" }]}>
                        <MaterialCommunityIcons name="delete" color={"red"} size={15} />  Delete conversation
                      </Text>
                    </TouchableOpacity>

                    <View style={[styles.dropdownDivider, { backgroundColor: theme.border }]} />

                    <TouchableOpacity style={styles.dropdownItem}>
                      {isTargetBlocked ? (
                        <Text onPress={handleUnBlockUser} style={[styles.dropdownItemText, { color: theme.textPrimary }]}>
                          🚫  Unblock @{other?.username}
                        </Text>
                      ) : (
                        <Text onPress={handleBlockUser} style={[styles.dropdownItemText, { color: theme.textPrimary }]}>
                          🚫  Block @{other?.username}
                        </Text>
                      )}
                    </TouchableOpacity>

                    <View style={[styles.dropdownDivider, { backgroundColor: theme.border }]} />

                    <TouchableOpacity style={styles.dropdownItem} onPress={handleReport}>
                      <Text style={[styles.dropdownItemText, { color: theme.textPrimary }]}>
                        ⚑  Report @{other?.username}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          )}
        </View>
      </View>

      {/* ── connection banner  */}
      <ConnectionBanner status={status} onRetry={retry} />

      {/* ── post context bar (DM only)  */}
      {post && !isGroup && (
        <TouchableOpacity
          style={[styles.postBar, { backgroundColor: theme.surfaceSecondary, borderBottomColor: theme.border }]}
          onPress={() => router.push(`/post/${post.slug}`)}
        >
          <Image source={{ uri: post.images[0]?.image }} style={styles.postThumb} contentFit="cover" />
          <View style={styles.postInfo}>
            <Text style={[styles.postName, { color: theme.textPrimary }]} numberOfLines={1}>
              📦 {post.name}
            </Text>
            <Text style={[styles.postPrice, { color: theme.primary }]}>
              {new Intl.NumberFormat("en-NG", {
                style: "currency", currency: "Ksh", minimumFractionDigits: 0,
              }).format(Number(post.price))}
            </Text>
          </View>
          <Text style={[styles.postChevron, { color: theme.textMuted }]}>›</Text>
        </TouchableOpacity>
      )}

      {/* ── messages list  */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : isError ? (
          <View style={styles.loading}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={[styles.errorText, { color: theme.textMuted }]}>Failed to load messages</Text>
            <TouchableOpacity style={[styles.retryBtn, { borderColor: theme.primary }]} onPress={()=>refetch()}>
              <Text style={[styles.retryText, { color: theme.primary }]}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messagesWithDates}
            keyExtractor={(item, index) => "type" in item ? `date-${index}` : item.id}
            renderItem={({ item }) => {
              if ("type" in item && item.type === "date") return renderDateSeparator(item.date)
              const message = item as Message
              return (
                <MessageBubble
                  message={message}
                  isOwn={message.sender_id === user?.id}
                  onOfferRespond={respondToOffer}
                  onDelete={(messageId) => deleteMessage({ messageId, conversationId })}
                  showSenderName={isGroup && message.sender_id !== user?.id}
                  onDeleteForMe={(messageId) => deleteForMe({ messageId, conversationId })}
                  onReply={startReply}
                  onToggleReaction={toggleReaction}
                  uploadProgress={uploadProgress[message.id]}
                  onOpenMedia={handleOpneMedia}
                />
              )
            }}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={100}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            ListHeaderComponent={
              isLoadingMore ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              ) : !hasMoreMessages && messages.length > 0 ? (
                <View style={styles.loadingMore}>
                  <Text style={{ color: theme.textMuted, fontSize: FontSize.xs }}>
                    Start of conversation
                  </Text>
                </View>
              ) : null
            }
            ListFooterComponent={typingUsers.length > 0 ? <TypingIndicator /> : null}
          />
        )}








        {/* blocked banner — DM only */}
        {!isGroup && blockReason && (
          <View style={[styles.blockedBanner, { backgroundColor: theme.surfaceSecondary, borderTopColor: theme.border }]}>
            <Text style={styles.blockedIcon}>🚫</Text>
            <Text style={[styles.blockedText, { color: theme.textMuted }]}>{blockReason}</Text>
          </View>
        )}

        {/* input bar */}
        {!isGroup && isTargetBlocked ? (
          <View style={[styles.blockedBanner, { backgroundColor: theme.textPrimary, borderTopColor: theme.border }]}>
            <Text style={styles.blockedIcon}>🚫</Text>
            <Text
              onPress={handleUnBlockUser}
              disabled={isUnBlocking}
              style={[styles.blockedText, { color: theme.textMuted }]}
            >
              You have blocked @{other?.username}. Tap to unblock.
            </Text>
          </View>
        ) : (
          <MessageInput
            ref={messageInputRef}
            onSendText={handleSendText}
            onSendOffer={handleSendOffer}
            onTyping={handleTypingEvent}
            onSendMedia={handleSendMedia}
            isSending={isSending}
            // hide offer button in groups — offers are DM/post context only
            showOfferButton={!isGroup}
            replyingTo={replyingTo}
            onCancelReply={cancelReply}
          />
        )}
      </KeyboardAvoidingView>






      {/* Report modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <TouchableOpacity
          style={styles.reportBackdrop}
          activeOpacity={1}
          onPress={() => setShowReportModal(false)}
        />
        <View style={[styles.reportSheet, { backgroundColor: theme.surface }]}>
          <View style={styles.reportHeader}>
            <Text style={[styles.reportTitle, { color: theme.textPrimary }]}>
              Report @{other?.username}
            </Text>
            <TouchableOpacity onPress={() => setShowReportModal(false)}>
              <Text style={[styles.reportClose, { color: theme.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.reportSubtitle, { color: theme.textSecondary }]}>
            Why are you reporting this user?
          </Text>

          {REPORT_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={[
                styles.reportOption,
                {
                  borderColor: reportReason === reason ? theme.primary : theme.border,
                  backgroundColor: reportReason === reason ? theme.primary + "15" : "transparent",
                },
              ]}
              onPress={() => setReportReason(reason)}
            >
              <Text style={[styles.reportOptionText, { color: reportReason === reason ? theme.primary : theme.textPrimary }]}>
                {reason}
              </Text>
              {reportReason === reason && <Text style={{ color: theme.primary }}>✓</Text>}
            </TouchableOpacity>
          ))}

          {reportReason === "Other" && (
            <TextInput
              style={[styles.otherInput, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.border }]}
              placeholder="Describe the issue..."
              placeholderTextColor={theme.textPlaceholder}
              value={otherReason}
              onChangeText={setOtherReason}
              multiline
              maxLength={200}
            />
          )}

          <TouchableOpacity
            style={[styles.reportSubmit, { backgroundColor: reportReason ? theme.primary : theme.border }]}
            onPress={handleReportSubmit}
            disabled={!reportReason || isReporting}
          >
            {isReporting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.reportSubmitText}>Submit Report</Text>}
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Block modal */}
      <Modal
        visible={showBlockModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBlockModal(false)}
      >
        <TouchableOpacity
          style={styles.reportBackdrop}
          activeOpacity={1}
          onPress={() => setShowBlockModal(false)}
        />
        <View style={[styles.reportSheet, { backgroundColor: theme.surface }]}>
          <View style={styles.reportHeader}>
            <Text style={[styles.reportTitle, { color: theme.textPrimary }]}>
              Block @{other?.username}
            </Text>
            <TouchableOpacity onPress={() => setShowBlockModal(false)}>
              <Text style={[styles.reportClose, { color: theme.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.reportSubtitle, { color: theme.textSecondary }]}>
            Why are you blocking this user? (optional)
          </Text>

          {REPORT_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={[
                styles.reportOption,
                {
                  borderColor: blockReportReason === reason ? theme.primary : theme.border,
                  backgroundColor: blockReportReason === reason ? theme.primary + "15" : "transparent",
                },
              ]}
              onPress={() => setBlockReportReason(reason)}
            >
              <Text style={[styles.reportOptionText, { color: blockReportReason === reason ? theme.primary : theme.textPrimary }]}>
                {reason}
              </Text>
              {blockReportReason === reason && <Text style={{ color: theme.primary }}>✓</Text>}
            </TouchableOpacity>
          ))}

          {blockReportReason === "Other" && (
            <TextInput
              style={[styles.otherInput, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.border }]}
              placeholder="Describe the issue..."
              placeholderTextColor={theme.textPlaceholder}
              value={otherBlockReason}
              onChangeText={setOtherBlockReason}
              multiline
              maxLength={200}
            />
          )}

          <TouchableOpacity
            style={[styles.reportSubmit, { backgroundColor: theme.border }]}
            onPress={handleBlockSubmit}
          >
            {isBlocking
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.blockSubmitText}>Block</Text>}
          </TouchableOpacity>
        </View>
      </Modal>
      <MediaViewer
        visible={!!fullScreenMedia}
        message={fullScreenMedia}
        onClose={() => setFullScreenMedia(null)}
      />

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── message action dropdown (delete, etc.) ──────────────────────────────
  messageMenu: {
    position: "absolute",
    minWidth: 140,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  messageMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  messageMenuItemIcon: { fontSize: 16 },
  messageMenuItemText: { fontSize: FontSize.sm, fontWeight: "700" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(220, 189, 189, 0.4)",
    zIndex: 9,
  },
  backIcon: { fontSize: 24, fontWeight: FontWeight.bold, width: 32 },
  headerUser: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray[200],
  },
  initialsCircle: {
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    color: "#fff",
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  headerUsername: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  headerStatus: { fontSize: FontSize.xs },
  moreIcon: { fontSize: 22, fontWeight: FontWeight.bold },
  headerActionBtn: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  usernamePlcaholder: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    height: 28,
    borderRadius: 14,
  },
  headerActionText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  dropdown: {
    position: "absolute",
    top: 36,
    right: 0,
    minWidth: 210,
    borderWidth: 1,
    borderRadius: Radius.md,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownItem: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2 },
  dropdownItemText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  dropdownDivider: { height: 1, marginHorizontal: Spacing.md },
  postBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1,
  },
  postThumb: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.gray[200] },
  postInfo: { flex: 1 },
  postName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  postPrice: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  postChevron: { fontSize: FontSize.xl },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  messagesList: { paddingVertical: Spacing.md },
  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  dateLine: { flex: 1, height: 1 },
  dateLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  blockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingBottom: 10,
    borderRadius: 20,
    borderTopWidth: 6,
    marginBottom: 50,
  },
  blockedIcon: { fontSize: FontSize.md },
  blockedText: { fontSize: FontSize.sm, flex: 1 },
  reportBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  reportSheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  reportTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  reportSubtitle: { fontSize: FontSize.sm, marginBottom: Spacing.xs },
  reportOption: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  reportOptionText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  otherInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    minHeight: 80,
    marginTop: Spacing.xs,
  },
  loadingMore:{
    paddingVertical:Spacing.md,
    alignItems:"center",
    justifyContent:"center"
  },
  reportSubmit: { borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: "center", marginTop: Spacing.sm },
  reportSubmitText: { color: "#fff", fontSize: FontSize.md, fontWeight: FontWeight.bold },
  blockSubmitText: { color: "#e41313", fontSize: FontSize.md, fontWeight: FontWeight.bold },
  reportClose: { fontSize: 18, fontWeight: FontWeight.bold, padding: 4 },
  errorIcon: { fontSize: 32, marginBottom: Spacing.sm, textAlign: "center" },
  errorText: { fontSize: FontSize.sm, textAlign: "center", marginBottom: Spacing.md },
  retryBtn: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  retryText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
})