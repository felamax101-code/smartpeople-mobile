
import  { useState } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import { verificationService, VerificationStatus } from "@/services/verification.service"
import { VerificationStatusCard } from "@/components/verification/VerificationStatusCard"
import { DocumentUpload, PickedFile } from "@/components/verification/DocumentUpload"
import { FormInput } from "@/components/ui/FormInput"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { useAuthStore } from "@/stores/auth.store"
import { MaterialCommunityIcons } from "@expo/vector-icons"
type IDType = "nin" | "passport" | "national_id" | "drivers_license"

const ID_OPTIONS: { value: IDType; label: string; icon: string; needsBack: boolean; needsExpiry: boolean }[] = [
  { value: "nin", label: "NIN", icon: "", needsBack: false, needsExpiry: false },
  { value: "passport", label: "Passport", icon: "", needsBack: false, needsExpiry: true },
  { value: "national_id", label: "National ID", icon: "", needsBack: true, needsExpiry: true },
  { value: "drivers_license", label: "Driver's License", icon: "", needsBack: true, needsExpiry: true },
]

export default function IdentityVerificationScreen() {
 const { user } = useAuthStore()
  const theme = useTheme()
  const queryClient = useQueryClient()

  const [idType, setIdType] = useState<IDType>("nin")
  const [idNumber, setIdNumber] = useState("")
  const [expiryDay, setExpiryDay] = useState("")
  const [expiryMonth, setExpiryMonth] = useState("")
  const [expiryYear, setExpiryYear] = useState("")
  const [idFront, setIdFront] = useState<PickedFile | null>(null)
  const [idBack, setIdBack] = useState<PickedFile | null>(null)
  const [selfie, setSelfie] = useState<PickedFile | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const[thereiserror,setthereiserror]=useState(false)

  const selectedIDOption = ID_OPTIONS.find((o) => o.value === idType)!

  //  fetch current status 
  const { data: overview,refetch, isLoading } = useQuery({
    queryKey: ["verification-status"],
    queryFn: verificationService.getStatus,
  })

  const vr = overview?.data
  console.log(overview?.data)
  const identityStatus = vr?.identity_status


  const getCurrentStatus = () => {
    if (!identityStatus) return "not_submitted"
    return identityStatus as any
  }

  //  can submit check 
  const canSubmit =
    !identityStatus ||
    identityStatus === "rejected" ||
    identityStatus === "expired"

  //  submit mutation 
  const submitMutation = useMutation({
    mutationFn: () => {
      const expiryDate =
        selectedIDOption.needsExpiry && expiryMonth && expiryYear
          ? `${expiryYear}-${expiryMonth.padStart(2, "0")}-01`
          : null
      return verificationService.submitIdentity({
        id_type: idType,
        id_number: idNumber.trim(),
        id_front: idFront!,
        id_back: selectedIDOption.needsBack ? idBack : null,
        selfie: selfie!,
        document_expiry_date: expiryDate,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification-status"] })
      queryClient.invalidateQueries({ queryKey:["profile", user?.username] })
      Alert.alert(
        "Submitted!",
        "Your documents are under review. We'll notify you within 24 hours.",
        [{ text: "OK", onPress: () => router.back() }]
      ),
      setthereiserror(false)
    },
    onError: (error: any) => {
      const data = error?.response?.data
      if (data?.error) {
        Alert.alert("Submission Failed", data.error)
      } else {
        Alert.alert("Error", "Something went wrong. Please try again.")
      }
    },
  })

  //  validate 
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!idNumber.trim())
      newErrors.idNumber = "ID number is required"

    if (selectedIDOption.needsExpiry) {
      if (!expiryMonth || !expiryYear)
        newErrors.expiry = "Expiry date is required"
      else if (
        parseInt(expiryYear) < new Date().getFullYear() ||
        (parseInt(expiryYear) === new Date().getFullYear() &&
          parseInt(expiryMonth) < new Date().getMonth() + 1)
      ) {
        newErrors.expiry = "Document is already expired"
      }
    }

    if (!idFront) newErrors.idFront = "ID front photo is required"
    if (selectedIDOption.needsBack && !idBack)
      newErrors.idBack = "ID back photo is required"
    if (!selfie) newErrors.selfie = "Selfie is required"

    setErrors(newErrors)
    setthereiserror(true)
    return Object.keys(newErrors).length === 0
  }

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    )
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      {/* header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backIcon, { color: theme.textPrimary }]}>
        <MaterialCommunityIcons name="arrow-left" color={`${theme.textPrimary}`} size={20} />
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Identity Verification
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

          <VerificationStatusCard
            status={getCurrentStatus()}
            rejectionReason={vr?.identity_rejection_reason}
            attemptsRemaining={vr?.attempts_remaining_identity ?? 5}
            reviewedAt={vr?.identity_reviewed_at}
          />

          {identityStatus === "exhausted" && (
            <View style={[styles.contactSupport, { backgroundColor: theme.surfaceSecondary }]}>
              <Text style={[styles.contactText, { color: theme.textSecondary }]}>
                Contact support to unlock your verification attempts:
              </Text>
              <Text style={[styles.contactEmail, { color: theme.primary }]}>
                support@yourapp.com
              </Text>
              <TouchableOpacity onPress={()=>refetch()} disabled={isLoading}>

                <View>
                  <Text style={[styles.pendingNote ,{color:theme.success}]}>
                    {isLoading? `Checking...`: `Click to check for any changes`}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {identityStatus === "approved" && (
            <View style={[styles.approvedNote, { backgroundColor: theme.successLight }]}>
              <Text style={[styles.approvedText, { color: Colors.success }]}>
                 Your identity is verified. You've unlocked Level 3 trust badge.
              </Text>

              <TouchableOpacity onPress={()=>router.push("/settings/verification/business")}>

                <View>
                  <Text style={[styles.pendingNote ,{color:theme.success,backgroundColor:theme.background}]}>
                    Click to upgrade to level 4
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
      
          )}


          {identityStatus === "pending" || identityStatus === "resubmitted" ? (
            <View style={[styles.pendingNote, { borderColor: theme.border, backgroundColor: theme.surfaceSecondary }]}>
              <Text style={[styles.pendingText, { color: theme.textSecondary }]}>
                 Your documents have been submitted and are currently being reviewed by our team.
                You'll receive a notification when the review is complete.
              </Text>

              <TouchableOpacity onPress={()=>refetch()} disabled={isLoading}>

                <View>
                  <Text style={[styles.pendingNote ,{color:theme.success}]}>
                    {isLoading? `Checking...`: `Click to check for any changes`}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : null}

          {canSubmit && (
            <>
              {/* rejection reason shown prominently */}
              {identityStatus === "rejected" && vr?.identity_rejection_reason && (
                <View style={[styles.rejectionBanner, { backgroundColor: theme.errorLight }]}>
                  <Text style={[styles.rejectionTitle, { color: theme.error }]}>
                     Rejection Reason
                  </Text>
                  <Text style={[styles.rejectionReason, { color: theme.error }]}>
                    {vr.identity_rejection_reason}
                  </Text>
                  <Text style={[styles.rejectionHint, { color: theme.textSecondary }]}>
                    Please address the above before resubmitting.
                    Attempts remaining: {vr.attempts_remaining_identity}
                  </Text>
                </View>
              )}

              {/* section divider */}
              <View style={[styles.sectionDivider, { backgroundColor: theme.border }]} />
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                {identityStatus === "rejected" || identityStatus === "expired"
                  ? "Resubmit Documents"
                  : "Submit Your Documents"}
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                  Document Type <Text style={{ color: theme.error }}>*</Text>
                </Text>
                <View style={styles.idTypeGrid}>
                  {ID_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.idTypePill,
                        {
                          backgroundColor:
                            idType === opt.value
                              ? theme.primary
                              : theme.surfaceSecondary,
                          borderColor:
                            idType === opt.value
                              ? theme.primary
                              : theme.border,
                        },
                      ]}
                      onPress={() => {
                        setIdType(opt.value)
                        setIdBack(null)  // reset back when type changes
                        setErrors({})
                      }}
                    >
                      <Text style={styles.idTypeIcon}>{opt.icon}</Text>
                      <Text style={[
                        styles.idTypeText,
                        {
                          color:
                            idType === opt.value ? "#fff" : theme.textSecondary,
                        },
                      ]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <FormInput
                label="ID Number"
                value={idNumber}
                onChangeText={(t) => {
                  setIdNumber(t)
                  if (errors.idNumber) setErrors((e) => ({ ...e, idNumber: "" }))
                }}
                error={errors.idNumber}
                placeholder={
                  idType === "nin"
                    ? "11-digit NIN"
                    : idType === "passport"
                    ? "Passport number"
                    : idType === "national_id"
                    ? "National ID number"
                    : "Driver's license number"
                }
                autoCapitalize="characters"
              />

              {selectedIDOption.needsExpiry && (
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                    Document Expiry Date{" "}
                    <Text style={{ color: theme.error }}>*</Text>
                  </Text>

                   
                  <View style={styles.expiryRow}>
                    <View style={styles.expiryMonthInput}>
                      <TextInput
                        style={[
                          styles.expiryInput,
                          {
                            backgroundColor: theme.inputBackground,
                            color: theme.textPrimary,
                            borderColor: errors.expiry ? theme.error : theme.border,
                          },
                        ]}
                        value={expiryDay}
                        onChangeText={(t) => {
                          const clean = t.replace(/[^0-9]/g, "").slice(0, 4)
                          setExpiryDay(clean)
                          if (errors.expiry) setErrors((e) => ({ ...e, expiry: "" }))
                        }}
                        placeholder="DD"
                        placeholderTextColor={theme.textPlaceholder}
                        keyboardType="number-pad"
                        maxLength={2}
                        textAlign="center"
                      />
                    </View>
                    <Text style={[styles.expirySeparator, { color: theme.textMuted }]}>
                      /
                    </Text>
                    <View style={styles.expiryMonthInput}>
                      <TextInput
                        style={[
                          styles.expiryInput,
                          {
                            backgroundColor: theme.inputBackground,
                            color: theme.textPrimary,
                            borderColor: errors.expiry ? theme.error : theme.border,
                          },
                        ]}
                        value={expiryMonth}
                        onChangeText={(t) => {
                          const clean = t.replace(/[^0-9]/g, "").slice(0, 2)
                          setExpiryMonth(clean)
                          if (errors.expiry) setErrors((e) => ({ ...e, expiry: "" }))
                        }}
                        placeholder="MM"
                        placeholderTextColor={theme.textPlaceholder}
                        keyboardType="number-pad"
                        maxLength={2}
                        textAlign="center"
                      />
                    </View>
                    <Text style={[styles.expirySeparator, { color: theme.textMuted }]}>
                      /
                    </Text>
                    <View style={styles.expiryYearInput}>
                      <TextInput
                        style={[
                          styles.expiryInput,
                          {
                            backgroundColor: theme.inputBackground,
                            color: theme.textPrimary,
                            borderColor: errors.expiry ? theme.error : theme.border,
                          },
                        ]}
                        value={expiryYear}
                        onChangeText={(t) => {
                          const clean = t.replace(/[^0-9]/g, "").slice(0, 4)
                          setExpiryYear(clean)
                          if (errors.expiry) setErrors((e) => ({ ...e, expiry: "" }))
                        }}
                        placeholder="YYYY"
                        placeholderTextColor={theme.textPlaceholder}
                        keyboardType="number-pad"
                        maxLength={4}
                        textAlign="center"
                      />
                    </View>
                  </View>
                  {errors.expiry && (
                    <Text style={[styles.fieldError, { color: theme.error }]}>
                      {errors.expiry}
                    </Text>
                  )}
                </View>
              )}

              <DocumentUpload
                label="ID Front"
                sublabel="Clear photo of the front of your document"
                value={idFront}
                onPick={setIdFront}
                onRemove={() => setIdFront(null)}
                source="gallery"
              />
              {errors.idFront && (
                <Text style={[styles.fieldError, { color: theme.error }]}>
                  {errors.idFront}
                </Text>
              )}

              {selectedIDOption.needsBack && (
                <>
                  <DocumentUpload
                    label="ID Back"
                    sublabel="Clear photo of the back of your document"
                    value={idBack}
                    onPick={setIdBack}
                    onRemove={() => setIdBack(null)}
                    source="gallery"
                  />
                  {errors.idBack && (
                    <Text style={[styles.fieldError, { color: theme.error }]}>
                      {errors.idBack}
                    </Text>
                  )}
                </>
              )}

              <DocumentUpload
                label="Selfie Holding ID"
                sublabel="Take a clear photo holding your document next to your face"
                value={selfie}
                onPick={setSelfie}
                onRemove={() => setSelfie(null)}
                source="camera"
              />
              {errors.selfie && (
                <Text style={[styles.fieldError, { color: theme.error }]}>
                  {errors.selfie}
                </Text>
              )}

              <View style={[styles.tipsCard, { backgroundColor: theme.primaryLight }]}>
                <Text style={[styles.tipsTitle, { color: theme.primary }]}>
                   Tips for approval
                </Text>
                {[
                  "Ensure all text on the document is clearly readable",
                  "No glare, shadows or blurry areas",
                  "Your face must be clearly visible in the selfie",
                  "The document in selfie must match the uploaded photos",
                ].map((tip, i) => (
                  <Text key={i} style={[styles.tipText, { color: theme.textSecondary }]}>
                     {tip}
                  </Text>
                ))}
              </View>
               {thereiserror && (
                            <Text style={[styles.fieldError, { color: theme.error }]}>
                              Correct the above errors                  </Text>
                          )}

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  {
                    backgroundColor:
                      idFront && selfie ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => {
                  if (validate()) submitMutation.mutate()
                }}
                disabled={submitMutation.isPending}
                activeOpacity={0.85}
              >
                {submitMutation.isPending ? (
                  <View style={styles.submitLoading}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.submitButtonText}>
                      Uploading & Submitting...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>
                    Submit for Verification
                  </Text>
                )}
              </TouchableOpacity>

              <Text style={[styles.privacyNote, { color: theme.textMuted }]}>
                 Your documents are encrypted and stored securely.
                They are only accessed by our verification team.
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
  contactSupport: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  contactText: { fontSize: FontSize.sm },
  contactEmail: {
    fontSize: FontSize.md,
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
  fieldGroup: { gap: Spacing.sm },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.3,
  },
  fieldError: {
    fontSize: FontSize.xs,
    marginTop: -Spacing.sm,
  },
  idTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  idTypePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    minWidth: "45%",
    justifyContent: "center",
  },
  idTypeIcon: { fontSize: 16 },
  idTypeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  expiryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  expiryMonthInput: { width: 50 },
  expiryYearInput: { width: 100 },
  expirySeparator: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  expiryInput: {
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
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











