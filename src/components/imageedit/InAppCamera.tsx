import React, { useRef, useState } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native"
import {
  CameraView,
  CameraType,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera"
import { useTheme } from "@/hooks/useTheme"
import { Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { MediaType } from "@/hooks/useMediaPicker"

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

  const [permission, requestPermission] = useCameraPermissions()
  const [micPermission, requestMicPermission] = useMicrophonePermissions()
  const [facing, setFacing] = useState<CameraType>("back")
  const [isRecording, setIsRecording] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const recordTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    if (!permission?.granted) requestPermission()
    if (mediaType === "video" && !micPermission?.granted) requestMicPermission()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    return () => {
      if (recordTimeout.current) clearTimeout(recordTimeout.current)
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
      Alert.alert("Could not take photo", "Please try again.")
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

    recordTimeout.current = setTimeout(() => {
      stopRecording()
    }, MAX_VIDEO_SECONDS * 1000)

    try {
      const video = await cameraRef.current.recordAsync()
      if (video) {
        onCapture({ uri: video.uri, type: "video" })
      }
    } catch (err) {
      Alert.alert("Could not record video", "Please try again.")
    } finally {
      if (recordTimeout.current) clearTimeout(recordTimeout.current)
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

      <TouchableOpacity style={styles.closeButton} onPress={onClose} disabled={isRecording}>
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.flipButton}
        onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
        disabled={isRecording}
      >
        <Text style={styles.flipButtonText}>⟲</Text>
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
})