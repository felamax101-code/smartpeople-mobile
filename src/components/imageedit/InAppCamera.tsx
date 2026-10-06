import React, { useRef, useState } from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import {
  CameraView,
  CameraType,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera"
import { useTheme } from "@/hooks/useTheme"
import { Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { MediaType } from "@/hooks/useMediaPicker"
import { useNotificationToast } from "../activityIndicator/ToastNotification"
import { MaterialCommunityIcons } from "@expo/vector-icons"
export interface CapturedAsset {
  uri: string
  type: "image" | "video"
  width?: number
  height?: number
  duration?: number
}

interface Props {
  mediaType: MediaType
  onCapture: (asset: CapturedAsset) => void
  onClose: () => void
}

const MAX_VIDEO_SECONDS = 60

export const InAppCamera = ({ mediaType, onCapture, onClose }: Props) => {
  const theme = useTheme()
  const cameraRef = useRef<CameraView>(null)
  const {showNotifToast}=useNotificationToast()
  const [permission, requestPermission] = useCameraPermissions()
  const [micPermission, requestMicPermission] = useMicrophonePermissions()
  const [facing, setFacing] = useState<CameraType>("back")
  const [isRecording, setIsRecording] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const recordTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
const [elapsed, setElapsed] = useState(0)            // whole seconds, drives the UI
const startedAt = useRef<number | null>(null)
const tickInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  React.useEffect(() => {
    if (!permission?.granted) requestPermission()
    if (mediaType === "video" && !micPermission?.granted) requestMicPermission()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    return () => {
      if (recordTimeout.current) clearTimeout(recordTimeout.current)
      if (tickInterval.current) clearInterval(tickInterval.current)

    }
  }, [])

  // permission not resolved yet
  if (!permission) {
    return <View style={styles.container} />
  }

  // permission denied — ask again or bail out
  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.permText, { color: theme.textPrimary }]}>
          Camera access is needed to take a {mediaType === "image" ? "photo" : "video"}.
        </Text>
        <Text style={[styles.infopermText, { color: theme.textPrimary }]}>
         Click <Text style={[{color:theme.primary}]}>[Grant Permission]</Text> or go to settings⇒apps⇒SmartPipla app ⇒ permissions ⇒ and give access to your media
        </Text>
        <TouchableOpacity
          style={[styles.permButton, { backgroundColor: theme.primary }]}
          onPress={requestPermission}
        >
          <Text style={styles.permButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={styles.cancelLink}>
          <Text style={{ color: theme.textSecondary }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const takePhoto = async () => {
    if (isBusy || !cameraRef.current) return
    setIsBusy(true)
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 })
      if (photo) {
        onCapture({
          uri: photo.uri,
          type: "image",
          width: photo.width,
          height: photo.height,
        })
      }
    } catch (err) {
     showNotifToast("Could not take photo.Please try again.","error")
    } finally {
      setIsBusy(false)
    }
  }

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording()
    }
  }

const startRecording = async () => {
  if (isBusy || !cameraRef.current || isRecording) return
  setIsRecording(true)
  setIsBusy(true)
  setElapsed(0)

  startedAt.current = Date.now()
  tickInterval.current = setInterval(() => {
    if (startedAt.current) {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000))
    }
  }, 250)   // ticks faster than 1s so the display never skips a second

  recordTimeout.current = setTimeout(() => {
    stopRecording()
  }, MAX_VIDEO_SECONDS * 1000)

  try {
    const video = await cameraRef.current.recordAsync()
    if (video) {
      const durationMs = startedAt.current ? Date.now() - startedAt.current : undefined
      onCapture({ uri: video.uri, type: "video", duration: durationMs })
    }
  } catch (err) {
    showNotifToast("Could not record video. Please try again.", "error")
  } finally {
    if (recordTimeout.current) clearTimeout(recordTimeout.current)
    if (tickInterval.current) clearInterval(tickInterval.current)
    startedAt.current = null
    setElapsed(0)
    setIsRecording(false)
    setIsBusy(false)
  }
}  

  const handleCapturePress = () => {
    if (mediaType === "image") {
      takePhoto()
    } else {
      isRecording ? stopRecording() : startRecording()
    }
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        mode={mediaType === "video" ? "video" : "picture"}
      />
{isRecording && (
  <View style={styles.timerBadge}>
    <View style={styles.recDot} />
    <Text style={styles.timerText}>
      {formatTime(elapsed)} / {formatTime(MAX_VIDEO_SECONDS)}
    </Text>
  </View>
)}
      <TouchableOpacity style={styles.closeButton} onPress={onClose} disabled={isRecording}>
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.flipButton}
        onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
        disabled={isRecording}
      >
  <MaterialCommunityIcons name="camera-flip-outline" size={22} color="#fff" />
      </TouchableOpacity>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.shutter, isRecording && styles.shutterRecording]}
          onPress={handleCapturePress}
          disabled={isBusy && !isRecording}
        >
          {mediaType === "video" && isRecording && <View style={styles.stopSquare} />}
        </TouchableOpacity>
        {mediaType === "video" && (
          <Text style={styles.hint}>{isRecording ? "Tap to stop" : "Tap to record"}</Text>
        )}
      </View>
    </View>
  )
}
const formatTime = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  permText: { fontSize: FontSize.md, textAlign: "center" },
  infopermText: { fontSize: FontSize.xs, textAlign: "center" },
  permButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
  },
  permButtonText: { color: "#fff", fontSize: FontSize.md, fontWeight: FontWeight.bold },
  cancelLink: { padding: Spacing.sm },
  closeButton: {
    position: "absolute",
    top: 50,
    left: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  flipButton: {
    position: "absolute",
    top: 50,
    right: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  flipButtonText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  controls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: Spacing.sm,
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#fff",
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterRecording: { borderColor: "#ff3b30" },
  stopSquare: { width: 24, height: 24, borderRadius: 4, backgroundColor: "#ff3b30" },
  hint: { color: "#fff", fontSize: FontSize.sm },
  timerBadge: {
  position: "absolute",
  top: 56,
  alignSelf: "center",
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 16,
  backgroundColor: "rgba(0,0,0,0.55)",
},
recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ff3b30" },
timerText: { color: "#fff", fontSize: FontSize.sm, fontWeight: FontWeight.bold },
})