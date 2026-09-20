import { useRef, useState, useEffect, useCallback, memo } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Animated,
  Share
} from "react-native"
import Swipeable from "react-native-gesture-handler/Swipeable"
import { useTheme } from "@/hooks/useTheme"
import { Image } from "expo-image"
import { OfferCard } from "./OfferCard"
import * as Clipboard from "expo-clipboard"

import { Colors, Spacing, Radius, FontSize } from "@/constants/colors"
import { MessageWithExtras, ReactionSummary, REACTION_EMOJIS } from "@/hooks/useConversationDetail"
import { router } from "expo-router"
import { Pressable } from "react-native"
import { useAuthStore } from "@/stores/auth.store"
import { useToast } from "../activityIndicator/ToastProvider"
import { MaterialCommunityIcons } from "@expo/vector-icons"
interface Props {
  message: MessageWithExtras
  uploadProgress?: number
  onOpenMedia?: (message: MessageWithExtras) => void
  isOwn: boolean
  onOfferRespond: (
    messageId: string,
    action: "accepted" | "declined" | "countered",
    counterAmount?: number
  ) => void
  onDelete?: (messageId: string) => void
  onReply: (message: MessageWithExtras) => void
  onToggleReaction: (message: MessageWithExtras, emoji: string) => void
  onDeleteForMe?: (messageId: string) => void


  showSenderName: boolean
}

export const MessageBubble = memo(({
  message,
  isOwn,
  onOfferRespond,
  onDelete,
  onReply,
  onToggleReaction,
  showSenderName,
  onOpenMedia,
  onDeleteForMe,
  uploadProgress,
}: Props) => {
  const { showToast } = useToast()
  const theme = useTheme()
  const swipeableRef = useRef<Swipeable>(null)
  const { user } = useAuthStore()
  //  reaction picker state + animation ─
  const [pickerVisible, setPickerVisible] = useState(false)
  const pickerAnim = useRef(new Animated.Value(0)).current
  const [deleteModalVsisble, setdeleteModalVsisble] = useState<boolean>(false)


  const bubbleRef = useRef<View>(null)
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 })


  const openPicker = () => {
    setPickerVisible(true)

    Animated.spring(pickerAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 100,
    }).start()
  }

  const closePicker = () => {
    Animated.timing(pickerAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => { setPickerVisible(false); setdeleteModalVsisble(false) })
  }
  const handleCopy = async () => {
    if (!message.body) return
    setPickerVisible(false)
    await Clipboard.setStringAsync(message.body)
  }

  const handleEmojiSelect = (emoji: string) => {
    onToggleReaction(message, emoji)
    closePicker()
  }
  const confirmDeleteFoRMe = () => {
    setPickerVisible(false)
    setdeleteModalVsisble(false)
    onDeleteForMe?.(message.id)

  }
  //  shared confirm dialog ─
  const confirmDelete = useCallback(() => {
    swipeableRef.current?.close()
    setPickerVisible(false)
    showToast({
      title: "Delete Message",
      message: "This will be deleted for everyone. Are you sure?",
      onConfirm: () => { onDelete?.(message.id) },
    })
  }, [showToast, onDelete, message.id])

  //  long press: open the reaction picker + report position so the
  //    parent screen can show its delete/actions dropdown alongside it ─
  // Deleted messages and the picker itself ignore long press.
  const handleLongPress = useCallback(() => {

    if (message.is_deleted) return
    bubbleRef.current?.measureInWindow((x, y, width, height) => {
      setPickerPos({ x, y })
      openPicker()

    })
  }, [message,])
  // Swiping left reveals a small reply icon behind the bubble. Releasing
  // past the threshold fires the reply immediately and snaps the row back —
  // no button tap required, matching WhatsApp/Telegram/iMessage behavior.
  const handleSwipeableOpen = useCallback((direction: "left" | "right") => {
    if (direction === "left") {
      onReply(message)
    }
    swipeableRef.current?.close()
  }, [onReply, message])

  //  swipe-right (i.e. drag finger right) action: reply icon peeking
  //    from behind the bubble, anchored to the corner 
  const renderLeftActions = useCallback(
    (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
      const scale = dragX.interpolate({
        inputRange: [0, 30, 60],
        outputRange: [0.5, 0.85, 1],
        extrapolate: "clamp",
      })
      const opacity = dragX.interpolate({
        inputRange: [0, 15, 45],
        outputRange: [0, 0.6, 1],
        extrapolate: "clamp",
      })
      return (
        <View style={styles.replyIconWrap}>
          <Animated.View
            style={[
              styles.replyIconCircle,
              { backgroundColor: theme.primaryLight, opacity, transform: [{ scale }] },
            ]}
          >
            <Text style={[styles.replyActionIcon, { color: theme.primary }]}>↩</Text>
          </Animated.View>
        </View>
      )
    },
    [theme]
  )

  //  deleted state (both users see this) ─
  if (message.is_deleted) {
    return (
      <View style={[styles.row, isOwn ? styles.rowRight : styles.rowLeft]}>
        <View style={[styles.deletedBubble, { borderColor: theme.border }]}>
          <Text style={[styles.deletedText, { color: theme.textMuted }]}>
            🚫 Message deleted
          </Text>
        </View>
      </View>
    )
  }
  const tick = isOwn ? (message.is_read ? "✓✓" : "✓") : ""
  const tickColor = "#b50b0b"
console.log("jj",  message.media_url,message.message_type )
  //  quoted reply preview 
  // Shown above the bubble when this message replies to another one.
  const quotedBlock = message.replied_to && (
    <View
      style={[
        styles.quotedBlock,
        { backgroundColor: isOwn ? "rgba(255,255,255,0.15)" : theme.background },
      ]}
    >
      <View style={[styles.quotedAccent, { backgroundColor: isOwn ? "#fff" : theme.primary }]} />
      <View style={styles.quotedTextContainer}>
        <Text
          style={[styles.quotedSender, { color: isOwn ? "#fff" : theme.primary }]}
          numberOfLines={1}
        >{message.replied_to.sender_username === user?.username
          ? "You"
          : ` @ ${message.replied_to.sender_username}`}
        </Text>
        {message.replied_to.message_type === "image" || message.replied_to.message_type==="video" ? (
          <View
          style={[{height:30,width:"100%"}]}
          >
          <Image
            source={{ uri: message.replied_to.media_url ?? "" }}
            style={[{backgroundColor:"#fff",height:"100%",width:"100%"}]}
            contentFit="cover"
            transition={200}
          />
          </View>
        ) : (
          <Text
            style={[styles.quotedBody, { color: isOwn ? "rgba(255,255,255,0.8)" : theme.textSecondary }]}
            numberOfLines={1}
          >
            {message.replied_to.is_deleted
              ? "Message deleted"
              // : message.replied_to.message_type === "image" 
              //   ? "📷 Photo"
              : message.replied_to.message_type === "offer"
                ? "💰 Offer"
                : message.replied_to.body ?? ""}
          </Text>
        )}

      </View>
    </View>
  )

  //  reaction strip ─
  // Renders below the bubble. Each chip bounces in via ReactionChip.
  const reactionStrip = !!message.reactions?.length && (
    <View style={[styles.reactionStrip, isOwn ? styles.reactionStripRight : styles.reactionStripLeft]}>
      {message.reactions!.map((r) => (
        <ReactionChip
          key={r.emoji}
          reaction={r}
          theme={theme}
          onPress={() => onToggleReaction(message, r.emoji)}
        />
      ))}
    </View>
  )
  //  reaction picker popup 

  const reactionPicker = (
    <Modal visible={pickerVisible} transparent animationType="none" onRequestClose={closePicker}>
      <Pressable style={{ flex: 1 }} onPress={() => {
        closePicker()
        setdeleteModalVsisble(false)
      }}>
        <Animated.View
          style={[
            styles.pickerContainer,
            {
              backgroundColor: theme.backgroundMuted,
              borderColor: theme.success,
              position: "absolute",
              top: pickerPos.y - 70,
              left: isOwn ? undefined : pickerPos.x,
              right: isOwn ? 16 : undefined,
              opacity: pickerAnim,
              transform: [{ scale: pickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
            }
          ]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={true}
            contentContainerStyle={{ gap: 4, paddingHorizontal: 4, borderTopWidth: 0.3, borderTopColor: theme.textPrimary, borderBottomWidth: 0.3, borderBottomColor: theme.textPrimary }}>
            {REACTION_EMOJIS.map((emoji) => (
              <TouchableOpacity key={emoji} style={styles.pickerEmojiBtn}
                onPress={() => handleEmojiSelect(emoji)} activeOpacity={0.6}>
                <Text style={styles.pickerEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.pickerCloseBtn} onPress={closePicker}>
            <Text style={[styles.pickerCloseIcon, { color: theme.textPrimary }]}>✕</Text>
          </TouchableOpacity>

          <View
            style={[styles.actionsmenu, { borderColor: theme.textMuted, backgroundColor: theme.inputBackground }]}
          >
            <TouchableOpacity
              onPress={() => {
                setPickerVisible(false);
                onReply(message)
              }}
            >
              <Text>
                <MaterialCommunityIcons name="reply" color={theme.primary} size={20} />
              </Text>
            </TouchableOpacity>
            {message.body && (
              <TouchableOpacity
                onPress={() => handleCopy()}
              >
                <Text>
                  <MaterialCommunityIcons name="content-copy" color={theme.primary} size={20} />
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setdeleteModalVsisble(true)}
            >
              <Text>
                <MaterialCommunityIcons name="delete" color={theme.primary} size={20} />
              </Text>
            </TouchableOpacity>
            {deleteModalVsisble && (


              <View style={[styles.deleteMoadal, { backgroundColor: theme.backgroundMuted, borderColor: theme.textMuted }]}  >
                <TouchableOpacity
                  onPress={() => confirmDeleteFoRMe()}
                  style={[{ borderRadius: 3, backgroundColor: theme.primary, paddingHorizontal: 5 }]}

                >
                  <Text
                    style={[{ color: theme.textPrimary }]}

                  >
                    Delete for me
                  </Text>
                </TouchableOpacity>
                {isOwn && (
                  <TouchableOpacity
                    onPress={() => confirmDelete()}
                    style={[{ borderRadius: 3, backgroundColor: theme.primary, paddingHorizontal: 5 }]}
                  >
                    <Text
                      style={[{ color: theme.textPrimary }]}
                    >
                      Delete for everyone
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => {
                    setdeleteModalVsisble(false)
                    setPickerVisible(false)
                  }}
                  style={[{ borderRadius: 3, backgroundColor: theme.primary, paddingHorizontal: 5 }]}
                >
                  <Text
                    style={[{ color: theme.textPrimary }]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>)}

          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  )









  //  offer card ─
  if (message.message_type === "offer" && message.offer_data) {
    const offerInner = (
      <Pressable
        onLongPress={handleLongPress}
        delayLongPress={400}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <View style={styles.offerRow}>
          {quotedBlock}
          <OfferCard
            messageId={message.id}
            offerData={message.offer_data}
            isOwn={isOwn}
            onRespond={onOfferRespond}
            isRead={message.is_read}
          />
          {reactionStrip}
        </View>
        {reactionPicker}
      </Pressable>
    )

    return (
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={renderLeftActions}
        onSwipeableOpen={handleSwipeableOpen}
        simultaneousHandlers={[]}
        friction={2}
        leftThreshold={50}
        overshootLeft={false}
        overshootRight={false}
      >
        {offerInner}
      </Swipeable>
    )
  }

  //  image / video bubble 
  if (message.message_type === "image" || message.message_type === "video") {
    const isVideo = message.message_type === "video"
    // const previewUri = isVideo ? message.thumbnail_url : message.media_url
    const previewUri = message.media_url
    const isUploading = typeof uploadProgress === "number"

    const mediaInner = (
      <Pressable
        onLongPress={handleLongPress}
        onPress={() => !isUploading && onOpenMedia?.(message)}
        delayLongPress={400}
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
      >
        <View style={[[styles.mediaRow, isOwn ? styles.rowRight : styles.rowLeft]]}>
          {quotedBlock}
          <View style={styles.mediaWrap} ref={bubbleRef}>
            {previewUri ? (
              <Image
                source={{ uri: (previewUri) }}
                style={[styles.mediaImage, { borderColor: isOwn ? theme.success : theme.textPlaceholder }]}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.mediaImage, styles.mediaFallback, { backgroundColor: theme.surfaceSecondary }]}>
                <Text style={{ fontSize: 32 }}>{isVideo ? <MaterialCommunityIcons name="video" size={20} /> : <MaterialCommunityIcons name="camera" size={20} />}</Text>
              </View>
            )}

            {isVideo && !isUploading && (
              <View style={styles.playOverlay}>
                <Text style={{ fontSize: 28 }}>
                  <MaterialCommunityIcons size={25} name="play-circle-outline" color={"white"} />
                </Text>
              </View>
            )}

            {isUploading && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.uploadPercentText}>{uploadProgress}%</Text>
              </View>
            )}
          </View>
          {reactionStrip}
        </View>
        {reactionPicker}
      </Pressable>
    )

    return (
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={renderLeftActions}
        onSwipeableOpen={handleSwipeableOpen}
        simultaneousHandlers={[]}
        friction={2}
        leftThreshold={50}
        overshootLeft={false}
        overshootRight={false}
      >
        {mediaInner}
      </Swipeable>
    )
  }

  //  inner bubble (long-press for reactions, or delete if own) ─
  const bubbleContent = (
    <Pressable
      onLongPress={handleLongPress}
      delayLongPress={400}
      style={{ overflow: "visible" }}
    >
      <View style={{ position: "relative", overflow: "visible" }}>

        {quotedBlock}

        <View
          ref={bubbleRef}
          style={[
            styles.bubble,
            isOwn
              ? [styles.ownBubble, { backgroundColor: theme.primary }]
              : [styles.otherBubble, { backgroundColor: theme.surfaceSecondary }],
          ]}
        >
          {showSenderName && (
            <Text onPress={() => router.push(`/profile/${message.sender_username}`)} style={[styles.username, { color: theme.success }]}>
              @{message.sender_username}:
            </Text>
          )}
          {message.body && (
            <Text
              style={[styles.bodyText, { color: isOwn ? "#fff" : theme.textPrimary }]}
            >
              {message.body}
            </Text>
          )}

          <View style={styles.meta}>
            <Text
              style={[
                styles.timeText,
                { color: isOwn ? "rgba(255,255,255,0.65)" : theme.textMuted },
              ]}
            >
              {formatTime(message.created_at)}
            </Text>
            {isOwn && (
              <Text style={[styles.tick, { color: tickColor }]}>{tick}</Text>
            )}
          </View>
        </View>

        {reactionStrip}
        {reactionPicker}

      </View>
    </Pressable>
  )

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      onSwipeableOpen={handleSwipeableOpen}
      simultaneousHandlers={[]}
      friction={2}
      leftThreshold={50}
      overshootLeft={false}
      overshootRight={false}
    >
      <View style={[styles.row, isOwn ? styles.rowRight : styles.rowLeft]}>
        {bubbleContent}
      </View>
    </Swipeable>
  )
})

//  ReactionChip — bounces in when its count changes 
const ReactionChip = ({
  reaction,
  theme,
  onPress,
}: {
  reaction: ReactionSummary
  theme: any
  onPress: () => void
}) => {
  const scale = useRef(new Animated.Value(0.6)).current

  // re-bounce every time the count changes (new reaction arrives via WS)
  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.15, useNativeDriver: true, friction: 4, tension: 200 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 200 }),
    ]).start()
  }, [reaction.count])

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[
          styles.reactionChip,
          {
            backgroundColor: reaction.reacted_by_me ? theme.primary + "25" : theme.surfaceSecondary,
            borderColor: reaction.reacted_by_me ? theme.primary : theme.border,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
        <Text style={[styles.reactionCount, { color: reaction.reacted_by_me ? theme.primary : theme.textSecondary }]}>
          {reaction.count}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  )
}

const formatTime = (dateString: string): string =>
  new Date(dateString).toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })

const styles = StyleSheet.create({
  row: { paddingHorizontal: Spacing.md, paddingVertical: 2, overflow: "visible" },
  rowRight: { alignItems: "flex-end", paddingLeft: 50 },
  rowLeft: { alignItems: "flex-start", paddingRight: 50 },

  offerRow: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },

  bubble: {
    maxWidth: "100%",
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    gap: 4,
  },
  ownBubble: { borderBottomRightRadius: 4 },
  otherBubble: { borderBottomLeftRadius: 4 },
  username: { fontSize: FontSize.sm, lineHeight: 10, fontStyle: "italic" },
  bodyText: { fontSize: FontSize.md, lineHeight: 22 },
  meta: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 3 },
  timeText: { fontSize: 10 },
  tick: { fontSize: 11, fontWeight: "700" },

  //  swipe actions 
  // deleteAction / deleteActionIcon / deleteActionLabel kept for a future
  // delete entry point (e.g. long-press menu) — no longer used by the swipe.
  deleteAction: {
    backgroundColor: Colors.error ?? "#EF4444",
    justifyContent: "center", alignItems: "center",
    width: 76, marginVertical: 2, borderRadius: Radius.lg,
    marginRight: Spacing.md, gap: 2,
  },
  deleteActionIcon: { fontSize: 18 },
  deleteActionLabel: { fontSize: FontSize.xs, color: "#fff", fontWeight: "700" },

  // small reply icon that peeks out from behind the bubble as you drag —
  // squeezed to the corner rather than a full-width action button.
  replyIconWrap: {
    width: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  replyIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  replyActionIcon: { fontSize: 16, fontWeight: "700" },

  //  deleted placeholder ─
  deletedBubble: {
    borderWidth: 1, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderStyle: "dashed",
  },
  deletedText: { fontSize: 10, fontStyle: "italic" },

  //  quoted reply preview 
  quotedBlock: {
    flexDirection: "row",
    borderRadius: Radius.md,
    padding: Spacing.xs,
    marginBottom: 4,
    gap: Spacing.xs,
    maxWidth: "78%",
  },
  actionsmenu: {
    position: 'absolute',
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: Spacing.xs,
    gap: Spacing.xl,
    top: -27,
    paddingHorizontal: Spacing.md,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    left: 0,
    right: 0,
    borderWidth: 1,

  },
  deleteMoadal: {
    position: 'absolute',
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.xs,
    gap: Spacing.md,
    top: -27,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    left: 0,
    backgroundColor: "red",
    borderWidth: 1,
    elevation: 10
  },

  quotedAccent: { width: 3, borderRadius: 2 },
  quotedTextContainer: { flex: 1, paddingVertical: 2 },
  quotedSender: { fontSize: 8, fontWeight: "700" },
  quotedBody: { fontSize: FontSize.xs, marginTop: 1 },

  //  reaction strip 
  reactionStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 2,
  },
  reactionStripLeft: { justifyContent: "flex-start" },
  reactionStripRight: { justifyContent: "flex-end" },
  reactionChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  reactionEmoji: { fontSize: 12 },
  reactionCount: { fontSize: 11, fontWeight: "700" },

  //  reaction picker popup 
  pickerContainer: {

    flexDirection: "row",
    alignItems: "center",
    overflow: "visible",
    height: 60,
    width: 240,
    borderWidth: 0.5,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 6,
    gap: 4,
    zIndex: 9999,
    elevation: 9999,
    minWidth: 160,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,

  },
  pickerLeft: { left: 0 },
  pickerRight: { right: 0 },
  pickerEmojiBtn: { paddingHorizontal: 4 },
  pickerEmoji: { fontSize: 16 },
  pickerCloseBtn: { paddingHorizontal: 6 },
  pickerCloseIcon: { fontSize: 12, fontWeight: "700" },

  mediaRow: { flexDirection: "column", alignItems: "flex-end", marginVertical: 2 },
  mediaWrap: {
    width: 220,
    height: 260,
    borderRadius: Radius.lg,
    overflow: "hidden",
    position: "relative",
  },
  mediaImage: { width: "100%", height: "100%", borderWidth: 1, borderRadius: Radius.md },
  mediaFallback: { justifyContent: "center", alignItems: "center" },
  playOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  uploadOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  uploadPercentText: { color: "#fff", fontSize: FontSize.sm, fontWeight: "700" },






})






