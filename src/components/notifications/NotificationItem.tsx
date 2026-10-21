
  
  import React, { useCallback } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native"
import { router } from "expo-router"
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable"
import { useTheme } from "@/hooks/useTheme"
import { Notification } from "@/types"
import { getNotificationConfig } from "@/constants/notifications"
import { Colors, Spacing, FontSize, FontWeight } from "@/constants/colors"

interface Props {
  notification: Notification
  onMarkRead: (id: string, isRead: boolean) => void
  onDelete: (id: string) => void
}

export const NotificationItem = ({
  notification,
  onMarkRead,
  onDelete,
}: Props) => {
  const theme = useTheme()
  const config = getNotificationConfig(notification.notification_type)
  const target = config.getTarget(notification.data)

  //  time ago 
  const timeAgo = formatTimeAgo(notification.created_at)

  //  tap → navigate + mark read 
  const handlePress = useCallback(() => {
    onMarkRead(notification.id, notification.is_read)
    if (target !=undefined) router.push(target as any)
  }, [notification.id, notification.is_read, target, onMarkRead])

  //  swipe left → delete ─
  const renderRightActions = () => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => onDelete(notification.id)}
    >
      <Text style={styles.deleteIcon}>🗑️</Text>
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  )

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
      <TouchableOpacity
        style={[
          styles.container,
          {
            backgroundColor: notification.is_read
              ? theme.surface
              : theme.primaryLight,
            borderBottomColor: theme.border,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.75}
        onLongPress={() => {
          Alert.alert(
            "Notification",
            "What would you like to do?",
            [
              {
                text: notification.is_read
                  ? "Already read"
                  : "Mark as read",
                onPress: () =>
                  onMarkRead(notification.id, notification.is_read),
                style: "default",
              },
              {
                text: "Delete",
                onPress: () => onDelete(notification.id),
                style: "destructive",
              },
              { text: "Cancel", style: "cancel" },
            ]
          )
        }}
      >
        {/*  icon circle  */}
        <View style={[
          styles.iconCircle,
          { backgroundColor: config.color + "20" }
        ]}>
          <Text style={styles.icon}>{config.icon}</Text>
        </View>

        {/*  content  */}
        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              {
                color: theme.textPrimary,
                fontWeight: notification.is_read
                  ? FontWeight.regular
                  : FontWeight.bold,
              },
            ]}
            numberOfLines={2}
          >
            {notification.title}
          </Text>

          {notification.body && (
            <Text
              style={[styles.body, { color: theme.textSecondary }]}
              numberOfLines={5}
            >
              {notification.body.slice(0,50)}{notification.body.length>50?"...":null}
            </Text>
          )}

          <Text style={[styles.time, { color: theme.textMuted }]}>
            {timeAgo}
          </Text>
        </View>

        {/*  unread dot ─ */}
        {!notification.is_read && (
          <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
        )}
      </TouchableOpacity>
    </Swipeable>
  )
}

const formatTimeAgo = (dateString: string): string => {
  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000
  )
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(dateString).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
  })
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  icon: { fontSize: 20 },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  body: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  time: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    flexShrink: 0,
  },
  deleteAction: {
    backgroundColor: Colors.error,
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    gap: 4,
  },
  deleteIcon: { fontSize: 20 },
  deleteText: {
    color: "#fff",
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
})








