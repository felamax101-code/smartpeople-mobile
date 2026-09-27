

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
import { Conversation } from "@/services/messaging.service"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { useAuthStore } from "@/stores/auth.store"
import { getAvatarColor } from "@/hooks/useUserGenerateAvatarColor"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { ItemTypingIndicator } from "./InItemIndicator"
interface Props {
  conversation: Conversation
  onDelete: (id: string) => void
  typing: boolean
}

export const ConversationItem = ({ conversation, onDelete, typing, }: Props) => {
  const theme = useTheme()
  const { user } = useAuthStore()
  // get the other participant (not current user)
  const other = conversation.participants.find((p) => p.id !== user?.id)
    ?? conversation.participants[0]
  const timeAgo = formatTimeAgo(conversation.last_message_at)
  const swipeableRef = useRef<Swipeable>(null)
  const handleDelete = () => { onDelete(conversation.id) }
  console.log("dm",other.avatar)
  const renderRightActions = () => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={handleDelete}
      activeOpacity={0.8}
    >
      <Text style={styles.deleteActionIcon}>
        <MaterialCommunityIcons name="delete" size={18} color="white" />
      </Text>
      <Text style={styles.deleteActionLabel}>Delete</Text>
    </TouchableOpacity>
  )
  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      friction={2}
      rightThreshold={50}
      overshootRight={false}>
      <TouchableOpacity
        style={[styles.container, { borderBottomColor: theme.border }]}
        onPress={() => router.push(`/messages/${conversation.id}` as any)}
        activeOpacity={0.7}
      >
        {/* avatar */}
        <View style={styles.avatarWrapper}>
          {(other?.avatar === null || other.avatar === undefined || !other.avatar.trim()) ?
            (<View style={[styles.usernamePlcaholder, { backgroundColor: `${getAvatarColor(other.username)}` }]}>
              <Text>{other.username.charAt(0)}</Text>
            </View>
            ) : (
              <Image
                source={{ uri: other?.avatar ?? undefined }}
                style={styles.avatar}
                contentFit="cover"
              />)}
          {/* unread indicator dot */}
          {conversation.unread_count > 0 && (
            <View style={[styles.onlineDot, { backgroundColor: theme.primary }]} />
          )}
        </View>

        {/* content */}
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text
              style={[
                styles.username,
                { color: theme.textPrimary },
                conversation.unread_count > 0 && styles.bold,
              ]}
              numberOfLines={1}
            >
              @{other?.username ?? "Unknown"}
            </Text>
            <Text style={[styles.time, { color: theme.textMuted }]}>
              {timeAgo}
            </Text>
          </View>

          <View style={styles.bottomRow}>

            {typing ? (

              <ItemTypingIndicator />

            ) : (
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
                {conversation.last_message_preview ?? "Group created"}
              </Text>)}

            {/* unread badge */}
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
  onlineDot: {
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
    gap: 4,
  },
  usernamePlcaholder: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    height: 40,
 borderRadius: 26,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  username: {
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
  deleteAction: {
    backgroundColor: Colors.error ?? "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    width: 76,
    marginVertical: 2,
    borderRadius: Radius.lg,
    marginRight: Spacing.md,
    gap: 2,
  },
  deleteActionIcon: { fontSize: 18 },
  deleteActionLabel: {
    fontSize: FontSize.xs,
    color: "#fff",
    fontWeight: "700",
  },

})








