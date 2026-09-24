import React, { useState, useEffect,useRef } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useMutation ,useQuery} from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import { OTPInput } from "@/components/ui/OTPInput"
import api from "@/services/api"
import { Spacing, Radius, FontSize, FontWeight, Colors } from "@/constants/colors"
import { useAuthStore } from "@/stores/auth.store"
type Step = "verify" | "codes"

export default function BackupCodesScreen() {
  const [codeSent, setCodeSent] = useState(false)
const [cooldown, setCooldown] = useState(0)
const cooldownRef = useRef<ReturnType<typeof setInterval>>(null)
  const theme = useTheme()
  const {user}=useAuthStore()
  const [step, setStep] = useState<Step>("verify")
  const [code, setCode] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  // ── auto submit when 6 digits ─────────────────────────────


useEffect(() => {
  if (code.length === 6 && step === "verify" && codeSent) {
    generateMutation.mutate()
  }
}, [code, codeSent])


// fetch current 2FA status to know which method
const { data: status } = useQuery({
  queryKey: ["2fa-status",user?.username??""],
  queryFn: async () => {
    const { data } = await api.get("/users/me/2fa-status/")
    return data
  },
})

// start cooldown timer
const startCooldown = () => {
  setCooldown(60)
  cooldownRef.current = setInterval(() => {
    setCooldown((c) => {
      if (c <= 1) { clearInterval(cooldownRef.current); return 0 }
      return c - 1
    })
  }, 1000)
}

useEffect(() => () => clearInterval(cooldownRef.current), [])





  // ── regenerate codes mutation ─────────────────────────────
  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/2fa/backup-codes/", { code })
      return data
    },
    onSuccess: (data) => {
      setBackupCodes(data.backup_codes ?? [])
      setStep("codes")
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.error ?? "Invalid code"
      Alert.alert("Error", detail)
      setCode("")
    },
  })
  // sends OTP via current method before showing input
const sendOTPMutation = useMutation({
  mutationFn: async () => {
    await api.post("/auth/2fa/setup/", { method: status?.method })
  },
  onSuccess: () => {
    setCodeSent(true)
    startCooldown()
  },
  onError: () => Alert.alert("Error", "Failed to send code. Try again."),
})



  const handleShare = async () => {
    const text = backupCodes
      .map((c, i) => `${i + 1}. ${c}`)
      .join("\n")

    await Share.share({
      message: `My 2FA Backup Codes — Marketplace App\n\n${text}\n\nKeep these safe and secret.`,
    })
  }

  // ── step 1: verify current 2FA code ──────────────────────
 

if (step === "verify") {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backIcon, { color: theme.textPrimary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Backup Codes</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.stepIcon}>🔑</Text>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Verify your identity</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {status?.method === "totp"
            ? "Enter your authenticator app code to generate new backup codes"
            : `We'll send a code to your ${status?.method === "email" ? "email" : "phone"} to verify it's you`}
        </Text>

        <View style={[styles.warningBanner, { backgroundColor: theme.errorLight }]}>
          <Text style={[styles.warningText, { color: theme.error }]}>
            ⚠️ New codes will permanently invalidate your existing backup codes.
          </Text>
        </View>

        {/* totp — show input immediately */}
        {status?.method === "totp" && (
          <View style={styles.otpWrapper}>
            <OTPInput value={code} onChange={setCode} hasError={generateMutation.isError} />
          </View>
        )}

        {/* email/sms — send code first */}
        {status?.method !== "totp" && !codeSent && (
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: theme.primary }]}
            onPress={() => sendOTPMutation.mutate()}
            disabled={sendOTPMutation.isPending}
          >
            {sendOTPMutation.isPending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.sendButtonText}>
                  Send Code via {status?.method === "email" ? "Email" : "SMS"}
                </Text>}
          </TouchableOpacity>
        )}

        {/* show input after code sent */}
        {codeSent && status?.method !== "totp" && (
          <>
            <View style={[styles.sentBanner, { backgroundColor: theme.successLight }]}>
              <Text style={[styles.sentText, { color: Colors.success }]}>
                ✓ Code sent to your {status?.method === "email" ? "email" : "phone"}
              </Text>
            </View>
            <View style={styles.otpWrapper}>
              <OTPInput value={code} onChange={setCode} hasError={generateMutation.isError} />
            </View>
            <TouchableOpacity
              disabled={cooldown > 0}
              onPress={() => { setCode(""); sendOTPMutation.mutate() }}
            >
              <Text style={[styles.resendText, { color: cooldown > 0 ? theme.textMuted : theme.primary }]}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {generateMutation.isPending && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.primary} size="small" />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Verifying...</Text>
          </View>
        )}

        {generateMutation.isError && (
          <Text style={[styles.errorText, { color: theme.error }]}>
            Invalid code. Please try again.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}













  // ── step 2: show new backup codes ─────────────────────────
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={{ width: 32 }} />
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          New Backup Codes
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.stepIcon}>🔑</Text>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          Your new backup codes
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Save these codes somewhere safe. Each can only be used once.
          Your old codes are now invalid.
        </Text>

        {/* warning */}
        <View style={[styles.warningBanner, { backgroundColor: "#FEF3C7" }]}>
          <Text style={[styles.warningText, { color: "#92400E" }]}>
            ⚠️ These codes will NOT be shown again after you leave this screen.
          </Text>
        </View>

        {/* codes grid */}
        <View style={[
          styles.codesGrid,
          { backgroundColor: theme.surface, borderColor: theme.border }
        ]}>
          {backupCodes.map((code, index) => (
            <View
              key={index}
              style={[
                styles.codeItem,
                {
                  borderBottomColor: theme.border,
                  borderBottomWidth: index < backupCodes.length - 1 ? 1 : 0,
                  backgroundColor:
                    index % 2 === 0 ? theme.surface : theme.surfaceSecondary,
                },
              ]}
            >
              <Text style={[styles.codeIndex, { color: theme.textMuted }]}>
                {index + 1}.
              </Text>
              <Text style={[styles.codeValue, { color: theme.primary }]}>
                {code}
              </Text>
            </View>
          ))}
        </View>

        {/* share button */}
        <TouchableOpacity
          style={[styles.shareButton, { borderColor: theme.primary }]}
          onPress={handleShare}
        >
          <Text style={[styles.shareButtonText, { color: theme.primary }]}>
             Save / Share Codes
          </Text>
        </TouchableOpacity>

        {/* done */}
        <TouchableOpacity
          style={[styles.doneButton, { backgroundColor: theme.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.doneButtonText}>
            I've saved my codes — Done
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    padding: Spacing.xl,
    gap: Spacing.lg,
    alignItems: "center",
    paddingBottom: Spacing.xxl,
  },
  stepIcon: { fontSize: 64 },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    textAlign: "center",
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: "center",
    lineHeight: 22,
  },
  warningBanner: {
    width: "100%",
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  warningText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    textAlign: "center",
    lineHeight: 20,
  },
  otpWrapper: {
    width: "100%",
    paddingVertical: Spacing.sm,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  loadingText: { fontSize: FontSize.sm },
  errorText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    textAlign: "center",
  },
  codesGrid: {
    width: "100%",
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  codeItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  codeIndex: {
    fontSize: FontSize.sm,
    width: 24,
  },
  codeValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: 2,
  },
  shareButton: {
    width: "100%",
    height: 50,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  shareButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  doneButton: {
    width: "100%",
    height: 54,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  doneButtonText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },

  

sendButton: {
  width: "100%",
  height: 54,
  borderRadius: Radius.md,
  alignItems: "center",
  justifyContent: "center",
},
sendButtonText: {
  color: "#fff",
  fontSize: FontSize.md,
  fontWeight: FontWeight.bold,
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








