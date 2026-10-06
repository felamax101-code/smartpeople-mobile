

import  { useState, useCallback, useMemo ,useEffect} from "react"
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { router } from "expo-router"
import { useTheme } from "@/hooks/useTheme"
import { useAuthStore } from "@/stores/auth.store"
import { useNotifications, NotificationFilter } from "@/hooks/useNotifications"
import { NotificationItem } from "@/components/notifications/NotificationItem"
import { messagingService } from "@/services/messaging.service"
import { useMessageStore } from "@/stores/message.store"
import { NotificationDateGroup } from "@/components/notifications/NotificationDateGroup"
import { Notification } from "@/types"
import { Spacing, Radius, FontSize, FontWeight, Colors } from "@/constants/colors"
import { useToast } from "@/components/activityIndicator/ToastProvider"
import { MaterialCommunityIcons } from "@expo/vector-icons"
type ListItem =
  | { type: "date"; label: string; key: string }
  | { type: "notification"; data: Notification; key: string }

const FILTER_TABS: { key: NotificationFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "social", label: "Social" },
  { key: "system", label: "System" },
]

//  date group label helper 
const getDateLabel = (dateString: string): string => {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return "Today"
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday"

  return date.toLocaleDateString("en-KE", {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

export default function NotificationsScreen() {
  const theme = useTheme()
  const { user } = useAuthStore()
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all")
  const {showToast}=useToast()
  const {setUnreadMessageCount}=useMessageStore()
  const {
    notifications,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isError,
    refetch,
    markRead,
    markAllRead,
    deleteOne,
    deleteAll,
    isMarkingAll,
  } = useNotifications(activeFilter)
  //  group by date 
  const listItems = useMemo((): ListItem[] => {
    const items: ListItem[] = []
    let lastDateLabel = ""

    notifications.forEach((notification) => {
      const label = getDateLabel(notification.created_at)

      if (label !== lastDateLabel) {
        items.push({
          type: "date",
          label,
          key: `date-${label}`,
        })
        lastDateLabel = label
      }

      items.push({
        type: "notification",
        data: notification,
        key: notification.id,
      })
    })

    return items
  }, [notifications])

  //  unread count for badge 
  const unreadCount = notifications.filter((n) => !n.is_read).length

  //  confirm delete all 
  const handleDeleteAll = useCallback(() => {

      showToast({
    title: "Clear All Notifications?",
    message:  "Cannot be undone.You won't be able to see theme again",
    onConfirm: () => {  deleteAll() },
  })
    
  }, [deleteAll])
useEffect(()=>{
    if(!user) return
    
    messagingService.getUnreadCount().then(setUnreadMessageCount)
    
    
  },[])
  //  render item 
  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === "date") {
        return <NotificationDateGroup label={item.label} />
      }
      return (
        <NotificationItem
          notification={item.data}
          onMarkRead={markRead}
          onDelete={deleteOne}
        />
      )
    },
    [markRead, deleteOne]
  )

  //  auth guard 
  if (!user) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={["top"]}
      >
        <View style={styles.guestScreen}>
          <Text style={styles.guestIcon}>🔔</Text>
          <Text style={[styles.guestTitle, { color: theme.textPrimary }]}>
            Notifications
          </Text>
          <Text style={[styles.guestSub, { color: theme.textSecondary }]}>
            Log in to see your notifications
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={["top"]}
      >

        {/*  header  */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.backIcon, { color: theme.textPrimary }]}>←</Text>
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            Notifications
            {unreadCount > 0 && (
              <Text style={{ color: theme.primary }}>
                {" "}({unreadCount})
              </Text>
            )}
          </Text>

          {/* right actions */}
          <View style={styles.headerActions}>
            {/* mark all read */}
            {unreadCount > 0 && (
              <TouchableOpacity
                onPress={() => markAllRead()}
                disabled={isMarkingAll}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 ,}}
                style={[{backgroundColor:theme.backgroundMuted,borderRadius:10,paddingHorizontal:4}]}
              >
                {isMarkingAll ? (
                  <ActivityIndicator color={theme.primary} size="small" />
                ) : (
                  <Text style={[styles.markAllText, { color: theme.primary }]}>
                    Read All
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {/* delete all */}
            {notifications.length > 0 && (
              <TouchableOpacity
                onPress={handleDeleteAll}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.deleteAllText, { color: theme.textMuted }]}>
                  <MaterialCommunityIcons name="delete"  color={theme.primary} size={20}/>
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/*  filter tabs  */}
        <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeFilter === tab.key && {
                  borderBottomColor: theme.primary,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setActiveFilter(tab.key)}
            >
              <Text style={[
                styles.tabText,
                {
                  color:
                    activeFilter === tab.key
                      ? theme.primary
                      : theme.textSecondary,
                  fontWeight:
                    activeFilter === tab.key
                      ? FontWeight.bold
                      : FontWeight.regular,
                },
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/*  list  */}
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.primary} size="large" />
          </View>
        ) :
        
         isError ? (
            <View style={styles.loading}>
              <Text style={[styles.errorIcon]}>⚠️</Text>
              <Text style={[styles.errorText, { color: theme.textMuted }]}>
                Failed to load notification
              </Text>
              <TouchableOpacity
                style={[styles.retryBtn, { borderColor: theme.primary }]}
                onPress={() => refetch()}
              >
                <Text style={[styles.retryText, { color: theme.primary }]}>
                  Try again
                </Text>
              </TouchableOpacity>
            </View>):(
          <FlatList
            data={listItems}
            keyExtractor={(item) => item.key}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) fetchNextPage()
            }}
            onEndReachedThreshold={0.3}
            refreshControl={
              <RefreshControl
                refreshing={false}
                onRefresh={refetch}
                tintColor={theme.primary}
              />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🎉</Text>
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                  {activeFilter === "unread"
                    ? "No unread notifications"
                    : "You're all caught up"}
                </Text>
                <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                  {activeFilter === "unread"
                    ? "All notifications have been read"
                    : "New activity will appear here"}
                </Text>
              </View>
            )}
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator color={theme.primary} size="small" />
                </View>
              ) : null
            }
          />
        )}

      </SafeAreaView>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  backIcon: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
    width: 32,
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  markAllText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  deleteAllText: {
    fontSize: 18,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: FontSize.sm,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIcon: { fontSize: 64 },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: "center",
  },
  emptySub: {
    fontSize: FontSize.md,
    textAlign: "center",
    lineHeight: 22,
  },
  footerLoader: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
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
})







































  
  
  
  