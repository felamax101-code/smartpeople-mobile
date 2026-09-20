import React, { useCallback, useEffect, useRef, useState } from "react"
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
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Image } from "expo-image"
import { router, useLocalSearchParams } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { communityservice, GroupPrivacy, CreateGroupPayload } from "@/services/community.sevice"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { useTheme } from "@/hooks/useTheme"
import { useAuthStore } from "@/stores/auth.store"
import { AnimatedBanner, BannerType, BannerState } from "@/components/activityIndicator/AnimatedBanner"

interface GroupDetail {
  slug: string
  name: string
  description: string
  privacy: GroupPrivacy
  rules: string[]
  avatar: string | null
}

type EditPayload = Partial<CreateGroupPayload>

type EditableField = "name" | "description" | "privacy" | "avatar"

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

export default function EditGroupScreen() {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const [avatarUri, setAvatarUri] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [privacy, setPrivacy] = useState<GroupPrivacy>("public")
  const [rules, setRules] = useState<string[]>([])
  const [fieldErrors, setFieldErrors] = useState<string[]>([])
  const [ruleDraft, setRuleDraft] = useState("")
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [banner, setBanner] = useState<BannerState | null>(null);

  const [editingFields, setEditingFields] = useState<Record<EditableField, boolean>>({
    name: false,
    description: false,
    privacy: false,
    avatar: false,
  })

  // snapshot of the last-saved values, used to revert on cancel and to build the diff payload
  const originalRef = useRef({
    name: "",
    description: "",
    privacy: "public" as GroupPrivacy,
    avatarUri: null as string | null,
  })
  const originalRulesRef = useRef<string[]>([])

  // ── fetch existing group data ─────────────────────────────
  const {
    data: groupData,
    isLoading: isLoadingGroup,
    isError: isLoadGroupError,
    refetch: refetchGroup,
  } = useQuery({
    queryKey: ["groups", "detail", slug],
    queryFn: () => communityservice.getCommunityData(slug),
    enabled: !!slug,
  })
  const showBanner = useCallback((type: BannerType, message: string) => {
    setBanner({ id: Date.now(), type, message });
  }, []);
  useEffect(() => {
    if (groupData && !isInitialized) {
      setName(groupData.name ?? "")
      setDescription(groupData.description ?? "")
      setPrivacy(groupData.privacy ?? "public")
      setRules(groupData.rules ?? [])
      setAvatarUri(groupData.cover_image ?? null)

      originalRef.current = {
        name: groupData.name ?? "",
        description: groupData.description ?? "",
        privacy: groupData.privacy ?? "public",
        avatarUri: groupData.cover_image ?? null,
      }
      originalRulesRef.current = groupData.rules ?? []
      setIsInitialized(true)
    }
  }, [groupData, isInitialized])

  // ── update group mutation ─────────────────────────────────
  const {
    mutate: submitUpdateGroup,
    isPending: isSubmitting,
    isError: isSubmitError,
    reset: resetSubmitError,
  } = useMutation({
    mutationFn: (payload: EditPayload) => communityservice.updateGroup(slug, payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["groups", "detail", slug] })
      queryClient.invalidateQueries({ queryKey: ["groups", "mine", user] })

      // reset edit state to the freshly saved values
      originalRef.current = { name, description, privacy, avatarUri }
      originalRulesRef.current = rules
      setEditingFields({ name: false, description: false, privacy: false, avatar: false })
      setEditingRuleIndex(null)

      showBanner("success", "Your changes have been saved.")
      //   const newSlug = response?.slug ?? slug
      //   router.replace(`/community/${newSlug}`)
    },
    onError: (error: any) => {
      const status = error?.response?.status
      const responseData = error?.response?.data
      const nextFieldErrors: any = []

      if (status === 429) {
        nextFieldErrors.push("Too many attempts. Try again later.")
      }

      if (responseData?.error && typeof responseData.error === "object") {
        const errorObj = responseData.error
        if (errorObj.name) nextFieldErrors.push(errorObj.name[0])
        if (errorObj.description) nextFieldErrors.push(errorObj.description[0])
        if (errorObj.non_field_errors) nextFieldErrors.push(errorObj.non_field_errors[0])
      }

      if (nextFieldErrors.length === 0) {
        nextFieldErrors.push(getErrorMessage(error) ?? "Something went wrong. Please try again.")
      }

      setFieldErrors(nextFieldErrors)
    },
  })

  // ── per-field edit toggling ───────────────────────────────
  const toggleFieldEdit = useCallback(
    (field: EditableField) => {
      setEditingFields((prev) => {
        const wasEditing = prev[field]
        // turning OFF edit mode reverts any unsaved change for that field
        if (wasEditing) {
          switch (field) {
            case "name":
              setName(originalRef.current.name)
              break
            case "description":
              setDescription(originalRef.current.description)
              break
            case "privacy":
              setPrivacy(originalRef.current.privacy)
              break
            case "avatar":
              setAvatarUri(originalRef.current.avatarUri)
              break
          }
        }
        return { ...prev, [field]: !wasEditing }
      })
    },
    []
  )

  // ── avatar picker ──────────────────────────────────────────
  const handlePickAvatar = useCallback(async () => {
    if (!editingFields.avatar) return

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      showBanner("error", "Enable photo library access in Settings to add a group avatar.")
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
  }, [editingFields.avatar])

  // ── rules list: add or edit ───────────────────────────────
  const handleEditRule = useCallback(
    (index: number) => {
      setEditingRuleIndex(index)
      setRuleDraft(rules[index])
    },
    [rules]
  )

  const handleCancelRuleEdit = useCallback(() => {
    setEditingRuleIndex(null)
    setRuleDraft("")
  }, [])

  const handleAddOrUpdateRule = useCallback(() => {
    const trimmed = ruleDraft.trim()
    if (!trimmed) return

    if (editingRuleIndex !== null) {
      setRules((prev) => prev.map((r, i) => (i === editingRuleIndex ? trimmed : r)))
      setEditingRuleIndex(null)
    } else {
      setRules((prev) => [...prev, trimmed])
    }
    setRuleDraft("")
  }, [ruleDraft, editingRuleIndex])

  const handleRemoveRule = useCallback(
    (index: number) => {
      setRules((prev) => prev.filter((_, i) => i !== index))
      if (editingRuleIndex === index) {
        setEditingRuleIndex(null)
        setRuleDraft("")
      }
    },
    [editingRuleIndex]
  )

  // ── save ───────────────────────────────────────────────────
  const rulesDirty = JSON.stringify(rules) !== JSON.stringify(originalRulesRef.current)
  const isDirty = Object.values(editingFields).some(Boolean) || rulesDirty

  const canSave =
    isDirty &&
    !isSubmitting &&
    (editingFields.name ? name.trim().length > 0 : true) &&
    (editingFields.description ? description.trim().length > 0 : true)

  const handleSubmit = useCallback(() => {
    if (!canSave) return

    const payload: EditPayload = {}
    if (editingFields.name) payload.name = name.trim()
    if (editingFields.description) payload.description = description.trim()
    if (editingFields.privacy) payload.privacy = privacy
    if (editingFields.avatar && avatarUri !== originalRef.current.avatarUri) {
      payload.cover_image = avatarUri
    }
    if (rulesDirty) payload.rules = rules

    submitUpdateGroup(payload)
  }, [canSave, editingFields, name, description, privacy, avatarUri, rules, rulesDirty, submitUpdateGroup])

  // ── loading / error states for the initial fetch ───────────
  if (isLoadingGroup) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </SafeAreaView>
    )
  }

  if (isLoadGroupError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.failedContainer}>
          <Text style={styles.failedIcon}>😕</Text>
          <Text style={[styles.failedTitle, { color: theme.textPrimary }]}>Couldn't load this group</Text>
          <Text style={[styles.failedMessage, { color: theme.textMuted }]}>
            Something went wrong fetching the group details.
          </Text>
          <TouchableOpacity style={styles.failedPrimaryBtn} onPress={() => refetchGroup()} activeOpacity={0.85}>
            <Text style={styles.failedPrimaryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.failedSecondaryBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={[styles.failedSecondaryBtnText, { color: theme.primary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      {banner && (
        <AnimatedBanner
          key={banner.id}
          type={banner.type}
          message={banner.message}
          onHide={() => setBanner(null)}
        />
      )}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Text style={[styles.backIcon, { color: theme.textPrimary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Edit Group</Text>
        <View style={styles.backBtn} />
      </View>

      {isSubmitError ? (
        <View style={styles.failedContainer}>
          <Text style={styles.failedIcon}>😕</Text>
          <Text style={[styles.failedTitle, { color: theme.textPrimary }]}>Couldn't save your changes</Text>
          <Text style={[styles.failedMessage, { color: theme.textMuted }]}>
            {fieldErrors?.[0] ??
              "Something went wrong on our end. Your details are still here, so it's safe to try again."}
          </Text>
          <TouchableOpacity style={styles.failedPrimaryBtn} onPress={handleSubmit} activeOpacity={0.85}>
            <Text style={styles.failedPrimaryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.failedSecondaryBtn} onPress={resetSubmitError} activeOpacity={0.7}>
            <Text style={[styles.failedSecondaryBtnText, { color: theme.primary }]}>Back to Editing</Text>
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
              <TouchableOpacity
                style={styles.avatarPicker}
                onPress={handlePickAvatar}
                activeOpacity={editingFields.avatar ? 0.8 : 1}
              >
                {(avatarUri) ? (
                  <Image source={avatarUri ?? ""} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: theme.surfaceSecondary }]}>
                    <Text style={styles.avatarPlaceholderIcon}>📷</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[
                    styles.avatarEditBadge,
                    { backgroundColor: editingFields.avatar ? theme.primary : theme.textMuted },
                  ]}
                  onPress={() => toggleFieldEdit("avatar")}
                  hitSlop={8}
                >
                  <Text style={styles.avatarEditIcon}>✎</Text>
                </TouchableOpacity>
              </TouchableOpacity>
              <Text style={[styles.avatarHint, { color: theme.textMuted }]}>
                {editingFields.avatar ? "Tap the image to choose a new avatar" : "Group avatar"}
              </Text>
            </View>

            {/* name */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: theme.textPrimary }]}>
                  Group Name <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity onPress={() => toggleFieldEdit("name")} hitSlop={8} style={styles.editIconBtn}>
                  <Text style={[styles.editIconText, { color: editingFields.name ? theme.primary : theme.textMuted }]}>
                    {editingFields.name ? "Cancel" : "✎ Edit"}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.textPrimary,
                    borderColor: editingFields.name ? theme.primary : theme.textMuted,
                    opacity: editingFields.name ? 1 : 0.6,
                  },
                ]}
                placeholder="What's your group called?"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
                editable={editingFields.name}
                maxLength={100}
              />
            </View>

            {/* description */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: theme.textPrimary }]}>
                  Description <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => toggleFieldEdit("description")}
                  hitSlop={8}
                  style={styles.editIconBtn}
                >
                  <Text
                    style={[
                      styles.editIconText,
                      { color: editingFields.description ? theme.primary : theme.textMuted },
                    ]}
                  >
                    {editingFields.description ? "Cancel" : "✎ Edit"}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    color: theme.textPrimary,
                    borderColor: editingFields.description ? theme.primary : theme.textMuted,
                    opacity: editingFields.description ? 1 : 0.6,
                  },
                ]}
                placeholder="What's this group about?"
                placeholderTextColor={Colors.textMuted}
                value={description}
                onChangeText={setDescription}
                editable={editingFields.description}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* privacy */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: theme.textPrimary }]}>Privacy</Text>
                <TouchableOpacity onPress={() => toggleFieldEdit("privacy")} hitSlop={8} style={styles.editIconBtn}>
                  <Text
                    style={[styles.editIconText, { color: editingFields.privacy ? theme.primary : theme.textMuted }]}
                  >
                    {editingFields.privacy ? "Cancel" : "✎ Edit"}
                  </Text>
                </TouchableOpacity>
              </View>
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
                        opacity: editingFields.privacy ? 1 : 0.6,
                      },
                    ]}
                    activeOpacity={editingFields.privacy ? 0.8 : 1}
                    disabled={!editingFields.privacy}
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

              {rules.map((rule, index) => {
                const isEditingThisRule = editingRuleIndex === index
                return (
                  <View
                    key={index}
                    style={[
                      styles.ruleRow,
                      { borderColor: isEditingThisRule ? theme.primary : theme.textMuted },
                    ]}
                  >
                    <Text style={[styles.ruleNumber, { color: theme.textMuted }]}>{index + 1}.</Text>
                    <Text style={[styles.ruleText, { color: theme.textPrimary }]}>{rule}</Text>
                    <TouchableOpacity onPress={() => handleEditRule(index)} hitSlop={8}>
                      <Text style={[styles.ruleEditIcon, { color: theme.primary }]}>✎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleRemoveRule(index)} hitSlop={8}>
                      <Text style={styles.removeRule}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )
              })}

              <View style={styles.addRuleRow}>
                <TextInput
                  style={[
                    styles.ruleInput,
                    {
                      color: theme.textPrimary,
                      borderColor: editingRuleIndex !== null ? theme.primary : theme.textMuted,
                    },
                  ]}
                  placeholder={editingRuleIndex !== null ? "Update rule..." : "Add a rule..."}
                  placeholderTextColor={Colors.textMuted}
                  value={ruleDraft}
                  onChangeText={setRuleDraft}
                  onSubmitEditing={handleAddOrUpdateRule}
                  returnKeyType="done"
                />
                {editingRuleIndex !== null && (
                  <TouchableOpacity style={styles.cancelRuleBtn} onPress={handleCancelRuleEdit}>
                    <Text style={[styles.cancelRuleBtnText, { color: theme.textMuted }]}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.addRuleBtn,
                    { backgroundColor: ruleDraft.trim() ? Colors.primary : Colors.gray[200] },
                  ]}
                  onPress={handleAddOrUpdateRule}
                  disabled={!ruleDraft.trim()}
                >
                  <Text style={styles.addRuleBtnText}>{editingRuleIndex !== null ? "Save" : "Add"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {isDirty && (
            <View style={[styles.footer, { borderTopColor: theme.textMuted, backgroundColor: theme.background }]}>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: canSave ? Colors.primary : Colors.gray[300] }]}
                onPress={handleSubmit}
                disabled={!canSave}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
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
  centered: {
    alignItems: "center",
    justifyContent: "center",
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
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  sublabel: {
    fontSize: FontSize.xs,
    marginBottom: Spacing.sm,
  },
  required: {
    color: Colors.warning,
  },
  editIconBtn: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  editIconText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
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
  ruleEditIcon: {
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.xs,
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
  cancelRuleBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  cancelRuleBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
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
