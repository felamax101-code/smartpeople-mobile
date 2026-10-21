import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from "react-native"
import * as Clipboard from "expo-clipboard"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import { FormInput } from "@/components/ui/FormInput"
import { OTPInput } from "@/components/ui/OTPInput"
import api from "@/services/api"
import { Spacing, Radius, FontSize, FontWeight, Colors } from "@/constants/colors"
import { useNotificationToast } from "@/components/activityIndicator/ToastNotification"
import { MaterialCommunityIcons } from "@expo/vector-icons"
type Method = "email" | "sms" | "totp"
type Step = "choose_method" | "confirm_code" | "backup_codes"

const METHOD_OPTIONS: {
  value: Method
  icon: string
  label: string
  sub: string
}[] = [
    {
      value: "email",
      icon: "📧",
      label: "Email OTP",
      sub: "Receive a code to your email address",
    },
    {
      value: "sms",
      icon: "📱",
      label: "SMS OTP",
      sub: "Receive a code to your phone number",
    },
    {
      value: "totp",
      icon: "🔐",
      label: "Authenticator App",
      sub: "Use Google Authenticator or Authy",
    },
  ]

export default function TwoFactorSetupScreen() {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>("choose_method")
  const [method, setMethod] = useState<Method>("email")
  const [code, setCode] = useState("")
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [manualKey, setManualKey] = useState<string | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [backupCopied, setBackupCopied] = useState(false)

  // ── step 1: initiate setup ────────────────────────────────
  const initiateMutation = useMutation({
    mutationFn: async (selectedMethod: Method) => {
      const { data } = await api.post("/auth/2fa/setup/", {
        method: selectedMethod,
      })
      return data
    },
    onSuccess: (data) => {
      if (method === "totp") {
        setQrCode(data.qr_code)
        setManualKey(data.manual_key)
      }
      setStep("confirm_code")
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.error ?? "Setup failed. Try again."
      Alert.alert("Error", detail)
    },
  })

  // ── step 2: confirm setup ─────────────────────────────────
  const confirmMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/auth/2fa/setup/confirm/", { code })
      return data
    },
    onSuccess: (data) => {
      setBackupCodes(data.backup_codes ?? [])
      setStep("backup_codes")
    },
    onError: (error: any) => {
      const detail =
        error?.response?.data?.error ?? "Invalid code. Please try again."
      Alert.alert("Error", detail)
      setCode("")
    },
  })
  const { showNotifToast } = useNotificationToast()
  const copyKey = async () => {
    if (!manualKey) return
    await Clipboard.setStringAsync(manualKey);
  };

  const handleCopyAllBackupCodes = async () => {
    try {
      await Clipboard.setStringAsync(backupCodes.join("\n"))
      showNotifToast("Backup codes copied", "success")
    } catch {
      showNotifToast("Error copying. Try again", "error")
    }
  }
  // auto-submit when 6 digits entered
  useEffect(() => {
    if (code.length === 6 && step === "confirm_code") {
      confirmMutation.mutate()
    }
  }, [code])

  const handleContinue = () => {
    initiateMutation.mutate(method)
  }

  const handleFinish = () => {
    Alert.alert(
      "2FA Enabled",
      "Two-factor authentication is now active on your account.Any login from untrusted device will be required to undergo 2FA authentication.",
      [{
        text: "Done", onPress: () => {
          queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
          router.back()
        }
      }]
    )
  }

  // ── step 1: choose method ─────────────────────────────────
  if (step === "choose_method") {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={["top"]}
      >
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backIcon, { color: theme.textPrimary }]}>
              <MaterialCommunityIcons name="arrow-left-thick" color={theme.primary} size={30} />

            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            Enable 2FA
          </Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.stepIcon}>🔐</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Choose a method
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Select how you want to receive your verification codes
          </Text>

          <View style={styles.methodList}>
            {METHOD_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.methodCard,
                  {
                    backgroundColor:
                      method === opt.value
                        ? theme.primaryLight
                        : theme.surface,
                    borderColor:
                      method === opt.value ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setMethod(opt.value)}
                activeOpacity={0.8}
              >
                <Text style={styles.methodIcon}>{opt.icon}</Text>
                <View style={styles.methodInfo}>
                  <Text style={[styles.methodLabel, { color: theme.textPrimary }]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.methodSub, { color: theme.textSecondary }]}>
                    {opt.sub}
                  </Text>
                </View>
                {method === opt.value && (
                  <View style={[styles.checkCircle, { backgroundColor: theme.primary }]}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={handleContinue}
            disabled={initiateMutation.isPending}
            activeOpacity={0.85}
          >
            {initiateMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Continue →</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── step 2: confirm code ──────────────────────────────────
  if (step === "confirm_code") {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={["top"]}
      >
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => setStep("choose_method")}>
            <Text style={[styles.backIcon, { color: theme.textPrimary }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            Verify Setup
          </Text>
          <View style={{ width: 32 }} />
        </View>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* TOTP — show QR code */}
            {method === "totp" && qrCode && (
              <View style={styles.qrSection}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>
                  Scan QR Code
                </Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  Open your authenticator app and scan this code
                </Text>
                <View style={[styles.qrContainer, { backgroundColor: "#fff" }]}>
                  <Image
                    source={{ uri: `data:image/png;base64,${qrCode}` }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                </View>
                {manualKey && (
                  <View style={[
                    styles.manualKeyCard,
                    { backgroundColor: theme.surfaceSecondary }
                  ]}>
                    <Text style={[styles.manualKeyLabel, { color: theme.textPrimarylight }]}>
                      Can't scan? Enter this key manually:
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 8,
                      }}
                    >
                      <Text style={[styles.manualKey, { color: theme.primary }]}>
                        {manualKey}
                      </Text>

                      <TouchableOpacity
                        onPress={copyKey}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: theme.primary,
                        }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '600' }}>
                          Copy
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  Then enter the 6-digit code from your app below
                </Text>
              </View>
            )}

            {/* Email/SMS — instructions */}
            {method !== "totp" && (
              <View style={styles.otpSection}>
                <Text style={styles.stepIcon}>
                  {method === "email" ? "📧" : "📱"}
                </Text>
                <Text style={[styles.title, { color: theme.textPrimary }]}>
                  Enter the code
                </Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  We sent a 6-digit code to your{" "}
                  {method === "email" ? "email address" : "phone number"}.
                  Enter it below to confirm setup.
                </Text>
              </View>
            )}

            {/* OTP input */}
            <View style={styles.otpWrapper}>

              <FormInput
                label=""
                value={code}
                onChangeText={(val) => setCode(val)}
                keyboardType="default"
                placeholder="6-digit code"
                returnKeyType="done"
                autoCapitalize="characters"
              />
            </View>

            {confirmMutation.isPending && (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={theme.primary} size="small" />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                  Verifying...
                </Text>
              </View>
            )}

            {confirmMutation.isError && (
              <Text style={[styles.errorText, { color: theme.error }]}>
                Invalid code. Please try again.
              </Text>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

      </SafeAreaView>
    )
  }

  // ── step 3: backup codes ──────────────────────────────────
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={{ width: 32 }} />
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Backup Codes
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepIcon}>🔑</Text>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          Save your backup codes
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          If you lose access to your {method === "totp"
            ? "authenticator app"
            : method === "email"
              ? "email"
              : "phone"},
          use one of these codes to log in.
          Each code can only be used once.
        </Text>

        {/* warning banner */}
        <View style={[styles.warningBanner, { backgroundColor: "#FEF3C7" }]}>
          <Text style={[styles.warningText, { color: "#92400E" }]}>
            ⚠️ These codes will NOT be shown again.
            Save them somewhere safe before continuing.
          </Text>
        </View>

        {/* codes grid */}
        <View style={[styles.codesGrid, {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        }]}>
          {backupCodes.map((code, index) => (
            <View
              key={index}
              style={[
                styles.codeItem,
                {
                  borderBottomColor: theme.border,
                  borderBottomWidth:
                    index < backupCodes.length - 1 ? 1 : 0,
                  backgroundColor:
                    index % 2 === 0
                      ? theme.surface
                      : theme.surfaceSecondary,
                },
              ]}
            >
              <Text style={[styles.codeNumber, { color: theme.textMuted }]}>
                {index + 1}.
              </Text>
              <Text style={[styles.codeValue, { color: theme.primary }]}>
                {code}
              </Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.backgroundMuted, borderColor: theme.textPlaceholder, borderWidth: 2, borderRadius: Radius.md, paddingHorizontal: 2, paddingVertical: 3 }]}
          onPress={handleCopyAllBackupCodes}
          activeOpacity={0.85}
        >
          <Text style={[styles.primaryButtonText, { color: theme.textPrimary }]}>
            Copy all to clipboard
          </Text>
        </TouchableOpacity>
        {/* done button */}
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          onPress={handleFinish}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>
            I have saved my codes — Done
          </Text>
        </TouchableOpacity>

        <Text style={[styles.privacyNote, { color: theme.primary, fontSize: FontSize.md }]}>
          2FA is now active on your account. You'll need your{" "}
          {method === "totp"
            ? "authenticator app"
            : method === "email"
              ? "email"
              : "phone"}{" "}
          every time you log in.
        </Text>
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
  stepIcon: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: "center",
    lineHeight: 22,
  },
  methodList: {
    width: "100%",
    gap: Spacing.md,
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  methodIcon: { fontSize: 28 },
  methodInfo: { flex: 1, gap: 3 },
  methodLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  methodSub: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  primaryButton: {
    width: "100%",
    height: 54,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  qrSection: {
    width: "100%",
    alignItems: "center",
    gap: Spacing.md,
  },
  qrContainer: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  manualKeyCard: {
    width: "100%",
    padding: Spacing.xs,
    borderRadius: Radius.md,
    gap: Spacing.xs,
    alignItems: "center",
  },
  manualKeyLabel: {
    fontSize: FontSize.xs,
    textAlign: "center",
  },
  manualKey: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,
    letterSpacing: 2,
  },
  otpSection: {
    alignItems: "center",
    gap: Spacing.md,
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
  loadingText: {
    fontSize: FontSize.sm,
  },
  errorText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    textAlign: "center",
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
  codeNumber: {
    fontSize: FontSize.sm,
    width: 24,
  },
  codeValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: 2,
    fontFamily: "monospace",
  },
  privacyNote: {
    fontSize: FontSize.sm,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
})