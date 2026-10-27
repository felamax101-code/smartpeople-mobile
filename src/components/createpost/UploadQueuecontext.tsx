import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import * as Crypto from "expo-crypto"
import api from "@/services/api"
import { PostVideo } from "@/types"
import { useNotificationToast } from "../activityIndicator/ToastNotification"
import { PostViewer } from "@/app/(tabs)/createpost"
const CREATE_POST_PATH = "/posts/"
const VIDEO_STATUS_PATH = (videoId: string) => `/post-videos/${videoId}/status/`

const GROUP_VIDEO_STATUS_PATH = (videoId: string) => `/groups/post-videos/${videoId}/status/`
const SP_VIDEO_STATUS_PATH = (videoId: string) => `/sp/post-videos/${videoId}/status/`

export type UploadStatus = "uploading" | "processing" | "done" | "failed"

export interface CreatePostInput {
  name?: string
  description: string
  categoryId: string
  locationLat?: string
  locationLng?: string
  locationDisplay?: string
  postType: "text" | "image" | "video"
  mediaType?: "photo" | "video" // matches PostSerializer's media_type field
  mediaUris?: string[] // local file uris, in the order they should be saved
  location?: string
  price?: string
  monthlyInstallment?: string
  listingType?: string
  rooms?: string
  deposit?: string
  listing_type?: string
  soundId?: string
  visibility?: PostViewer
  allowComments?: boolean
  allowDownload?: boolean
  isPromotional?: boolean


}

export interface UploadEntry {
  id: string // == clientUploadId, used as the upload's key everywhere
  clientUploadId: string
  localUris: string[]
  postType: "text" | "image" | "video"
  progress: number // 0-100, meaningful only while status is "uploading"
  status: UploadStatus
  postId?: string
  postSlug?: string
  videoIds?: string[]
  error?: string
  size?: string

}

interface StartUploadOptions {
  onDone?: (postId: string, postSlug: string) => void
  onFailed?: (error: string) => void
}

interface UploadQueueContextValue {
  uploads: UploadEntry[]
  startUpload: (input: CreatePostInput, options?: StartUploadOptions, isGroup?: boolean, slug?: string, isSP?: boolean) => string
  dismissUpload: (id: string) => void
}

const UploadQueueContext = createContext<UploadQueueContextValue | null>(null)

const POLL_INTERVAL_MS = 3000
const AUTO_DISMISS_DELAY_MS = 2000

export const UploadQueueProvider = ({ children }: { children: React.ReactNode }) => {
  const [uploads, setUploads] = useState<UploadEntry[]>([])
  const pollTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({})
  const callbacks = useRef<Record<string, StartUploadOptions>>({})
  const { showNotifToast } = useNotificationToast()
  const updateUpload = useCallback((id: string, patch: Partial<UploadEntry>) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)))
  }, [])

  const clearPoll = (id: string) => {
    if (pollTimers.current[id]) {
      clearInterval(pollTimers.current[id])
      delete pollTimers.current[id]
    }
  }

  const dismissUpload = useCallback((id: string) => {
    clearPoll(id)
    delete callbacks.current[id]
    setUploads((prev) => prev.filter((u) => u.id !== id))
  }, [])

  const scheduleDismiss = useCallback((id: string) => {
    setTimeout(() => dismissUpload(id), AUTO_DISMISS_DELAY_MS)
  }, [dismissUpload])

  // polls every still-processing video for one upload until all resolve
  const pollVideoStatuses = useCallback(
    (uploadId: string, postId: string, postSlug: string, videoIds: string[], isGroup?: boolean, isSP?: boolean) => {
      const pending = new Set(videoIds)
      const failed = new Set<string>()

      pollTimers.current[uploadId] = setInterval(async () => {
        try {

          await Promise.all(
            Array.from(pending).map(async (videoId) => {
              // goes through `api` too — status checks stay authenticated and
              // benefit from the same 401-refresh handling as everything else
              const res = await api.get(isGroup ? GROUP_VIDEO_STATUS_PATH(videoId) : isSP ? SP_VIDEO_STATUS_PATH(videoId) : VIDEO_STATUS_PATH(videoId))

              const data = res.data
              if (data.status === "done") {
                showNotifToast("Post uploaded", "success")
                pending.delete(videoId)
              } else if (data.status === "failed") {
                showNotifToast("Upload failed", "error")
                pending.delete(videoId)
                failed.add(videoId)
              }
              // any other status ("processing") — leave it pending, check again next tick
            })
          )

          if (pending.size === 0) {
            clearPoll(uploadId)
            if (failed.size > 0) {
              updateUpload(uploadId, { status: "failed", error: "Video processing failed" })
              callbacks.current[uploadId]?.onFailed?.("Video processing failed")
            } else {
              updateUpload(uploadId, { status: "done" })
              callbacks.current[uploadId]?.onDone?.(postId, postSlug)
              scheduleDismiss(uploadId)
            }
          }
        } catch {
          // transient network error — try again next tick rather than failing outright
        }
      }, POLL_INTERVAL_MS)
    },
    [updateUpload, scheduleDismiss]
  )

  const startUpload = useCallback(
    (input: CreatePostInput, options?: StartUploadOptions, isGroup?: boolean, slug?: string, isSP?: boolean) => {
      const clientUploadId = Crypto.randomUUID()
      const id = clientUploadId
      callbacks.current[id] = options ?? {}

      setUploads((prev) => [
        ...prev,
        {
          id,
          clientUploadId,
          localUris: input.mediaUris ?? [],
          postType: input.postType,
          progress: 0,
          status: "uploading",
        },
      ])

      const formData = new FormData()
      formData.append("client_upload_id", clientUploadId)
      formData.append("post_type", input.postType)
      formData.append("description", input.description)
      formData.append("category", input.categoryId)
      if (input.name) formData.append("name", input.name)
      if (input.locationLat) formData.append("location_lat", input.locationLat)
      if (input.locationLng) formData.append("location_lng", input.locationLng)
      if (input.locationDisplay) formData.append("location_display", input.locationDisplay)
      if (input.mediaType) formData.append("media_type", input.mediaType)
      if (input.price) formData.append("price", input.price)
      if (input.rooms) formData.append("rooms", input.rooms)
      if (input.deposit) formData.append("deposit", input.deposit)
      if (input.monthlyInstallment) formData.append("monthly_installment", input.monthlyInstallment)
      if (input.listing_type) formData.append("listing_type", input.listing_type)
      if (input.rooms) formData.append("house_type", input.rooms)
      if (input.soundId) { formData.append("sound_id", input.soundId) }
      if (input.allowComments) { formData.append("allow_comments", String(input.allowComments)) }
      if (input.visibility) { formData.append("who_can_view", input.visibility ?? "anybody") }
      if (input.allowDownload) { formData.append("allow_download", String(input.allowDownload)) }
      if (input.isPromotional) { formData.append("is_promotional_content", String(input.isPromotional)) }





      // DRF's ListField(child=FileField()) expects repeated "media" entries —
      // append each file under the same field name (1 for video, up to 10 for photos)
      ; (input.mediaUris ?? []).forEach((uri, index) => {
        const ext = uri.split(".").pop() || (input.mediaType === "video" ? "mp4" : "jpg")
        const mimeType = input.mediaType === "video" ? "video/mp4" : "image/jpeg"
        formData.append("media", {
          uri,
          name: `media_${index}.${ext}`,
          type: mimeType,
        } as any)
      })

      api
        .post(isGroup ? `/groups/${slug}/posts/` : isSP ? "/sp/posts/" : CREATE_POST_PATH, formData, {
          headers: { "Content-Type": "multipart/form-data" }, // overrides the instance's default JSON header for this request
          timeout: 300000, // 2 min — the instance-wide 15s default is fine for JSON but too short for a video upload on a slow connection
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total
            if (total) {
              showNotifToast("Uploading post. [Do not close the app!]", "success")
              const pct = Math.round((progressEvent.loaded / total) * 100)
              updateUpload(id, { progress: pct })
            }
          },
        })
        .then((response) => {
          const data = response.data
          const postId: string | undefined = data.id
          const postSlug: string | undefined = data.slug

          if (!postId) {
            const err = "No post id returned"
            updateUpload(id, { status: "failed", error: err })
            callbacks.current[id]?.onFailed?.(err)
            return
          }

          const videos: PostVideo[] = data.videos ?? []
          const videoIds = videos.map((v) => v.id)
          const pendingVideoIds = videos
            .filter((v) => v.processing_status === "processing")
            .map((v) => v.id)
          updateUpload(id, {
            progress: 100,
            postId,
            postSlug,
            videoIds,
            status: pendingVideoIds.length > 0 ? "processing" : "done",
          })

          if (pendingVideoIds.length > 0) {
            pollVideoStatuses(id, postId, postSlug ?? "", pendingVideoIds, isGroup, isSP)
          } else {
            // text/image posts, or a post with no video needing processing
            callbacks.current[id]?.onDone?.(postId, postSlug ?? "")
            scheduleDismiss(id)
          }
        })
        .catch((err) => {
          // NOTE: this can fire on a genuine network failure — but the request may
          // still have been received and processed server-side (see the
          // client_upload_id idempotency check in PostCreateView). If you want
          // to recover from this rather than just show a failure, this is the
          // spot to add a "check by client_upload_id before giving up" step.
          //
          // Also note: this .catch only sees errors axios doesn't resolve on its
          // own. A 401 is handled transparently by  interceptor (refresh +
          // retry) and never reaches here unless the refresh itself also fails.
          const message = err?.response?.data?.detail || err?.message || "Upload failed"
          updateUpload(id, { status: "failed", error: message })
          callbacks.current[id]?.onFailed?.(message)
        })

      return id
    },
    [updateUpload, pollVideoStatuses, scheduleDismiss]
  )

  useEffect(() => {
    return () => {
      Object.keys(pollTimers.current).forEach(clearPoll)
    }
  }, [])

  return (
    <UploadQueueContext.Provider value={{ uploads, startUpload, dismissUpload }}>
      {children}
    </UploadQueueContext.Provider>
  )
}

export const useUploadQueue = () => {
  const ctx = useContext(UploadQueueContext)
  if (!ctx) {
    throw new Error("useUploadQueue must be used within an UploadQueueProvider")
  }
  return ctx
}