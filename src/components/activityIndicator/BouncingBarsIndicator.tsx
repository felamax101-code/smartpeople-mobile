import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, ViewStyle } from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

export type BouncingBarsSize = "small" | "medium" | "large";

export interface BouncingBarsIndicatorProps {
  /** Number of bars to render. Default: 5 */
  barCount?: number;
  /** Colour of each bar. Default: '#6C63FF' */
  color?: string;
  /** Preset size or a custom { barWidth, barHeight, gap } object */
  size?: BouncingBarsSize | { barWidth: number; barHeight: number; gap: number };
  /** Duration (ms) for one full bounce cycle per bar. Default: 700 */
  duration?: number;
  /** Delay (ms) between each bar's animation start. Default: 120 */
  staggerDelay?: number;
  /** Optional container style override */
  style?: ViewStyle;
}

// ─── Size presets ─────────────────────────────────────────────────────────────

const SIZE_PRESETS: Record<BouncingBarsSize, { barWidth: number; barHeight: number; gap: number }> = {
  small:  { barWidth: 4,  barHeight: 20, gap: 3 },
  medium: { barWidth: 6,  barHeight: 32, gap: 5 },
  large:  { barWidth: 9,  barHeight: 48, gap: 7 },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const BouncingBarsIndicator: React.FC<BouncingBarsIndicatorProps> = ({
  barCount = 5,
  color = "#6C63FF",
  size = "medium",
  duration = 700,
  staggerDelay = 120,
  style,
}) => {
  const { barWidth, barHeight, gap } =
    typeof size === "string" ? SIZE_PRESETS[size] : size;

  // One Animated.Value per bar (0 → 1 → 0 scale on Y axis)
  const animations = useRef<Animated.Value[]>(
    Array.from({ length: barCount }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const buildLoop = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: duration / 2,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: duration / 2,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          // Pause so bars don't overlap on the next cycle
          Animated.delay((barCount - 1) * staggerDelay - delay),
        ])
      );

    const loops = animations.map((anim, i) => buildLoop(anim, i * staggerDelay));
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [animations, barCount, duration, staggerDelay]);

  return (
    <View style={[styles.container, { gap }, style]}>
      {animations.map((anim, i) => {
        // scaleY goes from 0.25 (resting) to 1.0 (peak)
        const scaleY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.25, 1],
        });

        // Slight opacity pulse gives a softer feel
        const opacity = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.45, 1],
        });

        return (
          <Animated.View
            key={i}
            style={[
              styles.bar,
              {
                width: barWidth,
                height: barHeight,
                borderRadius: barWidth / 2,
                backgroundColor: color,
                opacity,
                transform: [{ scaleY }],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  bar: {
    // transform origin is center by default in RN — bars grow from middle
  },
});

export default BouncingBarsIndicator;
