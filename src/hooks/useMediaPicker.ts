import { useState, useCallback, useEffect, useRef } from "react"
import * as ImagePicker from "expo-image-picker"
import { Alert } from "react-native"
import NativeVideoTrim, { showEditor, isValidFile, type Spec } from "react-native-video-trim"
// TODO: the README's New Architecture example uses `NativeVideoTrim` but never
// shows where it's imported from. Copy that import from the library's
// example/src folder (github.com/maitrungduc1410/react-native-video-trim).
// import NativeVideoTrim from "..."

export type MediaType = "image" | "video"|"text"

export interface SelectedMedia {
  uri: string
  id: string
  type: "image" | "video"
  duration?: number
  width?: number
  height?: number
}
type ToastType = "default" | "success" | "error"

type ShowToast = (message: string, type: ToastType) => void

const MAX_IMAGES = 5
const MAX_VIDEO_MS = 60_000 // maxDuration in the library is in milliseconds

// The library may return a bare path; expo-video / expo-image want a file:// URI
const toFileUri = (path: string) =>
  path.startsWith("file://") || path.startsWith("http") ? path : `file://${path}`

export const useMediaPicker = (
  mediaType: MediaType,
  showNotifToast?: ShowToast
) => {
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // remembers width/height of the video currently being trimmed
  const pendingMeta = useRef<{ width?: number; height?: number }>({})

  const notify = useCallback(
    ( message: string, type:ToastType) => {
      if (showNotifToast) showNotifToast(message, type as ToastType)
      else Alert.alert( message)
    },
    [showNotifToast]
  )

  // ---------- trimmer ----------

  const openTrimmer = useCallback(
    async (uri: string, meta: { width?: number; height?: number } = {}) => {
      const valid = await isValidFile(uri)
      if (!valid) {
        notify("Invalid video. This video file can't be opened.","error")
        return
      }
      pendingMeta.current = meta
      showEditor(uri, {
        maxDuration: MAX_VIDEO_MS,
        enablePreciseTrimming: true, // default stream-copy can drift past the limit
        headerText: " Edit and Trim video (max 60s)",
        closeWhenFinish: true,
          trimmingText: 'Applying video edits...',

      })
    },
    [notify]
  )

  // listen for the editor result
  useEffect(() => {
    if (mediaType !== "video") return

    const finishSub = NativeVideoTrim.onFinishTrimming(
      ({ outputPath, duration }: { outputPath: string; duration: number }) => {
        setSelectedMedia([
          {
            uri: toFileUri(outputPath),
            id: `trim_${Date.now()}`,
            type: "video",
            duration,
            ...pendingMeta.current,
          },
        ])
      }
    )

    const errorSub = NativeVideoTrim.onError(
      ({ message }: { message?: string }) => {
        notify( message || "Could not trim this video.","error")
      }
    )

    return () => {
      finishSub?.remove()
      errorSub?.remove()
    }
  }, [mediaType, notify])

  // ---------- gallery ----------

  const pickMedia = useCallback(async () => {
    setIsLoading(true)

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (status !== "granted") {
        notify(
          
          mediaType === "image"
            ? "Please allow gallery access to select photos."
            : "Please allow gallery access to select a video.","error"
        )
        return
      }

      if (mediaType === "image") {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: MAX_IMAGES,
          quality: 0.85,
          orderedSelection: true,
        })

        if (!result.canceled && result.assets.length > 0) {
          setSelectedMedia(
            result.assets.map((asset, index) => ({
              uri: asset.uri,
              id: asset.assetId ?? `img_${Date.now()}_${index}`,
              type: "image" as const,
              width: asset.width,
              height: asset.height,
            }))
          )
        }
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsMultipleSelection: false,
          quality: 1,
        })

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0]
          const meta = { width: asset.width, height: asset.height }

          // too long -> open the trimmer instead of rejecting
          
            await openTrimmer(asset.uri, meta)
           

          
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [mediaType, notify, openTrimmer])

  // ---------- in-app camera ----------

  const addCapturedMedia = useCallback(
    (asset: {
      uri: string
      type: "image" | "video"
      width?: number
      height?: number
      duration?: number
    }) => {
      if (asset.type === "image") {
        setSelectedMedia((prev) => {
          if (prev.length >= MAX_IMAGES) {
            notify(`Limit Reached. You can only select up to ${MAX_IMAGES} photos.`, "error")
            return prev
          }
          return [
            ...prev,
            {
              uri: asset.uri,
              id: `cam_img_${Date.now()}`,
              type: "image",
              width: asset.width,
              height: asset.height,
            },
          ]
        })
        return
      }

      const meta = { width: asset.width, height: asset.height }

      
        openTrimmer(asset.uri, meta)
      
    },
    [notify, openTrimmer]
  )

  // ---------- misc ----------

  // "Edit" button on a video thumbnail: re-open the trimmer on the current clip
  const editVideo = useCallback(() => {
    const clip = selectedMedia.find((m) => m.type === "video")
    if (clip) openTrimmer(clip.uri, { width: clip.width, height: clip.height })
  }, [selectedMedia, openTrimmer])

  const removeMedia = useCallback((id: string) => {
    setSelectedMedia((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const clearSelection = useCallback(() => setSelectedMedia([]), [])

  return {
    selectedMedia,
    isLoading,
    pickMedia,
    addCapturedMedia,
    editVideo,
    removeMedia,
    clearSelection,
    maxReached: mediaType === "image" && selectedMedia.length >= MAX_IMAGES,
  }
}