
import { useState, useCallback, useEffect } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TextInput,
  BackHandler
} from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams, useFocusEffect } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import { useUploadQueue } from "@/components/createpost/UploadQueuecontext"
import { useNavigation } from "expo-router"
import { useAuthStore } from "@/stores/auth.store"
import { useLocation } from "@/hooks/useLocation"
import { GalleryPicker } from "@/components/createpost/GalleryPicker"
import { MediaTypeSelector } from "@/components/createpost/MediaTypeSelector"
import { ImageStrip } from "@/components/createpost/ImageStrip"
import { FormInput } from "@/components/ui/FormInput"
import { Category, Post } from "@/types"
import { Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { AnimatedBanner, BannerState, BannerType } from "@/components/activityIndicator/AnimatedBanner"
import { communityservice } from "@/services/community.sevice"
import { ImageEditScreen } from "@/components/imageedit/ImageEditScreen"
import { useNotificationToast } from "@/components/activityIndicator/ToastNotification"
import { SelectedSound } from "@/components/createpost/SoundModal"
import { DraftsList } from "@/components/createpost/DraftList"
import { resolveDraftUris, PostDraft } from "@/hooks/drafts.store"
import { usePostDraft } from "@/hooks/usePostDraft"
//  screen steps ─
type Step =
  | "media_type"    // choose images or video
  | "gallery"
  | "image_edit"
  | "form"          // listing details form
  | "uploading"     // uploading to Cloudinary
  | "success"       // posted successfully     // posted successfully

function SellScreen() {
  const theme = useTheme()
  const { user } = useAuthStore()
  const { slug, cname } = useLocalSearchParams<{ slug: string, cname: string }>()
  const queryClient = useQueryClient()
  const [sound, setsound] = useState<SelectedSound | null | undefined>(null)
  const navigation = useNavigation()
  //  step state  
  const [step, setStep] = useState<Step>("media_type")
  const [mediaType, setMediaType] = useState<"image" | "video" | "text">("image")
  const [selectedUris, setSelectedUris] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 })
  const [opengalleryDisabled, setopengalleryDisabled] = useState(false)
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showNotifToast } = useNotificationToast()
  //  form state 
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    location: "",
  })
  const [errors, setErrors] = useState<Partial<typeof form>>({})
  const [mediaError, setMediaErrors] = useState<string | null>()
  //  location (auto GPS) 
  // const { location: gpsLocation } = useLocation()
  const { startUpload } = useUploadQueue()

  //  fetch categories 
  const { data: categoriesData, isError, refetch } = useQuery({
    queryKey: ["com-categories", slug, user?.username ?? ""],
    queryFn: () => communityservice.getCategories(slug),
    staleTime: 10 * 60 * 1000,
  })

  const categories: Category[] = categoriesData?.data ?? []


  const resetState = useCallback(() => {
    setStep("media_type"); setMediaType("image")
    setForm({ name: "", description: "", category: "", location: "" })
    setSelectedUris([]); setsound(null)
    setErrors({}); setMediaErrors(null); setthereIsErrors(false)
  }, [])

  const hasContent =
    form.name.trim().length > 0 ||
    form.description.trim().length > 0 ||
    selectedUris.length > 0

  const {
    draftIdRef, allowLeaveRef, skipAutosaveRef,
    buildDraft, saveDraft, removeDraft, askToSaveDraft, resetAll,
  } = usePostDraft({
    screen: "community",
    mediaType, uris: selectedUris, form, sound, hasContent,
    onReset: resetState,
  })

  const exitToStart = useCallback(() => {
    if (hasContent) askToSaveDraft(() => { })
    else setStep("media_type")
  }, [hasContent, askToSaveDraft])

  const restoreDraft = (d: PostDraft) => {
    draftIdRef.current = d.id
    setMediaType(d.mediaType)
    setSelectedUris(resolveDraftUris(d))
    setForm(d.form as typeof form)
    setsound(d.sound)
    setStep("form")
  }
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (step === "media_type") return false
        if (step === "uploading" || step === "success") return true
        if (step === "form" && mediaType === "image") { setStep("image_edit"); return true }
        exitToStart()
        return true
      })

      return () => sub.remove()
    }, [step, mediaType, exitToStart])
  )
  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: step === "media_type", // only allow swipe-back on the very first step
    })
  }, [step])
  const showBanner = useCallback((type: BannerType, message: string) => {
    setBanner({ id: Date.now(), type, message });
  }, []);
  //  update form field 
  const updateField = (field: keyof typeof form, value: any) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  //  remove image from strip ─
  const removeImage = useCallback((index: number) => {
    setSelectedUris((prev) => prev.filter((_, i) => i !== index))
  }, [])

  //  validate form 
  const validate = (): boolean => {
    const newErrors: typeof errors = {}
    if ((mediaType != "text" && selectedUris.length <= 0)) { setMediaErrors("No media selected"); return false; }
    if (!form.name.trim() || form.name.trim().length < 3)
      newErrors.name = "Name must be at least 3 characters"



    if (!form.category)
      newErrors.category = "Please select a category"

    if (!form.description.trim())
      newErrors.description = "Description must be at least 5 characters"



    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  const [thereIsErrors, setthereIsErrors] = useState(false)
  const handleSubmit = () => {
    if (!validate()) {
      setthereIsErrors(true)
      return
    }
    if (isSubmitting) return // guard against a double-tap firing two uploads
    setIsSubmitting(true)
    setopengalleryDisabled(true)
    const submittedDraftId = draftIdRef.current
    const snapshot = buildDraft("upload_failed")
    startUpload(
      {
        name: form.name.trim(),
        description: form.description.trim(),
        categoryId: form.category,
        locationDisplay: form.location.trim(),
        postType: mediaType, // "text" | "image" | "video"
        mediaType: mediaType === "image" ? "photo" : mediaType === "video" ? "video" : undefined,
        mediaUris: mediaType === "text" ? [] : selectedUris,
        soundId: sound?.id
      },
      {
        onDone: (postId, postSlug) => {
          showNotifToast(`Post uploaded to ${cname ?? "community"}`, "success")
          removeDraft(submittedDraftId)
          queryClient.invalidateQueries({ queryKey: ["user-listings", user?.username] })
          setTimeout(() => {
            router.push(`/community/post/${postSlug}`)
          }, 3000)

        },
        onFailed: (error) => {
          saveDraft(snapshot as any)
          showNotifToast("Failed to upload post", "error")
        },
      },
      true, slug

    )

    // leave immediately — the upload continues in the background via the
    // floating badge. 
    allowLeaveRef.current = true
    router.back()
    resetAll()
    setIsSubmitting(false)


    setIsSubmitting(false)
    setopengalleryDisabled(false)
  }
  //  auth check 
  if (!user) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={["top"]}
      >
        <View style={styles.guestScreen}>
          <Text style={styles.guestIcon}>🏷️</Text>
          <Text style={[styles.guestTitle, { color: theme.textPrimary }]}>
            Start sharing
          </Text>
          <Text style={[styles.guestSub, { color: theme.textSecondary }]}>
            Log in to share thoughts,images,videos and many more
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.loginButtonText}>Log In to post</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }


  //  uploading screen 
  if (step === "uploading") {
    return (
      <View style={[styles.fullScreen, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} size="large" />
        <Text style={[styles.uploadingTitle, { color: theme.textPrimary }]}>
          uploading and submitting...
        </Text>
        {uploadProgress.total > 0 && (
          <Text style={[styles.uploadingProgress, { color: theme.textSecondary }]}>
            Uploading {uploadProgress.done} / {uploadProgress.total}{" "}
            {mediaType === "image" ? "image" : "video"}
          </Text>
        )}
        {/* progress bar */}
        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <View style={[
            styles.progressFill,
            {
              backgroundColor: theme.primary,
              width: uploadProgress.total > 0
                ? `${(uploadProgress.done / uploadProgress.total) * 100}%`
                : "0%",
            }
          ]} />
        </View>
      </View>
    )
  }

  //  success screen ─
  if (step === "success") {
    return (
      <View style={[styles.fullScreen, { backgroundColor: theme.background }]}>
        <Text style={styles.successIcon}>🎉</Text>
        <Text style={[styles.successTitle, { color: theme.textPrimary }]}>
          Listing submitted!
        </Text>
        <Text style={[styles.successSub, { color: theme.textSecondary }]}>
          Your listing is under review. We'll notify you when it's approved.
        </Text>
        <ActivityIndicator
          color={theme.primary}
          size="small"
          style={{ marginTop: Spacing.lg }}
        />
      </View>
    )
  }

  //  media type selection ─
  if (step === "media_type") {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={["top"]}
      >
        {/* header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.headerBack, { color: theme.textPrimary }]}>✕</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            New post
          </Text>
          {cname && <Text style={[styles.headerTitle, { color: theme.primary, fontSize: FontSize.lg, fontWeight: FontWeight.bold }]}>
            [To {cname}]
          </Text>}
          <View style={{ width: 40 }} />
        </View>

        <ScrollView>
          <MediaTypeSelector
            selected={mediaType}
            onSelect={setMediaType}
          />
          <DraftsList onResume={restoreDraft} screen="community" community_slug={slug} />
          <View style={styles.mediaTypeCTA}>
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: theme.primary, opacity: opengalleryDisabled ? 0.5 : 1 }]}
              onPress={() => {
                setStep(mediaType === "text" ? "form" : "gallery")
              }}
              disabled={opengalleryDisabled}
            >
              <Text style={styles.continueButtonText}>
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  //  gallery picker ─
  if (step === "gallery") {
    return (
      <View style={styles.container}>
        {/* minimal header */}
        <SafeAreaView edges={["top"]} style={{ backgroundColor: "#000" }}>
          <View style={styles.galleryHeader}>
            <TouchableOpacity onPress={() => setStep("media_type")}>
              <Text style={styles.galleryBack}>
                <MaterialCommunityIcons name="arrow-left-thick" color={theme.primary} size={30} />

              </Text>
            </TouchableOpacity>
            <Text style={styles.galleryTitle}>
              {mediaType === "image" ? "Select Photos" : "Select Video"}
            </Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>

        <GalleryPicker
          mediaType={mediaType}
          onNext={(uris) => {
            setSelectedUris(uris)
            if (mediaType === "image") {
              setStep("image_edit")
            } else {
              setStep("form")
            }
          }}
        />
      </View>
    )
  }
  if (step === "image_edit") {
    return (
      <ImageEditScreen
        imageUris={selectedUris}
        onCancel={() => setStep("gallery")}
        onDone={(finalUris, sound_id) => {
          setSelectedUris(finalUris)
          setsound(sound_id)
          setStep("form")
        }}
      />
    )
  }

  //  post form 
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]} >
      {banner && (
        <AnimatedBanner
          key={banner.id}
          type={banner.type}
          message={banner.message}
          onHide={() => setBanner(null)}
        />
      )}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => (mediaType === "image" ? setStep("image_edit") : exitToStart())}>
              <MaterialCommunityIcons name="arrow-left-thick" color={theme.primary} size={30} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              Post Details
            </Text>
            {cname && <Text style={[styles.headerTitle, { color: theme.primary, fontSize: FontSize.lg, fontWeight: FontWeight.bold }]}>
              [To {cname}]
            </Text>}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={[styles.postButton, { color: theme.primary }]}>
                Post
              </Text>
            </TouchableOpacity>
          </View>


          {mediaType === "text" ?
            (<View>
              <View>
                {/* name */}
                <FormInput
                  label="Post Title"
                  value={form.name}
                  onChangeText={(t) => updateField("name", t)}
                  error={errors.name}
                  placeholder="title"
                  returnKeyType="next"
                  maxLength={50}
                />
                <View style={styles.descriptionFooter}>

                  <Text style={[styles.charCount, { color: form.name.length == 50 ? theme.error : theme.textMuted }]}>
                    {form.name.length} / 50
                  </Text>
                </View>
              </View>
              {/* category */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                  Category
                </Text>
                {!categories.length || isError ? (<TouchableOpacity
                  onPress={() => refetch()}
                >
                  <Text
                    style={[styles.fieldError, { color: theme.ALLwarning, fontSize: FontSize.lg }]}
                  >
                    Could not load categories,click to retry
                  </Text>

                </TouchableOpacity>

                ) : (<ScrollView
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
                          backgroundColor:
                            form.category === cat.id
                              ? theme.primary
                              : theme.surfaceSecondary,
                          borderColor:
                            form.category === cat.id
                              ? theme.primary
                              : theme.border,
                        },
                      ]}
                      onPress={() => updateField("category", cat.id)}
                    >
                      {cat.icon && (
                        <Text style={styles.categoryIcon}>{cat.icon}</Text>
                      )}
                      <Text style={[
                        styles.categoryChipText,
                        {
                          color:
                            form.category === cat.id
                              ? "#fff"
                              : theme.textSecondary,
                        },
                      ]}>
                        {cat.name}
                      </Text>

                    </TouchableOpacity>
                  ))}
                </ScrollView>
                )}
                {errors.category && (
                  <Text style={[styles.fieldError, { color: theme.error }]}>
                    {errors.category}
                  </Text>
                )}
              </View>
              {/* description */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                  Write about your post
                </Text>

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
                  placeholder="Write..."
                  placeholderTextColor={theme.textPlaceholder}
                  multiline
                  maxLength={5000}
                  textAlignVertical="top"
                />

                <View style={styles.descriptionFooter}>
                  {errors.description && (
                    <Text style={[styles.fieldError, { color: theme.error }]}>
                      {errors.description}
                    </Text>
                  )}
                  <Text style={[styles.charCount, { color: theme.textPrimary }]}>
                    {form.description.length} / 2000
                  </Text>
                </View>
               <View
                    style={[{ flexDirection: "row", justifyContent: "space-between" }]}

                  >
                    {/* draft button */}
                    <TouchableOpacity
                      style={[styles.submitButton, { backgroundColor: theme.primary }]}
                      onPress={() => askToSaveDraft(() => { })}
                      disabled={isSubmitting}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.submitButtonText}>
                        Save as draft
                      </Text>
                    </TouchableOpacity>
                    {/* submit button */}
                    <TouchableOpacity
                      style={[styles.submitButton, { backgroundColor: theme.primary }]}
                      onPress={handleSubmit}
                      disabled={isSubmitting}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.submitButtonText}>
                        Post
                      </Text>
                    </TouchableOpacity>
                  </View>

              </View>
            </View>

            ) : (

              <>
                {/*  image strip  */}
                <View style={styles.mediaSection}>
                  <ImageStrip
                    uris={selectedUris}
                    onRemove={removeImage}
                  />
                  {mediaType === "video" && (
                    <TouchableOpacity
                      style={[styles.addMoreButton, { borderColor: theme.border }]}
                      onPress={() => setStep("gallery")}
                    >
                      <Text style={[styles.addMoreText, { color: theme.textSecondary }]}>
                        Change
                      </Text>
                    </TouchableOpacity>
                  )}
                  {/* re-add more images */}
                  {mediaType === "image" && selectedUris.length < 5 && (
                    <TouchableOpacity
                      style={[styles.addMoreButton, { borderColor: theme.border }]}
                      onPress={() => setStep("gallery")}
                    >
                      <Text style={[styles.addMoreText, { color: theme.textSecondary }]}>
                        + Add more
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                {mediaError && (
                  <Text style={[styles.fieldError, { color: theme.error }]}>
                    {mediaError}
                  </Text>
                )}
                <View style={styles.form}>

                  {/* name */}
                  <FormInput
                    label="Post title"
                    value={form.name}
                    onChangeText={(t) => updateField("name", t)}
                    error={errors.name}
                    placeholder="title"
                    returnKeyType="next"
                  />

                  {/* category */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                      Category
                    </Text>
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
                              backgroundColor:
                                form.category === cat.id
                                  ? theme.primary
                                  : theme.surfaceSecondary,
                              borderColor:
                                form.category === cat.id
                                  ? theme.primary
                                  : theme.border,
                            },
                          ]}
                          onPress={() => updateField("category", cat.id)}
                        >
                          {cat.icon && (
                            <Text style={styles.categoryIcon}>{cat.icon}</Text>
                          )}
                          <Text style={[
                            styles.categoryChipText,
                            {
                              color:
                                form.category === cat.id
                                  ? "#fff"
                                  : theme.textSecondary,
                            },
                          ]}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    {errors.category && (
                      <Text style={[styles.fieldError, { color: theme.error }]}>
                        {errors.category}
                      </Text>
                    )}
                  </View>

                  {/* description */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                      Write about your post
                    </Text>
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
                      placeholder="Write..."
                      placeholderTextColor={theme.textPlaceholder}
                      multiline
                      maxLength={2000}
                      textAlignVertical="top"
                    />
                    <View style={styles.descriptionFooter}>
                      {errors.description && (
                        <Text style={[styles.fieldError, { color: theme.error }]}>
                          {errors.description}
                        </Text>
                      )}
                      <Text style={[styles.charCount, { color: theme.textMuted }]}>
                        {form.description.length} / 2000
                      </Text>
                    </View>
                  </View>
                  {thereIsErrors && (
                    <Text style={[styles.fieldError, { color: theme.error }]}>
                      Correct the above errors                  </Text>
                  )}

                  <View
                    style={[{ flexDirection: "row", justifyContent: "space-between" }]}

                  >
                    {/* draft button */}
                    <TouchableOpacity
                      style={[styles.submitButton, { backgroundColor: theme.primary }]}
                      onPress={() => askToSaveDraft(() => { })}
                      disabled={isSubmitting}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.submitButtonText}>
                        Save as draft
                      </Text>
                    </TouchableOpacity>
                    {/* submit button */}
                    <TouchableOpacity
                      style={[styles.submitButton, { backgroundColor: theme.primary }]}
                      onPress={handleSubmit}
                      disabled={isSubmitting}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.submitButtonText}>
                        Post
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.pendingNotice, { color: theme.textMuted }]}>
                    Posts are reviewed by our team before going live. Usually within a moment.
                  </Text>

                </View>
              </>
            )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, },
  fullScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  guestScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  guestIcon: { fontSize: 64 },
  guestTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    textAlign: "center",
  },
  guestSub: {
    fontSize: FontSize.md,
    textAlign: "center",
    lineHeight: 22,
  },
  loginButton: {
    width: "100%",
    height: 54,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  headerBack: {
    fontSize: 22,
    fontWeight: FontWeight.bold,
    width: 40,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  postButton: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    width: 40,
    textAlign: "right",
  },
  galleryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  galleryBack: {
    color: "#fff",
    fontSize: 22,
    fontWeight: FontWeight.bold,
    width: 40,
  },
  galleryTitle: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  mediaTypeCTA: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  continueButton: {
    height: 54,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  mediaSection: {
    paddingVertical: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  addMoreButton: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  addMoreText: {
    fontSize: FontSize.xs,
    textAlign: "center",
  },
  formContent: {
    paddingBottom: Spacing.xxl,

  },
  form: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.lg,
  },
  priceRow: {
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "flex-end",
  },
  priceInput: {
    flex: 1,
  },
  negotiableToggle: {
    alignItems: "center",
    gap: 4,
    paddingBottom: Spacing.xs,
  },
  negotiableLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  fieldGroup: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.3,
  },
  fieldError: {
    fontSize: FontSize.xs,
  },
  categoryChips: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
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
  categoryChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  descriptionInput: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: FontSize.md,
  },
  descriptionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  charCount: {
    fontSize: FontSize.xs,
    textAlign: "right",
    flex: 1,
  },
  gpsStatus: {
    fontSize: FontSize.xs,
    marginTop: -Spacing.xs,
  },
  submitButton: {
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
     paddingVertical:10,
    paddingHorizontal:20
  },
  submitButtonText: {
    color: "#fff",
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  pendingNotice: {
    fontSize: FontSize.sm,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
  uploadingTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: "center",
  },
  uploadingProgress: {
    fontSize: FontSize.md,
    textAlign: "center",
  },
  progressBar: {
    width: "80%",
    height: 6,
    borderRadius: Radius.full,
    overflow: "hidden",
    marginTop: Spacing.sm,
  },
  progressFill: {
    height: "100%",
    borderRadius: Radius.full,
  },
  successIcon: { fontSize: 72 },
  successTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    textAlign: "center",
  },
  successSub: {
    fontSize: FontSize.md,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },
})




export default SellScreen










