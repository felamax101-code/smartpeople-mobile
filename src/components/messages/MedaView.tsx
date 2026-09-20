import { Modal, View, StyleSheet, TouchableOpacity, Text, Dimensions } from "react-native"
import { GestureHandlerRootView, Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated"
import { useVideoPlayer, VideoView } from "expo-video"
import { MessageWithExtras } from "@/hooks/useConversationDetail"

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window")

const API_BASE_URL = "" // TODO: point this at your actual API base — same value used in MessageBubble's resolveMediaUrl
const resolveMediaUrl = (path: string) =>
  path.startsWith("http") || path.startsWith("file://") ? path : `${API_BASE_URL}${path}`

interface Props {
  visible: boolean
  message: MessageWithExtras | null
  onClose: () => void
}

export function MediaViewer({ visible, message, onClose }: Props) {
  const isVideo = message?.message_type === "video"

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.backdrop}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={16}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          {message && (
            isVideo ? (
              <VideoPane uri={resolveMediaUrl(message.media_url ?? "")} />
            ) : (
              <ZoomableImage uri={resolveMediaUrl(message.media_url ?? "")} />
            )
          )}
        </View>
      </GestureHandlerRootView>
    </Modal>
  )
}

// ── video pane ──────────────────────────────────────────────────────────────
// Plays automatically on open. Unmounting (viewer closes) disposes the
// player as part of Expo's own teardown — no manual pause() needed, and
// calling one after disposal is what caused the "already released" crash.
function VideoPane({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.play()
    p.loop=true
  })

  return (
    <VideoView
      style={styles.media}
      player={player}
      nativeControls
      contentFit="contain"
    />
  )
}

// ── zoomable image ────────────────────────────────────────────────────────
// Pinch to zoom, pan while zoomed in. Releasing below 1x snaps back to fit.
// This is a lightweight hand-rolled version using gesture-handler (already
// a dependency via Swipeable) rather than pulling in a new zoom library —
// good enough for "view a photo," not a full photo-editor-grade zoom.
function ZoomableImage({ uri }: { uri: string }) {
  const scale = useSharedValue(1)
  const savedScale = useSharedValue(1)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const savedTranslateX = useSharedValue(0)
  const savedTranslateY = useSharedValue(0)

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale
    })
    .onEnd(() => {
      if (scale.value < 1) {
        // snapped below fit-size — reset zoom and position together
        scale.value = withSpring(1)
        translateX.value = withSpring(0)
        translateY.value = withSpring(0)
        savedScale.value = 1
        savedTranslateX.value = 0
        savedTranslateY.value = 0
      } else {
        savedScale.value = scale.value
      }
    })

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX
      translateY.value = savedTranslateY.value + e.translationY
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value
      savedTranslateY.value = translateY.value
    })

  // both gestures recognized at once — pinch to zoom while also panning,
  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }))

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.Image
        source={{ uri }}
        resizeMode="contain"
        style={[styles.media, animatedStyle]}
      />
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  media: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: { color: "#fff", fontSize: 18, fontWeight: "700" },
})
