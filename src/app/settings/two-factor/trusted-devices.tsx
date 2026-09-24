

import React from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import api from "@/services/api"
import { Spacing, Radius, FontSize, FontWeight, Colors } from "@/constants/colors"
import { useAuthStore } from "@/stores/auth.store"
import { useNotificationToast } from "@/components/activityIndicator/ToastNotification"
interface TrustedDevice {
  id: string
  device_label: string
  ip_address: string
  location: string
  expires_at: string
  created_at: string
}

export default function TrustedDevicesScreen() {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const{showNotifToast}=useNotificationToast()
const {user}=useAuthStore()
  const { data: devices, isLoading } = useQuery({
    queryKey: ["trusted-devices"],
    queryFn: async (): Promise<TrustedDevice[]> => {
      const { data } = await api.get("/2fa/trusted-devices/")
      return data.data ?? data
    },
  })

  const removeMutation = useMutation({
    mutationFn: (deviceId: string) =>
      api.delete(`/2fa/trusted-devices/${deviceId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trusted-devices"] })
    },
    onError: () => showNotifToast("Failed to remove devices","error")
  })

  const handleRemove = (device: TrustedDevice) => {
    Alert.alert(
      "Remove Trusted Device",
      `Remove "${device.device_label}"?\n\nThis device will need to complete 2FA on next login.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeMutation.mutate(device.id),
        },
      ]
    )
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })

  const getDaysLeft = (expiresAt: string): number => {
    const diff = new Date(expiresAt).getTime() - Date.now()
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
  }

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
          Trusted Devices
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* explanation */}
          <View style={[styles.infoCard, {
            backgroundColor: theme.primaryLight,
            borderColor: theme.primary,
          }]}>
            <Text style={[styles.infoText, { color: theme.primary }]}>
              🛡️ Trusted devices skip 2FA for 30 days.
              Remove any device you don't recognize.
            </Text>
          </View>

          {/* devices list */}
          {!devices || devices.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📱</Text>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                No trusted devices
              </Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                Devices you mark as trusted during login will appear here
              </Text>
            </View>
          ) : (
            <View style={styles.deviceList}>
              {devices.map((device) => {
                const daysLeft = getDaysLeft(device.expires_at)

                return (
                  <View
                    key={device.id}
                    style={[styles.deviceCard, {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    }]}
                  >
                    {/* icon + info */}
                    <View style={styles.deviceLeft}>
                      <View style={[
                        styles.deviceIcon,
                        { backgroundColor: theme.primaryLight }
                      ]}>
                        <Text style={styles.deviceIconText}>
                          {device.device_label?.toLowerCase().includes("iphone") ||
                           device.device_label?.toLowerCase().includes("android")
                            ? "📱"
                            : "💻"}
                        </Text>
                      </View>

                      <View style={styles.deviceInfo}>
                        <Text style={[
                          styles.deviceLabel,
                          { color: theme.textPrimary }
                        ]}>
                          {device.device_label ?? "Unknown Device"}
                        </Text>

                        {device.location && (
                          <Text style={[
                            styles.deviceDetail,
                            { color: theme.textSecondary }
                          ]}>
                            📍 {device.location}
                          </Text>
                        )}

                        <Text style={[
                          styles.deviceDetail,
                          { color: theme.textMuted }
                        ]}>
                          Added {formatDate(device.created_at)}
                        </Text>

                        {/* expiry */}
                        <View style={[
                          styles.expiryBadge,
                          {
                            backgroundColor:
                              daysLeft <= 3
                                ? theme.errorLight
                                : theme.successLight,
                          }
                        ]}>
                          <Text style={[
                            styles.expiryText,
                            {
                              color:
                                daysLeft <= 3
                                  ? theme.error
                                  : Colors.success,
                            }
                          ]}>
                            {daysLeft === 0
                              ? "Expires today"
                              : `Expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* remove button */}
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemove(device)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={[styles.removeText, { color: theme.error }]}>
                        ✕
                      </Text>
                    </TouchableOpacity>
                  </View>
                )
              })}
            </View>
          )}

          {/* remove all */}
          {devices && devices.length > 1 && (
            <TouchableOpacity
              style={[styles.removeAllButton, { borderColor: theme.error }]}
              onPress={() =>
                Alert.alert(
                  "Remove All Trusted Devices",
                  "All devices will need to complete 2FA on next login.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Remove All",
                      style: "destructive",
                      onPress: async () => {
                        for (const device of devices) {
                          await removeMutation.mutateAsync(device.id)
                        }
                      },
                    },
                  ]
                )
              }
            >
              <Text style={[styles.removeAllText, { color: theme.error }]}>
                🗑️ Remove All Trusted Devices
              </Text>
            </TouchableOpacity>
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
  infoCard: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  infoText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    lineHeight: 20,
    textAlign: "center",
  },
  deviceList: {
    gap: Spacing.md,
  },
  deviceCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  deviceLeft: {
    flex: 1,
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "flex-start",
  },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  deviceIconText: { fontSize: 22 },
  deviceInfo: {
    flex: 1,
    gap: 4,
  },
  deviceLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  deviceDetail: {
    fontSize: FontSize.xs,
  },
  expiryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginTop: 4,
  },
  expiryText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  removeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: {
    fontSize: 18,
    fontWeight: FontWeight.bold,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: Spacing.md,
  },
  emptyIcon: { fontSize: 56 },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: "center",
  },
  emptySub: {
    fontSize: FontSize.md,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },
  removeAllButton: {
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  removeAllText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
})















