

//edit post

import React, { useState, useCallback, useEffect } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import { useAuthStore } from "@/stores/auth.store"
import { useLocation } from "@/hooks/useLocation"
import { FormInput } from "@/components/ui/FormInput"
import { listingService,  } from "@/services/listing.service"
import { feedService } from "@/services/feed.service"
import { Category } from "@/types"
import {  Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"

type Step = "form" | "saving" | "success"

export default function EditPostScreen() {
  const theme = useTheme()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const { slug } = useLocalSearchParams<{ slug: string }>()

  const [step, setStep] = useState<Step>("form")

  //  form state 
  const [form, setForm] = useState({
    name: "",
    description: "",
    
    category: "",
    location: "",
  })
  const [errors, setErrors] = useState<Partial<typeof form>>({})

  //  location (auto GPS) ─
  const { location: gpsLocation } = useLocation()

  //  fetch existing listing 
  const { data: listing, isError, refetch, isLoading: isLoadingListing } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => feedService.getPost(slug),
    enabled: !!slug,
  })


  //    fetch categories 
  const { data: categoriesData } = useQuery({
    queryKey: ["categories",slug],
    queryFn: feedService.getCategories,
    staleTime: 10 * 60 * 1000,
  })
  const categories: Category[] = categoriesData?.data ?? []

  //  update form field ─
  const updateField = (field: keyof typeof form, value: any) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }



  //  pre-populate form once listing AND categories are loaded 
  useEffect(() => {
    if (!listing || categories.length === 0) return

    // listing.category is a Category object, pull id and name out first
    const categoryId = listing.category?.id
    const categoryName = listing.category?.name

    const matchedCategory = categories.find(
      (c) => c.id === categoryId || c.name === categoryName
    )

    setForm({
      name: listing.name ?? "",
      description: listing.description ?? "",
    
      category: matchedCategory?.id ?? categoryId ?? "",
      location: listing.location_display ?? "",
    })
  }, [listing, categories])

  //  validate form ─
  const validate = (): boolean => {
    const newErrors: typeof errors = {}

    if (!form.name.trim() || form.name.trim().length < 3)
      newErrors.name = "Name must be at least 3 characters"

   

    if (!form.category)
      newErrors.category = "Please select a category"

    if (!form.description.trim() )
      newErrors.description = "Description must be at least 20 characters"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  //  submit (update) mutation 
  const submitMutation = useMutation({
    mutationFn: () => {
      setStep("saving")
      return listingService.updateListing(slug, {
        name: form.name.trim(),
        description: form.description.trim(),
       
        category: form.category,
        location_display: form.location.trim(),
        location_lat: gpsLocation?.lat ?? listing?.location_lat ?? 0,
        location_lng: gpsLocation?.lng ?? listing?.location_lng ?? 0,
      })
    },
    onSuccess: (updated) => {
      // Invalidate so product page and feed refresh
      queryClient.invalidateQueries({ queryKey: ["listing", slug] })
      queryClient.invalidateQueries({ queryKey: ["feed"] })
      setStep("success")
      setTimeout(() => {
        router.replace(`/post/${updated.slug}`)
      }, 1500)
    },
    onError: (error: any) => {
      setStep("form")
      const detail = error?.response?.data?.detail ?? "Failed to save changes. Try again."
      Alert.alert("Error", detail)
    },
  })

  const handleSubmit = () => {
    if (!validate()) return
    submitMutation.mutate()
  }

  //  auth check 
  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
        <View style={styles.centeredScreen}>
          <Text style={[styles.guestTitle, { color: theme.textPrimary }]}>Not logged in</Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.primaryButtonText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  //  loading existing listing 
  if (isLoadingListing) {
    return (
      <View style={[styles.centeredScreen, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} size="large" />
        <Text style={[styles.uploadingTitle, { color: theme.textSecondary }]}>
          Loading listing...
        </Text>
      </View>
    )
  }
  if (isError) {
    return (
      <View style={styles.loading}>
        <Text style={[styles.errorIcon]}>⚠️</Text>
        <Text style={[styles.errorText, { color: theme.textMuted }]}>
          Failed to loadthis users profile
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, { borderColor: theme.primary }]}
          onPress={() => refetch()}
        >
          <Text style={[styles.retryText, { color: theme.primary }]}>
            Try again
          </Text>
        </TouchableOpacity>
      </View>)
  }
  //  saving screen ─
  if (step === "saving") {
    return (
      <View style={[styles.centeredScreen, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} size="large" />
        <Text style={[styles.uploadingTitle, { color: theme.textPrimary }]}>
          Saving changes...
        </Text>
      </View>
    )
  }

  //  success screen 
  if (step === "success") {
    return (
      <View style={[styles.centeredScreen, { backgroundColor: theme.background }]}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={[styles.successTitle, { color: theme.textPrimary }]}>
          Changes saved!
        </Text>
        <Text style={[styles.successSub, { color: theme.textSecondary }]}>
          Your listing has been updated successfully.
        </Text>
        <ActivityIndicator color={theme.primary} size="small" style={{ marginTop: Spacing.lg }} />
      </View>
    )
  }

  //  edit form ─
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>

      {/* header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.headerBack, { color: theme.textPrimary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Edit Listing</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={submitMutation.isPending}>
          <Text style={[styles.saveButton, { color: theme.primary }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.formContent}
        >

          {/*  existing media (read-only preview) ─ */}
          {listing?.images && listing.images.length > 0 && (
            <View style={styles.mediaSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {listing.images.map((img: any, i: number) => (
                  <Image
                    key={i}
                    source={{ uri: img.image ?? img }}
                    style={[styles.mediaThumb, { borderColor: theme.border }]}
                    resizeMode="cover"
                  />

                ))}
              </ScrollView>
              <Text style={[styles.mediaNote, { color: theme.textMuted }]}>
                🔒 Media cannot be changed after posting
              </Text>
            </View>
          )}

          <View style={styles.form}>

            {/* name */}
            <FormInput
              label="Post Name"
              value={form.name}
              onChangeText={(t) => updateField("name", t)}
              error={errors.name}
              placeholder="e.g. iPhone 14 Pro 128gb"
              returnKeyType="next"
            />

            {/* category */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryChips}
              >
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: form.category === cat.id ? theme.primary : theme.surfaceSecondary,
                        borderColor: form.category === cat.id ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => updateField("category", cat.id)}
                  >
                    {cat.icon && <Text style={styles.categoryIcon}>{cat.icon}</Text>}
                    <Text style={[
                      styles.categoryChipText,
                      { color: form.category === cat.id ? "#fff" : theme.textSecondary },
                    ]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {errors.category && (
                <Text style={[styles.fieldError, { color: theme.error }]}>{errors.category}</Text>
              )}
            </View>

            {/* description */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Description</Text>
              <TextInput
                style={[
                  styles.descriptionInput,
                  {
                    backgroundColor: theme.inputBackground,
                    color: theme.textPrimary,
                    borderColor: errors.description ? theme.error : theme.border,
                  },
                ]}
                value={form.description}
                onChangeText={(t) => updateField("description", t)}
                placeholder="Describe your product — condition, specs, reason for selling..."
                placeholderTextColor={theme.textPlaceholder}
                multiline
                maxLength={2000}
                textAlignVertical="top"
              />
              <View style={styles.descriptionFooter}>
                {errors.description && (
                  <Text style={[styles.fieldError, { color: theme.error }]}>{errors.description}</Text>
                )}
                <Text style={[styles.charCount, { color: theme.textMuted }]}>
                  {form.description.length} / 2000
                </Text>
              </View>
            </View>

           

            {/* save button */}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.primary }]}
              onPress={handleSubmit}
              disabled={submitMutation.isPending}
              activeOpacity={0.85}
            >
              <Text style={styles.submitButtonText}>💾 Save Changes</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centeredScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  headerBack: { fontSize: 22, fontWeight: FontWeight.bold, width: 40 },
  headerTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  saveButton: { fontSize: FontSize.md, fontWeight: FontWeight.bold, width: 40, textAlign: "right" },
  mediaSection: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  mediaThumb: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  mediaNote: { fontSize: FontSize.xs, marginTop: 4 },
  formContent: { paddingBottom: Spacing.xxl },
  form: { paddingHorizontal: Spacing.md, gap: Spacing.lg },
  priceRow: { flexDirection: "row", gap: Spacing.md, alignItems: "flex-end" },
  priceInput: { flex: 1 },
  negotiableToggle: { alignItems: "center", gap: 4, paddingBottom: Spacing.xs },
  negotiableLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  fieldGroup: { gap: Spacing.sm },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, letterSpacing: 0.3 },
  fieldError: { fontSize: FontSize.xs },
  categoryChips: { gap: Spacing.sm, paddingRight: Spacing.md },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  categoryIcon: { fontSize: 14 },
  categoryChipText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  descriptionInput: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: FontSize.md,
    minHeight: 120,
    maxHeight: 200,
  },
  descriptionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  charCount: { fontSize: FontSize.xs, textAlign: "right", flex: 1 },
  gpsStatus: { fontSize: FontSize.xs, marginTop: -Spacing.xs },
  submitButton: {
    height: 56,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  submitButtonText: { color: "#fff", fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  guestTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold },
  primaryButton: {
    width: "100%",
    height: 54,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: "#fff", fontSize: FontSize.md, fontWeight: FontWeight.bold },
  uploadingTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, textAlign: "center" },
  successIcon: { fontSize: 72 },
  successTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, textAlign: "center" },
  successSub: { fontSize: FontSize.md, textAlign: "center", lineHeight: 22, paddingHorizontal: Spacing.md },

  retryBtn: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  retryText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  errorText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },

})
