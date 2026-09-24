import React from "react"
import { View, Text, StyleSheet } from "react-native"
import { Image } from "expo-image"
import { Spacing, Radius } from "@/constants/colors"
import { CircularProgress } from "./UploadProgressCircle"
import { useUploadQueue } from "./UploadQueuecontext"
//It reads from UploadQueueContext, so as long as
// UploadQueueProvider wraps your navigator, uploads keep running and this
// badge keeps updating even after the user has navigated away and back.
export const UploadProgressBadge = () => {
  const { uploads } = useUploadQueue()

  if (uploads.length === 0) return null

  return (
    <View style={styles.container} pointerEvents="box-none">
      {uploads.map((upload) => (
        <View key={upload.id} style={styles.badge}>
          <Image source={{ uri: upload.localUris[0] }} style={styles.thumb} contentFit="cover" />

          <View style={styles.overlay}>
            {upload.status === "uploading" && (
              <>
                <CircularProgress progress={upload.progress} size={36} />
                <Text style={styles.label}>{upload.progress}%</Text>
              </>
            )}
            {upload.status === "processing" && (
              <>
                <CircularProgress progress={100} size={36} />
                <Text style={styles.label}>Processing</Text>
              </>
            )}
            {upload.status === "done" && <Text style={styles.checkmark}>✓</Text>}
            {upload.status === "failed" && <Text style={styles.errorMark}>✕</Text>}
          </View>
        </View>
      ))}
    </View>
  )
}

const BADGE_SIZE = 56

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 90, // sits above a typical tab bar — adjust to your layout
    right: Spacing.md,
    gap: Spacing.sm,
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: Radius.md,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  label: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  checkmark: {
    color: "#4cd964",
    fontSize: 22,
    fontWeight: "900",
  },
  errorMark: {
    color: "#ff3b30",
    fontSize: 20,
    fontWeight: "900",
  },
})