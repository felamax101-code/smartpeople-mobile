


import React, { useState } from "react"
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
import * as WebBrowser from 'expo-web-browser';

import { useMutation } from "@tanstack/react-query"
import { FormInput } from "@/components/ui/FormInput"
import { PasswordStrengthBar } from "@/components/ui/PasswordStrengthBar"

import { useTheme } from "@/hooks/useTheme"
import { useUsernameCheck } from "@/hooks/useUsernameCheck"
import { getPasswordStrength } from "@/hooks/usePasswordStrength"
import { authService } from "@/services/auth.service"
import { Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"

export default function RegisterScreen() {
  const theme = useTheme()

  //  form state 
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    passwordConfirm: "",
  })
  const [errors, setErrors] = useState<Partial<typeof form> & { general?: string }>({})
  const [showPassword, setShowPassword] = useState(false)

  //  derived state 
  const passwordStrength = getPasswordStrength(form.password)
  const { hint: usernameHint, error: usernameError, status: usernameStatus } =
    useUsernameCheck(form.username)

  // passwords match check — only show after user has typed in confirm field
  const passwordsMatch = form.password === form.passwordConfirm
  const confirmHint = form.passwordConfirm
    ? passwordsMatch
      ? "✓ Passwords match"
      : undefined
    : undefined
  const confirmError = form.passwordConfirm && !passwordsMatch
    ? "Passwords don't match"
    : undefined

  //  register mutation 
  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: (data) => {
      // move to email verification screen
      // pass email so verify screen knows where to send OTP
      router.push({
        pathname: "/(auth)/verify-email",
        params: { email: form.email.trim().toLowerCase() },

      })
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      const responseData = error?.response?.data
      const fieldErrors: typeof errors = {}
      if (status == 429) {

        fieldErrors.general = "Registration attempts exceeded. Try again later"
      }
      // Check if error is in the nested { error: { field: [messages] } } format
      if (responseData?.error && typeof responseData.error === 'object') {

        const errorObj = responseData.error

        // Map each field error
        if (errorObj.email) fieldErrors.email = errorObj.email[0]
        if (errorObj.username) fieldErrors.username = errorObj.username[0]
        if (errorObj.name) fieldErrors.name = errorObj.name[0]
        if (errorObj.password) fieldErrors.password = errorObj.password[0]

        // Handle non_field_errors (e.g., password mismatch)
        if (errorObj.non_field_errors) {
          fieldErrors.general = errorObj.non_field_errors[0]
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

  //  field updater 
  const updateField = (field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    // clear error on change
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  //  validation 
  const validate = (): boolean => {
    const newErrors: typeof errors = {}

    if (!form.name.trim() || form.name.trim().length < 2)
      newErrors.name = "Name must be at least 2 characters"

    if (!form.username.trim() || form.username.length < 3)
      newErrors.username = "Username must be at least 3 characters"
    else if (usernameStatus === "taken")
      newErrors.username = "Username is already taken"
    else if (usernameStatus === "invalid")
      newErrors.username = "Only letters, numbers and underscores allowed"
    else if (usernameStatus === "checking")
      newErrors.username = "Checking availability..."

    if (!form.email.trim())
      newErrors.email = "Email is required"
    else if (!/\S+@\S+\.\S+/.test(form.email))
      newErrors.email = "Enter a valid email address"

    if (!form.password)
      newErrors.password = "Password is required"
    else if (passwordStrength.score < 2)
      newErrors.password = "Password is too weak"

    if (!form.passwordConfirm)
      newErrors.passwordConfirm = "Please confirm your password"
    else if (!passwordsMatch)
      newErrors.passwordConfirm = "Passwords don't match"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleContinue = () => {
    if (!validate()) return

    // passwordConfirm is NEVER sent to backend
    const { passwordConfirm, ...payload } = form
    registerMutation.mutate({
      ...payload,
      email: payload.email.trim().toLowerCase(),
      username: payload.username.trim().toLowerCase(),
      name: payload.name.trim(),
    })
  }

  const isLoading = registerMutation.isPending
  const canContinue =
    form.name &&
    form.username &&
    form.email &&
    form.password &&
    form.passwordConfirm &&
    passwordsMatch &&
    usernameStatus !== "taken" &&
    usernameStatus !== "checking"

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
        
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.backIcon, { color: theme.textPrimary }]}>←</Text>
          </TouchableOpacity>
          {/* step indicator */}
          <View style={styles.stepIndicator}>
            <View style={[styles.step, styles.stepActive, { backgroundColor: theme.primary }]} />
            <View style={[styles.step, { backgroundColor: theme.border }]} />
          </View>
        </View>

        {/*  title  */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Create your account
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Become SmartPiplian
          </Text>
        </View>

        {/*  form  */}
        <View style={styles.form}>

          {/* general error */}
          {errors.general && (
            <View style={[styles.errorBanner, { backgroundColor: theme.errorLight }]}>
              <Text style={[styles.errorBannerText, { color: theme.error }]}>
                {errors.general}
              </Text>
            </View>
          )}

          {/* full name */}
          <FormInput
            label="Full Name"
            value={form.name}
            onChangeText={(t) => updateField("name", t)}
            error={errors.name}
            placeholder=" eg.Felix Kilel"
            autoCapitalize="words"
            returnKeyType="next"
            textContentType="name"
            autoComplete="name"
          />

          {/* username */}
          <FormInput
            label="Username"
            value={form.username}
            onChangeText={(t) => updateField("username", t.toLowerCase())}
            error={errors.username ?? usernameError}
            hint={usernameHint}
            placeholder="eg.felixkilel"
            autoCapitalize="none"
            returnKeyType="next"
            autoComplete="username"
            textContentType="username"
            importantForAutofill="no"
          />

          {/* email */}
          <FormInput
            label="Email"
            value={form.email}
            onChangeText={(t) => updateField("email", t)}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="eg.example@email.com"
            returnKeyType="next"
            textContentType="emailAddress"
            autoComplete="email"
          />

          {/* password */}
          <View style={styles.passwordGroup}>
            <FormInput
              label="Password"
              value={form.password}
              onChangeText={(t) => updateField("password", t)}
              error={errors.password}
              isPassword
              placeholder="Min. 6 characters"
              returnKeyType="next"
              textContentType="newPassword"
              autoComplete="password-new"
            />
            {/* strength bar appears as user types */}
            <PasswordStrengthBar strength={passwordStrength} />
          </View>

          {/* confirm password — frontend only */}
          <FormInput
            label="Confirm Password"
            value={form.passwordConfirm}
            onChangeText={(t) => updateField("passwordConfirm", t)}
            error={confirmError ?? errors.passwordConfirm}
            hint={confirmHint}
            hintColor={theme.success}
            isPassword
            placeholder="Repeat your password"
            returnKeyType="done"
            onSubmitEditing={handleContinue}

          />
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          By pressing <Text  style={[{color:theme.primary}]} >[Continue]</Text> you agree you to our <Text
            style={[{color:theme.primary}]} 
           onPress={async() => { await WebBrowser.openBrowserAsync("https://smartpipla.com/terms", {
                              presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
                              toolbarColor: '#6366F1',
                            }) }}
          >Terms of Service</Text> and <Text   style={[{color:theme.primary}]}
           onPress={async() => {
          
                         await WebBrowser.openBrowserAsync("https://smartpipla.com/privacy", {
                              presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
                              toolbarColor: '#6366F1',
                            })
                       }}
           >Privacy Policy</Text>
          </Text>
          {/* continue button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: canContinue && !isLoading
                  ? theme.primary
                  : theme.border,
              },
            ]}
            onPress={handleContinue}
            disabled={!canContinue || isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>

        {/*  footer  */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Already have an account?
          </Text>
          <TouchableOpacity onPress={() => router.replace("/login")}>
            <Text style={[styles.footerLink, { color: theme.primary }]}>
              {" "}Log in
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop:40
   
   
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
    width: 48,  // active step is wider
  },
  titleSection: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  form: {
    gap: Spacing.md,
  },
  passwordGroup: {
    gap: Spacing.xs,
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
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Spacing.xl,
  },
  footerText: { fontSize: FontSize.md },
  footerLink: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
})








