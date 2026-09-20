



import  { useState, useEffect, useRef, useCallback } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useMutation } from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import { FormInput } from "@/components/ui/FormInput"
import { OTPInput } from "@/components/ui/OTPInput"
import { PasswordStrengthBar } from "@/components/ui/PasswordStrengthBar"
import { getPasswordStrength } from "@/hooks/usePasswordStrength"
import { useShakeAnimation } from "@/hooks/useShakeAnimations"
import { authService } from "@/services/auth.service"
import { Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"

// ── step types ────────────────────────────────────────────────
type Step = "email" | "otp" | "new_password" | "success"

const RESEND_COOLDOWN = 60

export default function ForgotPasswordScreen() {
  const theme = useTheme()
  const { shakeAnim, shake } = useShakeAnimation()

  // ── step state ────────────────────────────────────────────
  const [step, setStep] = useState<Step>("email")

  // ── form state ────────────────────────────────────────────
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState<string | undefined>()

  const [otp, setOtp] = useState("")
  const [otpError, setOtpError] = useState<string | undefined>()

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState<string | undefined>()

  // ── resend cooldown ───────────────────────────────────────
  const [cooldown, setCooldown] = useState(0)
  const [canResend, setCanResend] = useState(false)
  const cooldownRef = useRef<ReturnType<typeof setInterval>|null>(null)

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN)
    setCanResend(false)
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
  }, [])

  useEffect(() => () => clearInterval(cooldownRef.current), [])

  // ── derived ───────────────────────────────────────────────
  const passwordStrength = getPasswordStrength(newPassword)
  const passwordsMatch = newPassword === confirmPassword
  const confirmHint =
    confirmPassword && passwordsMatch ? "✓ Passwords match" : undefined
  const confirmError =
    confirmPassword && !passwordsMatch
      ? "Passwords don't match"
      : undefined

  const formatCooldown = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60)
      .toString()
      .padStart(2, "0")}`

  // ── step 1: request reset ─────────────────────────────────
  const requestMutation = useMutation({
    mutationFn: () => authService.requestPasswordReset(email.trim().toLowerCase()),
    onSuccess: () => {
      setStep("otp")
      startCooldown()
    },
    onError: (error: any) => {
      const status = error?.response?.status
      const detail = error?.response?.data?.detail

      if (status === 404) {
        setEmailError("No account found with this email address")
      } else {
        setEmailError(detail ?? "Something went wrong. Please try again.")
      }
    },
  })

  // ── step 2: resend OTP ────────────────────────────────────
  const resendMutation = useMutation({
    mutationFn: () =>
      authService.requestPasswordReset(email.trim().toLowerCase()),
    onSuccess: () => {
      setOtp("")
      setOtpError(undefined)
      startCooldown()
    },
    onError: () => setOtpError("Failed to resend code. Try again."),
  })

  // ── step 3: confirm reset ─────────────────────────────────
  const confirmMutation = useMutation({
    mutationFn: () =>
      authService.confirmPasswordReset(
        email.trim().toLowerCase(),
        otp,
        newPassword
      ),
    onSuccess: () => setStep("success"),
    onError: (error: any) => {
      const detail = error?.response?.data?.detail

      // wrong/expired OTP — go back to OTP step
      if (detail?.toLowerCase().includes("otp") ||
          detail?.toLowerCase().includes("code")) {
        setStep("otp")
        setOtp("")
        setOtpError(detail ?? "Invalid or expired code. Request a new one ")
        shake()
        return
      }

      setPasswordError(detail ?? "Failed to reset password. Try again.")
    },
  })

  // ── auto-submit OTP when 6 digits filled ─────────────────
  useEffect(() => {
    if (otp.length === 6 && step === "otp") {
      // move to password step — don't verify OTP yet
      // backend verifies OTP + new password together
      setStep("new_password")
    }
  }, [otp, step])

  // ── validate email ────────────────────────────────────────
  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setEmailError("Email is required")
      return false
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Enter a valid email address")
      return false
    }
    setEmailError(undefined)
    return true
  }

  // ── validate new password ─────────────────────────────────
  const validatePassword = (): boolean => {
    if (!newPassword) {
      setPasswordError("Password is required")
      return false
    }
    if (passwordStrength.score < 2) {
      setPasswordError("Password is too weak")
      return false
    }
    if (!passwordsMatch) {
      setPasswordError("Passwords don't match")
      return false
    }
    setPasswordError(undefined)
    return true
  }

  // ── step progress indicator ───────────────────────────────
  const StepIndicator = () => {
    const steps: Step[] = ["email", "otp", "new_password"]
    const currentIndex = steps.indexOf(step)

    return (
      <View style={styles.stepIndicator}>
        {steps.map((s, index) => (
          <View
            key={s}
            style={[
              styles.stepDot,
              {
                backgroundColor:
                  index <= currentIndex ? theme.primary : theme.border,
                width: index === currentIndex ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>
    )
  }

  // ── success screen ────────────────────────────────────────
  if (step === "success") {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={["top"]}
      >
        <View style={styles.successScreen}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={[styles.successTitle, { color: theme.textPrimary }]}>
            Password Reset!
          </Text>
          <Text style={[styles.successSub, { color: theme.textSecondary }]}>
            Your password has been successfully reset.
            You can now log in with your new password.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text style={styles.primaryButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

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

          {/* ── header ──────────────────────────────────── */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                if (step === "email") router.back()
                else if (step === "otp") setStep("email")
                else if (step === "new_password") {
                  setStep("otp")
                  setOtp("")
                }
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={[styles.backIcon, { color: theme.textPrimary }]}>
                ←
              </Text>
            </TouchableOpacity>

            <StepIndicator />
          </View>

          {/* ── step 1: email ────────────────────────────── */}
          {step === "email" && (
            <View style={styles.stepContent}>
              <Text style={styles.stepIcon}>🔑</Text>
              <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>
                Forgot Password?
              </Text>
              <Text style={[styles.stepSub, { color: theme.textSecondary }]}>
                Enter your email address and we'll send you a code to reset your password.
              </Text>

              <View style={styles.form}>
                <FormInput
                  label="Email Address"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t)
                    if (emailError) setEmailError(undefined)
                  }}
                  error={emailError}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="your@email.com"
                  returnKeyType="send"
                  onSubmitEditing={() => {
                    if (validateEmail()) requestMutation.mutate()
                  }}
                />

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor:
                        email.trim() ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => {
                    if (validateEmail()) requestMutation.mutate()
                  }}
                  disabled={requestMutation.isPending || !email.trim()}
                  activeOpacity={0.85}
                >
                  {requestMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Send Reset Code</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryLink}
                  onPress={() => router.back()}
                >
                  <Text style={[styles.secondaryLinkText, { color: theme.textSecondary }]}>
                    Back to{" "}
                    <Text style={{ color: theme.primary, fontWeight: FontWeight.bold }}>
                      Login
                    </Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── step 2: OTP ──────────────────────────────── */}
          {step === "otp" && (
            <View style={styles.stepContent}>
              <Text style={styles.stepIcon}>📧</Text>
              <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>
                Check your email
              </Text>
              <Text style={[styles.stepSub, { color: theme.textSecondary }]}>
                We sent a 6-digit reset code to
              </Text>
              <Text style={[styles.emailHighlight, { color: theme.primary }]}>
                {email}
              </Text>

              <View style={styles.form}>
                {/* error banner */}
                {otpError && (
                  <View style={[
                    styles.errorBanner,
                    { backgroundColor: theme.errorLight }
                  ]}>
                    <Text style={[styles.errorText, { color: theme.error }]}>
                      {otpError}
                    </Text>
                  </View>
                )}

                <Animated.View
                  style={{ transform: [{ translateX: shakeAnim }] }}
                >
                  <OTPInput
                    value={otp}
                    onChange={(val) => {
                      setOtp(val)
                      if (otpError) setOtpError(undefined)
                    }}
                    hasError={!!otpError}
                  />
                </Animated.View>

                {/* hint */}
                <Text style={[styles.otpHint, { color: theme.textMuted }]}>
                  Enter the code to continue to the next step
                </Text>

                {/* resend */}
                <View style={styles.resendRow}>
                  {canResend ? (
                    <TouchableOpacity
                      onPress={() => resendMutation.mutate()}
                      disabled={resendMutation.isPending}
                    >
                      <Text style={[styles.resendLink, { color: theme.primary }]}>
                        {resendMutation.isPending
                          ? "Sending..."
                          : "Resend code"}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.resendCooldown, { color: theme.textMuted }]}>
                      Resend code in {formatCooldown(cooldown)}
                    </Text>
                  )}
                </View>

                {/* wrong email */}
                <TouchableOpacity
                  style={styles.secondaryLink}
                  onPress={() => {
                    setStep("email")
                    setOtp("")
                    setOtpError(undefined)
                  }}
                >
                  <Text style={[styles.secondaryLinkText, { color: theme.textSecondary }]}>
                    Wrong email?{" "}
                    <Text style={{ color: theme.primary, fontWeight: FontWeight.bold }}>
                      Go back
                    </Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── step 3: new password ──────────────────────── */}
          {step === "new_password" && (
            <View style={styles.stepContent}>
              <Text style={styles.stepIcon}>🔒</Text>
              <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>
                New Password
              </Text>
              <Text style={[styles.stepSub, { color: theme.textSecondary }]}>
                Choose a strong password for your account
              </Text>

              <View style={styles.form}>
                {/* general error */}
                {passwordError && (
                  <View style={[
                    styles.errorBanner,
                    { backgroundColor: theme.errorLight }
                  ]}>
                    <Text style={[styles.errorText, { color: theme.error }]}>
                      {passwordError}
                    </Text>
                  </View>
                )}

                {/* new password */}
                <View style={styles.passwordGroup}>
                  <FormInput
                    label="New Password"
                    value={newPassword}
                    onChangeText={(t) => {
                      setNewPassword(t)
                      if (passwordError) setPasswordError(undefined)
                    }}
                    isPassword
                    placeholder="Min. 8 characters"
                    returnKeyType="next"
                  />
                  <PasswordStrengthBar strength={passwordStrength} />
                </View>

                {/* confirm password */}
                <FormInput
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t)
                    if (passwordError) setPasswordError(undefined)
                  }}
                  isPassword
                  placeholder="Repeat your new password"
                  hint={confirmHint}
                  error={
                    confirmPassword && !passwordsMatch
                      ? "Passwords don't match"
                      : undefined
                  }
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (validatePassword()) confirmMutation.mutate()
                  }}
                />

                {/* OTP code summary */}
                <View style={[
                  styles.otpSummary,
                  { backgroundColor: theme.surfaceSecondary }
                ]}>
                  <Text style={[styles.otpSummaryText, { color: theme.textSecondary }]}>
                    🔢 Using code:{" "}
                    <Text style={{ color: theme.primary, fontWeight: FontWeight.bold }}>
                      {otp.split("").join(" · ")}
                    </Text>
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setStep("otp")
                      setOtp("")
                    }}
                  >
                    <Text style={[styles.changeCode, { color: theme.primary }]}>
                      Change
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* submit */}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor:
                        newPassword && confirmPassword && passwordsMatch
                          ? theme.primary
                          : theme.border,
                    },
                  ]}
                  onPress={() => {
                    if (validatePassword()) confirmMutation.mutate()
                  }}
                  disabled={
                    confirmMutation.isPending ||
                    !newPassword ||
                    !confirmPassword ||
                    !passwordsMatch
                  }
                  activeOpacity={0.85}
                >
                  {confirmMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      Reset Password
                    </Text>
                  )}
                </TouchableOpacity>

              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 52,
    paddingBottom: Spacing.md,
  },
  backIcon: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  stepDot: {
    height: 4,
    borderRadius: 2,
    // width set inline per active state
  },
  stepContent: {
    alignItems: "center",
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  stepIcon: {
    fontSize: 64,
    marginBottom: Spacing.sm,
  },
  stepTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  stepSub: {
    fontSize: FontSize.md,
    textAlign: "center",
    lineHeight: 22,
  },
  emailHighlight: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginTop: -Spacing.xs,
  },
  form: {
    width: "100%",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  passwordGroup: {
    gap: Spacing.xs,
  },
  errorBanner: {
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  errorText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    textAlign: "center",
  },
  otpHint: {
    fontSize: FontSize.sm,
    textAlign: "center",
    marginTop: -Spacing.sm,
  },
  resendRow: {
    alignItems: "center",
  },
  resendLink: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  resendCooldown: {
    fontSize: FontSize.sm,
  },
  otpSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  otpSummaryText: {
    fontSize: FontSize.sm,
    flex: 1,
  },
  changeCode: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  primaryButton: {
    height: 54,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xs,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.3,
  },
  secondaryLink: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  secondaryLinkText: {
    fontSize: FontSize.md,
    textAlign: "center",
  },
  successScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  successIcon: {
    fontSize: 72,
    marginBottom: Spacing.sm,
  },
  successTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    textAlign: "center",
  },
  successSub: {
    fontSize: FontSize.md,
    textAlign: "center",
    lineHeight: 22,
  },
})












