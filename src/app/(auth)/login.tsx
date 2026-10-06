

import { useState } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native"
import { router } from "expo-router"
import { useMutation } from "@tanstack/react-query"
import { FormInput } from "@/components/ui/FormInput"
import { Image } from "expo-image"
import { useTheme } from "@/hooks/useTheme"
import { useAuthStore } from "@/stores/auth.store"
import { authService } from "@/services/auth.service"
import { Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
const APP_ICON = require('../../assets/images/icon-192.png');

export default function LoginScreen() {
  const theme = useTheme()
  const { setUser, pendingAction, clearPendingAction } = useAuthStore()

  //  form state 
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})

  //  login mutation 
  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: async (data) => {
      if (data.requires_2fa) {
        // navigate to 2FA screen with temp_token
        router.push({
          pathname: "/(auth)/two-factor",
          params: {
            temp_token: data.temp_token,
            method: data.method,
            email,
          },
        })
        return
      }

      // login complete — fetch user profile
      const user = await authService.getMe()
      setUser(user)

      // execute pending action if any (e.g. they tried to upvote before login)
      if (pendingAction) {
        clearPendingAction()
        // pending action will re-fire from the component that triggered it
      }

      // navigate back to feed
      router.replace("/")
    },
    onError: (error: any) => {
      const status = error?.response?.status
      const responseData = error?.response?.data
      const fieldErrors: typeof errors = {}
      if (status == 429) {

        fieldErrors.general = "Login attempts exceeded.Try again later"
      }
      // Check if error is in the nested { error: { field: [messages] } } format
      if (responseData?.error && typeof responseData.error === 'object') {

        const errorObj = responseData.error

        // Map each field error
        if (errorObj.email) fieldErrors.email = errorObj.email[0]

        if (errorObj.password) fieldErrors.password = errorObj.password[0]

        // Handle non_field_errors (e.g., password mismatch)
        if (errorObj.non_field_errors) {
          fieldErrors.general = errorObj.non_field_errors[0]
        }
        if (errorObj.non_field_errors == "Please verify your email before logging in.") {
          router.push({
            pathname: "/(auth)/verify-email",
            params: { email: email.trim().toLowerCase() },

          })
          setErrors({})
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



      setErrors(fieldErrors)
    },
  })

  //  validation 
  const validate = (): boolean => {
    const newErrors: typeof errors = {}

    if (!email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Enter a valid email address"
    }

    if (!password) {
      newErrors.password = "Password is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleLogin = () => {
    if (!validate()) return
    setErrors({})
    loginMutation.mutate({ email: email.trim().toLowerCase(), password })
  }

  const isLoading = loginMutation.isPending

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/*  brand section  */}
        <View style={styles.brandSection}>
           <Image
          source={APP_ICON}
          style={[{width:60,height:60,borderRadius :7}]}
          contentFit="cover"
          />
          
          <Text style={[styles.brandName, { color: theme.textPrimary }]}>
            SmartPipla
          </Text>
          <Text style={[styles.brandTagline, { color: theme.textSecondary }]}>
          You are a SmartPiplian.
          </Text>
        </View>

        {/*  form section  */}
        <View style={styles.formSection}>
          <Text style={[styles.formTitle, { color: theme.textPrimary }]}>
            Login to proceed
          </Text>
          <Text style={[styles.formsubTitle, { color: theme.textPrimarylight }]}>
             Enter the email and password for your account
          </Text>

          {/* general error */}
          {errors.general && (
            <View style={[styles.errorBanner, { backgroundColor: theme.errorLight }]}>
              <Text style={[styles.errorBannerText, { color: theme.error }]}>
                {errors.general}
              </Text>
            </View>
          )}

          {/* email */}
          <FormInput
            label="Email"
            value={email}
            onChangeText={(t) => {
              setEmail(t)
              if (errors.email) setErrors((e) => ({ ...e, email: undefined }))
            }}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="email@example.com"
            returnKeyType="next"
          />

          {/* password */}
          <FormInput
            label="Password"
            value={password}
            onChangeText={(t) => {
              setPassword(t)
              if (errors.password) setErrors((e) => ({ ...e, password: undefined }))
            }}
            error={errors.password}
            isPassword
            placeholder="Your password"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          {/* forgot password */}
          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() => router.push("/(auth)/forgot-password")}
          >
            <Text style={[styles.forgotText, { color: theme.primary }]}>
              Forgot password?
            </Text>
          </TouchableOpacity>

          {/* login button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: theme.primary },
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small"  />
            ) : (
              <Text style={styles.primaryButtonText}>Log In</Text>
            )}
          </TouchableOpacity>

          {/* divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <Text style={[styles.dividerText, { color: theme.textMuted }]}>
              or
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>
        </View>

        {/*  footer  */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            New to SmartPipla?
          </Text>
          <TouchableOpacity onPress={() => router.push("/register")}>
            <Text style={[styles.footerLink, { color: theme.primary }]}>
              {" "}Create Account
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop:30
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  brandSection: {
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  brandIcon: {
    fontSize: 30,
  },
  brandName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: FontSize.md,
    letterSpacing: 1,
  },
  formSection: {
    gap: Spacing.md,
  },
  formTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  formsubTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.regular,
    marginBottom: Spacing.xs,
  },
  errorBanner: {
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  errorBannerText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    textAlign: "center",
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginTop: -Spacing.xs,
  },
  forgotText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  primaryButton: {
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
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: FontSize.md,
  },
  secondaryButton: {
    height: 54,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Spacing.xl,
  },
  footerText: {
    fontSize: FontSize.md,
  },
  footerLink: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
})








