import React from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from "react-native"
import { Image } from "expo-image"
import { useTheme } from "@/hooks/useTheme"
import { useMediaPicker, MediaType, SelectedMedia } from "@/hooks/useMediaPicker"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"

const { width: SCREEN_WIDTH } = Dimensions.get("window")
const THUMB_SIZE = (SCREEN_WIDTH - Spacing.md * 2 - Spacing.sm * 4) / 4

interface Props {
  mediaType: MediaType
  onNext: (uris: string[]) => void
}

export const GalleryPicker = ({ mediaType, onNext }: Props) => {
  const theme = useTheme()

  const {
    selectedMedia,
    isLoading,
    pickMedia,
    removeMedia,
    maxReached,
  } = useMediaPicker(mediaType)

  // auto-open picker on mount
  React.useEffect(() => {
    pickMedia()
  }, [])

  // when media selected → auto advance to next step
  React.useEffect(() => {
    if (selectedMedia.length > 0) {
      onNext(selectedMedia.map((m) => m.uri))
    }
  }, [selectedMedia])
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} size="large" />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Opening gallery...
          </Text>
        </View>
      ) : selectedMedia.length === 0 ? (
        // show button to re-open picker if user dismissed without selecting
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>
            {mediaType === "image" ? "🖼️" : "🎬"}
          </Text>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
            No {mediaType === "image" ? "photos" : "video"} selected
          </Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
            {mediaType === "image"
              ? `Select up to ${5} photos from your gallery`
              : "Select a video from your gallery"}
          </Text>
          <TouchableOpacity
            style={[styles.openButton, { backgroundColor: theme.primary }]}
            onPress={pickMedia}
          >
            <Text style={styles.openButtonText}>
              Open Gallery
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        // show selected thumbnails with continue button
        <View style={styles.selectedContainer}>
          <Text style={[styles.selectedTitle, { color: theme.textPrimary }]}>
            {selectedMedia.length} {mediaType === "image" ? "photo" : "video"} selected
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbsRow}
          >
            {selectedMedia.map((media, index) => (
              <View key={media.id} style={styles.thumbWrapper}>
                <Image
                  source={{ uri: media.uri }}
                  style={styles.thumb}
                  contentFit="cover"
                />
                {/* order number */}
                <View style={[styles.orderBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.orderText}>{index + 1}</Text>
                </View>
                {/* remove */}
                <TouchableOpacity
                  style={styles.removeBadge}
                  onPress={() => removeMedia(media.id)}
                >
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* add more — only for images */}
            {mediaType === "image" && !maxReached && (
              <TouchableOpacity
                style={[styles.addMore, { borderColor: theme.border }]}
                onPress={pickMedia}
              >
                <Text style={[styles.addMoreText, { color: theme.textSecondary }]}>
                  + Add{"\n"}more
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* continue button */}
          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: theme.primary }]}
            onPress={() => onNext(selectedMedia.map((m) => m.uri))}
          >
            <Text style={styles.continueButtonText}>
              Continue with {selectedMedia.length}{" "}
              {mediaType === "image"
                ? `photo${selectedMedia.length > 1 ? "s" : ""}`
                : "video"} →
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIcon: { fontSize: 64 },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: "center",
  },
  emptySub: {
    fontSize: FontSize.md,
    textAlign: "center",
    lineHeight: 22,
  },
  openButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
  },
  openButtonText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  selectedContainer: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.lg,
  },
  selectedTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    textAlign: "center",
    paddingTop: Spacing.lg,
  },
  thumbsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  thumbWrapper: {
    width: THUMB_SIZE * 2,
    height: THUMB_SIZE * 2,
    borderRadius: Radius.md,
    overflow: "visible",
    position: "relative",
  },
  thumb: {
    width: "100%",
    height: "100%",
    borderRadius: Radius.md,
    backgroundColor: Colors.gray[200],
  },
  orderBadge: {
    position: "absolute",
    bottom: -6,
    left: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  orderText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
  },
  removeBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.error,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  removeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  addMore: {
    width: THUMB_SIZE * 2,
    height: THUMB_SIZE * 2,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  addMoreText: {
    fontSize: FontSize.sm,
    textAlign: "center",
    fontWeight: FontWeight.medium,
  },
  continueButton: {
    height: 54,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
})







