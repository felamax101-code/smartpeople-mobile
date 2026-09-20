

import React from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native"
import { Image } from "expo-image"
import * as ImagePicker from "expo-image-picker"
import { useTheme } from "@/hooks/useTheme"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"

export interface PickedFile {
  uri: string
  name: string
  type: string
}

interface Props {
  label: string
  sublabel?: string
  value: PickedFile | null
  onPick: (file: PickedFile) => void
  onRemove: () => void
  source: "gallery" | "camera"  // gallery for IDs, camera for selfie
  isRequired?: boolean
}

export const DocumentUpload = ({
  label,
  sublabel,
  value,
  onPick,
  onRemove,
  source,
  isRequired = true,
}: Props) => {
  const theme = useTheme()
  const [isLoading, setIsLoading] = React.useState(false)

  const handlePick = async () => {
    setIsLoading(true)
    try {
      let result: ImagePicker.ImagePickerResult

      if (source === "camera") {
        // request camera permission
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== "granted") {
          Alert.alert(
            "Camera Permission Required",
            "Please allow camera access to take your selfie."
          )
          return
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.85,
        })
      } else {
        // request gallery permission
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (status !== "granted") {
          Alert.alert(
            "Gallery Permission Required",
            "Please allow gallery access to upload your document."
          )
          return
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.85,
        })
      }

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0]
        const uri = asset.uri
        const fileName = uri.split("/").pop() ?? `doc_${Date.now()}.jpg`
        const fileType = asset.mimeType ?? "image/jpeg"

        onPick({ uri, name: fileName, type: fileType })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* label */}
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {label}
          {isRequired && (
            <Text style={{ color: theme.error }}> *</Text>
          )}
        </Text>
        {sublabel && (
          <Text style={[styles.sublabel, { color: theme.textMuted }]}>
            {sublabel}
          </Text>
        )}
      </View>

      {value ? (
        // preview
        <View style={styles.preview}>
          <Image
            source={{ uri: value.uri }}
            style={styles.previewImage}
            contentFit="cover"
          />
          <View style={styles.previewOverlay}>
            <TouchableOpacity
              style={[styles.retakeButton, { backgroundColor: theme.primary }]}
              onPress={handlePick}
            >
              <Text style={styles.retakeText}>
                {source === "camera" ? "Retake" : "Change"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.removeButton, { backgroundColor: theme.error }]}
              onPress={onRemove}
            >
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
          {/* success indicator */}
          <View style={[styles.successDot, { backgroundColor: Colors.success }]}>
            <Text style={styles.successDotText}>☑️</Text>
          </View>
        </View>
      ) : (
        // upload button
        <TouchableOpacity
          style={[
            styles.uploadButton,
            {
              backgroundColor: theme.surfaceSecondary,
              borderColor: theme.border,
            },
          ]}
          onPress={handlePick}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <>
              <Text style={styles.uploadIcon}>
                {source === "camera" ? "" : ""}
              </Text>
              <Text style={[styles.uploadLabel, { color: theme.textSecondary }]}>
                {source === "camera"
                  ? "Take a selfie"
                  : "Upload from gallery"}
              </Text>
              <Text style={[styles.uploadHint, { color: theme.textMuted }]}>
                {source === "camera"
                  ? "Hold your ID next to your face"
                  : "JPG or PNG, clear and legible"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  labelRow: {
    gap: 2,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.3,
  },
  sublabel: {
    fontSize: FontSize.xs,
  },
  uploadButton: {
    height: 100,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  uploadIcon: { fontSize: 28 },
  uploadLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  uploadHint: {
    fontSize: FontSize.xs,
    textAlign: "center",
    paddingHorizontal: Spacing.md,
  },
  preview: {
    height: 140,
    borderRadius: Radius.lg,
    overflow: "hidden",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewOverlay: {
    position: "absolute",
    bottom: Spacing.sm,
    right: Spacing.sm,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  retakeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  retakeText: {
    color: "#fff",
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  successDot: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  successDotText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
  },
})








