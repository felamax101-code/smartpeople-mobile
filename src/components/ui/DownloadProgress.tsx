import { View, StyleSheet } from "react-native"
import Svg, { Circle } from "react-native-svg"
import { MaterialCommunityIcons } from "@expo/vector-icons"

interface Props {
  progress: number // 0 to 1
  status: "downloading" | "success" | "error"
  size?: number
  color?: string
}

export const DownloadProgressRing = ({
  progress,
  status,
  size = 20,
  color = "#3b82f6",
}: Props) => {
  const strokeWidth = 2.5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress)

  if (status === "success") {
    return (
      <MaterialCommunityIcons name="check-circle" size={size} color="#22c55e" />
    )
  }

  if (status === "error") {
    return (
      <MaterialCommunityIcons name="close-circle" size={size} color="#ef4444" />
    )
  }

  // status === "downloading"
  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          // rotate so it starts at 12 o'clock instead of 3 o'clock
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
})