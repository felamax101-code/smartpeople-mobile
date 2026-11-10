import { useEffect } from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { Image } from "expo-image"
import { router } from "expo-router"
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { useTheme } from "@/hooks/useTheme"
import { SoundDetail } from "@/types"
import { Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { getAvatarColor } from "@/hooks/useUserGenerateAvatarColor"
import { SoundSort } from "@/services/sounds"
import { useAuthStore } from "@/stores/auth.store"
const SORT_OPTIONS: { label: string; value: SoundSort }[] = [
  { label: "Newest", value: "newest" },
  { label: "Most viewed", value: "most_viewed" },
  { label: "Most liked", value: "most_upvoted" },
]

interface Props {
  sound: SoundDetail
  sort: SoundSort
  onSortChange: (sort: SoundSort) => void
}
export const SoundHeader = ({ sound, sort, onSortChange }: Props) => {
  const theme = useTheme()
  const player = useAudioPlayer({ uri: sound.preview_url })
  const status = useAudioPlayerStatus(player)
  const {user}=useAuthStore()

  // rewind when playback finishes so the next press starts from the beginning
  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0)
    }
  }, [status.didJustFinish])
  const togglePlay = () => {
    if (status.playing) player.pause()
    else player.play()
  }

  return (
    <View style={styles.container}>
      <View style={styles.ownerRow}>
        {sound.owner.avatar ? (
          <Image source={{ uri: sound.owner.avatar }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View
            style={[styles.avatarFallback, { backgroundColor: getAvatarColor(sound.owner.username) }]}
          >
            <Text
              style={[{ color: "white", fontSize: FontSize.xxl, fontWeight: 700, fontFamily: "Poppins" }]}
            >{sound.owner.username.charAt(0)}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[{ color: theme.textPrimary }]} numberOfLines={1}>
            Sound owned or distributed by
          </Text>
          <Text 
          onPress={()=>
            router.push(user?.username===sound.owner.username?`/profile`:`/profile/${sound.owner.username}`)
          }
          style={[styles.username, { color: theme.textPrimary }]} numberOfLines={1}>
            {"  "} {sound.owner.username}
          </Text>

        </View>
      </View>

      <View style={[styles.player, { backgroundColor: theme.surfaceSecondary, borderColor: theme.borderFocus }]}>
        <TouchableOpacity
          onPress={togglePlay}
          style={[styles.playButton, { backgroundColor: theme.primary }]}
          activeOpacity={0.8}
          disabled={!status.isLoaded}
        >
          <MaterialCommunityIcons
            name={status.playing ? "pause" : "play"}
            size={26}
            color="#fff"
          />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.soundTitle, { color: theme.textPrimary }]} numberOfLines={1}>
            {sound.title}
          </Text>
          <Text style={[styles.count, { color: theme.textPrimarylight }]}>
            <Text style={[styles.count, { color: theme.primary }]}>
              Duration:
            </Text>{sound.duration ? `${Math.round(sound.duration)}s` : ""}
          </Text>
          <Text style={[styles.count, { color: theme.textPrimarylight }]}>
            {sound.usage_count} {sound.usage_count === 1 ? "post" : "posts"}
          </Text>
        </View>
      </View>
      <View
        style={[styles.player, { flexDirection: "column" }]}
      >
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary, borderColor: theme.textPlaceholder }]}
          onPress={() => router.push({
            pathname: `/createpost`,
            params: {
              "id": sound.id,
              "url": sound.preview_url,
              "title": sound.title,
              "owner": sound.owner.username,
              "duration": sound.duration,
            }
          })}
        >
          <Text
            style={[{ color: "#fff",fontWeight:700 }]}

          >Use this sound to create post</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.backgroundMuted, borderColor: theme.primary }]}

        >
          <Text
            style={[{ color: theme.textPrimary }]}
          >View more sounds from this user</Text>
        </TouchableOpacity>
      </View>
<View style={styles.sortRow}>
  {SORT_OPTIONS.map((opt) => {
    const active = sort === opt.value
    return (
      <TouchableOpacity
        key={opt.value}
        onPress={() => onSortChange(opt.value)}
        activeOpacity={0.8}
        style={[
          styles.chip,
          {
            backgroundColor: active ? theme.primary : theme.surfaceSecondary,
            borderColor: active ? theme.primary : theme.borderFocus,
          },
        ]}
      >
        <Text
          style={[
            styles.chipText,
            { color: active ? "#fff" : theme.textPrimary },
          ]}
        >
          {opt.label}
        </Text>
      </TouchableOpacity>
    )
  })}
</View>
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Posts using this sound</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm, paddingBottom: Spacing.md },
  ownerRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28 },

  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    borderWidth: 3,
    display: "flex",
    alignItems: 'center',
    justifyContent: "center",
  },
  username: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  count: { fontSize: FontSize.sm },
  player: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 0.3,
  },
  playButton: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  soundTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, marginTop: Spacing.xs },
  button: { paddingHorizontal: 4, borderRadius: Radius.md, paddingVertical: 2, borderWidth: 1 },
  sortRow: { flexDirection: "row", gap: Spacing.sm },
chip: {
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: Radius.md,
  borderWidth: 0.5,
},
chipText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
})