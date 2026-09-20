

import { useState, useCallback } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import api from "@/services/api"
import {  Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { AnimatedBanner, BannerState, BannerType } from "@/components/activityIndicator/AnimatedBanner"
import { useToast } from "@/components/activityIndicator/ToastProvider"
import { MaterialCommunityIcons } from "@expo/vector-icons"
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
  const [banner, setBanner] = useState<BannerState | null>(null);
  const { showToast } = useToast()
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: async (): Promise<Session[]> => {
      const { data } = await api.get("/users/me/sessions/")

      return data.data ?? data
    },
  })

  const terminateMutation = useMutation({
    mutationFn: (sessionId: string) =>
      api.delete(`/users/me/sessions/${sessionId}/`),
    onSuccess: () => {
      showBanner("success","Session terminated")
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
    },
    onError: () => showBanner("error", "Failed to terminate session"),
  })

  const terminateAllMutation = useMutation({
    mutationFn: () => api.post("/auth/logout-others/",),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
      showBanner("success", "All other sessions terminated")
    },
  })

  const handleTerminate = (session: Session) => {
    if (session.is_current) return
    showToast(
      {
        title: "Terminate Session?",
        message: `Log out from ${session.device} (${session.location})?`,
        onConfirm: () => { terminateMutation.mutate(session.id) },

      }
    )

  }
  const showBanner = useCallback((type: BannerType, message: string) => {
    setBanner({ id: Date.now(), type, message });
  }, []);
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (diff < 60) return "Active now"
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
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
        />)}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backIcon, { color: theme.textPrimary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Active Sessions
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* terminate all others */}
          {(sessions?.length ?? 0) > 1 && (
            <TouchableOpacity
              style={[styles.terminateAll, { borderColor: theme.error }]}
              onPress={() =>
                showToast(
                  {
                    title: "Log Out All Other Devices?",
                    message: "This will terminate all sessions except this one.",
                    onConfirm: () => { terminateAllMutation.mutate() },

                  }
                )

              }
            >
              <Text style={[styles.terminateAllText, { color: theme.error }]}>
                {<MaterialCommunityIcons name="logout" size={20} color={`${theme.textPrimary}`} />} Log out all other devices
              </Text>
            </TouchableOpacity>
          )}

          {sessions?.map((session) => (
            <View
              key={session.id}
              style={[
                styles.sessionCard,
                {
                  backgroundColor: session.is_current
                    ? theme.primaryLight
                    : theme.surface,
                  borderColor: session.is_current
                    ? theme.primary
                    : theme.border,
                },
              ]}
            >
              <View style={styles.sessionIcon}>
                <Text style={styles.sessionIconText}>
                  {session.browser?.includes("Mobile") ||
                    session.os?.includes("iOS") ||
                    session.os?.includes("Android")
                    ? <MaterialCommunityIcons name="tablet" size={20} color={`${theme.textPrimary}`} />
                    : <MaterialCommunityIcons name="laptop" size={20} color={`${theme.textPrimary}`} />}
                </Text>
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
                <Text style={[styles.sessionTime, { color: theme.textMuted }]}>
                  🕐 {formatTime(session.last_active)}
                </Text>
              </View>

              {!session.is_current && (
                <TouchableOpacity
                  onPress={() => handleTerminate(session)}
                  style={styles.terminateButton}
                >
                  <Text style={[styles.terminateIcon, { color: theme.error }]}>
                    Terminate
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {(!sessions || sessions.length === 0) && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📱</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No active sessions found
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
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








