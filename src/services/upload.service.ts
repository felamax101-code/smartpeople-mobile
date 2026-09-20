import { Platform } from "react-native"

// your Cloudinary config — store in .env
const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET! // unsigned preset

export interface UploadResult {
  url: string
  publicId: string
  width?: number
  height?: number
  duration?: number  // for videos
  format: string
}

export const uploadService = {

  // ── upload single image ───────────────────────────────────
  uploadImage: async (
    localUri: string,
    onProgress?: (percent: number) => void
  ): Promise<UploadResult> => {
    const formData = new FormData()

    // React Native file format for FormData
    formData.append("file", {
      uri: Platform.OS === "ios" ? localUri.replace("file://", "") : localUri,
      type: "image/jpeg",
      name: `image_${Date.now()}.jpg`,
    } as any)

    formData.append("upload_preset", UPLOAD_PRESET)
    formData.append("folder", "marketplace/products")

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    )

    if (!response.ok) {
      throw new Error("Image upload failed")
    }

    const data = await response.json()

    return {
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format,
    }
  },

  // ── upload multiple images ────────────────────────────────
  uploadImages: async (
    localUris: string[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<UploadResult[]> => {
    const results: UploadResult[] = []

    for (let i = 0; i < localUris.length; i++) {
      const result = await uploadService.uploadImage(localUris[i])
      results.push(result)
      onProgress?.(i + 1, localUris.length)
    }

    return results
  },

  // ── upload video ──────────────────────────────────────────
  uploadVideo: async (
    localUri: string,
    onProgress?: (percent: number) => void
  ): Promise<UploadResult> => {
    const formData = new FormData()

    formData.append("file", {
      uri: Platform.OS === "ios" ? localUri.replace("file://", "") : localUri,
      type: "video/mp4",
      name: `video_${Date.now()}.mp4`,
    } as any)

    formData.append("upload_preset", UPLOAD_PRESET)
    formData.append("folder", "marketplace/products/videos")
    formData.append("resource_type", "video")

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
      {
        method: "POST",
        body: formData,
      }
    )

    if (!response.ok) {
      throw new Error("Video upload failed")
    }

    const data = await response.json()

    return {
      url: data.secure_url,
      publicId: data.public_id,
      duration: data.duration,
      format: data.format,
    }
  },
}