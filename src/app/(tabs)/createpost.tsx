import { useState, useEffect, useCallback, useRef } from "react"
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
  BackHandler,
  Alert, AppState
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import * as Crypto from "expo-crypto"
import { router, useFocusEffect } from "expo-router"
import { DraftsList } from "@/components/createpost/DraftList"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import { useAuthStore } from "@/stores/auth.store"
import { useNavigation } from "expo-router"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { GalleryPicker } from "@/components/createpost/GalleryPicker"
import { MediaTypeSelector } from "@/components/createpost/MediaTypeSelector"
import { ImageStrip } from "@/components/createpost/ImageStrip"
import { FormInput } from "@/components/ui/FormInput"
import { feedService } from "@/services/feed.service"
import { Checkbox } from "@/components/ui/Checkbox"
import { Category, Post } from "@/types"
import { useMessageStore } from "@/stores/message.store"
import { messagingService } from "@/services/messaging.service"
import { Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { AnimatedBanner, BannerState, BannerType } from "@/components/activityIndicator/AnimatedBanner"
import { ImageEditScreen } from "@/components/imageedit/ImageEditScreen"
import { useUploadQueue } from "@/components/createpost/UploadQueuecontext"
import { useNotificationToast } from "@/components/activityIndicator/ToastNotification"
import { SelectedSound } from "@/components/createpost/SoundModal"
import { useDraftStore, PostDraft, resolveDraftUris } from "@/hooks/drafts.store"
export type PostViewer = "anybody" | "followers" | "only_me"

const DEFAULT_FORM = {
  name: "",
  description: "",
  category: "",
  location: "",
  postViewers: "anybody" as PostViewer,
  allow_download: true,
  promotionalContent: false,
  allowComments: true,
}
type PostForm = typeof DEFAULT_FORM

const VIEWER_OPTIONS: { value: PostViewer; label: string; sublabel?: string }[] = [
  { value: "anybody", label: "Everyone" },
  { value: "followers", label: "Followers and friends" },
  { value: "only_me", label: "Only me", sublabel: "Visible only on your profile" },
]
//  screen steps 
type Step =
  | "media_type"    // choose images or video
  | "gallery"
  | "image_edit"

  | "form"          // listing details form
  | "uploading"     // uploading to Cloudinary
  | "success"       // posted successfully

function SellScreen() {
  const theme = useTheme()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const navigation = useNavigation()
  const { setUnreadMessageCount } = useMessageStore()
  //  step state 
  const [step, setStep] = useState<Step>("media_type")
  const [mediaType, setMediaType] = useState<"image" | "video" | "text">("image")
  const [selectedUris, setSelectedUris] = useState<string[]>([])
  const [sound, setsound] = useState<SelectedSound | null | undefined>(null)
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 })
  const [moreSettingsVisible, setMoreSettingsVisible] = useState<boolean>(false)
  const [opengalleryDisabled, setopengalleryDisabled] = useState(false)
  const [banner, setBanner] = useState<BannerState | null>(null);

  const { saveDraft, removeDraft } = useDraftStore()
  const draftIdRef = useRef(Crypto.randomUUID())
  const allowLeaveRef = useRef(false)
  //  form state 
  const [form, setForm] = useState<PostForm>(DEFAULT_FORM)
  const [errors, setErrors] = useState<Partial<Record<"name" | "category" | "description", string>>>({})
  const [mediaError, setMediaErrors] = useState<string | null>()
  //  location (auto GPS) ─
  // const { location: gpsLocation } = useLocation()

  //  fetch categories 
  const { data: categoriesData, isError, refetch } = useQuery({
    queryKey: ["categories", user?.username],
    queryFn: feedService.getCategories,
    staleTime: 10 * 60 * 1000,
  })

  //  background upload 
  const { startUpload } = useUploadQueue()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const skipAutosaveRef = useRef(false) // true while submitting/leaving on purpose

  const resetAll = useCallback(() => {
    draftIdRef.current = Crypto.randomUUID()

    setStep("media_type")
    setMediaType("image")
    setForm(DEFAULT_FORM)
    setSelectedUris([])
    setsound(null)
    setErrors({})
    setMediaErrors(null)
    setthereIsErrors(false)
  }, [])
  useEffect(() => {
    if (!user) return

    messagingService.getUnreadCount()
      .then(setUnreadMessageCount)
      .catch((e) => { })


  }, [])
  const hasContent =
    form.name.trim().length > 0 ||
    form.description.trim().length > 0 ||
    selectedUris.length > 0

  // always holds the latest values; callbacks read from here, never from stale closures
  const latestRef = useRef({ mediaType, selectedUris, form, sound, hasContent })
  latestRef.current = { mediaType, selectedUris, form, sound, hasContent }

  const saveCurrentDraft = useCallback(
    (reason: "manual" | "autosave") => {
      const s = latestRef.current
      return saveDraft({
        id: draftIdRef.current,
        mediaType: s.mediaType,
        uris: s.selectedUris,
        form: s.form,
        sound: s.sound ?? null,
        reason,
        screen: "feed"

      })
    },
    [saveDraft])
  const askToSaveDraft = useCallback(
    (proceed: () => void) => {
      Alert.alert("Save as draft?", "You can finish this post later.", [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: async () => {
            skipAutosaveRef.current = true
            await removeDraft(draftIdRef.current)
            resetAll()
            skipAutosaveRef.current = false   // new line
            proceed()
          },
        },
        {
          text: "Save draft",
          onPress: async () => {
            skipAutosaveRef.current = true
            await saveCurrentDraft("manual")
            resetAll()
            skipAutosaveRef.current = false   // new line
            proceed()
          },
        },
      ], { cancelable: true })
    },
    [removeDraft, saveCurrentDraft, resetAll]
  )

  const leaveScreen = useCallback(() => {
    if (router.canGoBack()) router.back()
    else BackHandler.exitApp() // Android only; no-op on iOS
  }, [])
  const exitToStart = useCallback(() => {
    if (latestRef.current.hasContent) {
      // Save/Discard both call resetAll(), which sets step to "media_type",
      // so there is nothing more to do in proceed
      askToSaveDraft(() => { })
    } else {
      setStep("media_type")
    }
  }, [askToSaveDraft])
  //ask to save draft before leaving
  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", (e: any) => {
      if (allowLeaveRef.current || !hasContent) return
      e.preventDefault()
      Alert.alert("Save as draft?", "You can finish this post later.", [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: async () => {
            await removeDraft(draftIdRef.current)
            allowLeaveRef.current = true
            navigation.dispatch(e.data.action)
          },
        },
        {
          text: "Save draft",
          onPress: async () => {
            await saveCurrentDraft("manual")
            allowLeaveRef.current = true
            navigation.dispatch(e.data.action)
          },
        },
      ])
    })
    return unsub
  }, [navigation, hasContent, saveCurrentDraft, removeDraft])

  // resume a draft
  const restoreDraft = (d: PostDraft) => {
    draftIdRef.current = d.id
    setMediaType(d.mediaType)
    setSelectedUris(resolveDraftUris(d))
    setForm({ ...DEFAULT_FORM, ...(d.form as Partial<PostForm>) })
    setsound(d.sound)
    setStep("form")
  }




  const categories: Category[] = categoriesData?.data ?? []

  //  update form field ─
  const updateField = <K extends keyof PostForm>(field: K, value: PostForm[K]) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (field in errors) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  //  remove image from strip ─
  const removeImage = useCallback((index: number) => {
    setSelectedUris((prev) => prev.filter((_, i) => i !== index))
  }, [])




  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (step === "media_type") return false // nothing to protect here
        if (step === "uploading" || step === "success") return true
        if (step === "form" && mediaType === "image") {
          setStep("image_edit")
          return true
        }
        exitToStart() // form (video/text), gallery, image_edit
        return true
      })
      return () => sub.remove()
    }, [step, mediaType, exitToStart])
  )

  useFocusEffect(
    useCallback(() => {
      skipAutosaveRef.current = false // screen focused again: allow autosave
      return () => {
        // runs only when the tab loses focus, because it has no changing deps
        if (latestRef.current.hasContent && !skipAutosaveRef.current) {
          saveCurrentDraft("autosave")
        }
      }
    }, [saveCurrentDraft])
  )

  //autosave on background
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active" && latestRef.current.hasContent && !skipAutosaveRef.current) {
        saveCurrentDraft("autosave")
      }
    })
    return () => sub.remove()
  }, [saveCurrentDraft])
  //  validate form ─
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

  const { showNotifToast } = useNotificationToast()
  const [thereIsErrors, setthereIsErrors] = useState(false)
  const handleSubmit = () => {
    if (!validate()) {
      setthereIsErrors(true)
      return
    }
    skipAutosaveRef.current = true
    const submittedDraftId = draftIdRef.current
    if (isSubmitting) return // guard against a double-tap firing two uploads
    setIsSubmitting(true)
    const snapshot = {
      id: draftIdRef.current,
      mediaType,
      uris: [...selectedUris],
      form: { ...form },
      sound: sound ?? null,
    }
    startUpload(
      {
        name: form.name.trim(),
        description: form.description.trim(),
        categoryId: form.category,
        locationDisplay: form.location.trim(),
        postType: mediaType, // "text" | "image" | "video"
        mediaType: mediaType === "image" ? "photo" : mediaType === "video" ? "video" : undefined,
        mediaUris: mediaType === "text" ? [] : selectedUris,
        soundId: sound?.id,
        visibility: form.postViewers,
        allowComments: form.allowComments,
        allowDownload: mediaType === "text" ? false : form.allow_download,
        isPromotional: form.promotionalContent,
      },
      {
        onDone: (postId, postSlug) => {
          removeDraft(submittedDraftId)
          queryClient.invalidateQueries({ queryKey: ["user-listings", user?.username] })
          showNotifToast("Post uploaded", "success")
          router.push(`/post/${postSlug}`)
        },
        onFailed: (error) => {

          saveDraft({ ...snapshot, reason: "upload_failed", screen: "feed" })

          showNotifToast("Failed to upload post.Saved to drafts", "error")
        },
      }
    )
    allowLeaveRef.current = true // don't show the draft prompt for a real submit

    // leave immediately — the upload continues in the background via the
    // floating badge. 
    router.back()
    resetAll()
    setIsSubmitting(false)
  }
  const moreSettings = moreSettingsVisible && (
    <View style={[styles.settingsPanel, { borderColor: theme.border, backgroundColor: theme.surfaceSecondary }]}>
      <Text style={[styles.settingsHeading, { color: theme.textPrimary }]}>
        Who can view this post?
      </Text>
      {VIEWER_OPTIONS.map((opt) => (
        <Checkbox
          key={opt.value}
          label={opt.label}
          sublabel={opt.sublabel}
          checked={form.postViewers === opt.value}
          // behaves like a radio group: tapping always selects, never leaves none selected
          onChange={() => updateField("postViewers", opt.value)}
        />
      ))}

      <View style={[styles.settingsDivider, { backgroundColor: theme.border }]} />

      <Checkbox
        label="Allow comments"
        checked={form.allowComments}
        onChange={(v) => updateField("allowComments", v)}
      />
      {mediaType !== "text" && (
        <Checkbox
          label="Allow downloads"
          sublabel="Let others save your photos or video"
          checked={form.allow_download}
          onChange={(v) => updateField("allow_download", v)}
        />
      )}
      <Checkbox
        label="Promotional content"
        sublabel="This post promotes a product, service or brand"
        checked={form.promotionalContent}
        onChange={(v) => updateField("promotionalContent", v)}
      />
    </View>
  )
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
          <Text style={[styles.guestSub, { color: theme.textSecondary }]}>
            Or new to here?
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push("/(auth)/register")}
          >
            <Text style={styles.loginButtonText}>Create account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }


  //  uploading screen 
  if (step === "uploading") {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={["top"]}
      >
        <View style={[styles.fullScreen, { backgroundColor: theme.background }]}>
          <ActivityIndicator color={theme.primary} size="large" />
          <Text style={[styles.uploadingTitle, { color: theme.textPrimary }]}>
            uploading and submitting...
          </Text>
          {uploadProgress.total > 0 && (
            <Text style={[styles.uploadingProgress, { color: theme.textSecondary }]}>
              Uploading {uploadProgress.done} / {uploadProgress.total}{" "}
              {mediaType === "image" ? "images" : "video"}
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
      </SafeAreaView>
    )
  }

  //  success screen 
  if (step === "success") {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={["top"]}
      >
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
      </SafeAreaView>
    )
  }

  //  media type selection 
  if (step === "media_type") {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={["top"]}
      >

        {/* header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()}
          >
            <Text style={[styles.headerBack, { color: theme.primary }]}>✕</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            New post
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView>
          <MediaTypeSelector
            selected={mediaType}
            onSelect={setMediaType}
          />
          <DraftsList onResume={restoreDraft} screen="feed" />
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

  //  gallery picker 
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
          setSelectedUris(finalUris);
          setsound(sound_id)
          setStep("form")
        }}
      />
    )
  }

  //  post form 
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {banner && (
          <AnimatedBanner
            key={banner.id}
            type={banner.type}
            message={banner.message}
            onHide={() => setBanner(null)}
          />
        )}
        <ScrollView
          style={[styles.container, { backgroundColor: theme.background }]}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <TouchableOpacity
              onPress={() => (mediaType === "image" ? setStep("image_edit") : exitToStart())}
            >
              <MaterialCommunityIcons name="arrow-left-thick" color={theme.primary} size={30} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              post Details
            </Text>
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
                  label="Post Title - Give a catchy title"
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
                  Select relevant  Category
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
                  Write about your  post to make it easily discoverable
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
                    {form.description.length} / 5000
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: theme.primary }]}
                  onPress={() => setMoreSettingsVisible((v) => !v)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.submitButtonText}>
                    More Settings {moreSettingsVisible ? "▲" : "▼"}
                  </Text>
                </TouchableOpacity>
                {moreSettings}
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
                    label="Give your post a relevant title"
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
                  {/* category */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                      Select a relevant category
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
                      Write about your post to make it easily dscoverable
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
                      <Text style={[styles.charCount, { color: theme.textMuted }]}>
                        {form.description.length} / 5000
                      </Text>
                    </View>
                  </View>
                  {thereIsErrors && (
                    <Text style={[styles.fieldError, { color: theme.error }]}>
                      Correct the above errors                  </Text>
                  )}
                  <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: theme.primary }]}
                    onPress={() => setMoreSettingsVisible((v) => !v)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.submitButtonText}>
                      More Settings {moreSettingsVisible ? "▲" : "▼"}
                    </Text>
                  </TouchableOpacity>
                  {moreSettings}
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
                  {/* pending notice */}
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
  settingsPanel: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  settingsHeading: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  settingsDivider: {
    height: 1,
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
    paddingVertical: 10,
    justifyContent: "center",
    marginTop: Spacing.sm,
    paddingHorizontal: 20
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