import { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from "react-native"
import { router } from "expo-router"
import { useTheme } from "@/hooks/useTheme"
import { Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { useMutation ,useQuery} from "@tanstack/react-query"
import { propertyApplicationService } from "@/hooks/useSPapplication"
type ApplicantType = "personal" | "organization"

export default function ApplyToPostScreen() {
  const theme = useTheme()

  const [applicantType, setApplicantType] = useState<ApplicantType>("personal")
  const [name, setName] = useState("")
  const [fielderror, setError] = useState("")
    const [isSubmitSuccess,setIsSubmitSuccess]=useState<boolean>(false)
  const isOrg = applicantType === "organization"
   const { data: statusData, isLoading: isCheckingStatus } = useQuery({
  queryKey: ["property-application-status"],
  queryFn: propertyApplicationService.getMyStatus,
})
  const handleTypeChange = (type: ApplicantType) => {
    setApplicantType(type)
    setName("")       // clear name when switching type — avoids submitting a name meant for the other type
    setError("")
  }
  const {
  mutate: submitApplication,
  isPending: isSubmitting,   // use isLoading instead if you're on React Query v4
  isError,
  error,
} = useMutation({
  mutationFn: propertyApplicationService.submit,
  onSuccess: (data) => {
setIsSubmitSuccess(true)  },
  onError: (err: any) => {
    const message = err?.response?.data?.error ?? "Something went wrong while submiting your application.Try again or come back later. Make sure you are well connected to the internet"
    setError(message)
  },
})

  const handleSubmit = () => {
    if (!name.trim()) {
      setError(isOrg ? "Organization name is required" : "Full name is required")
      return
    }
    if (!isOrg && name.trim().length < 2) {
      setError("Enter your real full name")
      return
    }

    submitApplication({ applicant_type: applicantType, name: name.trim() })
  }
  if(statusData?.has_applied && statusData.application?.status==="pending"){
    return (
       <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.backIcon, { color: theme.textPrimary }]}>←</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            You have already applied. Your application is pending. 
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            You will receive a notification once approved or rejected(you can see the notifications by clicking the bell icon on feed screens)
          </Text>
           <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            You can also return to this screen to view your application status
          </Text>
        </View>
         <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: theme.primary }]}
          onPress={()=>router.replace("/realestate")}
          activeOpacity={0.85}
        >
    <Text style={styles.submitText}>Got it</Text>
  
        </TouchableOpacity>
      </ScrollView>
    )
  }
  if(statusData?.has_applied && statusData.application?.status==="approved"){
    return (
       <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.backIcon, { color: theme.textPrimary }]}>←</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Congratulation.Your application was approved and SmartProperty Account has been created
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Click below to navigate to your account
          </Text>
          
        </View>
         <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: theme.primary }]}
          onPress={()=>router.replace("/sp/profile")}
          activeOpacity={0.85}
        >
    <Text style={styles.submitText}>View my SmartPropertyAccount</Text>
  
        </TouchableOpacity>
      </ScrollView>
    )
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
{statusData?.has_applied && statusData.application?.status==="rejected" && (
  <View style={styles.titleSection}>
          <Text style={[styles.title, { color: theme.error }]}>
            Application rejected
          </Text>
          <Text style={[styles.subtitle, { color: theme.success }]}>
            You can apply again
          </Text>
        </View>
  
)}
        {isSubmitSuccess ?(
            <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.backIcon, { color: theme.textPrimary }]}>←</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Application submitted. You will receive a notification about whether it has been accepted or rejected
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Note that you can also check status on the previous screen (SmartProperties screen). Click the menu button(the three horizontal bars to the top right) then my SmartProperty account
          </Text>
        </View>
         <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: theme.primary }]}
          onPress={()=>router.replace("/realestate")}
          activeOpacity={0.85}
          
        >
         
    <Text style={styles.submitText}>Got it</Text>
  
        </TouchableOpacity>
      </ScrollView>
        ):(

        
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.backIcon, { color: theme.textPrimary }]}>←</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Apply to get a SmartProperty account- to post your properties to other smartpeoplers
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Tell us who you're applying as. We'll review and get back to you.
          </Text>
        </View>
        

        {/* type toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              {
                borderColor: theme.border,
                backgroundColor: !isOrg ? theme.primary : "transparent",
              },
            ]}
            onPress={() => handleTypeChange("personal")}
          >
            <Text
              style={[
                styles.toggleText,
                { color: !isOrg ? "#fff" : theme.textPrimary },
              ]}
            >
              Personal
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleBtn,
              {
                borderColor: theme.border,
                backgroundColor: isOrg ? theme.primary : "transparent",
              },
            ]}
            onPress={() => handleTypeChange("organization")}
          >
            <Text
              style={[
                styles.toggleText,
                { color: isOrg ? "#fff" : theme.textPrimary },
              ]}
            >
              Organization/group
            </Text>
          </TouchableOpacity>
        </View>

        {/* conditional name field */}
        <View style={styles.form}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {isOrg ? "Organization Name" : "Full Name"}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: fielderror ? theme.error : theme.border,
                color: theme.textPrimary,
              },
            ]}
            placeholder={isOrg ? "e.g. Kilel Properties Ltd" : "e.g. Felix Kilel"}
            placeholderTextColor={theme.textPlaceholder}
            value={name}
            onChangeText={(t) => {
              setName(t)
              if (fielderror) setError("")
            }}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          {fielderror ? (
            <Text style={[styles.fielderrorText, { color: theme.error }]}>{fielderror}</Text>
          ) : null}

          {isOrg && (
            <Text style={[styles.helperNote, { color: theme.textMuted }]}>
              Use the registered name of your organization — this is what applicants will see.
            </Text>
          )}
          {!isOrg && (
            <Text style={[styles.helperNote, { color: theme.textMuted }]}>
              Use your real name  — this is what applicants will see.
            </Text>
          )}
        </View>

        {/* submit */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: theme.primary }]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
    <ActivityIndicator color="#fff" size="small" />
  ) : (
    <Text style={styles.submitText}>Submit Application</Text>
  )}
        </TouchableOpacity>

      </ScrollView>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  header: {
    paddingTop: 56,
    paddingBottom: Spacing.md,
  },
  backIcon: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
  },
  titleSection: {
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  toggleRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  toggleBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  form: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 52,
    fontSize: FontSize.md,
  },
  fielderrorText: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  helperNote: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  submitBtn: {
    height: 54,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
})