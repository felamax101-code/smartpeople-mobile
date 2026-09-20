import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { useVideoEditorStore } from '@/stores/VideoEditorStore';
import * as Haptics from 'expo-haptics';

const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'medium') => {
  switch (type) {
    case 'light':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'medium':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'heavy':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
  }
};


interface GestureSystemProps {
  children: React.ReactNode;
  width: number;
  height: number;
}

export const GestureSystem: React.FC<GestureSystemProps> = ({ children, width, height }) => {
  const {
    currentFrame,
    isPlaying,
    setCurrentFrame,
    setIsPlaying,
    pixelsPerFrame,
    setPixelsPerFrame,
    timelineOffset,
    setTimelineOffset,
    selectedClipId,
    selectedOverlayId
  } = useVideoEditorStore();

  const gestureState = useSharedValue<'idle' | 'scrubbing' | 'zooming' | 'panning' | 'dragging'>('idle');
  const lastTouchTime = useSharedValue(0);
  const touchStartPos = useSharedValue({ x: 0, y: 0 });

  // Timeline scrub gesture
  const timelineScrubGesture = Gesture.Pan()
    .onStart((event) => {
      if (gestureState.value === 'idle') {
        gestureState.value = 'scrubbing';
        touchStartPos.value = { x: event.x, y: event.y };
       runOnJS( triggerHaptic)('light');
      }
    })
    .onUpdate((event) => {
      if (gestureState.value === 'scrubbing') {
        const newFrame = Math.round((event.absoluteX + timelineOffset) / pixelsPerFrame);
        runOnJS(setCurrentFrame)(Math.max(0, newFrame));
      }
    })
    .onEnd(() => {
      if (gestureState.value === 'scrubbing') {
        gestureState.value = 'idle';
      }
    })
    .withTestId('timeline-scrub');

  // Timeline zoom gesture
  const timelineZoomGesture = Gesture.Pinch()
    .onStart(() => {
      if (gestureState.value === 'idle') {
        gestureState.value = 'zooming';
       runOnJS( triggerHaptic)('medium');
      }
    })
    .onUpdate((event) => {
      if (gestureState.value === 'zooming') {
        const newPixelsPerFrame = Math.max(0.5, Math.min(50, pixelsPerFrame * event.scale));
        runOnJS(setPixelsPerFrame)(newPixelsPerFrame);
      }
    })
    .onEnd(() => {
      if (gestureState.value === 'zooming') {
        gestureState.value = 'idle';
      }
    })
    .withTestId('timeline-zoom');

  // Timeline pan gesture
  const timelinePanGesture = Gesture.Pan()
    .onStart(() => {
      if (gestureState.value === 'idle') {
        gestureState.value = 'panning';
       runOnJS (triggerHaptic)('light');
      }
    })
    .onUpdate((event) => {
      if (gestureState.value === 'panning') {
        const newOffset = Math.max(0, timelineOffset - event.translationX);
        runOnJS(setTimelineOffset)(newOffset);
      }
    })
    .onEnd(() => {
      if (gestureState.value === 'panning') {
        gestureState.value = 'idle';
      }
    })
    .withTestId('timeline-pan');

  // Overlay manipulation gestures
  const overlayTapGesture = Gesture.Tap()
    .onStart((event) => {
      const currentTime = Date.now();
      if (currentTime - lastTouchTime.value < 300) {
        // Double tap detected
       runOnJS( triggerHaptic)('heavy');
        // Handle double tap on overlay
      }
      lastTouchTime.value = currentTime;
    })
    .onEnd(() => {
      // Handle single tap on overlay
      runOnJS(triggerHaptic)('light');
    })
    .withTestId('overlay-tap');

  const overlayDragGesture = Gesture.Pan()
    .onStart((event) => {
      if (selectedOverlayId && gestureState.value === 'idle') {
        gestureState.value = 'dragging';
        touchStartPos.value = { x: event.x, y: event.y };
       runOnJS (triggerHaptic)('medium');
      }
    })
    .onUpdate((event) => {
      if (gestureState.value === 'dragging' && selectedOverlayId) {
        // Update overlay position
        const deltaX = event.translationX;
        const deltaY = event.translationY;
        
        // This would update the overlay transform via store
        runOnJS(() => {
          // Update overlay position
        })();
      }
    })
    .onEnd(() => {
      if (gestureState.value === 'dragging') {
        gestureState.value = 'idle';
        // Commit overlay position change
      }
    })
    .withTestId('overlay-drag');

  const overlayScaleGesture = Gesture.Pinch()
    .onStart(() => {
      if (selectedOverlayId && gestureState.value === 'idle') {
        gestureState.value = 'zooming';
        runOnJS(triggerHaptic)('medium');
      }
    })
    .onUpdate((event) => {
      if (gestureState.value === 'zooming' && selectedOverlayId) {
        // Update overlay scale
        runOnJS(() => {
          // Update overlay scale
        })();
      }
    })
    .onEnd(() => {
      if (gestureState.value === 'zooming') {
        gestureState.value = 'idle';
        // Commit overlay scale change
      }
    })
    .withTestId('overlay-scale');

  const overlayRotateGesture = Gesture.Rotation()
    .onStart(() => {
      if (selectedOverlayId && gestureState.value === 'idle') {
        gestureState.value = 'dragging';
        runOnJS(triggerHaptic)('light');
      }
    })
    .onUpdate((event) => {
      if (gestureState.value === 'dragging' && selectedOverlayId) {
        // Update overlay rotation
        runOnJS(() => {
          // Update overlay rotation
        })();
      }
    })
    .onEnd(() => {
      if (gestureState.value === 'dragging') {
        gestureState.value = 'idle';
        // Commit overlay rotation change
      }
    })
    .withTestId('overlay-rotate');

  // Combined overlay gestures
  const overlayGesture = Gesture.Simultaneous(
    overlayTapGesture,
    overlayDragGesture,
    overlayScaleGesture,
    overlayRotateGesture
  );

  // Timeline gestures
  const timelineGesture = Gesture.Race(
    timelineScrubGesture,
    timelineZoomGesture,
    timelinePanGesture
  );

  // Global gesture handler
  const globalGesture = Gesture.Exclusive(
    timelineGesture,
    overlayGesture
  );

  return (
    <GestureDetector gesture={globalGesture}>
      <View style={[styles.container, { width, height }]}>
        {children}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});
