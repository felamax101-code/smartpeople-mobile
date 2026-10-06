import { useRef } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native"
import { Image } from "expo-image"
import Swipeable from "react-native-gesture-handler/Swipeable"
import { router } from "expo-router"
import { useTheme } from "@/hooks/useTheme"
import { useAuthStore } from "@/stores/auth.store"
import { Conversation } from "@/services/messaging.service"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { useGroupManagement } from "@/hooks/useGroupManagement"
import { useConversations } from "@/hooks/useConversations"
import { getAvatarColor } from "@/hooks/useUserGenerateAvatarColor"
import { useMessageStore } from "@/stores/message.store"
import { ItemTypingIndicator } from "./InItemIndicator"
interface Props {
  conversation: Conversation
   typing: boolean
  typingUsers: number
}

// ── avatar fallback colours 
// When a group has no avatar image, we generate a coloured circle with the
// group name's initials. The colour is derived from the group name so the same
// group always gets the same colour across devices and sessions.




const getInitials = (name: string): string => {
  return name
    .trim()
    .split(" ")
    .slice(0, 2)                         // max 2 words
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
}
export const GroupConversationItem = ({ conversation , typing, typingUsers = 0}: Props) => {
  const theme = useTheme()
  const { user } = useAuthStore()
  const { removeConversation } = useConversations()
  const { leaveGroup } = useGroupManagement()
      const {unreadMesageCount,setUnreadMessageCount}=useMessageStore()

  const swipeableRef = useRef<Swipeable>(null)

  const timeAgo = formatTimeAgo(conversation.last_message_at)
  // ── member names subtitle 
  // Show up to 2 other participants by name, then "+N more" if there are more.
  // The current user is excluded — they know they're in the group.
  const otherMembers = conversation.participants.filter((p) => p.id !== user?.id)
  const visibleNames = otherMembers.slice(0, 2).map((p) => p.username).join(", ")
  const overflow = otherMembers.length - 2
  const membersSubtitle = overflow > 0
    ? `${visibleNames} +${overflow} more`
    : visibleNames

  // ── leave group 
  // Groups can't be "deleted" from the list — the user can only leave.
  // On success, removeConversation() removes it from the cache immediately.
  const handleLeave = () => {
    swipeableRef.current?.close()
    leaveGroup(conversation.id, {
      onSuccess: () => removeConversation(conversation.id),
    })
  }

  const renderRightActions = () => (
    <TouchableOpacity
      style={styles.leaveAction}
      onPress={handleLeave}
      activeOpacity={0.8}
    >
      <Text style={styles.leaveActionIcon}>🚪</Text>
      <Text style={styles.leaveActionLabel}>Leave</Text>
    </TouchableOpacity>
  )
  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      friction={2}
      rightThreshold={50}
      overshootRight={false}
    >
      <TouchableOpacity
        style={[styles.container, { borderBottomColor: theme.border }]}
        onPress={() => {router.push(`/messages/${conversation.id}`);setUnreadMessageCount(unreadMesageCount-(conversation.unread_count??0))}}
        activeOpacity={0.7}
      >
        {/* ── avatar  */}
        <View style={styles.avatarWrapper}>
          {(conversation?.group_avatar === null || conversation?.group_avatar===undefined || !conversation.group_avatar.trim())?
            (<View style={[styles.usernamePlcaholder, { backgroundColor: `${getAvatarColor(conversation.group_name ?? "G")}` }]}>
              <Text> {getInitials(conversation.group_name ?? "G")}</Text>
            </View>
            ) : (

              // admin has set a custom group photo — show it
              <Image
                source={{ uri: conversation.group_avatar }}
                style={styles.avatar}
                contentFit="cover"
              />)}

          {/* unread indicator dot — same position as ConversationItem */}
          {conversation.unread_count > 0 && (
            <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
          )}
        </View>

        {/* ── content  */}
        <View style={styles.content}>

          {/* top row: group name + timestamp */}
          <View style={styles.topRow}>
            <Text
              style={[
                styles.groupName,
                { color: theme.textPrimary },
                conversation.unread_count > 0 && styles.bold,
              ]}
              numberOfLines={1}
            >
              {conversation.group_name ?? "Group"}
            </Text>
            <Text style={[styles.time, { color: theme.textMuted }]}>
              {timeAgo}
            </Text>
          </View>

          {/* middle row: member names — unique to groups */}
          <Text
            style={[styles.members, { color: theme.success }]}
            numberOfLines={1}
          >
            {membersSubtitle}
          </Text>

          {/* bottom row: last message preview + unread badge */}
          <View style={styles.bottomRow}>

            {typing?(
              <View
              style={[{display:"flex",flexDirection:"row",gap:4}]}
              >
                <Text
                style={[{color:theme.success,fontSize:FontSize.xs}]}
                >
                  {typingUsers>0?typingUsers:null}
                </Text>
                <ItemTypingIndicator/>
                 <Text
                style={[{color:theme.success,fontSize:FontSize.xs}]}
                >
                  Typing
                </Text>
              </View>
            ):(
            <Text
              style={[
                styles.preview,
                {
                  color: conversation.unread_count > 0
                    ? theme.textPrimary
                    : theme.textSecondary,
                  fontWeight: conversation.unread_count > 0
                    ? FontWeight.semibold
                    : FontWeight.regular,
                },
              ]}
              numberOfLines={1}
            >
              {typing ?
              `Typing`
            
            :
              conversation.last_message_preview ?? "Group created"}
            </Text>)}

            {conversation.unread_count > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.unreadText}>
                  {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
                </Text>
              </View>
            )}
          </View>

        </View>
      </TouchableOpacity>
    </Swipeable>
  )
}

// ── helpers 
const formatTimeAgo = (dateString: string | null): string => {
  if (!dateString) return ""
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (seconds < 60) return "now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
  return new Date(dateString).toLocaleDateString()
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 26,
    backgroundColor: Colors.gray[200],
  },
  // overlaid on avatar when no group_avatar is set
  initialsCircle: {
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  usernamePlcaholder: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    height: 40,
     borderRadius: 26,
  },
  unreadDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  content: {
    flex: 1,
    gap: 2,     // slightly tighter than DM — three rows need the space
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  groupName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    flex: 1,
  },
  bold: {
    fontWeight: FontWeight.bold,
  },
  time: {
    fontSize: FontSize.xs,
  },
  // member names row — sits between the group name and the preview
  members: {
    fontSize: FontSize.xs,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  preview: {
    fontSize: FontSize.sm,
    flex: 1,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    marginLeft: Spacing.sm,
  },
  unreadText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  leaveAction: {
    backgroundColor: Colors.error ?? "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    width: 76,
    marginVertical: 2,
    borderRadius: Radius.lg,
    marginRight: Spacing.md,
    gap: 2,
  },
  leaveActionIcon: { fontSize: 18 },
  leaveActionLabel: {
    fontSize: FontSize.xs,
    color: "#fff",
    fontWeight: "700",
  },
})