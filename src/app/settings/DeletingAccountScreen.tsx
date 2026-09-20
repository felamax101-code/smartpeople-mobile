import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
const STEPS = [
  { text: 'Deleting your posts…', duration: 1500 },
  { text: 'Removing your data…', duration: 1500 },
  { text: 'Finishing up…', duration: 1500 },
  { text: 'Your account has been deleted.', duration: 1200 },
  { text: 'You can create another account anytime you wish.', duration: 1800 },
];

export default function DeletingAccountScreen() {
  const [stepIndex, setStepIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in current step text
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    const isLastStep = stepIndex === STEPS.length - 1;
    const timer = setTimeout(() => {
      if (isLastStep) {
        // Redirect back to Feeds, clearing the navigation stack
        router.dismissAll();
        router.replace("/(tabs)")
      } else {
        setStepIndex((prev) => prev + 1);
      }
    }, STEPS[stepIndex].duration);

    return () => clearTimeout(timer);
  }, [stepIndex]);

  const isDone = stepIndex === STEPS.length - 1;

  return (
    <View style={styles.container}>
      {isDone ? (
        <Ionicons name="checkmark-circle" size={56} color="#10B981" />
      ) : (
        <View style={styles.spinnerDot} />
      )}

      <Animated.Text style={[styles.text, { opacity: fadeAnim }]}>
        {STEPS[stepIndex].text}
      </Animated.Text>

      <View style={styles.progressTrack}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i <= stepIndex && styles.progressDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  spinnerDot: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: '#E5E7EB',
    borderTopColor: '#DC2626',
  },
  text: {
    marginTop: 24,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  progressTrack: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  progressDotActive: {
    backgroundColor: '#DC2626',
  },
});


