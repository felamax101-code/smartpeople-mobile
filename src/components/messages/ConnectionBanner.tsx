
import  { useEffect, useRef } from "react"
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native"
import { Colors, Spacing, FontSize, FontWeight } from "@/constants/colors"

type Status = "connecting" | "connected" | "disconnected" | "failed"

interface Props {
  status: Status
  onRetry: () => void
}

export const ConnectionBanner = ({ status, onRetry }: Props) => {
  const slideAnim = useRef(new Animated.Value(-48)).current

  const visible = status === "disconnected" || status === "failed"

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : -48,
      useNativeDriver: true,
      damping: 20,
    }).start()
  }, [visible])

  if (!visible) return null

  const isFailed = status === "failed"

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: isFailed ? Colors.error : Colors.warning,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.bannerText}>
        {isFailed ? "⚠️ Connection lost" : "🔄 Reconnecting..."}
      </Text>
      {isFailed && (
        <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  banner: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  bannerText: {
    color: "#fff",
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  retryButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  retryText: {
    color: "#fff",
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
})



















