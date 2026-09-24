import  { useEffect, useState, useRef, useCallback } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useQueryClient } from "@tanstack/react-query"
import { router,useLocalSearchParams } from "expo-router"
import { Image } from "expo-image"
import * as ImagePicker from "expo-image-picker"
import { useMutation } from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import { useAuthStore } from "@/stores/auth.store"
import { userService } from "@/services/user.service"
import { FormInput } from "@/components/ui/FormInput"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { AnimatedBanner,BannerState,BannerType } from "@/components/activityIndicator/AnimatedBanner"
// ─ Types 
type Tab = "general" | "email" | "phone"
type VerifyStep = "input" | "verify"
// ─ OTP Input Component 
function OtpInput({
  code,
  onChange,
  theme,
}: {
  code: string[]
  onChange: (code: string[]) => void
  theme: any
}) {
  const refs = useRef<(TextInput | null)[]>([])

  const handleChange = (text: string, index: number) => {
    const digit = text.slice(-1)
    const next = [...code]
    next[index] = digit
    onChange(next)
    if (digit && index < 5) refs.current[index + 1]?.focus()
  }

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !code[index] && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  return (
    <View style={otpStyles.row}>
      {code.map((digit, i) => (
        <TextInput
          key={i}
          ref={(r) => { refs.current[i] = r }}
          style={[
            otpStyles.box,
            {
              backgroundColor: theme.inputBackground,
              borderColor: digit ? theme.primary : theme.border,
              color: theme.textPrimary,
            },
          ]}
          value={digit}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
          keyboardType="default"
          maxLength={1}
          textAlign="center"
          selectTextOnFocus
        />
      ))}
    </View>
  )
}

const otpStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginVertical: Spacing.md,
  },
  box: {
    width: 48,
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    fontSize: 22,
    fontWeight: "700",
  },
})

// ─ Verify Panel (shared by Email & Phone) 
function VerifyPanel({
  type,
  currentValue,
  theme,
}: {
  type: "email" | "phone"
  currentValue: string
  theme: any
}) {
  const isEmail = type === "email"
  const [step, setStep] = useState<VerifyStep>("input")
  const [inputValue, setInputValue] = useState("")
  const [code, setCode] = useState(["", "", "", "", "", ""])
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [errors, setErrors] = useState<{ phone?: string; email?: string; general?: string }>({})
    const [banner, setBanner] = useState<BannerState | null>(null);

  const isCodeComplete = code.every((d) => d !== "")

  const startCountdown = () => {
    setResendCountdown(30)
    countdownRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }
const showBanner = useCallback((type: BannerType, message: string) => {
    setBanner({ id: Date.now(), type, message });
  }, []);
  const handleSendCode = async () => {
    if (!inputValue.trim()) return
    setSending(true)
    try {
      if (type === "email") {
        await userService.changeEmailRequest(inputValue.trim())
      }

      if (type === "phone") { await userService.changePhoneRequest(inputValue.trim()) }
      await new Promise((r) => setTimeout(r, 1000))
      setStep("verify")
      startCountdown()
    } catch (error:any) {
       const status=error?.response.status
        const responseData = error?.response?.data
        const fieldErrors: typeof errors = {}
      if (status==429){
      
        errors.general="  Requets Attempts exceeded.Try again later"
      }
        // Check if error is in the nested { error: { field: [messages] } } format
        if (responseData?.error && typeof responseData.error === 'object') {
          
          const errorObj = responseData.error
          // Map each field error
          if (errorObj.phone) errors.phone = errorObj.phone[0]
          if (errorObj.email) errors.email = errorObj.email[0]
          
          
          
          // Handle non_field_errors (e.g., password mismatch)
          if (errorObj.non_field_errors) {
            errors.general = errorObj.non_field_errors[0]
          }
          
          // Handle generic detail message
          if (errorObj.detail) errors.general = errorObj.detail
        }
        
        // Fallback for other error formats
        else if (responseData?.detail) {
          errors.general = responseData.detail
        
        
        // If no specific errors found
        if (Object.keys(fieldErrors).length === 0) {
          errors.general = "Something went wrong. Please try again."
        }
      
      
      
        setErrors(fieldErrors)  
      }
    } finally {
      setSending(false)
    }
  }

  const handleResend = async () => {
    if (resendCountdown > 0) return
    setSending(true)
    try {
      if (type === "email") {
        await userService.changeEmailRequest(inputValue.trim())
      }
      if (type === "phone") {
        await userService.changePhoneRequest(inputValue.trim())
      }


      await new Promise((r) => setTimeout(r, 800)) // mock
      setCode(["", "", "", "", "", ""])
      startCountdown()
    } catch (e){
      showBanner("error", "Failed to resend code.Try again ")
    } finally {
      setSending(false)
    }
  }

  const handleVerify = async () => {
    if (!isCodeComplete) return
    setVerifying(true)
    try {
      if (type === "email") {
        await userService.changeEmailVerify(inputValue, code.join(""))
      }
      if (type === "phone") { await userService.changePhoneVerify(inputValue, code.join("")) }
      await new Promise((r) => setTimeout(r, 1000)) // mock
      showBanner(
        "success",
        `Your ${isEmail ? "email" : "phone number"} has been updated successfully.`,
        
      )
      setStep("input")
      setInputValue("")
      setCode(["", "", "", "", "", ""])
    } catch {
      showBanner("error", "The code you entered is incorrect. Please try again.")
      setCode(["", "", "", "", "", ""])
    } finally {
      setVerifying(false)
    }
  }
  //  Step 1: Enter new value 
  if (step === "input") {
    return (
      <View style={vpStyles.container}>
        {/* Current value card */}
        <View style={[vpStyles.currentCard, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
          <View>
            <Text style={[vpStyles.currentLabel, { color: theme.textMuted }]}>
              Current {isEmail ? "email" : "phone"}
            </Text>
            <Text style={[vpStyles.currentValue, { color: theme.textPrimary }]}>
              {currentValue || "—"}
            </Text>
          </View>
          <View style={[vpStyles.badge, { backgroundColor: theme.primary + "22" }]}>
            <Text style={[vpStyles.badgeText, { color: theme.primary }]}>●  Active</Text>
          </View>
        </View>

        <Text style={[vpStyles.sectionTitle, { color: theme.textSecondary }]}>
          {isEmail ? "New email address" : "New phone number"}
        </Text>
        <Text style={[vpStyles.hint, { color: theme.textMuted }]}>
          {isEmail
            ? "We'll send a 6-digit verification code to confirm ownership."
            : "We'll send a 6-digit SMS code to confirm your number."}
        </Text>

        <FormInput
          label={isEmail ? "Email" : "Phone number"}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder={isEmail ? "you@example.com" : "+254 12345678"}
          keyboardType={isEmail ? "email-address" : "phone-pad"}
          autoCapitalize="none"
          error={isEmail ? errors.email : errors.phone}
          
        />

            {errors.general &&(
              <Text style={styles.error}>{errors.general}</Text>
            )}
        <TouchableOpacity
          style={[
            vpStyles.primaryBtn,
            {
              backgroundColor: inputValue.trim() ? theme.primary : theme.border,
              opacity: sending ? 0.7 : 1,
            },
          ]}
          onPress={handleSendCode}
          disabled={!inputValue.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={vpStyles.primaryBtnText}>Send verification code</Text>
          )}
        </TouchableOpacity>
      </View>
    )
  }

  //  Step 2: Enter OTP 
  return (
    <View style={vpStyles.container}>
      <TouchableOpacity
        style={vpStyles.backRow}
        onPress={() => { setStep("input"); setCode(["", "", "", "", "", ""]) }}
      >
        <Text style={[vpStyles.backArrow, { color: theme.textMuted }]}>←</Text>
        <Text style={[vpStyles.backText, { color: theme.textMuted }]}>Change {isEmail ? "email" : "number"}</Text>
      </TouchableOpacity>

      <View style={vpStyles.otpHeader}>
        <Text style={[vpStyles.otpTitle, { color: theme.textPrimary }]}>Enter verification code</Text>
        <Text style={[vpStyles.otpSub, { color: theme.textMuted }]}>
          A 6-digit code was sent to{"\n"}
          <Text style={{ color: theme.textSecondary, fontWeight: "600" }}>{inputValue}</Text>
        </Text>
      </View>

      <OtpInput code={code} onChange={setCode} theme={theme} />

      <TouchableOpacity
        style={[
          vpStyles.primaryBtn,
          {
            backgroundColor: isCodeComplete ? theme.primary : theme.border,
            opacity: verifying ? 0.7 : 1,
          },
        ]}
        onPress={handleVerify}
        disabled={!isCodeComplete || verifying}
      >
        {verifying ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={vpStyles.primaryBtnText}>Confirm & update</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={vpStyles.resendRow}
        onPress={handleResend}
        disabled={resendCountdown > 0 || sending}
      >
        <Text style={[vpStyles.resendText, { color: resendCountdown > 0 ? theme.textMuted : theme.primary }]}>
          {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : "Resend code"}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const vpStyles = StyleSheet.create({
  container: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, gap: Spacing.sm },
  currentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  currentLabel: { fontSize: FontSize.xs, marginBottom: 2 },
  currentValue: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  badgeText: { fontSize: FontSize.xs, fontWeight: "600" },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginTop: Spacing.sm },
  hint: { fontSize: FontSize.xs, lineHeight: 18, marginBottom: Spacing.xs },
  primaryBtn: {
    height: 50,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  primaryBtnText: { color: "#fff", fontSize: FontSize.md, fontWeight: FontWeight.bold },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: Spacing.md },
  backArrow: { fontSize: 18, lineHeight: 20 },
  backText: { fontSize: FontSize.sm },
  otpHeader: { alignItems: "center", gap: 6, marginBottom: Spacing.sm },
  otpTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  otpSub: { fontSize: FontSize.sm, textAlign: "center", lineHeight: 20 },
  resendRow: { alignItems: "center", marginTop: Spacing.sm, paddingVertical: Spacing.sm },
  resendText: { fontSize: FontSize.sm, fontWeight: "500" },
})

// ─ Main Screen 
export default function EditProfileScreen() {
  const theme = useTheme()
  const { user, setUser } = useAuthStore()
  const queryClient=useQueryClient()
    const { tab} = useLocalSearchParams<{ tab: string }>()

  const [activeTab, setActiveTab] = useState<Tab>("general")
  const [form, setForm] = useState({
    name: user?.name ?? "",
    bio: user?.bio ?? "",
    location: user?.location ?? "",
    phone: user?.phone ?? "",
    username: user?.username ?? "",
  })
    const [banner, setBanner] = useState<BannerState | null>(null);
  
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [generalErrors, setGeneralErrors] = useState("")
  const [errors, setErrors] = useState<Partial<typeof form>>({})
  const [avatarFile, setAvatarFile] = useState<{ uri: string; name: string; type: string } | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const tabs: { key:Partial<Tab>; label: string }[] = [
    { key: "general", label: "General" },
    { key: "email", label: "Email" },
    // { key: "phone", label: "Phone" },
  ]
  const [permissions, setPermissions] = useState<{
    is_allowed_to_change_email: boolean;
    is_allowed_to_change_username: boolean;
    remaining_email_days: number;
    remaining_username_days: number;
  } | null>(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const data = await userService.getPermissions();
        setPermissions(data);
      } catch (error) {
        permissions?.is_allowed_to_change_email === false
        permissions?.is_allowed_to_change_username === false
      }
    };

    fetchPermissions();
  }, []);
  const showBanner = useCallback((type: BannerType, message: string) => {
      setBanner({ id: Date.now(), type, message });
    }, []);
  useEffect(()=>{
if(tab==="phone")
  setActiveTab("phone")
  },[tab])
  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      const uri = asset.uri
      const name = uri.split("/").pop() ?? `avatar_${Date.now()}.jpg`
      const type = asset.mimeType ?? "image/jpeg"
      setAvatarFile({ uri, name, type })
      setAvatarPreview(uri)
    }
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      userService.updateProfile({
        name: form.name.trim(),
        bio: form.bio.trim(),
        location: form.location.trim(),
        avatarFile,
        phone: form.phone,
        username:form.username
      }),
    onSuccess: (updated) => {
      setUser(updated)
      showBanner("success", "Profile updated successfully")
       
        
           queryClient.invalidateQueries({ queryKey: ["profile", user?.username] })
      
    },
    onError: (error: any) => {
      showBanner("error","Failed to update try again")
      const status = error?.response.status
      const responseData = error?.response?.data
      if (status == 429) {

        setGeneralErrors("attempts exceeded.Try again later")
      }
      // Check if error is in the nested { error: { field: [messages] } } format
      if (responseData?.error && typeof responseData.error === 'object') {

        const errorObj = responseData.error

        // Map each field error
        if (errorObj.username) errors.username = errorObj.username[0]

        if (errorObj.name) errors.name = errorObj.name[0]

        // Handle non_field_errors (e.g., password mismatch)
        if (errorObj.non_field_errors) {
          setGeneralErrors(errorObj.non_field_errors[0])
        }

        // Handle generic detail message
        if (errorObj.detail) setGeneralErrors(errorObj.detail)
      }

      // Fallback for other error formats
      else if (responseData?.detail) {
        setGeneralErrors(responseData.detail)
      }

      // If no specific errors found
      if (!responseData) {
        setGeneralErrors("Something went wrong. Please try again.")
      }

    }
  })

  const validate = (): boolean => {
    const newErrors: typeof errors = {}
    if (form.name && form.name.trim().length < 2)
      newErrors.name = "Name must be at least 2 characters"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    saveMutation.mutate()
  }


  const currentAvatar = avatarPreview ?? user?.avatar

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      {banner && (
              <AnimatedBanner
                key={banner.id}
                type={banner.type}
                message={banner.message}
                onHide={() => setBanner(null)}
              />
            )}
      {/*  Header  */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.headerBack, { color: theme.textPrimary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Edit Profile</Text>
        {activeTab === "general" ? (
          <TouchableOpacity onPress={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <ActivityIndicator color={theme.primary} size="small" />
            ) : (
              <Text style={[styles.saveButton, { color: theme.primary }]}>Save</Text>
            )}
          </TouchableOpacity>
        ) : (
          // Placeholder to keep title centered
          <View style={{ width: 40 }} />
        )}
      </View>

      {/*  Tab Bar  */}
      <View style={[styles.tabBar, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? theme.primary : theme.textMuted },
                ]}
              >
                {tab.label}
              </Text>
              {isActive && (
                <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} />
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      {/*  Content  */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {/* GENERAL TAB */}
        {activeTab === "general" && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
            {/* Avatar */}
            <View style={styles.avatarSection}>
              <TouchableOpacity style={styles.avatarWrapper} onPress={pickAvatar} disabled={isUploadingAvatar}>
                <Image source={{ uri: currentAvatar ?? undefined }} style={styles.avatar} contentFit="cover" />
                {isUploadingAvatar ? (
                  <View style={[styles.avatarOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
                    <ActivityIndicator color="#fff" />
                  </View>
                ) : (
                  <View style={[styles.avatarOverlay, { backgroundColor: "rgba(0,0,0,0.35)" }]}>
                    <Text style={styles.cameraIcon}></Text>
                  </View>
                )}
              </TouchableOpacity>
              <Text
                onPress={pickAvatar}
                style={[styles.changePhotoText, { color: theme.primary }]}
              >
                Change Photo
              </Text>
            </View>

            <Text style={[styles.readOnlyNote, { color: "#b42121" }]}>{generalErrors}</Text>


            {/* Form */}
            <View style={styles.form}>
              <FormInput
                label="Full Name"
                info="Displayed to your profile viewers depending on whether you enable/disable in Privacy settings"
                value={form.name}
                onChangeText={(t) => {
                  setForm((f) => ({ ...f, name: t }))
                  if (errors.name) setErrors((e) => ({ ...e, name: undefined }))
                }}
                error={errors.name}
                placeholder="Your full name"
                autoCapitalize="words"
              />

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                  Bio{" "}
                  <Text style={[styles.infoText, { color: theme.textMuted }]}>
                    Displayed to your profile viewers
                  </Text>
                </Text>
                <View style={[styles.bioInput, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                  <FormInput
                    label=""
                    value={form.bio}
                    onChangeText={(t) => setForm((f) => ({ ...f, bio: t }))}
                    placeholder="Tell people about yourself..."
                    multiline
                    maxLength={160}
                  />
                </View>
                <Text style={[styles.charCount, { color: theme.textMuted }]}>{form.bio.length} / 160</Text>
              </View>

              <FormInput
                label="Location"
                info="Displayed to your profile viewers depending on whether you enable/disable in Privacy settings"
                value={form.location}
                onChangeText={(t) => setForm((f) => ({ ...f, location: t }))}
                placeholder="e.g. Nairobi, Kenya"
              />

              {/* Username — read only */}
              {permissions?.is_allowed_to_change_username ? (
                <FormInput
                  label="Username"
                  info="Displayed generally throughout the platform, does not affect your Full Nmae"
                  value={form.username}
                  onChangeText={(t) => {
                    setForm((f) => ({ ...f, username: t }))
                    if (errors.username) setErrors((e) => ({ ...e, name: undefined }))
                  }}
                  error={errors.username}
                  placeholder="Your username"
                  autoCapitalize="none"
                />
              ) : (
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Username</Text>
                  <View style={[styles.readOnlyField, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                    <Text style={[styles.readOnlyText, { color: theme.textMuted }]}>@{user?.username}</Text>
                  </View>
                  <Text style={[styles.readOnlyNote, { color: "#b42121" }]}>🔒Changed once in seven days .{permissions?.remaining_username_days} remaining</Text>

                </View>)}
            </View>
          </ScrollView>
        )}

        {/* EMAIL TAB */}
        {activeTab === "email" && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >{permissions?.is_allowed_to_change_email ? (
            <VerifyPanel type="email" currentValue={user?.email ?? ""} theme={theme} />
          ) : (
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Email</Text>
              <View style={[styles.readOnlyField, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                <Text style={[styles.readOnlyText, { color: theme.textMuted }]}>@{user?.email}</Text>
              </View>
              <Text style={[styles.readOnlyNote, { color: "#c82424" }]}>🔒Changed only once in every 7 days.{permissions?.remaining_email_days} days remaining</Text>

            </View>)}
          </ScrollView>
        )}

        {/* PHONE TAB */}
        {activeTab === "phone" && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
            <VerifyPanel type="phone" currentValue={user?.phone ?? ""} theme={theme} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  headerBack: { fontSize: 24, fontWeight: FontWeight.bold, width: 32 },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  saveButton: { fontSize: FontSize.md, fontWeight: FontWeight.bold, minWidth: 40, textAlign: "right" },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm + 2,
    position: "relative",
  },
  tabLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  error: {
    fontSize: FontSize.sm,
    color:"red",
    fontWeight: FontWeight.semibold,
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: "15%",
    right: "15%",
    height: 2.5,
    borderRadius: 2,
  },

  // Scroll content
  content: { paddingBottom: Spacing.xxl },

  // Avatar
  avatarSection: { alignItems: "center", paddingVertical: Spacing.xl, gap: Spacing.sm },
  avatarWrapper: { width: 100, height: 100, borderRadius: 50, overflow: "hidden", position: "relative" },
  avatar: { width: "100%", height: "100%", backgroundColor: Colors.gray[200] },
  avatarOverlay: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  cameraIcon: { fontSize: 24 },
  changePhotoText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },

  // Form
  form: { paddingHorizontal: Spacing.md, gap: Spacing.lg },
  fieldGroup: { gap: Spacing.xs },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, letterSpacing: 0.3 },
  bioInput: { borderRadius: Radius.md },
  charCount: { fontSize: FontSize.xs, textAlign: "right" },
  readOnlyField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    height: 52,
  },
  readOnlyText: { fontSize: FontSize.md },
  readOnlyNote: { fontSize: FontSize.xs },
  infoText: { fontFamily: "sans-serif", fontSize: 10 },
})
