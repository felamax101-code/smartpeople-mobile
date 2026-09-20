


import React, { useState } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useMutation } from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import { FormInput } from "@/components/ui/FormInput"
import { PasswordStrengthBar } from "@/components/ui/PasswordStrengthBar"
import { getPasswordStrength } from "@/hooks/usePasswordStrength"
import api from "@/services/api"
import { Spacing, FontSize, FontWeight } from "@/constants/colors"

export default function ChangePasswordScreen() {
  const theme = useTheme()

  const [form, setForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  })
  const [errors, setErrors] = useState<Partial<typeof form>>({})

  const strength = getPasswordStrength(form.new_password)
  const passwordsMatch = form.new_password === form.confirm_password

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post("/auth/password/change/", {
        old_password: form.old_password,
        new_password: form.new_password,
      })
    },
    onSuccess: () => {
      Alert.alert(
        "Password Changed",
        "Your password has been updated successfully.",
        [{ text: "OK", onPress: () => router.back() }]
      )
    },
    onError: (error: any) => {
      const data = error?.response?.data
      const newErrors: typeof errors = {}
      if (data?.old_password) newErrors.old_password = "Current password is incorrect"
      if (data?.new_password) newErrors.new_password = data.new_password[0]
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
      } else {
        Alert.alert("Error", "Failed to change password")
      }
    },
  })

  const validate = (): boolean => {
    const newErrors: typeof errors = {}
    if (!form.old_password) newErrors.old_password = "Required"
    if (!form.new_password) newErrors.new_password = "Required"
    else if (strength.score < 2) newErrors.new_password = "Password is too weak"
    if (!form.confirm_password) newErrors.confirm_password = "Required"
    else if (!passwordsMatch) newErrors.confirm_password = "Passwords don't match"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
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
          Change Password
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            <FormInput
              label="Current Password"
              value={form.old_password}
              onChangeText={(t) => {
                setForm((f) => ({ ...f, old_password: t }))
                if (errors.old_password)
                  setErrors((e) => ({ ...e, old_password: undefined }))
              }}
              error={errors.old_password}
              isPassword
              placeholder="Your current password"
            />

            <View style={styles.passwordGroup}>
              <FormInput
                label="New Password"
                value={form.new_password}
                onChangeText={(t) => {
                  setForm((f) => ({ ...f, new_password: t }))
                  if (errors.new_password)
                    setErrors((e) => ({ ...e, new_password: undefined }))
                }}
                error={errors.new_password}
                isPassword
                placeholder="Min. 8 characters"
              />
              <PasswordStrengthBar strength={strength} />
            </View>

            <FormInput
              label="Confirm New Password"
              value={form.confirm_password}
              onChangeText={(t) => {
                setForm((f) => ({ ...f, confirm_password: t }))
                if (errors.confirm_password)
                  setErrors((e) => ({ ...e, confirm_password: undefined }))
              }}
              error={errors.confirm_password}
              hint={
                form.confirm_password && passwordsMatch
                  ? "✓ Passwords match"
                  : undefined
              }
              isPassword
              placeholder="Repeat new password"
            />

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.primary }]}
              onPress={() => { if (validate()) mutation.mutate() }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  form: { gap: Spacing.lg },
  passwordGroup: { gap: Spacing.xs },
  submitButton: {
    height: 54,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
})







