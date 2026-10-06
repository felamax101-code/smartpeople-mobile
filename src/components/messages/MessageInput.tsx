

import { useState, forwardRef, useRef, useCallback, useEffect, useImperativeHandle } from "react"
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Animated,
  Modal
} from "react-native"
import { File } from "expo-file-system"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { MediaType } from "@/hooks/useMediaPicker"
import { useTheme } from "@/hooks/useTheme"
import { Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { MessageWithExtras } from "@/hooks/useConversationDetail"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { InAppCamera, CapturedAsset } from "../imageedit/InAppCamera"
import * as ImagePicker from "expo-image-picker"
import { useAuthStore } from "@/stores/auth.store"
import { ImageEditScreen } from "../imageedit/ImageEditScreen"
import { useNotificationToast } from "../activityIndicator/ToastNotification"
import NativeVideoTrim, { showEditor, isValidFile, type Spec } from "react-native-video-trim"

const MAX_VIDEO_MS = 60_000 // library and expo-image-picker both use milliseconds

// the library returns a bare path, expo-file-system wants a file:// URI
const toFileUri = (path: string) =>
  path.startsWith("file://") || path.startsWith("http") ? path : `file://${path}`
export interface PickedMediaAsset {
  uri: string
  type: "image" | "video"
  width?: number
  height?: number
  duration?: number   // videos only
  mimeType: string | undefined
  fileSize?: number   // bytes
}

const MAX_MEDIA_ITEMS = 5

interface Props {
  onSendText: (text: string) => void
  onSendOffer: (amount: number) => void
  onSendMedia: (assets: PickedMediaAsset[]) => void
  onTyping: (isTyping: boolean) => void
  isSending: boolean
  showOfferButton: boolean
  replyingTo: MessageWithExtras | null
  onCancelReply: () => void
}

//  builds the one-line preview shown in the reply bar 
const getReplyPreviewText = (message: MessageWithExtras): string => {
  if (message.is_deleted) return "Message deleted"
  if (message.message_type === "image") return "📷 Photo"
  if (message.message_type === "video") return "🎥 Video"
  if (message.message_type === "offer") return `💰 Offer · Ksh ${message.offer_data?.amount ?? ""}`
  return message.body ?? ""
}

export const MessageInput = forwardRef<{ focus: () => void }, Props>(({
  onSendText,
  onSendOffer,
  onSendMedia,
  onTyping,
  isSending,
  showOfferButton,
  replyingTo,
  onCancelReply,
}, ref) => {
  const { user } = useAuthStore()
  const inputRef = useRef<TextInput>(null)
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }))
  const theme = useTheme()
  const [text, setText] = useState("")
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [offerAmount, setOfferAmount] = useState("")
  const {showNotifToast}=useNotificationToast()
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mediapickerVisisble, setMediaPickerMediaVisisble] = useState<boolean>(false)
  const [pendingAssets, setPendingAssets] = useState<PickedMediaAsset[] | null>(null)
  //  reply bar animation 
  // Slides down from height 0 with a spring when a reply target is set,
  // and springs back to 0 when cancelled or sent.
  const replyAnim = useRef(new Animated.Value(0)).current
  const [cameraMode, setCameraMode] = useState<MediaType | null>(null)
  useEffect(() => {
    Animated.spring(replyAnim, {
      toValue: replyingTo ? 1 : 0,
      useNativeDriver: false,   // animating height — can't use native driver
      friction: 9,
      tension: 80,
    }).start()
  }, [replyingTo, replyAnim])

  const replyBarHeight = replyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 56],
  })
  const replyBarOpacity = replyAnim

  const handleTextChange = (value: string) => {
    setText(value)
    onTyping(true)
    if (typingTimeoutRef.current !== null) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000)
  }

  const handleSend = useCallback(() => {
    if (!text.trim() || isSending) return
    onTyping(false)
    if (typingTimeoutRef.current !== null) clearTimeout(typingTimeoutRef.current)
    onSendText(text.trim())
    setText("")
  }, [text, isSending, onSendText, onTyping])

  

  //  media: normalize a raw picker asset into our own shape, tagging it
  //    image vs video so everything downstream    can branch on `type` without re-inspecting the file. 
  const toPickedAsset = (asset: ImagePicker.ImagePickerAsset): PickedMediaAsset => ({
    uri: asset.uri,
    type: asset.type === "video" ? "video" : "image",
    width: asset.width,
    height: asset.height,
    duration: asset.duration ?? undefined,
    mimeType: asset.mimeType
  })
  // Opens the native editor and resolves with the trimmed asset, or null if the
// user cancelled or something failed.
const trimVideo = useCallback(
  async (asset: PickedMediaAsset): Promise<PickedMediaAsset | null> => {
    const { isValid } = await isValidFile(asset.uri)
    if (!isValid) {
      showNotifToast("This video can't be opened.", "error")
      return null
    }

    return new Promise((resolve) => {
      const native = NativeVideoTrim as Spec
      const subs: { remove: () => void }[] = []
      const finish = (result: PickedMediaAsset | null) => {
        subs.forEach((s) => s.remove())   // always unsubscribe
        resolve(result)
      }

      subs.push(
        native.onFinishTrimming(({ outputPath, duration }) => {
          const uri = toFileUri(outputPath)
          finish({
            ...asset,
            uri,
            duration,
            mimeType: "video/mp4",
            width: undefined,    // edit tools may have cropped/rotated
            height: undefined,
            fileSize: getFileSize(uri),   // new file, re-read
          })
        })
      )
      subs.push(native.onCancel(() => finish(null)))
      subs.push(
        native.onError(({ message }) => {
          showNotifToast(message || "Could not trim this video.", "error")
          finish(null)
        })
      )

      showEditor(asset.uri, {
        maxDuration: MAX_VIDEO_MS,
        enablePreciseTrimming: true,   // otherwise output can overshoot 60s
        headerText: "Trim video (max 60s)",
        closeWhenFinish: true,
      })
    })
  },
  [showNotifToast]
)
const handlePicked = useCallback(
  async (assets: PickedMediaAsset[]) => {
    const processed: PickedMediaAsset[] = []

    for (const a of assets) {
      if (a.type === "video" && a.duration && a.duration > MAX_VIDEO_MS) {
        const trimmed = await trimVideo(a)   // one editor at a time
        if (trimmed) processed.push(trimmed)
        else showNotifToast("Video skipped: it must be 60 seconds or less.", "error")
      } else {
        processed.push(a)
      }
    }

    if (processed.length === 0) return

    const withSize = processed.map((a) => ({
      ...a,
      fileSize: a.fileSize ?? getFileSize(a.uri),
    }))

    if (withSize.some((a) => a.type === "image")) {
      setPendingAssets(withSize)   // image editor, as before
    } else {
      onSendMedia(withSize)
    }
  },
  [onSendMedia, trimVideo, showNotifToast]
)

const handleEditDone = useCallback((editedUris: string[]) => {
  if (!pendingAssets) return
  let i = 0
  const merged = pendingAssets.map((a) => {
    if (a.type === "video") return a
    const uri = editedUris[i++]
    return {
      ...a,
      uri,
      mimeType: mimeFromUri(uri),
      width: undefined,            // crop/rotate changed these
      height: undefined,
      fileSize: getFileSize(uri),  // re-read, the edited file is a new file
    }
  })
  setPendingAssets(null)
  onSendMedia(merged)
}, [pendingAssets, onSendMedia])
  const pickFromLibrary = useCallback(async () => {
    setMediaPickerMediaVisisble(false)

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      showNotifToast("Permission needed. Allow access to your photos and videos to send media.","error")
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],   // one mixed picker — both types together
      allowsMultipleSelection: true,
      selectionLimit: MAX_MEDIA_ITEMS,
      quality: 0.7,
    })

    if (result.canceled) return

    const assets = result.assets.slice(0, MAX_MEDIA_ITEMS).map(toPickedAsset)
    handlePicked(assets)
  }, [onSendMedia,handlePicked])
  const openCamera = useCallback((mode: MediaType) => {
    setMediaPickerMediaVisisble(false)
    setCameraMode(mode)
  }, [])

  const handleCameraCapture = useCallback((asset: CapturedAsset) => {
    setCameraMode(null)
    const ext = asset.uri.split(".").pop()?.toLowerCase()
    const mimeType =
      asset.type === "image"
        ? ext === "png" ? "image/png" : "image/jpeg"
        : ext === "mov" ? "video/quicktime" : "video/mp4"

    handlePicked([{
  uri: asset.uri,
  type: asset.type,
  width: asset.width,
  height: asset.height,
  duration: asset.duration,
  mimeType,
}])
  }, [onSendMedia,handlePicked])
  return (
    <>
      {/*  reply bar  */}
      <Animated.View
        style={[
          styles.replyBar,
          {
            height: replyBarHeight,
            opacity: replyBarOpacity,
            backgroundColor: theme.surfaceSecondary,
            borderTopColor: theme.border,
          },
        ]}
      >
        {replyingTo && (
          <>

            <View style={[styles.replyAccent, { backgroundColor: theme.primary }]} />

            <View style={styles.replyTextContainer}>
              <Text style={[styles.replyLabel, { color: theme.primary }]} numberOfLines={1}>
                Replying to @{user?.username === replyingTo.sender_username ? "Yourself" : replyingTo.sender_username}
              </Text>
              <Text style={[styles.replyPreview, { color: theme.textSecondary }]} numberOfLines={1}>
                {getReplyPreviewText(replyingTo)}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onCancelReply}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.replyCancelBtn}
            >
              <Text style={[styles.replyCancelIcon, { color: theme.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>

      {/*  input row  */}
      <View style={[
        styles.container,
        { backgroundColor: theme.surface, borderTopColor: theme.border }
      ]}>

        <TouchableOpacity
          style={[styles.offerButton, { backgroundColor: theme.primaryLight, borderColor: theme.textPrimary }]}
          onPress={() => setMediaPickerMediaVisisble((v) => !v)}
        >
          <Text style={[styles.offerButtonText, { color: theme.primary }]}>
            <MaterialCommunityIcons name="plus-circle-outline" color={`${theme.textMuted}`} size={19} />
          </Text>
        </TouchableOpacity>


        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            { backgroundColor: theme.inputBackground, color: theme.textPrimary, borderColor: theme.success },
          ]}
          value={text}
          onChangeText={handleTextChange}
          placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
          placeholderTextColor={theme.textPlaceholder}
          multiline
          maxLength={2000}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: text.trim() ? theme.primary : theme.border },
          ]}
          onPress={handleSend}
          disabled={!text.trim() || isSending}
        >
          <Text style={styles.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>

      {/*  media picker: backdrop first (bottom layer), menu second (top
          layer) — later siblings paint on top in RN, same as DOM stacking.
          Both are absolute, so they're positioned relative to this
          component's nearest real View ancestor (the screen's
          KeyboardAvoidingView), not the small + button. ─ */}
      {mediapickerVisisble && (
        <>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setMediaPickerMediaVisisble(false)}
          />
          <View style={[styles.mediaPicker, { backgroundColor: theme.primary, borderColor: theme.textMuted }]}>
            <View style={[styles.mediaTitle, { backgroundColor: theme.borderMuted }]}>
              <Text style={{ fontSize: FontSize.xs, color: theme.textPrimary }}>
                Select to send
              </Text>
            </View>

            <View style={{ marginTop: 10, flexDirection: "column", gap: 6 }}>
              <TouchableOpacity onPress={pickFromLibrary}>
                <Text style={[styles.mediaItem, { color: theme.textPrimary, backgroundColor: theme.backgroundMuted }]}>
                  <MaterialCommunityIcons name="folder" size={15} /> Library
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openCamera("image")}>
                <Text style={[styles.mediaItem, { color: theme.textPrimary, backgroundColor: theme.backgroundMuted }]}>
                  <MaterialCommunityIcons name="camera" size={15} /> Photo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openCamera("video")}>
                <Text style={[styles.mediaItem, { color: theme.textPrimary, backgroundColor: theme.backgroundMuted }]}>
                  <MaterialCommunityIcons name="video" size={15} /> Video
                </Text>
              </TouchableOpacity>
            </View>
          </View>
         
        </>
      )}
       <Modal
            visible={cameraMode !== null}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={() => setCameraMode(null)}   // Android back button
          >
            {cameraMode && (
              <InAppCamera
                mediaType={cameraMode}
                onCapture={handleCameraCapture}
                onClose={() => setCameraMode(null)}
              />
            )}
          </Modal>
          <Modal
  visible={pendingAssets !== null}
  animationType="slide"
  presentationStyle="fullScreen"
  statusBarTranslucent
  onRequestClose={() => setPendingAssets(null)}
>
  <SafeAreaProvider>
    {pendingAssets && (
      <ImageEditScreen
        imageUris={pendingAssets.filter((a) => a.type === "image").map((a) => a.uri)}
        onCancel={() => setPendingAssets(null)}
        onDone={handleEditDone}
      />
    )}
  </SafeAreaProvider>
</Modal>
    </>
  )
})
const getFileSize = (uri: string): number | undefined => {
  try {
    return new File(uri).size ?? undefined
  } catch {
    return undefined
  }
}

const mimeFromUri = (uri: string) => {
  const ext = uri.split(".").pop()?.toLowerCase()
  if (ext === "png") return "image/png"
  if (ext === "webp") return "image/webp"
  return "image/jpeg"
}
const styles = StyleSheet.create({
  //  reply bar 
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
    overflow: "hidden",   // clips content while height animates from 0
    gap: Spacing.sm,
  },
  replyAccent: {
    width: 3,
    height: "60%",
    borderRadius: 2,
  },
  mediaPicker: {
    position: "absolute",
    bottom: 60,          // sits just above the input row
    left: Spacing.sm,    // roughly under the + button, which is the first item in the row
    width: 150,
    borderRadius: Radius.lg,
    zIndex: 20,
    elevation: 20,       // Android needs elevation, zIndex alone isn't reliable there
    borderWidth: 2,
    paddingBottom: 8,
  },
  mediaTitle: {
    marginHorizontal: 2,
    marginVertical: 4,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: 2
  },
  mediaItem: {
    fontSize: FontSize.sm,
    marginHorizontal: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: Radius.lg,

  },
  replyTextContainer: { flex: 1 },
  replyLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  replyPreview: { fontSize: FontSize.sm, marginTop: 1 },
  replyCancelBtn: { padding: 4 },
  replyCancelIcon: { fontSize: 16, fontWeight: FontWeight.bold },

  //  input row (unchanged) ─
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderTopWidth: 1,
  },
  offerButton: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center", flexShrink: 0, borderWidth: 0.5
  },
  offerButtonText: { fontSize: 18 },
  input: {
    flex: 1, borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md, paddingTop: 10, paddingBottom: 10,
    fontSize: FontSize.md, maxHeight: 120, minHeight: 40, borderWidth: 0.5
  },
  sendButton: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  sendIcon: { color: "#fff", fontSize: 18, fontWeight: "900" },

  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.1)",
    zIndex: 10,
    elevation: 10,
  },
  offerSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl, gap: Spacing.md, alignItems: "center",
  },
  dragHandle: { width: 40, height: 4, borderRadius: 2, marginBottom: Spacing.sm },
  offerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  offerSub: { fontSize: FontSize.sm, textAlign: "center", lineHeight: 20 },
  offerInput: {
    width: "100%", height: 52, borderRadius: Radius.md, borderWidth: 1,
    paddingHorizontal: Spacing.md, fontSize: FontSize.xl, fontWeight: FontWeight.bold, textAlign: "center",
  },
  sendOfferButton: {
    width: "100%", height: 52, borderRadius: Radius.md,
    alignItems: "center", justifyContent: "center",
  },
  sendOfferText: { color: "#fff", fontSize: FontSize.md, fontWeight: FontWeight.bold },
})










