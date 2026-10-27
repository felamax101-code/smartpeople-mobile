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
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams, useFocusEffect } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import { useAuthStore } from "@/stores/auth.store"
import { useLocation } from "@/hooks/useLocation"
import { GalleryPicker } from "@/components/createpost/GalleryPicker"
import { MediaTypeSelector } from "@/components/createpost/MediaTypeSelector"
import { ImageStrip } from "@/components/createpost/ImageStrip"
import { FormInput } from "@/components/ui/FormInput"
import { Category, Post } from "@/types"
import { Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { AnimatedBanner, BannerState, BannerType } from "@/components/activityIndicator/AnimatedBanner"
import { splistingService } from "@/services/splisting.service"
import { spfeedService } from "@/services/realestate.service"
import { ImageEditScreen } from "@/components/imageedit/ImageEditScreen"
import { useUploadQueue } from "@/components/createpost/UploadQueuecontext"
import { useNotificationToast } from "@/components/activityIndicator/ToastNotification"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { SelectedSound } from "@/components/createpost/SoundModal"
import { DraftsList } from "@/components/createpost/DraftList"
import { usePostDraft } from "@/hooks/usePostDraft"
import { resolveDraftUris, PostDraft } from "@/hooks/drafts.store"

//  screen steps 
type Step =
  | "media_type"    // choose images or video
  | "gallery"
  | "image_edit"
  | "form"          // listing details form
  | "uploading"     // uploading to Cloudinary
  | "success"

type ListingType = "rental" | "sale"
type RoomType = "single" | "bed_sitter" | "one_bedroom" | "two_bedroom" | "three_plus"

const LISTING_TYPE_OPTIONS: { id: ListingType; label: string }[] = [
  { id: "rental", label: "For Rent" },
  { id: "sale", label: "For Sale" },
]

const ROOM_TYPE_OPTIONS: { id: RoomType; label: string }[] = [
  { id: "single", label: "Single Room" },
  { id: "bed_sitter", label: "BedSitter" },
  { id: "one_bedroom", label: "One Bedroom" },
  { id: "two_bedroom", label: "Two Bedroom" },
  { id: "three_plus", label: "Three+ Bedroom" },
]

function SellScreen() {
  const theme = useTheme()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()


  //  step state 
  const [sound, setsound] = useState<SelectedSound | null | undefined>(null)

  const [step, setStep] = useState<Step>("media_type")
  const [mediaType, setMediaType] = useState<"image" | "video">("image")
  const [selectedUris, setSelectedUris] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 })
  const [opengalleryDisabled, setopengalleryDisabled] = useState(false)
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [pinnedCoords, setPinnedCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showNotifToast } = useNotificationToast()
  const { startUpload } = useUploadQueue()

  //  form state 
  const [form, setForm] = useState({
    name: "",
    description: "",

    category: "",
    location: "",
    price: "",
    listingType: "rental" as ListingType,
    rooms: "" as RoomType | "",
    deposit: "",
    monthlyInstallment: "",
    roomsError: ""
  })
  const [errors, setErrors] = useState<Partial<typeof form>>({})
  const [mediaError, setMediaErrors] = useState<string | null>()
  //  location (auto GPS) ─
  const { location: gpsLocation } = useLocation()
  const params = useLocalSearchParams<{ pickedLat?: string; pickedLng?: string }>()
  const EMPTY_FORM = {
    name: "", description: "", category: "", location: "", price: "",
    listingType: "rental" as ListingType, rooms: "" as RoomType | "",
    deposit: "", monthlyInstallment: "", roomsError: "",
  }
  const resetState = useCallback(() => {
    setStep("media_type"); setMediaType("image")
    setForm(EMPTY_FORM); setSelectedUris([]); setsound(null)
    setErrors({}); setMediaErrors(null); setthereIsErrors(false)
    setPinnedCoords(null)
  }, [])

  const hasContent =
    form.name.trim().length > 0 ||
    form.description.trim().length > 0 ||
    selectedUris.length > 0

  const {
    draftIdRef, allowLeaveRef, skipAutosaveRef,
    buildDraft, saveDraft, removeDraft, askToSaveDraft, resetAll,
  } = usePostDraft({
    screen: "sp",
    mediaType, uris: selectedUris, form, sound, hasContent,
    onReset: resetState,
  })

  const exitToStart = useCallback(() => {
    if (hasContent) askToSaveDraft(() => { })
    else setStep("media_type")
  }, [hasContent, askToSaveDraft])

  const restoreDraft = (d: PostDraft) => {
    draftIdRef.current = d.id
    setMediaType(d.mediaType as typeof mediaType)
    setSelectedUris(resolveDraftUris(d))
    setForm(d.form as typeof form)
    setsound(d.sound)
    setStep("form")
  }
  useEffect(() => {
    if (params.pickedLat && params.pickedLng) {
      setPinnedCoords({
        latitude: Number(params.pickedLat),
        longitude: Number(params.pickedLng),
      })
    }
  }, [params.pickedLat, params.pickedLng])
  //  fetch categories 
  const { data: categoriesData, isError, refetch } = useQuery({
    queryKey: ["sp-categories"],
    queryFn: spfeedService.getCategories,
    staleTime: 10 * 60 * 1000,
  })



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
        if (step === "media_type") return false
        if (step === "uploading" || step === "success") return true
        if (step === "form" && mediaType === "image") { setStep("image_edit"); return true }
        exitToStart()
        return true
      })
      // deps: [step, mediaType, exitToStart]


      return () => sub.remove()
    }, [step, mediaType])
  )
  //  validate form ─
  const validate = (): boolean => {
    const newErrors: typeof errors = {}
    if ((selectedUris.length <= 0)) { setMediaErrors("No media selected"); return false; }
    if (!form.name.trim() || form.name.trim().length < 3)
      newErrors.name = "Name must be at least 3 characters"



    if (!form.category)
      newErrors.category = "Please select a category"

    if (!form.rooms)
      newErrors.roomsError = "Please select the number of rooms"

    if (form.listingType === "sale") {
      if (!form.deposit)
        newErrors.deposit = "Deposit or full price is required"
    } else {
      if (!form.price)
        newErrors.price = "Price is required"
    }

    if (!form.location)
      newErrors.location = "Please enter the location"

    if (!form.description.trim())
      newErrors.description = "Description must be at least 5 characters"



    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  const formatNumber = (value: string) => {
    const digitsOnly = value.replace(/\D/g, ""); // strip everything but digits
    if (!digitsOnly) return "";
    return Number(digitsOnly).toLocaleString("en-US"); // "1234567" -> "1,234,567"
  };


  const [thereIsErrors, setthereIsErrors] = useState(false)
  const handleSubmit = () => {
    if (!validate()) {
      setthereIsErrors(true)
      return
    }
    if (isSubmitting) return // guard against a double-tap firing two uploads
    setIsSubmitting(true)
    const isSale = form.listingType === "sale"
    const submittedDraftId = draftIdRef.current
    const snapshot = buildDraft("upload_failed")
    startUpload(
      {
        name: form.name.trim(),
        description: form.description.trim(),
        categoryId: form.category,
        postType: mediaType,
        mediaUris: selectedUris,
        mediaType: mediaType === "image" ? "photo" : "video",
        locationDisplay: form.location.trim(),
        listing_type: form.listingType,
        rooms: form.rooms,
        // For rentals "price" is the monthly rent.
        // For sales "price" mirrors the deposit/full-price field so listings remain sortable/filterable by a single price.
        price: (isSale ? form.deposit : form.price).replace(/,/g, ""),
        deposit: isSale ? form.deposit.replace(/,/g, "") : undefined,
        monthlyInstallment: isSale ? form.monthlyInstallment.replace(/,/g, "") : undefined,
        locationLat: pinnedCoords?.latitude as unknown as string ?? gpsLocation?.lat ?? undefined,
        locationLng: pinnedCoords?.longitude as unknown as string ?? gpsLocation?.lng as unknown as string ?? undefined,
        soundId: sound?.id


      },
      {
        onDone: (postId, postSlug) => {
          removeDraft(submittedDraftId)

          queryClient.invalidateQueries({ queryKey: ["user-listings", user?.username] })
          showNotifToast("Post uploaded to SmartProperty Account", "success")
          router.push(`/sp/post/${postSlug}`)
        },
        onFailed: (error) => {
          saveDraft(snapshot as any)

          showNotifToast("Failed to upload post", "error")
        },
      }, false, undefined, true
    )

    // leave immediately — the upload continues in the background via the
    // floating badge. 
    router.back()

     allowLeaveRef.current = true
    resetAll()
    setIsSubmitting(false)
    
    setIsSubmitting(false)
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
            Log in to sell your properties
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
            <Text style={[styles.headerBack, { color: theme.primary }]}>✕</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            New property post
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView>
          <MediaTypeSelector
            selected={mediaType}
            onSelect={setMediaType}
            isSP={true}
          />
          <DraftsList
            onResume={restoreDraft}
            screen="sp"
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
          setSelectedUris(finalUris)
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
            <TouchableOpacity  onPress={() => (mediaType === "image" ? setStep("image_edit") : exitToStart())}>
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
            <View>
              {/* name */}
              <FormInput
                label="Title(eg.1 Bedroom To Let/House for sale)"
                value={form.name}
                onChangeText={(t) => updateField("name", t)}
                error={errors.name}
                placeholder="title"
                maxLength={30}
                returnKeyType="next"
              />
              <View style={styles.descriptionFooter}>

                <Text style={[styles.charCount, { color: form.name.length == 30 ? theme.error : theme.textMuted }]}>
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

            {/* listing type: rental or sale */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Listing Type
              </Text>
              <View style={styles.categoryChips}>
                {LISTING_TYPE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor:
                          form.listingType === opt.id
                            ? theme.primary
                            : theme.surfaceSecondary,
                        borderColor:
                          form.listingType === opt.id
                            ? theme.primary
                            : theme.border,
                      },
                    ]}
                    onPress={() => updateField("listingType", opt.id)}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      {
                        color:
                          form.listingType === opt.id
                            ? "#fff"
                            : theme.textSecondary,
                      },
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* room type */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Rooms
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryChips}
              >
                {ROOM_TYPE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor:
                          form.rooms === opt.id
                            ? theme.primary
                            : theme.surfaceSecondary,
                        borderColor:
                          form.rooms === opt.id
                            ? theme.primary
                            : theme.border,
                      },
                    ]}
                    onPress={() => updateField("rooms", opt.id)}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      {
                        color:
                          form.rooms === opt.id
                            ? "#fff"
                            : theme.textSecondary,
                      },
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {errors.roomsError && (
                <Text style={[styles.fieldError, { color: theme.error }]}>
                  {errors.roomsError}
                </Text>
              )}
            </View>

            {form.listingType === "rental" ? (
              <View>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                  Price (per month)
                </Text>

                <TextInput
                  style={[
                    styles.descriptionInput,
                    {
                      backgroundColor: theme.inputBackground,
                      color: theme.textPrimary,
                      borderColor: errors.price ? theme.error : theme.border,
                    },
                  ]}
                  value={formatNumber(form.price)}
                  onChangeText={(t) => updateField("price", t)}
                  placeholder="eg 10,000..."
                  placeholderTextColor={theme.textPlaceholder}
                  multiline
                  maxLength={11}
                  keyboardType="numeric"
                  textAlignVertical="top"
                />
                <View style={styles.descriptionFooter}>
                  {errors.price && (
                    <Text style={[styles.fieldError, { color: theme.error }]}>
                      {errors.price}
                    </Text>
                  )}
                  <Text style={[styles.charCount, { color: (form.price.replace(/,/g, "")).length == 9 ? theme.error : theme.textMuted }]}>
                    {(form.price.replace(/,/g, "")).length} / 9
                  </Text>
                </View>
              </View>
            ) : (
              <View>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                  Deposit (or full price)
                </Text>
                <TextInput
                  style={[
                    styles.descriptionInput,
                    {
                      backgroundColor: theme.inputBackground,
                      color: theme.textPrimary,
                      borderColor: errors.deposit ? theme.error : theme.border,
                    },
                  ]}
                  value={formatNumber(form.deposit)}
                  onChangeText={(t) => updateField("deposit", t)}
                  placeholder="eg 10,000..."
                  placeholderTextColor={theme.textPlaceholder}
                  multiline
                  maxLength={11}
                  keyboardType="numeric"
                  textAlignVertical="top"
                />
                <View style={styles.descriptionFooter}>
                  {errors.deposit && (
                    <Text style={[styles.fieldError, { color: theme.error }]}>
                      {errors.deposit}
                    </Text>
                  )}
                  <Text style={[styles.charCount, { color: (form.deposit.replace(/,/g, "")).length == 9 ? theme.error : theme.textMuted }]}>
                    {(form.deposit.replace(/,/g, "")).length} / 9
                  </Text>
                </View>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                  Monthly Installments (Where applicable)(You can give more description about the price and payment in the description field below)
                </Text>
                <TextInput
                  style={[
                    styles.descriptionInput,
                    {
                      backgroundColor: theme.inputBackground,
                      color: theme.textPrimary,
                      borderColor: theme.border,
                    },
                  ]}
                  value={formatNumber(form.monthlyInstallment)}
                  onChangeText={(t) => updateField("monthlyInstallment", t)}
                  placeholder="eg 10,000..."
                  placeholderTextColor={theme.textPlaceholder}
                  multiline
                  maxLength={11}
                  keyboardType="numeric"
                  textAlignVertical="top"
                />
              </View>
            )}
            <View>
              <View>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                  Describe your post
                </Text>
                <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>
                  Explain more about price ,property description like size,condition etc
                </Text>
              </View>
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
            <View style={styles.fieldGroup}>

            </View>
            <View style={styles.fieldGroup}>
              <View>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                  Where is your property located?
                </Text>
                <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>
                  Give a well-leading location starting from a well known place down to the exact location,seperating with comas. eg.Nairobi,upperhill..
                </Text>
              </View>
              <TextInput
                style={[
                  styles.descriptionInput,
                  {
                    backgroundColor: theme.inputBackground,
                    color: theme.textPrimary,
                    borderColor: errors.description ? theme.error : theme.border,
                  },
                ]}
                value={form.location}
                onChangeText={(t) => updateField("location", t)}
                placeholder="eg Kajiado,Rongai..."
                placeholderTextColor={theme.textPlaceholder}
                multiline
                maxLength={100}
                textAlignVertical="top"
              />
              <View style={styles.descriptionFooter}>
                {errors.location && (
                  <Text style={[styles.fieldError, { color: theme.error }]}>
                    {errors.location}
                  </Text>
                )}
                <Text style={[styles.charCount, { color: theme.textMuted }]}>
                  {form.location.length} / 100
                </Text>
              </View>
              {/* <TouchableOpacity
                style={[styles.mapPickButton, { borderColor: theme.border }]}
                onPress={() =>
                  router.push({
                    pathname: "/sp/LocationPicker",
                    params: { lat: pinnedCoords?.latitude, lng: pinnedCoords?.longitude },
                  })}
              >
                <Text style={[styles.mapPickText, { color: theme.primary }]}>
                  {pinnedCoords ? "Change pinned location" : "Pin exact location on map"}
                </Text>
              </TouchableOpacity> */}

              {pinnedCoords && (
                <Text style={[styles.gpsStatus, { color: theme.textMuted }]}>
                  Pinned at {pinnedCoords.latitude.toFixed(5)}, {pinnedCoords.longitude.toFixed(5)}
                </Text>
              )}
            </View>
            <Text style={[styles.fieldError, { color: theme.textPrimarylight }]}>
            </Text>
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

            {/* pending notice */}
            <Text style={[styles.pendingNotice, { color: theme.textMuted }]}>
              Posts are reviewed by our team before going live. Usually within a moment.
            </Text>

          </View>



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
  mapPickButton: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  mapPickText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
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