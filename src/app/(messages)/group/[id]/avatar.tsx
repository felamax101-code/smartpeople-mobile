

// ── app/messages/group/[id]/avatar.tsx ────────────────────────────────────────

import React, { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { Image } from "expo-image"
import * as ImagePicker from "expo-image-picker"
import * as ImageManipulator from "expo-image-manipulator"
import { useTheme } from "@/hooks/useTheme"
import { useGroupManagement } from "@/hooks/useGroupManagement"
import { messagingService } from "@/services/messaging.service"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"

export default function GroupAvatarScreen() {
  const theme = useTheme()
  const { id: conversationId } = useLocalSearchParams<{ id: string }>()
  const { updateGroup, isUpdating } = useGroupManagement(conversationId)

  // local preview URI — shown after the user picks before they confirm
  const [previewUri, setPreviewUri] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const isBusy = isUploading || isUpdating

  // ── Step 1: pick an image ─────────────────────────────────────────────────
  // allowsEditing: true  → shows a native square crop box on iOS and Android
  // aspect: [1, 1]       → forces a square crop (perfect for avatars)
  // quality: 0.8         → slight compression at the picker level
  const pickImage = async (source: "library" | "camera") => {
    // ask for permission first — required on iOS, good practice on Android
    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("Permission needed", "Camera access is required to take a photo.")
        return
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("Permission needed", "Photo library access is required.")
        return
      }
    }

    const result = await (source === "camera"
      ? ImagePicker.launchCameraAsync({
          allowsEditing: true,   // shows crop UI
          aspect: [1, 1],        // square crop
          quality: 0.8,
        })
      : ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        }))

    // user cancelled — do nothing
    if (result.canceled || !result.assets[0]) return

    // ── Step 2: resize + compress with ImageManipulator ───────────────────
    // Avatars don't need to be large — 400×400 is plenty for a group avatar.
    // This brings a typical phone photo from ~4MB down to ~40-80KB.
    const manipulated = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [
        // resize to max 400×400 — keeps aspect ratio via the resize action
        { resize: { width: 400, height: 400 } },
      ],
      {
        compress: 0.75,                          // 75% quality — good balance
        format: ImageManipulator.SaveFormat.JPEG, // JPEG is smaller than PNG for photos
      }
    )

    // show the processed image as a preview
    setPreviewUri(manipulated.uri)
  }

  // ── Step 3: upload + save ─────────────────────────────────────────────────
  // Uploads to your FastAPI /upload/ endpoint as multipart/form-data,
  // then saves the returned URL to the group via PATCH /groups/{id}/
  const handleSave = async () => {
    if (!previewUri) return

    try {
      setIsUploading(true)

      // build a FormData object — React Native's fetch handles multipart natively
      const formData = new FormData()
      formData.append("file", {
        uri: previewUri,
        name: `group-avatar-${conversationId}.jpg`,
        type: "image/jpeg",
      } as any)   // 'as any' needed — RN's FormData type doesn't match the web spec

      const uploadedUrl = await messagingService.uploadImage(formData)

      // save URL to the group — triggers group_updated WS event to all members
      updateGroup(
        { conversationId, group_avatar: uploadedUrl },
        {
          onSuccess: () => {
            router.back()   // return to settings screen — header updates automatically
          },
          onError: () => {
            Alert.alert("Error", "Avatar uploaded but failed to save. Try again.")
          },
        }
      )
    } catch {
      Alert.alert("Upload failed", "Could not upload image. Check your connection.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>

      {/* ── header ─────────────────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          disabled={isBusy}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.backIcon, { color: isBusy ? theme.textMuted : theme.textPrimary }]}>
            ←
          </Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Group Avatar
        </Text>

        {/* Save button — only active once an image is picked */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={!previewUri || isBusy}
        >
          <Text style={[
            styles.saveText,
            { color: previewUri && !isBusy ? theme.primary : theme.textMuted },
          ]}>
            {isBusy ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>

        {/* ── preview area ──────────────────────────────────────────────── */}
        {/* Shows the picked+processed image before the user confirms.
            Before any pick, shows a placeholder circle with instructions. */}
        <View style={styles.previewContainer}>
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              style={styles.previewImage}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.previewPlaceholder, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
              <Text style={styles.previewPlaceholderIcon}>👥</Text>
              <Text style={[styles.previewPlaceholderText, { color: theme.textMuted }]}>
                No image selected
              </Text>
            </View>
          )}

          {/* uploading overlay */}
          {isBusy && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator color="#fff" size="large" />
              <Text style={styles.uploadingText}>
                {isUploading ? "Uploading..." : "Saving..."}
              </Text>
            </View>
          )}
        </View>

        {/* ── pick buttons ──────────────────────────────────────────────── */}
        <View style={styles.pickButtons}>

          <TouchableOpacity
            style={[styles.pickBtn, { backgroundColor: theme.primary }]}
            onPress={() => pickImage("library")}
            disabled={isBusy}
            activeOpacity={0.8}
          >
            <Text style={styles.pickBtnIcon}>🖼</Text>
            <Text style={styles.pickBtnText}>Choose from Library</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pickBtn, { backgroundColor: theme.inputBackground, borderColor: theme.border, borderWidth: 1 }]}
            onPress={() => pickImage("camera")}
            disabled={isBusy}
            activeOpacity={0.8}
          >
            <Text style={styles.pickBtnIcon}>📷</Text>
            <Text style={[styles.pickBtnText, { color: theme.textPrimary }]}>Take a Photo</Text>
          </TouchableOpacity>

        </View>

        {/* helper text */}
        <Text style={[styles.helperText, { color: theme.textMuted }]}>
          Images are cropped to a square and resized to 400×400 before uploading.
        </Text>

      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backIcon: { fontSize: 24, fontWeight: FontWeight.bold },
  headerTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  saveText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },

  body: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing.xl,
  },

  // preview
  previewContainer: {
    position: "relative",
    width: 180,
    height: 180,
  },
  previewImage: {
    width: 180,
    height: 180,
    borderRadius: 90,   // perfect circle
  },
  previewPlaceholder: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  previewPlaceholderIcon: { fontSize: 48 },
  previewPlaceholderText: { fontSize: FontSize.sm, textAlign: "center" },
  uploadingOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 90,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  uploadingText: {
    color: "#fff",
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },

  // pick buttons
  pickButtons: {
    width: "100%",
    gap: Spacing.md,
  },
  pickBtn: {
    flexDirection: "row",
    height: 54,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  pickBtnIcon: { fontSize: 20 },
  pickBtnText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },

  helperText: {
    fontSize: FontSize.xs,
    textAlign: "center",
    lineHeight: 18,
  },
})











