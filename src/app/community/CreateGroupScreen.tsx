import React, { useCallback, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Image } from "expo-image"
import { router } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { communityservice, GroupPrivacy, CreateGroupPayload } from "@/services/community.sevice"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { useTheme } from "@/hooks/useTheme"
import { useAuthStore } from "@/stores/auth.store"
import { MaterialCommunityIcons } from "@expo/vector-icons"

const PRIVACY_OPTIONS: { value: GroupPrivacy; label: string; description: string; icon: string }[] = [
  {
    value: "public",
    label: "Public",
    description: "Anyone can find this group, see its posts, and join instantly.",
    icon: "🌐",
  },
  {
    value: "private",
    label: "Private",
    description: "Anyone can find this group, but must request to join and be approved.",
    icon: "🔒",
  },
  {
    value: "invite_only",
    label: "Invite Only",
    description: "Hidden from search — people can only join if you invite them directly.",
    icon: "✉️",
  },
]

// Adjust this if your api client throws a different error shape.
function getErrorMessage(error: unknown): string | undefined {
  if (!error) return undefined
  const anyErr = error as any
  return anyErr?.response?.data?.message ?? anyErr?.message
}

export default function CreateGroupScreen() {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const {user}=useAuthStore()
  const [cover_image, setAvatarUri] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [privacy, setPrivacy] = useState<GroupPrivacy>("public")
  const [rules, setRules] = useState<string[]>([])
  const [fieldErrors, setFieldErrors] = useState<string[]>([])
  const [ruleDraft, setRuleDraft] = useState("")
  //  create group mutation ─
  const {
    mutate: submitCreateGroup,
    isPending: isSubmitting,
    isError: isSubmitError,
    reset: resetSubmitError,
  } = useMutation({
    mutationFn: (payload: CreateGroupPayload) => communityservice.createGroup(payload),
    onSuccess: (response) => {
      // so it shows up next time they visit "My Groups"
      queryClient.invalidateQueries({ queryKey: ["groups", "mine"] })
      const newSlug = response.slug
      router.replace(`/community/${newSlug}`)
    },
        onError: (error: any) => {
            const status=error?.response.status
      const responseData = error?.response?.data
      const fieldErrors:any = []
    if (status==429){
    
      fieldErrors["Login attempts exceeded.Try again later"]
    }
      // Check if error is in the nested { error: { field: [messages] } } format
      if (responseData?.error && typeof responseData.error === 'object') {
        
        const errorObj = responseData.error
        
        // Map each field error
        if (errorObj.name) fieldErrors[errorObj.name[0]]
        
        if (errorObj.description) fieldErrors[description[0]]
        
        // Handle non_field_errors (e.g., password mismatch)
        if (errorObj.non_field_errors) {
          fieldErrors[errorObj.non_field_errors[0]]
        }
        
       
      }
      
      
      
      // If no specific errors found
      if (Object.keys(fieldErrors).length === 0) {
        fieldErrors["Something went wrong. Please try again."]
      }
    
    
    
      setFieldErrors(fieldErrors)  
    },
      
  })

  //  avatar picker 
  const handlePickAvatar = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert("Photo access needed", "Enable photo library access in Settings to add a group avatar.")
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets?.[0]?.uri) {
      setAvatarUri(result.assets[0].uri)
    }
  }, [])

  //  rules list ─
  const handleAddRule = useCallback(() => {
    const trimmed = ruleDraft.trim()
    if (!trimmed) return
    setRules((prev) => [...prev, trimmed])
    setRuleDraft("")
  }, [ruleDraft])

  const handleRemoveRule = useCallback((index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index))
  }, [])

  //  submit 
  const canSubmit = name.trim().length > 0 && description.trim().length > 0 && !isSubmitting

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return
    submitCreateGroup({
      name: name.trim(),
      description: description.trim(),
      privacy,
      rules,
      cover_image,
    })
  }, [canSubmit, name, description, privacy, rules, cover_image, submitCreateGroup])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Text style={[styles.backIcon, { color: theme.textPrimary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Create Group</Text>
        <View style={styles.backBtn} />
      </View>

      {isSubmitError ? (
        <View style={styles.failedContainer}>
          <Text style={styles.failedIcon}>😕</Text>
          <Text style={[styles.failedTitle, { color: theme.textPrimary }]}>Couldn't create your group</Text>
          <Text style={[styles.failedMessage, { color: theme.textMuted }]}>
            {fieldErrors ??
              "Something went wrong on our end. Your details are still here, so it's safe to try again."}
          </Text>
          <TouchableOpacity style={styles.failedPrimaryBtn} onPress={handleSubmit} activeOpacity={0.85}>
            <Text style={styles.failedPrimaryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.failedSecondaryBtn} onPress={resetSubmitError} activeOpacity={0.7}>
            <Text style={[styles.failedSecondaryBtnText, { color: theme.primary }]}>Edit Details</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* avatar */}
            <View style={styles.avatarSection}>
              <TouchableOpacity style={styles.avatarPicker} onPress={handlePickAvatar} activeOpacity={0.8}>
                {cover_image ? (
                  <Image source={{ uri: cover_image }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: theme.surfaceSecondary }]}>
                    <Text style={styles.avatarPlaceholderIcon}>\
                      <MaterialCommunityIcons name="camera" color={`${theme.textPrimary}` } size={30} />
                    </Text>
                  </View>
                )}
                <View style={[styles.avatarEditBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.avatarEditIcon}>✎</Text>
                </View>
              </TouchableOpacity>
              <Text style={[styles.avatarHint, { color: theme.textMuted }]}>Group avatar (optional)</Text>
            </View>

            {/* name */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>
                Group Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { color: theme.textPrimary, borderColor: theme.textMuted }]}
                placeholder="What's your group called?"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
                maxLength={100}
              />
            </View>

            {/* description */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>
                Description <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, { color: theme.textPrimary, borderColor: theme.textMuted }]}
                placeholder="What's this group about?"
                placeholderTextColor={Colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* privacy */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>Privacy</Text>
              {PRIVACY_OPTIONS.map((option) => {
                const isSelected = privacy === option.value
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.privacyOption,
                      {
                        borderColor: isSelected ? theme.primary : theme.textMuted,
                        backgroundColor: isSelected ? theme.surfaceSecondary : theme.background,
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => setPrivacy(option.value)}
                  >
                    <Text style={styles.privacyIcon}>{option.icon}</Text>
                    <View style={styles.privacyTextWrap}>
                      <Text style={[styles.privacyLabel, { color: theme.textPrimary }]}>{option.label}</Text>
                      <Text style={[styles.privacyDescription, { color: theme.textMuted }]}>
                        {option.description}
                      </Text>
                    </View>
                    <View style={[styles.radioOuter, { borderColor: isSelected ? theme.primary : theme.textMuted }]}>
                      {isSelected && <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* rules */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>Group Rules</Text>
              <Text style={[styles.sublabel, { color: theme.textMuted }]}>
                Optional — helps members know what's expected
              </Text>

              {rules.map((rule, index) => (
                <View key={index} style={[styles.ruleRow, { borderColor: theme.textMuted }]}>
                  <Text style={[styles.ruleNumber, { color: theme.textMuted }]}>{index + 1}.</Text>
                  <Text style={[styles.ruleText, { color: theme.textPrimary }]}>{rule}</Text>
                  <TouchableOpacity onPress={() => handleRemoveRule(index)} hitSlop={8}>
                    <Text style={styles.removeRule}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.addRuleRow}>
                <TextInput
                  style={[styles.ruleInput, { color: theme.textPrimary, borderColor: theme.textMuted }]}
                  placeholder="Add a rule..."
                  placeholderTextColor={Colors.textMuted}
                  value={ruleDraft}
                  onChangeText={setRuleDraft}
                  onSubmitEditing={handleAddRule}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[
                    styles.addRuleBtn,
                    { backgroundColor: ruleDraft.trim() ? Colors.primary : Colors.gray[200] },
                  ]}
                  onPress={handleAddRule}
                  disabled={!ruleDraft.trim()}
                >
                  <Text style={[styles.addRuleBtnText,{color:theme.primary}]}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.textMuted, backgroundColor: theme.background }]}>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: canSubmit ? Colors.primary : Colors.gray[300] }]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              {isSubmitting ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={[styles.submitBtnText,{color:theme.primary}]}>Create Group</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: {
    width: 32,
  },
  backIcon: {
    fontSize: 28,
    fontWeight: FontWeight.semibold,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  avatarSection: {
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  avatarPicker: {
    width: 96,
    height: 96,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPlaceholderIcon: {
    fontSize: 28,
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  avatarEditIcon: {
    fontSize: 13,
    color: Colors.white,
  },
  avatarHint: {
    fontSize: FontSize.xs,
    marginTop: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  sublabel: {
    fontSize: FontSize.xs,
    marginBottom: Spacing.sm,
  },
  required: {
    color: Colors.warning,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
  },
  textArea: {
    minHeight: 100,
    paddingTop: Spacing.sm,
  },
  privacyOption: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  privacyIcon: {
    fontSize: 22,
  },
  privacyTextWrap: {
    flex: 1,
    gap: 2,
  },
  privacyLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  privacyDescription: {
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  ruleNumber: {
    fontSize: FontSize.sm,
  },
  ruleText: {
    flex: 1,
    fontSize: FontSize.sm,
  },
  removeRule: {
    color: Colors.warning,
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.xs,
  },
  addRuleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  ruleInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
  },
  addRuleBtn: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  addRuleBtnText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  footer: {
    borderTopWidth: 1,
    padding: Spacing.md,
  },
  submitBtn: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  failedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  failedIcon: {
    fontSize: 56,
    marginBottom: Spacing.md,
  },
  failedTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  failedMessage: {
    fontSize: FontSize.sm,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  failedPrimaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    width: "100%",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  failedPrimaryBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  failedSecondaryBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  failedSecondaryBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
})



