
import { useState, useEffect, useCallback } from "react"
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
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useFocusEffect } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import { useAuthStore } from "@/stores/auth.store"
import { useLocation } from "@/hooks/useLocation"
import { useNavigation } from "expo-router"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { GalleryPicker } from "@/components/createpost/GalleryPicker"
import { MediaTypeSelector } from "@/components/createpost/MediaTypeSelector"
import { ImageStrip } from "@/components/createpost/ImageStrip"
import { FormInput } from "@/components/ui/FormInput"
import { listingService } from "@/services/listing.service"
import { feedService } from "@/services/feed.service"
import { Category, Post } from "@/types"
import { Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { AnimatedBanner, BannerState, BannerType } from "@/components/activityIndicator/AnimatedBanner"
import { VideoEditScreen } from "@/components/editor/VideoEditScreen"
import { ImageEditScreen } from "@/components/imageedit/ImageEditScreen"
//  screen steps 
type Step =
  | "media_type"    // choose images or video
  | "gallery"
  | "video_edit"
  | "image_edit"

  | "form"          // listing details form
  | "uploading"     // uploading to Cloudinary
  | "success"       // posted successfully

function SellScreen() {
  const theme = useTheme()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const navigation = useNavigation()

  //  step state 
  const [step, setStep] = useState<Step>("media_type")
  const [mediaType, setMediaType] = useState<"image" | "video" | "text">("image")
  const [selectedUris, setSelectedUris] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 })
  const [opengalleryDisabled, setopengalleryDisabled] = useState(false)
  const [banner, setBanner] = useState<BannerState | null>(null);

  //  form state 
  const [form, setForm] = useState({
    name: "",
    description: "",

    category: "",
    location: "",
  })
  const [errors, setErrors] = useState<Partial<typeof form>>({})
  const [mediaError, setMediaErrors] = useState<string | null>()
  //  location (auto GPS) ─
  // const { location: gpsLocation } = useLocation()

  //  fetch categories 
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: feedService.getCategories,
    staleTime: 10 * 60 * 1000,
  })
  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: step === "media_type", // only allow swipe-back on the very first step
    })
  }, [step])
  //  submit mutation ─
  const submitMutation = useMutation({
    mutationFn: async () => {
      setStep("uploading")
      setopengalleryDisabled(true)
      setUploadProgress({ done: 0, total: selectedUris.length })
      // Build mediaFiles array from selected URIs
      const mediaFiles = selectedUris.map((uri) => ({
        uri,
        name: uri.split("/").pop() ?? "file",
        type: mediaType === "image" ? "image/jpeg" : "video/mp4",
      }))

      setUploadProgress({ done: selectedUris.length, total: selectedUris.length })
      return listingService.createListing({
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        post_type: mediaType,
        mediaFiles,
        mediaType: mediaType === "image" ? "photo" : "video",
        location_display: form.location.trim(),
        // location_lat: gpsLocation?.lat ?? 0,
        // location_lng: gpsLocation?.lng ?? 0,
      })
    },
    onSuccess: (post: Post) => {
      setStep("success")
      queryClient.invalidateQueries({ queryKey: ["user-listings", user?.username] })
      // navigate to the new listing after short delay
      setTimeout(() => {
        router.push(`/post/${post.slug}`)
      }, 1500)
      setTimeout(() => {

        setopengalleryDisabled(false)

      }, 2000)
      setStep("media_type")
      setForm({
        name: "",
        description: "",
        category: "",
        location: "",
      })

      setthereIsErrors(false)
      setMediaErrors(null)
    },
    onError: (error: any) => {
      setopengalleryDisabled(false)
      setStep("form")
      const detail = error?.response?.data?.detail ?? "Failed to post listing. Try again."
      showBanner("error", detail)
    },
  })
  useEffect(()=>{
    if (step==="media_type"){
      setForm({
        name: "",
        description: "",
        category: "",
        location: "",
      });
      setSelectedUris([])
    }
  },[step])
  const categories: Category[] = categoriesData?.data ?? []
  const showBanner = useCallback((type: BannerType, message: string) => {
    setBanner({ id: Date.now(), type, message });
  }, []);
  //  update form field ─
  const updateField = (field: keyof typeof form, value: any) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  //  remove image from strip ─
  const removeImage = useCallback((index: number) => {
    setSelectedUris((prev) => prev.filter((_, i) => i !== index))
  }, [])

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (step === "media_type") {
          return false // nothing to trap — let default back/exit happen
        }

        if (step === "form") {
          
           if (mediaType === "image") setStep("image_edit")
          else setStep("media_type")
        } else if (step === "uploading" || step === "success") {
          // don't let back interrupt an in-flight submit or the success screen
          return true
        } else {
          // gallery, image_edit, video_edit, etc. → back to media type choice
          setStep("media_type")
        }

        return true
      })

      return () => sub.remove()
    }, [step, mediaType])
  )
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
  const [thereIsErrors, setthereIsErrors] = useState(false)
  const handleSubmit = () => {
    if (!validate()) {
      setthereIsErrors(true)
      return
    }
    submitMutation.mutate()
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
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.headerBack, { color: theme.textPrimary }]}>✕</Text>
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
          <View style={styles.mediaTypeCTA}>
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: theme.primary, opacity: opengalleryDisabled ? 0.5 : 1 }]}
              onPress={() => {
                setStep("gallery")
              }}
              disabled={opengalleryDisabled}
            >
              <Text style={styles.continueButtonText}>

                {mediaType === "text" ?
                  "Continue"
                  : "Open Gallery"
                }
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  //  gallery picker 
  if (step === "gallery") {
    if (mediaType === "text") { setStep("form") }
    return (
      <View style={styles.container}>
        {/* minimal header */}
        <SafeAreaView edges={["top"]} style={{ backgroundColor: "#000" }}>
          <View style={styles.galleryHeader}>
            <TouchableOpacity onPress={() => setStep("media_type")}>
              <Text style={styles.galleryBack}>←</Text>
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
            }  else {
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
        onDone={(finalUris) => {
          setSelectedUris(finalUris)
          setStep("form")
        }}
      />
    )
  }
  //  video editor 
  if (step === "video_edit") {
    return (
      <VideoEditScreen
        videoUri={selectedUris[0]}
        onCancel={() => setStep("gallery")}
        onDone={(finalUri) => {
          setSelectedUris([finalUri])
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
            <TouchableOpacity onPress={() => setStep(mediaType === "video" ? "video_edit" : mediaType === "image" ? "image_edit" : "media_type")}>
              <MaterialCommunityIcons name="arrow-left-thick" color={theme.primary} size={30} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              post Details
            </Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitMutation.isPending}
            >
              <Text style={[styles.postButton, { color: theme.primary }]}>
                Post
              </Text>
            </TouchableOpacity>
          </View>


          {mediaType === "text" ?
            (<View>
              {/* name */}
              <FormInput
                label="Post Title"
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
                  Write about your progress,success,mistakes,fun momments etc
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
                  <Text style={[styles.charCount, { color: theme.textPrimary }]}>
                    {form.description.length} / 2000
                  </Text>
                </View>
                {/* submit button */}
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: theme.primary }]}
                  onPress={handleSubmit}
                  disabled={submitMutation.isPending}
                  activeOpacity={0.85}
                >
                  <Text style={styles.submitButtonText}>
                    🏷️ Post
                  </Text>
                </TouchableOpacity>

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
                  {/* submit button */}
                  <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: theme.primary }]}
                    onPress={handleSubmit}
                    disabled={submitMutation.isPending}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.submitButtonText}>
                      Post
                    </Text>
                  </TouchableOpacity>

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
    height: 56,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
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










