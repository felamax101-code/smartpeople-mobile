

import { useState, useCallback, memo } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import api from "@/services/api"
import { Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { useToast } from "@/components/activityIndicator/ToastProvider"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import BouncingBarsIndicator from "@/components/activityIndicator/BouncingBarsIndicator"
import { useNotificationToast } from "@/components/activityIndicator/ToastNotification"
interface Session {
  id: string
  device: string
  os: string
  browser: string
  ip_address: string
  location: string
  last_active: string
  created_at: string
  is_current: boolean
}

export default function SessionsScreen() {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { showNotifToast } = useNotificationToast()
  const {
    data, fetchNextPage, refetch, isError, isLoading, hasNextPage, isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["sessions"],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get("/users/me/sessions/", {
        params: { page: pageParam },
      })
      return data
    },
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
  })
  const total = data?.pages[0]?.count ?? 0
  const sessions = data?.pages.flatMap((p) => p.data) ?? []

  const terminateMutation = useMutation({
    mutationFn: (sessionId: string) =>
      api.delete(`/users/me/sessions/${sessionId}/`),
    onSuccess: () => {
      showNotifToast("Session terminated", "success")
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
    },
    onError: () => showNotifToast("Failed to terminate session", "error"),
  })

  const terminateAllMutation = useMutation({
    mutationFn: () => api.post("/auth/logout-others/",),
    onSuccess: () => {
      queryClient.resetQueries({ queryKey: ["sessions"] }), showNotifToast("All other sessions terminated", "success")
    },
  })

  const handleTerminate = useCallback((session: Session) => {
    if (session.is_current) return
    showToast(
      {
        title: "Terminate Session?",
        message: `Log out from ${session.device} (${session.location})?`,
        onConfirm: () => { terminateMutation.mutate(session.id) },

      }
    )

  }, [sessions, showToast])

  const logoutAllButton =
    total > 1 ? (
      <TouchableOpacity
        style={[styles.terminateAll, { borderColor: theme.error }]}
        disabled={terminateAllMutation.isPending}
        onPress={() =>
          showToast({
            title: "Log Out All Other Devices?",
            message: `This will terminate the other ${total - 1} sessions and keep this one.`,
            onConfirm: () => terminateAllMutation.mutate(),
          })
        }
      >
        <View style={styles.terminateAllRow}>
          <MaterialCommunityIcons name="logout" size={20} color={theme.error} />
          <Text style={[styles.terminateAllText, { color: theme.error }]}>
            {terminateAllMutation.isPending
              ? "Logging out..."
              : "Log out all other devices"}
          </Text>
        </View>
      </TouchableOpacity>
    ) : null

  const emptyState = (
    <View style={styles.empty}>
      <MaterialCommunityIcons name="devices" size={48} color={theme.textSecondary} />
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        No active sessions found
      </Text>
    </View>
  )

  const footer = isFetchingNextPage ? (
    <View style={{ paddingVertical: Spacing.md }}>
      <BouncingBarsIndicator color={theme.primary} />
    </View>
  ) : null

  const SessionCard = memo(function SessionCard({
    session, theme, onTerminate,
  }: { session: Session; theme: any; onTerminate: (s: Session) => void }) {
    const isMobile =
      session.browser?.includes("Mobile") ||
      session.os?.includes("iOS") ||
      session.os?.includes("Android")

    return (
      <View style={[styles.sessionCard, {
        backgroundColor: session.is_current ? theme.primaryLight : theme.surface,
        borderColor: session.is_current ? theme.primary : theme.border,
      }]}>
        <View style={styles.sessionIcon}>
          <MaterialCommunityIcons
            name={isMobile ? "tablet" : "laptop"}
            size={20}
            color={theme.textPrimary}
          />
        </View>
        <View style={styles.sessionInfo}>
          <View style={styles.sessionTitleRow}>
            <Text style={[styles.sessionDevice, { color: theme.textPrimary }]}>
              {session.browser} on {session.os}
            </Text>
            {session.is_current && (
              <View style={[styles.currentBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.currentBadgeText}>This device</Text>
              </View>
            )}
          </View>
          <Text style={[styles.sessionDetail, { color: theme.textSecondary }]}>
            Location: {session.location} · {session.ip_address}
          </Text>
          <Text style={[styles.sessionTime, { color: theme.textSecondary }]}>
            🕐 {formatTime(session.last_active)}
          </Text>
        </View>
        {!session.is_current && (
          <TouchableOpacity onPress={() => onTerminate(session)} style={styles.terminateButton}>
            <Text style={[styles.terminateIcon, { color: theme.error }]}>Terminate</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  })


  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backIcon, { color: theme.textPrimary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Active Sessions
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {isError ? (
        <View style={styles.loading}>
          <Text style={{ color: theme.textSecondary }}>Couldn't load sessions</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={{ color: theme.primary }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading ? (
        <View style={styles.loading}>
          <BouncingBarsIndicator color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => (
            <SessionCard session={item} theme={theme} onTerminate={handleTerminate} />
          )}
          ListHeaderComponent={logoutAllButton}
          ListEmptyComponent={emptyState}
          ListFooterComponent={footer}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
        />
      )}
    </SafeAreaView>
  )
}

const formatTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return "Active now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backIcon: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
    width: 32,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  terminateAll: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: "center",
  },
  terminateAllText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  terminateAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sessionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(108,99,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sessionIconText: { fontSize: 22 },
  sessionInfo: { flex: 1, gap: 3 },
  sessionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  sessionDevice: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  currentBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  sessionDetail: { fontSize: FontSize.xs },
  sessionTime: { fontSize: FontSize.xs },
  terminateButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  terminateIcon: {
    fontSize: 10,
    fontWeight: FontWeight.regular,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 60,
    gap: Spacing.md,
  },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: FontSize.md },
})








