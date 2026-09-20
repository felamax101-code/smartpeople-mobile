

import React, { useEffect, useRef } from "react"
import { View, Animated, StyleSheet } from "react-native"
import { useTheme } from "@/hooks/useTheme"
import { Spacing, Radius } from "@/constants/colors"

export const TypingIndicator = () => {
  const theme = useTheme()
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ]

  useEffect(() => {
    // bounce each dot with staggered delay
    const animations = dots.map((dot, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 150),
          Animated.timing(dot, {
            toValue: -6,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(600 - index * 150),
        ])
      )
    )

    animations.forEach((a) => a.start())
    return () => animations.forEach((a) => a.stop())
  }, [])

  return (
    <View style={styles.container}>
      <View style={[styles.bubble, { backgroundColor: theme.surfaceSecondary }]}>
        {dots.map((dot, index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: theme.textMuted,
                transform: [{ translateY: dot }],
              },
            ]}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    //gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderBottomLeftRadius: 4,
    gap: Spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
})






