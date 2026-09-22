import { useState, useCallback } from "react"
import * as ImagePicker from "expo-image-picker"
import { Alert } from "react-native"
import { Assets } from "expo-router/build/react-navigation"

export type MediaType = "image" | "video" |"text"

export interface SelectedMedia {
  uri: string
  id: string
  type: "image" | "video"
  duration?: number
  width?: number
  height?: number
}

const MAX_IMAGES = 5

export const useMediaPicker = (mediaType: MediaType) => {
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const pickMedia = useCallback(async () => {
    setIsLoading(true)

    try {
      if (mediaType === "image") {
        // request gallery permission
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync()

        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Please allow gallery access to select photos."
          )
          return
        }

        // open native image picker — supports multiple selection
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,   // ← select up to 5
          selectionLimit: MAX_IMAGES,
          quality: 0.85,
          orderedSelection: true,           // ← maintains selection order
        })

        if (!result.canceled && result.assets.length > 0) {
          const media: SelectedMedia[] = result.assets.map((asset, index) => ({
            uri: asset.uri,
            id: asset.assetId ?? `img_${Date.now()}_${index}`,
            type: "image",
            width: asset.width,
            height: asset.height,
          }))
          setSelectedMedia(media)
        }

      } else {
        // video — single selection
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync()

        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Please allow gallery access to select a video."
          )
          return
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsMultipleSelection: false,
          quality: 1,
          videoMaxDuration: 60,    // 60 seconds max
        })

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0]
          if (asset.duration && asset.duration>60000){
            Alert.alert(
              "Please select video under 60 seconds"
            )
            return;
          }
          setSelectedMedia([{
            uri: asset.uri,
            id: asset.assetId ?? `vid_${Date.now()}`,
            type: "video",
            duration: asset.duration ?? undefined,
            width: asset.width,
            height: asset.height,
          }])
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [mediaType])

  // add media that was already captured by the in-app camera screen
  // (no ImagePicker.launchCameraAsync — that hands off to the system camera app,
  // which backgrounds this app and risks the OS killing the process on
  // low-memory devices, losing all state)
  const addCapturedMedia = useCallback(
    (asset: { uri: string; type: "image" | "video"; width?: number; height?: number; duration?: number }) => {
      if (asset.type === "image") {
        setSelectedMedia((prev) => {
          if (prev.length >= MAX_IMAGES) {
            Alert.alert("Limit Reached", `You can only select up to ${MAX_IMAGES} photos.`)
            return prev
          }
          const newItem: SelectedMedia = {
            uri: asset.uri,
            id: `cam_img_${Date.now()}`,
            type: "image",
            width: asset.width,
            height: asset.height,
          }
          return [...prev, newItem]
        })
      } else {
        setSelectedMedia([{
          uri: asset.uri,
          id: `cam_vid_${Date.now()}`,
          type: "video",
          duration: asset.duration,
          width: asset.width,
          height: asset.height,
        }])
      }
    },
    []
  )

  const removeMedia = useCallback((id: string) => {
    setSelectedMedia((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const clearSelection = useCallback(() => setSelectedMedia([]), [])

  return {
    selectedMedia,
    isLoading,
    pickMedia,          // call this to open the gallery picker
    addCapturedMedia,    // call this with the result from the in-app camera screen
    removeMedia,
    clearSelection,
    maxReached: mediaType === "image" && selectedMedia.length >= MAX_IMAGES,
    hasPermission: true, // handled inside pickMedia / pickFromCamera
  }
}