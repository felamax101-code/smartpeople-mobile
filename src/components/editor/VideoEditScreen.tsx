import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { VideoEditor } from "@/components/editor/VideoEditor"
import { Project } from "@/types/timeline"


const { width: screenWidth, height: screenHeight } = Dimensions.get('window')
interface VideoEditScreenProps {
  videoUri: string
  onCancel: () => void
  onDone: (finalUri: string) => void
}

const FPS = 30
const PLACEHOLDER_DURATION_FRAMES = FPS * 60 * 30 // corrected later via onVideoLoad in VideoPreview

export function VideoEditScreen({ videoUri, onCancel, onDone }: VideoEditScreenProps) {
  const initialProject: Project = {
    fps: FPS,
    durationFrames: PLACEHOLDER_DURATION_FRAMES,
    tracks: [
      {
        id: "video-track-1",
        type: "video",
        volume: 1,
        clips: [
          {
            id: "clip-1",
            sourceUri: videoUri,
            sourceStartFrame: 0,
            sourceEndFrame: PLACEHOLDER_DURATION_FRAMES,
            timelineStartFrame: 0,
            durationFrames: PLACEHOLDER_DURATION_FRAMES,
            volume: 1,
            disabled: false,
          },
        ],
      },
      {
        id: "audio-track-1",
        type: "audio",
        volume: 1,
        clips: [],
      },
    ],
    overlays: [],
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.headerText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDone(videoUri)}>
          <Text style={styles.headerText}>Done</Text>
        </TouchableOpacity>
      </View>

      <VideoEditor initialProject={initialProject} width={screenWidth} height={screenHeight - 150} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  headerText: { color: "#fff", fontSize: 16, fontWeight: "600" },
})