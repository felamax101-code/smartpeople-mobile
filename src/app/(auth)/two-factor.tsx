import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { AxiosError } from "axios"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { useMutation } from "@tanstack/react-query"
import { Checkbox } from "@/components/ui/Checkbox"
import { FormInput } from "@/components/ui/FormInput"
import { useTheme } from "@/hooks/useTheme"
import * as SecureStore from "expo-secure-store"
import { useAuthStore } from "@/stores/auth.store"
import { useShakeAnimation } from "@/hooks/useShakeAnimations"
import { authService } from "@/services/auth.service"
import { Spacing, Radius, FontSize, FontWeight, Colors } from "@/constants/colors"
import { MaterialCommunityIcons } from "@expo/vector-icons"
type TwoFAMethod = "email" | "sms" | "totp"
interface ErrorResponse {
  error?: string
}
const RESEND_COOLDOWN = 60

const METHOD_CONFIG = {
  email: {
    icon: "📧",
    bannerColor: "#EFF6FF",
    title: "Check your email",
    subtitle: (email: string) => `We sent a 6-digit code to\n${email}`,
    canResend: true,
  },
  sms: {
    icon: "📱",
    bannerColor: "#F0FDF4",
    title: "Check your phone",
    subtitle: () => `We sent a 6-digit code to your\nregistered phone number`,
    canResend: true,
  },
  totp: {
    icon: "🔐",
    bannerColor: "#EEF0FF",
    title: "Authenticator App",
    subtitle: () => "Open your authenticator app\nCodes refresh every 30 seconds",
    canResend: false,
  },
}

export default function TwoFactorLoginScreen() {
  const theme = useTheme()
  const { temp_token, method, email } =
    useLocalSearchParams<{
      temp_token: string
      method: TwoFAMethod
      email: string
    }>()

  const { setUser, pendingAction, clearPendingAction } = useAuthStore()
  const { shakeAnim, shake } = useShakeAnimation()

  // ── state ─────────────────────────────────────────────────
  const [code, setCode] = useState("")
  const [trustDevice, setTrustDevice] = useState(false)
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [backupCode, setBackupCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [attemptsLeft, setAttemptsLeft] = useState(5)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN)
  const [canResend, setCanResend] = useState(false)
  const cooldownRef = useRef<ReturnType<typeof setInterval>>(null)
  const [resolvedEmail, setResolvedEmail] = useState<string | null>("")

  const [resolvedTempToken, setResolvedTempToken] = useState<string>("")
  const [resolvedMethod, setResolvedMethod] = useState<TwoFAMethod>("email")
  const config = METHOD_CONFIG[resolvedMethod ?? "email"]
  useEffect(() => {

    const loadDetails = async () => {
      if (temp_token) { setResolvedTempToken(temp_token) } else {
        const stored_temp_token = await SecureStore.getItemAsync("log_temp_token")
        setResolvedTempToken(stored_temp_token ?? temp_token)
      }
      if (method) { setResolvedMethod(method) } else {
        const stored_method = await SecureStore.getItemAsync("log_method")
        setResolvedMethod(stored_method as TwoFAMethod ?? method)
      }
      if (email) { setResolvedEmail(email) } else {
        const stored_log_email = await SecureStore.getItemAsync("log_email")
        setResolvedEmail(stored_log_email)
      }
    }
    loadDetails()
  }, [])
  //  cooldown timer 
  useEffect(() => {
    if (!config.canResend) return
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(cooldownRef.current)
          setCanResend(true)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(cooldownRef.current)
  }, [config.canResend])

  // ── auto submit OTP ───────────────────────────────────────
  useEffect(() => {
    if (!useBackupCode && code.length === 6) {
      verifyMutation.mutate()
    }
  }, [code, useBackupCode])

  // ── format backup code XXXX-XXXX ─────────────────────────
  const formatBackupCode = (text: string) => {
    const clean = text.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8)
    return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean
  }

  // ── verify mutation ───────────────────────────────────────
  const verifyMutation = useMutation({
    mutationFn: () =>
      authService.verify2FA({
        resolvedTempToken,
        code: useBackupCode ? backupCode.replace("-", "") : code,
        trust_device: trustDevice,
      }),
    onSuccess: async (data) => {
      const user = await authService.getMe()
      setUser(user)
      if (pendingAction) clearPendingAction()

      if (data.warning) {
        // backup code used warning — navigate anyway
      }
      await SecureStore.deleteItemAsync("log_temp_token")
      await SecureStore.deleteItemAsync("log_method")
      await SecureStore.deleteItemAsync("log_email")
      router.replace("/(tabs)")
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.error ?? "Invalid code"

      const attemptsMatch = detail?.match(/(\d+) attempts remaining/)
      if (attemptsMatch) setAttemptsLeft(parseInt(attemptsMatch[1]))

      if (detail?.includes("Please log in again")) {
        setError("Too many attempts. Please log in again.")
        setTimeout(() => router.replace("/(auth)/login"), 0)
        return
      }

      setError(detail)
      shake()
      setCode("")
    },
  })

  // ── resend mutation ───────────────────────────────────────
  const resendMutation = useMutation({
    mutationFn: () => authService.resend2FA(resolvedTempToken),
    onSuccess: () => {
      setCanResend(false)
      setCooldown(RESEND_COOLDOWN)
      setCode("")
      setError(null)
    },
    onError: (error: AxiosError<ErrorResponse>) => {
      const detail = error?.response?.data?.error
      const status = error?.response?.status
      if (status == 429) {
        setError("Attempts exceeded.Try again later")
      }
      else {
        setError(detail ?? "Failed to resend.Try again")
      }

    }
  })


  const formatCooldown = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60)
      .toString()
      .padStart(2, "0")}`

  const isLoading = verifyMutation.isPending

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={[styles.backIcon, { color: theme.textPrimary }]}>
              <MaterialCommunityIcons name="arrow-left-thick" color={theme.primary} size={30} />

            </Text>
          </TouchableOpacity>

          <View style={styles.mainContent}>

            {/* icon */}
            <Text style={styles.icon}>
              {useBackupCode ? "🔑" : config.icon}
            </Text>

            {/* title */}
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              {useBackupCode
                ? "Enter Backup Code"
                : "Two-Step Verification"}
            </Text>
            <Text style={[styles.title, { color: theme.textPrimary, fontSize: 10 }]}>
              This device is not in your trust list.Tick Trust device to add it
            </Text>

            {/* method banner */}
            {!useBackupCode && (
              <View style={[
                styles.methodBanner,
                { backgroundColor: config.bannerColor }
              ]}>
                <Text style={[styles.methodTitle, { color: theme.textPrimary }]}>
                  {config.title}
                </Text>
                <Text style={[styles.methodSubtitle, { color: theme.textSecondary }]}>
                  {config.subtitle(resolvedEmail ?? "your email")}
                </Text>
              </View>
            )}

            {/* backup code description */}
            {useBackupCode && (
              <Text style={[styles.backupDesc, { color: theme.textSecondary }]}>
                Use one of the 8 backup codes you saved during setup.
                Each code can only be used once.
              </Text>
            )}
            {error && (
              <View style={[styles.errorBanner, { backgroundColor: theme.errorLight }]}>
                <Text style={[styles.errorText, { color: theme.error }]}>
                  {error}
                </Text>
                {attemptsLeft < 5 && attemptsLeft > 0 && (
                  <Text style={[styles.attemptsText, { color: theme.error }]}>
                    {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining
                  </Text>
                )}
              </View>
            )}
            {/* input */}
            <Animated.View
              style={[
                styles.inputSection,
                { transform: [{ translateX: shakeAnim }] }
              ]}
            >
              {useBackupCode ? (
                <FormInput
                  label="Backup Code"
                  value={backupCode}
                  onChangeText={(t) => {
                    setBackupCode(formatBackupCode(t))
                    if (error) setError(null)
                  }}
                  placeholder="XXXX-XXXX"
                  autoCapitalize="characters"
                  returnKeyType="done"
                  onSubmitEditing={() => verifyMutation.mutate()}
                />
              ) : method === "totp" ? (
                <FormInput
                  label="Authenticator Code"
                  value={code}
                  onChangeText={(t) => {
                    const digits = t.replace(/[^0-9]/g, "").slice(0, 6)
                    setCode(digits)
                    if (error) setError(null)
                  }}
                  keyboardType="number-pad"
                  placeholder="6-digit code"
                  returnKeyType="done"
                  onSubmitEditing={() => verifyMutation.mutate()}
                />
              ) : (

                <FormInput
                  label=""
                  value={code}
                  onChangeText={(t) => {
                    setCode(t)
                  }}
                  keyboardType="default"
                  placeholder="6-digit code"
                  returnKeyType="done"
                  autoCapitalize="characters"
                />
              )}
            </Animated.View>


            {/* loading */}
            {isLoading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={theme.primary} size="small" />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                  Verifying...
                </Text>
              </View>
            )}

            {/* resend */}
            {config.canResend && !useBackupCode && (
              <View style={styles.resendRow}>
                {canResend ? (
                  <TouchableOpacity
                    onPress={() => resendMutation.mutate()}
                    disabled={resendMutation.isPending}
                  >
                    <Text style={[styles.resendLink, { color: theme.primary }]}>
                      {resendMutation.isPending ? "Sending..." : "Resend code"}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.resendCooldown, { color: theme.textMuted }]}>
                    Resend code in {formatCooldown(cooldown)}
                  </Text>
                )}
              </View>
            )}

            {/* verify button — for TOTP and backup code */}
            {(method === "totp" || useBackupCode) && (
              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  { backgroundColor: isLoading ? theme.border : theme.primary }
                ]}
                onPress={() => verifyMutation.mutate()}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify</Text>
                )}
              </TouchableOpacity>
            )}

            {/* trust device */}
            <View style={[styles.trustSection, { borderTopColor: theme.border }]}>
              <Checkbox
                checked={trustDevice}
                onChange={setTrustDevice}
                label="Trust this device"
                sublabel="Skip 2FA on this device for 30 days"
              />
            </View>

            {/* backup code toggle */}
            <TouchableOpacity
              onPress={() => {
                setUseBackupCode((v) => !v)
                setCode("")
                setBackupCode("")
                setError(null)
              }}
              style={styles.toggleButton}
            >
              <Text style={[styles.toggleText, { color: theme.primary }]}>
                {useBackupCode
                  ? "Use verification code instead"
                  : "Use a backup code instead"}
              </Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    flexGrow: 1,
  },
  backButton: {
    paddingBottom: Spacing.md,
    alignSelf: "flex-start",
  },
  backIcon: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
  },
  mainContent: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.lg,
  },
  icon: { fontSize: 20 },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  methodBanner: {
    width: "100%",
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    alignItems: "center",
    gap: Spacing.xs,
  },
  methodTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  methodSubtitle: {
    fontSize: FontSize.sm,
    textAlign: "center",
    lineHeight: 20,
  },
  backupDesc: {
    fontSize: FontSize.md,
    textAlign: "center",
    lineHeight: 22,
  },
  inputSection: { width: "100%" },
  errorBanner: {
    width: "100%",
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: 4,
  },
  errorText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    textAlign: "center",
  },
  attemptsText: {
    fontSize: FontSize.xs,
    textAlign: "center",
    fontWeight: FontWeight.semibold,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  loadingText: { fontSize: FontSize.sm },
  resendRow: { alignItems: "center" },
  resendLink: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  resendCooldown: { fontSize: FontSize.sm },
  verifyButton: {
    width: "100%",
    height: 54,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  trustSection: {
    width: "100%",
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
  toggleButton: { paddingVertical: Spacing.sm },
  toggleText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    textAlign: "center",
  },
})