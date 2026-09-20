
import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Easing } from 'react-native';

export type BannerType = 'success' | 'error';

interface AnimatedBannerProps {
  type: BannerType;
  message: string;
  onHide: () => void;
  durationMs?: number; // how long it stays visible before auto-dismissing
}
export interface BannerState {
  id: number; // changing id forces AnimatedBanner to remount and re-animate
  type: BannerType;
  message: string;
}
// Mount this conditionally from the parent, e.g.:
//   {banner && <AnimatedBanner key={banner.id} type={banner.type} message={banner.message} onHide={() => setBanner(null)} />}
// Using a changing `key` on the parent's side makes it remount (and thus
// re-animate) even if the same message fires twice in a row.
export function AnimatedBanner({ type, message, onHide, durationMs = 3000 }: AnimatedBannerProps) {
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => onHide());
    }, durationMs);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        styles.banner,
        type === 'success' ? styles.success : styles.error,
        { transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50, // rough allowance for status bar/notch — wrap in SafeAreaView  if there
    paddingBottom: 14,
    paddingHorizontal: 16,
    zIndex: 100,
    elevation: 10,
  },
  success: { backgroundColor: '#16a34a' },
  error: { backgroundColor: '#dc2626' },
  text: { color: '#fff', fontWeight: '600', fontSize: 14, textAlign: 'center' },
});
