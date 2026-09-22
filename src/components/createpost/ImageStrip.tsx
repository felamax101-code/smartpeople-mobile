
import React from "react"
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Text,
} from "react-native"
import { Image } from "expo-image"
import { useTheme } from "@/hooks/useTheme"
import { Colors, Spacing, Radius } from "@/constants/colors"

interface Props {
  uris: string[]
  onRemove: (index: number) => void
}

const THUMB = 80

export const ImageStrip = ({ uris, onRemove }: Props) => {
  const theme = useTheme()

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {uris.map((uri, index) => (
        <View key={index} style={styles.thumbWrapper}>
          <Image
            source={{ uri }}
            style={styles.thumb}
            contentFit="cover"
          />
          {/* order badge */}
          <View style={[styles.orderBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.orderText}>{index + 1}</Text>
          </View>
          {/* remove button */}
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onRemove(index)}
          >
            <Text style={styles.removeIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    flexDirection: "row",
  },
  thumbWrapper: {
    width: THUMB,
    height: THUMB,
    borderRadius: Radius.md,
    overflow: "visible",
    position: "relative",
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: Radius.md,
    backgroundColor: Colors.gray[200],
  },
  orderBadge: {
    position: "absolute",
    bottom: -4,
    left: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  orderText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  removeButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  removeIcon: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
  },
})







