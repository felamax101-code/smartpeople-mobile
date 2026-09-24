

import React, { useState } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import { verificationService } from "@/services/verification.service"
import { VerificationStatusCard } from "@/components/verification/VerificationStatusCard"
import { DocumentUpload, PickedFile } from "@/components/verification/DocumentUpload"
import { FormInput } from "@/components/ui/FormInput"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { useAuthStore } from "@/stores/auth.store"
export default function BusinessVerificationScreen() {
  const theme = useTheme()
  const queryClient = useQueryClient()
const {user}=useAuthStore()
  const [form, setForm] = useState({
    business_name: "",
    rc_number: "",
    business_address: "",
  })
  const [cacDocument, setCacDocument] = useState<PickedFile | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [thereiserror, setthereiserror] = useState(false)

  const { data: overview, refetch,isLoading } = useQuery({
    queryKey: ["verification-status",user?.username??''],
    queryFn: verificationService.getStatus,
  })

  const vr = overview?.data
  const businessStatus = vr?.business_status

  const canSubmit =
    !businessStatus ||
    businessStatus === "rejected" ||
    businessStatus === "expired"


  const submitMutation = useMutation({
    mutationFn: () =>
      verificationService.submitBusiness({
        business_name: form.business_name.trim(),
        rc_number: form.rc_number.trim(),
        business_address: form.business_address.trim(),
        cac_document: cacDocument!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification-status"] })
      Alert.alert(
        "Submitted!",
        "Your business documents are under review.",
        [{ text: "OK", onPress: () => router.back() }]
      );
      setthereiserror(false)
    },
    onError: (error: any) => {
      const data = error?.response?.data
      Alert.alert("Error", data?.error ?? "Submission failed. Try again.")
    },
  })

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.business_name.trim())
      newErrors.business_name = "Business name is required"
    if (!form.rc_number.trim())
      newErrors.rc_number = "RC number is required"
    if (!form.business_address.trim())
      newErrors.business_address = "Business address is required"
    if (!cacDocument)
      newErrors.cac = "CAC document is required"
    setErrors(newErrors)
    setthereiserror(true)
    return Object.keys(newErrors).length === 0
  }

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }))
  }
  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    )
  }

  const getCurrentStatus = () => {
    if (!businessStatus) return "not_submitted"
    return businessStatus as any
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backIcon, { color: theme.textPrimary }]}>🦀</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Business Verification
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >

          {/* status card */}
          <VerificationStatusCard
            status={getCurrentStatus()}
            rejectionReason={vr?.business_rejection_reason}
            attemptsRemaining={vr?.attempts_remaining_business ?? 5}
            reviewedAt={vr?.business_reviewed_at}
          />

          {/* identity must be verified first */}
          {vr?.identity_status !== "approved" && (
            <View style={[styles.prerequisite, {
              backgroundColor: theme.surfaceSecondary,
              borderColor: theme.border,
            }]}>
              <Text style={[styles.prerequisiteText, { color: theme.textSecondary }]}>
                🦧 Identity verification (Level 3) must be completed before
                business verification.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/settings/verification/identity")}
              >
                <Text style={[styles.prerequisiteLink, { color: theme.primary }]}>
                  Verify Identity
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* approved state */}
          {businessStatus === "approved" && (
            <View style={[styles.approvedNote, { backgroundColor: theme.successLight }]}>
              <Text style={[styles.approvedText, { color: Colors.success }]}>
                💩 Your business is verified. You've unlocked Level 4 trust badge.
              </Text>
            </View>
          )}

          {/* pending state */}
          {(businessStatus === "pending" || businessStatus === "resubmitted") && (
            <View style={[styles.pendingNote, {
              borderColor: theme.border,
              backgroundColor: theme.surfaceSecondary,
            }]}>
              <Text style={[styles.pendingText, { color: theme.textSecondary }]}>
                🐽 Your business documents are under review. We'll notify you soon.
              </Text>
              <TouchableOpacity onPress={() => refetch()} disabled={isLoading}>

                <View>
                  <Text style={[styles.pendingNote, { color: theme.success }]}>
                    {isLoading ? `Checking...` : `Click to check for any changes`}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* submission form */}
          {canSubmit && vr?.identity_status === "approved" && (
            <>
              {/* rejection reason */}
              {businessStatus === "rejected" && vr?.business_rejection_reason && (
                <View style={[styles.rejectionBanner, { backgroundColor: theme.errorLight }]}>
                  <Text style={[styles.rejectionTitle, { color: theme.error }]}>
                    😶‍🌫️Rejection Reason
                  </Text>
                  <Text style={[styles.rejectionReason, { color: theme.error }]}>
                    {vr.business_rejection_reason}
                  </Text>
                  <Text style={[styles.rejectionHint, { color: theme.textSecondary }]}>
                    Attempts remaining: {vr.attempts_remaining_business}
                  </Text>
                </View>
              )}

              <View style={[styles.sectionDivider, { backgroundColor: theme.border }]} />
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                {businessStatus === "rejected"
                  ? "Resubmit Business Documents"
                  : "Business Details"}
              </Text>

              {/* form fields */}
              <FormInput
                label="Registered Business Name"
                value={form.business_name}
                onChangeText={(t) => updateField("business_name", t)}
                error={errors.business_name}
                placeholder="As registered with CAC"
                autoCapitalize="words"
              />

              <FormInput
                label="RC Number"
                value={form.rc_number}
                onChangeText={(t) => updateField("rc_number", t)}
                error={errors.rc_number}
                placeholder="e.g. RC1234567"
                autoCapitalize="characters"
              />

              <FormInput
                label="Business Address"
                value={form.business_address}
                onChangeText={(t) => updateField("business_address", t)}
                error={errors.business_address}
                placeholder="Registered business address"
                autoCapitalize="words"
              />

              {/* CAC document */}
              <DocumentUpload
                label="CAC Certificate / Document"
                sublabel="Certificate of Incorporation or Business Name Registration"
                value={cacDocument}
                onPick={setCacDocument}
                onRemove={() => setCacDocument(null)}
                source="gallery"
              />
              {errors.cac && (
                <Text style={[styles.fieldError, { color: theme.error }]}>
                  {errors.cac}
                </Text>
              )}

              {/* tips */}
              <View style={[styles.tipsCard, { backgroundColor: theme.primaryLight }]}>
                <Text style={[styles.tipsTitle, { color: theme.primary }]}>
                  🐻 Accepted documents
                </Text>
                {[
                  "Certificate of Incorporation (CAC)",
                  "Business Name Registration Certificate",
                  "RC number must be clearly visible",
                  "Document must be current and valid",
                ].map((tip, i) => (
                  <Text key={i} style={[styles.tipText, { color: theme.textSecondary }]}>
                    🥶 {tip}
                  </Text>
                ))}
              </View>
              {thereiserror && (
                <Text style={[styles.fieldError, { color: theme.error }]}>
                  Correct the above errors                  </Text>
              )}

              {/* submit */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  {
                    backgroundColor:
                      cacDocument &&
                        form.business_name &&
                        form.rc_number &&
                        form.business_address
                        ? theme.primary
                        : theme.border,
                  },
                ]}
                onPress={() => { if (validate()) submitMutation.mutate() }}
                disabled={submitMutation.isPending}
                activeOpacity={0.85}
              >
                {submitMutation.isPending ? (
                  <View style={styles.submitLoading}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.submitButtonText}>Submitting...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>
                    Submit for Verification
                  </Text>
                )}
              </TouchableOpacity>

              <Text style={[styles.privacyNote, { color: theme.textMuted }]}>
                🫎 Your business documents are encrypted and stored securely.
              </Text>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
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
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  prerequisite: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  prerequisiteText: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  prerequisiteLink: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  approvedNote: {
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  approvedText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    lineHeight: 22,
  },
  pendingNote: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  pendingText: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  rejectionBanner: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  rejectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  rejectionReason: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  rejectionHint: {
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  sectionDivider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  fieldError: {
    fontSize: FontSize.xs,
    marginTop: -Spacing.sm,
  },
  tipsCard: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  tipsTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  tipText: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  submitButton: {
    height: 56,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  submitLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  privacyNote: {
    fontSize: FontSize.xs,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: Spacing.md,
  },
})




















