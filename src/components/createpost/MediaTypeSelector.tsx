
import React from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native"
import { useTheme } from "@/hooks/useTheme"
import { MediaType } from "@/hooks/useMediaPicker"
import { Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
interface Props {
  selected: MediaType
  onSelect: (type: any) => void
  isSP?: boolean
}

export const MediaTypeSelector = ({ selected, onSelect, isSP }: Props) => {
  const theme = useTheme()

  const options: { type: any; icon: React.ReactNode; label: string; sub: string }[] = [


    {
      type: "image",
      icon: <Ionicons name="image" size={24} color="gray" />,
      label: "Add Photos",
      sub: isSP ? "Show what you are selling using photos" : "Up to 5 images.post memes,checkouts,your fun moments ... in form of a photo",
    },
    {
      type: "video",
      icon: <Ionicons name="videocam" size={24} color="gray" />,
      label: "Add Video",
      sub: isSP ? "Show what you are selling using a video" : "Single video.Add a short fun moment,meme etc ...",
    },
    {
      type: "text",
      icon: <Ionicons name="text" size={24} color="gray" />,
      label: "Add Text",
      sub: "Share something in form of an artical",
    },
  ].filter((opt) => !(isSP && opt.type === "text"))

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>
        Select media type
      </Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        {isSP ? "Choose images or video" : "Choose images,video or text"}
      </Text>
      <TouchableOpacity
        style={[styles.soundTab, { borderColor: theme.success, backgroundColor: theme.textPlaceholder }]}
        onPress={() => router.push("/upload")}
        activeOpacity={0.8}
      >
        <View style={[{ flexDirection: "column", alignItems: "center", justifyContent: "center" }]}>
          <Text style={styles.optionIcon}>
            <Ionicons name="mic" size={27} color="red" />
          </Text>
          <Text style={[styles.optionLabel, { color: theme.textPrimary }]}>
           Smart Sound/Music
          </Text>
          <Text style={[styles.optionSub, { color: theme.textPrimary }]}>
           Make your sounds popular,monetize and earn where applicable
          </Text>

        </View>

      </TouchableOpacity>
      <View style={styles.options}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.type}
            style={[
              styles.option,
              {
                backgroundColor:
                  selected === opt.type
                    ? theme.primaryLight
                    : theme.surfaceSecondary,
                borderColor:
                  selected === opt.type ? theme.primary : theme.border,
              },
            ]}
            onPress={() => onSelect(opt.type)}
            activeOpacity={0.8}
          >
            <View style={[{ flexDirection: "column", alignItems: "center", justifyContent: "center" }]}>
              <Text style={styles.optionIcon}>{opt.icon}</Text>
              <Text style={[styles.optionLabel, { color: theme.textPrimary }]}>
                {opt.label}
              </Text>
              <Text style={[styles.optionSub, { color: theme.textPrimary }]}>
                {opt.sub}
              </Text>

            </View>
            {selected === opt.type && (
              <View style={[styles.checkDot, { backgroundColor: theme.primary }]}>
                <Text style={styles.checkDotText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xs,
    gap: Spacing.sm,
    alignItems: "center",
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.extrabold,
    textAlign: "center",
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: "center",
    marginTop: -Spacing.xs,
  },
  options: {
    width: "100%",
    gap: Spacing.md,
  },
  option: {
    height: 100,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    position: "relative",
  },
  soundTab: {
    height: 80,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    position: "relative",
  },
  optionIcon: {
    fontSize: 40,
  },
  optionLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  optionSub: {
    fontSize: FontSize.sm,
  },
  checkDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkDotText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
})









