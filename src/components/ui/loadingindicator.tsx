import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  Text,
  ViewStyle,
} from "react-native";

type LoadingIndicatorProps = {
  /** Renders as a full-screen overlay covering the whole viewport. Defaults to true. */
  fullScreen?: boolean;
  /** Optional override for the background color when fullScreen is true. */
  backgroundColor?: string;
  /** Optional override for the text/accent color. */
  accentColor?: string;
};

export default function LoadingIndicator({
  fullScreen = true,
  backgroundColor = "#0B0B12",
  accentColor = "#6C5CE7",
}: LoadingIndicatorProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.85)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Text fade/scale pulse loop
    const textLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Expanding ring loop, gives it a "logo mark" feel
    const ringLoop = Animated.loop(
      Animated.parallel([
        Animated.timing(ringScale, {
          toValue: 1.25,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    textLoop.start();
    ringLoop.start();

    return () => {
      textLoop.stop();
      ringLoop.stop();
    };
  }, [pulse, ringScale, ringOpacity]);

  const textOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 1],
  });

  const textScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1.03],
  });

  const containerStyle: ViewStyle = fullScreen
    ? { ...styles.fullScreen, backgroundColor }
    : styles.inline;

  const fontSize = fullScreen ? 16 : 13;
  const ringSize = fullScreen ? 120 : 64;

  return (
    <View style={containerStyle}>
      <View style={[styles.markWrap, { width: ringSize, height: ringSize }]}>
        <Animated.View
          style={[
            styles.ring,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderColor: accentColor,
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />
        <View
          style={[
            styles.core,
            {
              width: ringSize * 0.4,
              height: ringSize * 0.4,
              borderRadius: (ringSize * 0.4) / 2,
              backgroundColor: accentColor,
            },
          ]}
        />
      </View>

      <Animated.Text
        style={[
          styles.text,
          {
            color: accentColor,
            fontSize,
            opacity: textOpacity,
            transform: [{ scale: textScale }],
          },
        ]}
      >
{"Wait a moment"}   
   </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 24,
  zIndex: 999,
},
inline: {
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 24,
  paddingHorizontal: 24,
},
  markWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  ring: {
    position: "absolute",
    borderWidth: 2,
  },
  core: {
    position: "absolute",
  },
 text: {
  fontWeight: "600",
  letterSpacing: 1,
  textAlign: "center",
  alignSelf: "center",
},
});