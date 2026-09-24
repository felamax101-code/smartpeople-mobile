import React from "react"
import { View, StyleSheet } from "react-native"

interface Props {
  progress: number // 0-100
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
}

export const CircularProgress = ({
  progress,
  size = 40,
  strokeWidth = 3,
  color = "#fff",
  trackColor = "rgba(255,255,255,0.3)",
}: Props) => {
  const clamped = Math.max(0, Math.min(100, progress))
  const rightRotation = clamped <= 50 ? (clamped / 50) * 180 : 180
  const leftRotation = clamped > 50 ? ((clamped - 50) / 50) * 180 : 0

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* background track */}
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: trackColor,
          },
        ]}
      />

      {/* right half */}
      <View style={[styles.half, { width: size / 2, height: size, right: 0 }]}>
        <View
          style={[
            styles.halfCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              left: -size / 2,
              transform: [{ rotate: `${rightRotation}deg` }],
            },
          ]}
        />
      </View>

      {/* left half — only starts filling past 50% */}
      <View style={[styles.half, { width: size / 2, height: size, left: 0 }]}>
        <View
          style={[
            styles.halfCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              left: 0,
              transform: [{ rotate: `${leftRotation}deg` }],
            },
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { position: "relative", alignItems: "center", justifyContent: "center" },
  circle: { position: "absolute" },
  half: { position: "absolute", overflow: "hidden" },
  halfCircle: {
    position: "absolute",
  },
})