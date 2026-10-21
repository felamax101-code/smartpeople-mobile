//
// Looping background music for image posts. Renders only a small mute toggle;
// the audio itself comes from a hook, so nothing is drawn over the photos
// apart from that button.
import { useEffect, useState } from "react"
import { StyleSheet, TouchableOpacity } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio"

type Props = {
  url: string
  isActive: boolean // on screen, focused, and this post is the visible one
  isDetail: boolean // feed starts muted, detail screen starts with sound on
  top: number // lets the parent keep clear of its other badges
}

export const CarouselSound = ({ url, isActive, isDetail, top }: Props) => {
  const [muted, setMuted] = useState(false)

  const player = useAudioPlayer(url)
  const status = useAudioPlayerStatus(player)

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => { })
  }, [])

  useEffect(() => {
    player.loop = true
  }, [player])

  // The track keeps playing while muted, so unmuting is instant and in sync.
  useEffect(() => {
    player.muted = muted
  }, [muted, player])

  // Play only while this post is the active one, and only once the file has loaded.
  useEffect(() => {
    try {
      if (isActive && status.isLoaded) player.play()
      else player.pause()
    } catch {
      // player already released
    }
  }, [isActive, status.isLoaded, player])

  return (
    <TouchableOpacity
      style={[styles.btn, { top }]}
      activeOpacity={0.7}
      onPress={() => setMuted((m) => !m)}
      accessibilityRole="button"
      accessibilityLabel={muted ? "Turn music on" : "Turn music off"}
    >
      <MaterialCommunityIcons name="music-note" size={14} color="#fff" />
      <MaterialCommunityIcons name={muted ? "volume-mute" : "volume-high"} size={15} color="#fff" />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  btn: {
    position: "absolute",
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
})