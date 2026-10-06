import React, { useCallback, useRef, useMemo, useState ,useEffect} from "react"
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useQueryClient } from "@tanstack/react-query"
import { messagingService } from "@/services/messaging.service"
import { router } from "expo-router"
import { useTheme } from "@/hooks/useTheme"
import { useAuthStore } from "@/stores/auth.store"
import { useConversations } from "@/hooks/useConversations"
import { useWebSocket } from "@/hooks/useWebSocket"
import { ConversationItem } from "@/components/messages/ConversationItem"
import { GroupConversationItem } from "@/components/messages/GroupConversationItem"
import { ConnectionBanner } from "@/components/messages/ConnectionBanner"
import { Spacing, FontSize, FontWeight, Radius } from "@/constants/colors"
import { Conversation } from "@/services/messaging.service"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { AnimatedBanner, BannerState, BannerType } from "@/components/activityIndicator/AnimatedBanner"
import { useMessageStore } from "@/stores/message.store"
import { UploadProgressBadge } from "@/components/createpost/UploadProgressbadge"


type TabType = "all" | "dm" | "groups"
export default function MessagesScreen() {
  const theme = useTheme()
  const { user } = useAuthStore()
  const queryClient=useQueryClient()
  const {setUnreadMessageCount}=useMessageStore()
    const [banner, setBanner] = useState<BannerState | null>(null);
   const [typing, SetTypng] = useState<{ conversation_id: string | null, typing: boolean  }>({
    conversation_id: null,
    typing: false
  })
  const {
    isError,
    conversations,
    isLoading,
    refetch,
    updateConversationPreview,
    updateGroupInfo,      
    removeConversation,  
    handleTyping ,
    typingUsers
    
  } = useConversations()
  // ── global WebSocket handler 
  // Runs for every event while the messages tab is mounted.
  const handleWSEventRef = useRef<(event: any) => void>(null)
  const [activeTab, setActiveTab] = useState<TabType>("all")
  handleWSEventRef.current = useCallback((event: any) => {
    
    // ── new message 
    // Update the preview text, timestamp, and unread badge in the list.
    // Works for both DMs and groups — useConversations handles the difference.
    if (event.type === "message") {
      updateConversationPreview(event.data)
    }

    // ── new conversation / added to a group 
    // Fires when:
    //   a) someone starts a DM with the current user
    //   b) someone adds the current user to a group after WS connected
    // refetch() loads the full conversation object into the list.
    // subscribeToConversation() tells the server to start forwarding that
    // conversation's Redis channel events to this WebSocket connection.
    if (event.type === "new_conversation") {
      refetch()
      subscribeToConversation(event.data.conversation_id)
    }
    if(event.type==="typing"){
       SetTypng({
          conversation_id:event.data.conversation_id,
          typing:event.data.is_typing
        })
        handleTyping(event.data.user_id, event.data.is_typing)
    }

    // ── group renamed or avatar changed ────
    // An admin updated the group — patch the name/avatar in the list in place
    // without a full refetch. The GroupConversationItem re-renders automatically.
    if (event.type === "group_updated") {
      updateGroupInfo(event.data)
    }

    // ── member removed from a group ────────
    // Two cases:
    //   current user was kicked / left → remove the conversation entirely
    //   someone else was removed → refetch so participant count stays accurate
    if (event.type === "group_member_removed") {
      if (event.data.removed_user_id === user?.id) {
        // we're no longer in this group — remove it from the list
        removeConversation(event.data.conversation_id)
      } else {
        // another member was removed — refresh to reflect updated member count
        refetch()
      }
    }

    // ── member added to a group 
    // Someone was added — refetch so the participant list stays up to date.
    // This matters for the member count shown in GroupConversationItem.
    if (event.type === "group_member_added") {
      refetch()
    }

  }, [
    updateConversationPreview,
    updateGroupInfo,
    removeConversation,
    refetch,
    user?.id,
    // subscribeToConversation added below after useWebSocket call
  ])
  const stableHandler = useCallback((event: any) => {
    handleWSEventRef.current?.(event)
  }, [])
  const { status, retry, subscribeToConversation } = useWebSocket({
    userId: user?.id ?? "",
    onEvent: stableHandler,
  })
  useEffect(()=>{
      if(!user) return
      
      messagingService.getUnreadCount().then(setUnreadMessageCount)
      
      
    },[user])

 const showBanner = useCallback((type: BannerType, message: string) => {
    setBanner({ id: Date.now(), type, message });
  }, []);
const handleDeleteConversation = async (id:string) => {
    try {
      const data = await messagingService.deleteConversation(id)
      if (data.success === true) {
         showBanner("success", "Deleted.You can start another conversation with the other partcipant any time")
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.removeQueries({ queryKey: ["messages", id] });
      } else {
        showBanner("error", "Something went wrong. Try again")
      }

    } catch (e) {
      const detail = "Something went wrong. Try again"
      showBanner("error", detail)
    }
  }
  const filteredConv = useMemo(() => {
    return conversations.filter((item) => {
      if (activeTab === "dm") return !item.is_group
      if (activeTab === "groups") return item.is_group
      return true
    })
  }, [conversations, activeTab])
  // ── render one row in the conversation list ───────
  const renderConversation = useCallback(({ item }: { item: Conversation }) => {
    if (item.is_group) {
      
      return <GroupConversationItem conversation={item} 
      
      typing={typing.conversation_id==item.id && typing.typing} typingUsers={typingUsers.length}
      />
    }
    // ConversationItem 
    return <ConversationItem conversation={item} onDelete={(id)=>handleDeleteConversation(id)}
    typing={typingUsers.length>0}
    />
  }, [])

  // ── guest wall ──
  if (!user) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={["top"]}
      >
        <View style={styles.guestScreen}>
          <Text style={styles.guestIcon}>💬</Text>
          <Text style={[styles.guestTitle, { color: theme.textPrimary }]}>
            Your Messages
          </Text>
          <Text style={[styles.guestSub, { color: theme.textSecondary }]}>
            Log in to message other people
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.loginButtonText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      {banner && (
              <AnimatedBanner
                key={banner.id}
                type={banner.type}
                message={banner.message}
                onHide={() => setBanner(null)}
              />
            )}
      {/* ── header  */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Smart Chats
        </Text>

        



        {/* Compose button — opens a choice between new DM and new group.
            Routes to a dedicated screen that handles both flows.
            */}
        <TouchableOpacity
          style={styles.composeButton}
          onPress={() => router.push("/(messages)/new")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.composeIcon, { color: theme.primary }]}>New</Text>
        </TouchableOpacity>
      </View>
      {/* ── Segment Tabs Bar  */}
      <View style={[styles.tabsContainer, { borderBottomColor: theme.border }]}>
        {(["all", "dm", "groups"] as const).map((tab) => {
          const isActive = activeTab === tab
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
                isActive && { borderBottomColor: theme.primary },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  isActive
                    ? { color: theme.primary, fontWeight: FontWeight.bold }
                    : { color: theme.textSecondary }
                ]}
              >
                {tab === "all" ? "All" : tab === "dm" ? "Direct" : "Groups"}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
      {/* ── connection banner  */}
      <ConnectionBanner status={status} onRetry={retry} />

      {/* ── list states ────── */}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>

      ) : isError ? (
        <View style={styles.loading}>
          <Text style={styles.errorIcon}>
            <MaterialCommunityIcons
            name="alert-circle-outline"
              size={25}
              color={`${theme.textPrimary}`}
              />
          </Text>
          <Text style={[styles.errorText, { color: theme.textMuted }]}>
            Failed to load conversations
          </Text>
           <Text style={[styles.errorText, { color: theme.textMuted }]}>
           This might be a problem we are working on 
          </Text>
           <Text style={[styles.errorText, { color: theme.textMuted }]}>
            Meanwhile make sure you are well connected to the internet
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { borderColor: theme.primary }]}
            onPress={() => refetch()}
          >
            <Text style={[styles.retryText, { color: theme.primary }]}>
              Try again
            </Text>
          </TouchableOpacity>
        </View>

      ) : filteredConv.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>
             <MaterialCommunityIcons
              name="message-text"
              size={25}
              color={`${theme.textPrimary}`}
              />
          </Text>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
            {activeTab === "all"
              ? "No conversations yet"
              : activeTab === "dm"
                ? "No direct messages yet"
                : "No group messages yet"}
          </Text>

          <View style={[styles.emptySub]}>
            {activeTab === "all"
              ? <TouchableOpacity onPress={() => router.push("/(messages)/new")}>
                <Text
                  style={[styles.emptyIcon, { backgroundColor: theme.primary, color: theme.textPrimary, borderColor: theme.borderMuted }]}>
                Start a conversation</Text>
              </TouchableOpacity>
              : activeTab === "dm"
                ? <TouchableOpacity onPress={() => router.push({
                  pathname:"/(messages)/new",
                 
                  })}>
                  <Text
                    style={[styles.emptyIcon, { backgroundColor: theme.primary, color: theme.textPrimary, borderColor: theme.borderMuted }]}>
                    Start a conversation</Text>
                </TouchableOpacity>
                :
                <TouchableOpacity onPress={() => router.push({
                  pathname:"/(messages)/new",
                  params:{
                    tab:"group"
                  }
                  })}>
                  <Text
                    style={[styles.emptyIcon, { backgroundColor: theme.primary, color: theme.textPrimary, borderColor: theme.borderMuted }]}>
                    Create a group</Text>
                </TouchableOpacity>}
                <TouchableOpacity onPress={()=>refetch()}>
                  <Text
                    style={[styles.emptyIcon, { backgroundColor: theme.primary, color: theme.textPrimary, borderColor: theme.borderMuted }]}>
                    Reload</Text>
                </TouchableOpacity>
          </View>
        </View>

      ) : (
        <FlatList
          data={filteredConv}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}  // branches on is_group internally
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={theme.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
      <UploadProgressBadge/>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    flexDirection: "row",             // NEW — row so title and button sit side by side
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
  },
  composeButton: {
    // keeps the tap area generous without affecting layout
    padding: Spacing.xs,
  },
  composeIcon: {
    fontSize: FontSize.xl,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  emptyIcon: {
    fontSize: FontSize.md,
    borderWidth: 2,
    borderRadius: Radius.lg,
    paddingHorizontal: 4,
    lineHeight: 20
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: "center",
  },
  emptySub: {
   
  },
  guestScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  guestIcon: { fontSize: 64 },
  guestTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
  },
  guestSub: {
    fontSize: FontSize.md,
    textAlign: "center",
  },
  loginButton: {
    width: "100%",
    height: 54,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  errorText: {
    fontSize: FontSize.sm,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  retryBtn: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  retryText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },



  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    textTransform: "capitalize",
  },
})