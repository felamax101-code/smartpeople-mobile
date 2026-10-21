

import React, { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  ScrollView,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
  StyleSheet,
  ActivityIndicator,
} from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useMutation } from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import { useAuthStore } from "@/stores/auth.store"
import { authService } from "@/services/auth.service"
import { Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { FormInput } from "@/components/ui/FormInput"
const RESEND_COOLDOWN = 60  // seconds before user can resend

export default function VerifyEmailScreen() {
  const theme = useTheme()
  const { email, user_id } = useLocalSearchParams<{ email: string, user_id: string }>()
  const { setUser, pendingAction, clearPendingAction } = useAuthStore()

  //  state ─
  const [otp, setOtp] = useState("")
  const [error, setError] = useState<{ email?: string; general?: string }>({})
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN)
  const [canResend, setCanResend] = useState(false)

  //  cooldown timer 
  useEffect(() => {
    if (cooldown <= 0) {
      setCanResend(true)
      return
    }
    const timer = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timer)
          setCanResend(true)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  //  auto-submit when all 6 digits entered ─
  useEffect(() => {
    if (otp.length === 6) {
      verifyMutation.mutate({ email, otp, user_id })
    }
  }, [otp])

  //  verify mutation 
  const verifyMutation = useMutation({
    mutationFn: ({ email, otp, user_id }: { email: string; otp: string, user_id: string }) =>
      authService.verifyEmail(email, otp, user_id),
    onSuccess: async () => {
      // email verified — now log them in

      const user = await authService.getMe()
      setUser(user)
      // navigate back to feed
      router.replace("/")
    },

    onError: (error: any) => {
      const status = error?.response.status
      const responseData = error?.response?.data
      const fieldErrors: typeof error = {}
      if (status == 429) {

        fieldErrors.general = "Attempts excceded at this time window .Try again after some some time"
      }
      // Check if error is in the nested { error: { field: [messages] } } format
      if (responseData?.error && typeof responseData.error === 'object') {

        const errorObj = responseData.error

        // Map each field error
        if (errorObj.email) fieldErrors.email = errorObj.email[0]


        // Handle non_field_errors 
        if (errorObj.non_field_errors) {
          fieldErrors.general = errorObj.non_field_errors[0]
        }
        if (errorObj.non_field_errors == "Please verify your email before logging in.") {
          router.push({
            pathname: "/(auth)/verify-email",
            params: { email: email.trim().toLowerCase() },

          })
        }
        // Handle generic detail message
        if (errorObj.detail) fieldErrors.general = errorObj.detail
      }

      // Fallback for other error formats
      else if (responseData?.detail) {
        fieldErrors.general = responseData.detail
      }

      // If no specific errors found
      if (Object.keys(fieldErrors).length === 0) {
        fieldErrors.general = "Something went wrong. Please try again."
      }



      setError(fieldErrors)
      setOtp("")
    },
  })

  //  resend OTP 
  const resendMutation = useMutation({
    mutationFn: () => authService.resendOTP(email),
    onSuccess: () => {
      setCanResend(false)
      setCooldown(RESEND_COOLDOWN)
      setError({})
      setOtp("")
    },

    onError: (error: any) => {
      const status = error?.response.status
      const responseData = error?.response?.data
      const fieldErrors: typeof error = {}
      if (status == 429) {

        fieldErrors.general = "Attempts exceeded.Try again later"
      }
      // Check if error is in the nested { error: { field: [messages] } } format
      if (responseData?.error && typeof responseData.error === 'object') {

        const errorObj = responseData.error

        // Map each field error
        if (errorObj.email) fieldErrors.email = errorObj.email[0]


        // Handle non_field_errors 
        if (errorObj.non_field_errors) {
          fieldErrors.general = errorObj.non_field_errors[0]
        }
        if (errorObj.non_field_errors == "Please verify your email before logging in.") {
          router.push({
            pathname: "/(auth)/verify-email",
            params: { email: email.trim().toLowerCase() },

          })
        }
        // Handle generic detail message
        if (errorObj.detail) fieldErrors.general = errorObj.detail
      }

      // Fallback for other error formats
      else if (responseData?.detail) {
        fieldErrors.general = responseData.detail
      }

      // If no specific errors found
      if (Object.keys(fieldErrors).length === 0) {
        fieldErrors.general = "Something went wrong. Please try again."
      }



      setError(fieldErrors)
    },
  })

  const handleResend = useCallback(() => {
    if (!canResend) return
    resendMutation.mutate()
  }, [canResend])

  // format cooldown as MM:SS
  const formatCooldown = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0")
    const s = (seconds % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  const isLoading = verifyMutation.isPending

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/*  header  */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.backIcon, { color: theme.textPrimary }]}>←</Text>
          </TouchableOpacity>
          <View style={styles.stepIndicator}>
            <View style={[styles.step, { backgroundColor: theme.border }]} />
            <View style={[styles.step, styles.stepActive, { backgroundColor: theme.primary }]} />
          </View>
        </View>

        {/*  content ─ */}
        <View style={styles.mainContent}>
          <Text style={styles.emailIcon}>📧</Text>

          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Check your email
          </Text>

          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            We sent a 6-digit verification code to
          </Text>
          <Text style={[styles.emailText, { color: theme.primary }]}>
            {email}
          </Text>
          {/* error */}
          {error && (
            <View style={[styles.errorBanner, { backgroundColor: theme.errorLight }]}>
              {Object.values(error).filter(Boolean).length > 0 && (
                <Text style={[styles.errorText, { color: theme.error }]}>
                  {Object.values(error).filter(Boolean).join(" • ")}
                </Text>
              )}
            </View>
          )}
          {/* OTP input */}
          <View style={styles.otpContainer}>

            <FormInput
              label="OTP"
              value={otp}
              onChangeText={(t) => {
                setOtp(t)
              }}
              keyboardType="default"
              placeholder="6-digit code"
              returnKeyType="done"
              autoCapitalize="characters"
            />
          </View>


          {/* loading indicator */}
          {isLoading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.primary} size="small" />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Verifying...
              </Text>
            </View>
          )}

          {/* resend section */}
          <View style={styles.resendSection}>
            {canResend ? (
              <TouchableOpacity
                onPress={handleResend}
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

          {/* wrong email */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.wrongEmailButton}
          >
            <Text style={[styles.wrongEmailText, { color: theme.textSecondary }]}>
              Wrong email?{" "}
              <Text style={{ color: theme.primary, fontWeight: FontWeight.bold }}>
                Go back
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingBottom: Spacing.md,
  },
  backIcon: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
  },
  stepIndicator: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  step: {
    width: 32,
    height: 4,
    borderRadius: Radius.full,
  },
  stepActive: {
    width: 48,
  },
  mainContent: {
    flex: 1,
    alignItems: "center",

    gap: Spacing.md,
  },
  emailIcon: {
    fontSize: 44,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    textAlign: "center",
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: "center",
  },
  emailText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginTop: -Spacing.xs,
  },
  otpContainer: {
    width: "100%",
    paddingVertical: Spacing.lg,
  },
  errorBanner: {
    width: "100%",
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  errorText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    textAlign: "center",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: FontSize.sm,
  },
  resendSection: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  resendLink: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  resendCooldown: {
    fontSize: FontSize.sm,
  },
  wrongEmailButton: {
    paddingVertical: Spacing.sm,
  },
  wrongEmailText: {
    fontSize: FontSize.md,
    textAlign: "center",
  },
})




















