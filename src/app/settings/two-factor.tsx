
//disable two factor auth
import React, { useState ,useRef,useEffect} from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import { OTPInput } from "@/components/ui/OTPInput"
import api from "@/services/api"
import { SettingsSectionHeader, SettingsSectionCard, SettingsRow } from "@/components/settings/SettingsRow"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"

interface TwoFAStatus {
  is_enabled: boolean
  method: "email" | "sms" | "totp"
}

export default function TwoFactorScreen() {

  const [disableCodeSent, setDisableCodeSent] = useState(false)
const [disableCooldown, setDisableCooldown] = useState(0)
const cooldownRef = useRef<ReturnType<typeof setInterval>>(null)

const startCooldown = () => {
  setDisableCooldown(60)
  cooldownRef.current = setInterval(() => {
    setDisableCooldown((c) => {
      if (c <= 1) {
        clearInterval(cooldownRef.current)
        return 0
      }
      return c - 1
    })
  }, 1000)
}

useEffect(() => () => clearInterval(cooldownRef.current), [])




  const theme = useTheme()
  const [showDisableModal, setShowDisableModal] = useState(false)
  const [disableCode, setDisableCode] = useState("")

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["2fa-status"],
    queryFn: async (): Promise<TwoFAStatus> => {
      const { data } = await api.get("/users/me/2fa-status/")
      return {
        is_enabled: data.is_enabled ?? false,
        method: data.method ?? "email",
      }
    },
  })
  

const sendDisableOTPMutation = useMutation({
  mutationFn: async () => {
    // reuse the setup endpoint — sends OTP for current method
    await api.post("/auth/2fa/setup/", { method: status?.method })
  },
  onSuccess: () => {
    setDisableCodeSent(true)
    startCooldown()
  },
  onError: () => Alert.alert("Error", "Failed to send code. Try again."),
})

  const disableMutation = useMutation({
    mutationFn: async (code: string) => {
      await api.post("/2fa/disable/", { code })
    },
    onSuccess: () => {
      setShowDisableModal(false)
      setDisableCode("")
      refetch()
      Alert.alert("2FA Disabled", "Two-factor authentication has been disabled.")
    },
    onError: () => {
      Alert.alert("Error", "Invalid code. Please try again.")
      setDisableCode("")
    },
  })

  // auto-submit when 6 digits entered for disable
  React.useEffect(() => {
    if (disableCode.length === 6 && showDisableModal) {
      disableMutation.mutate(disableCode)
    }
  }, [disableCode])

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    )
  }

  const METHOD_LABELS = {
    email: "Email OTP",
    sms: "SMS OTP",
    totp: "Authenticator App",
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
          Two-Factor Authentication
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* status card */}
        <View style={[styles.statusCard, {
          backgroundColor: status?.is_enabled
            ? theme.successLight
            : theme.surfaceSecondary,
          borderColor: status?.is_enabled
            ? Colors.success
            : theme.border,
        }]}>
          <Text style={styles.statusIcon}>
            {status?.is_enabled ? "🔐" : "🔓"}
          </Text>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusTitle, {
              color: status?.is_enabled ? Colors.success : theme.textSecondary
            }]}>
              {status?.is_enabled ? "2FA is Enabled" : "2FA is Disabled"}
            </Text>
            {status?.is_enabled && (
              <Text style={[styles.statusSublabel, { color: theme.textSecondary }]}>
                Method: {METHOD_LABELS[status.method]}
              </Text>
            )}
          </View>
        </View>

        {status?.is_enabled ? (
          <>
            <SettingsSectionHeader title="Current Settings" />
            <SettingsSectionCard>
              <SettingsRow
                icon="📧"
                label="Change Method"
                sublabel={`Currently: ${METHOD_LABELS[status.method]}`}
                onPress={() => router.push("/settings/two-factor/setup")}
              />
              <SettingsRow
                icon="🔑"
                label="Regenerate Backup Codes"
                sublabel="Get new one-time backup codes"
                onPress={() => router.push("/settings/two-factor/backup-codes")}
              />
              <SettingsRow
                icon="📱"
                label="Trusted Devices"
                sublabel="Manage devices that skip 2FA"
                onPress={() => router.push("/settings/two-factor/trusted-devices")}
              />
            </SettingsSectionCard>

            <SettingsSectionHeader title="Danger" />
            <SettingsSectionCard>
              <SettingsRow
                icon="🔓"
                label="Disable 2FA"
                sublabel="Requires your current 2FA code"
                isDestructive
               onPress={() => {
  setShowDisableModal(true)
  // for email/sms — send OTP immediately when modal opens
  if (status?.method === "email" || status?.method === "sms") {
    sendDisableOTPMutation.mutate()
  } else {
    // totp — no send needed, user reads from app
    setDisableCodeSent(true)
  }
}}
              />
            </SettingsSectionCard>
          </>
        ) : (
          <View style={styles.enableSection}>
            <Text style={[styles.enableTitle, { color: theme.textPrimary }]}>
              Protect your account
            </Text>
            <Text style={[styles.enableSub, { color: theme.textSecondary }]}>
              Two-factor authentication adds an extra layer of security.
              Even if someone gets your password, they can't log in without your second factor.
            </Text>
            <TouchableOpacity
              style={[styles.enableButton, { backgroundColor: theme.primary }]}
              onPress={() => router.push("/settings/two-factor/setup")}
            >
              <Text style={styles.enableButtonText}>Enable 2FA →</Text>
            </TouchableOpacity>
          </View>
        )}

        


{showDisableModal && (
  <View style={[styles.disableModal, {
    backgroundColor: theme.surface,
    borderColor: theme.border,
  }]}>

    {/* sending state */}
    {sendDisableOTPMutation.isPending && (
      <View style={styles.sendingRow}>
        <ActivityIndicator color={theme.primary} size="small" />
        <Text style={[styles.sendingText, { color: theme.textSecondary }]}>
          Sending code...
        </Text>
      </View>
    )}

    {/* code sent banner — email/sms only */}
    {disableCodeSent && status?.method !== "totp" && (
      <View style={[styles.sentBanner, { backgroundColor: theme.successLight }]}>
        <Text style={[styles.sentText, { color: Colors.success }]}>
          ✓ Code sent to your{" "}
          {status?.method === "email" ? "email" : "phone"}
        </Text>
      </View>
    )}

    <Text style={[styles.disableTitle, { color: theme.textPrimary }]}>
      {status?.method === "totp"
        ? "Enter your authenticator code"
        : `Enter the code sent to your ${status?.method === "email" ? "email" : "phone"} to disable `}
    </Text>

    {/* only show input when code is sent or totp */}
    {disableCodeSent && (
      <OTPInput
        value={disableCode}
        onChange={setDisableCode}
        hasError={disableMutation.isError}
      />
    )}

    {disableMutation.isPending && (
      <ActivityIndicator color={theme.primary} />
    )}

    {/* resend — email/sms only */}
    {disableCodeSent && status?.method !== "totp" && (
      <TouchableOpacity
        disabled={disableCooldown > 0 || sendDisableOTPMutation.isPending}
        onPress={() => {
          setDisableCode("")
          sendDisableOTPMutation.mutate()
        }}
      >
        <Text style={[
          styles.resendText,
          {
            color: disableCooldown > 0
              ? theme.textMuted
              : theme.primary
          }
        ]}>
          {disableCooldown > 0
            ? `Resend in ${disableCooldown}s`
            : "Resend code"}
        </Text>
      </TouchableOpacity>
    )}

    <TouchableOpacity
      onPress={() => {
        setShowDisableModal(false)
        setDisableCode("")
        setDisableCodeSent(false)
        clearInterval(cooldownRef.current)
      }}
    >
      <Text style={[styles.cancelText, { color: theme.textMuted }]}>
        Cancel
      </Text>
    </TouchableOpacity>
  </View>
)}




        <View style={{ height: 40 }} />
      </ScrollView>
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
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  statusIcon: { fontSize: 36 },
  statusInfo: { gap: 4 },
  statusTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  statusSublabel: { fontSize: FontSize.sm },
  enableSection: {
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: "center",
  },
  enableTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: "center",
  },
  enableSub: {
    fontSize: FontSize.md,
    textAlign: "center",
    lineHeight: 22,
  },
  enableButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
  },
  enableButtonText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  disableModal: {
    margin: Spacing.md,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: "center",
    gap: Spacing.lg,
  },
  disableTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    textAlign: "center",
  },
  cancelText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  sendingRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: Spacing.sm,
},
sendingText: {
  fontSize: FontSize.sm,
},
sentBanner: {
  width: "100%",
  padding: Spacing.sm,
  borderRadius: Radius.md,
  alignItems: "center",
},
sentText: {
  fontSize: FontSize.sm,
  fontWeight: FontWeight.semibold,
},
resendText: {
  fontSize: FontSize.sm,
  fontWeight: FontWeight.semibold,
},

})








