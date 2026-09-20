import { Keyframe, KeyframeSegment, TransformState, EasingFunction } from '@/types/timeline';
import { SharedValue, useSharedValue, useAnimatedReaction } from 'react-native-reanimated';

// Worklet-compatible easing functions
const easingFunctions = {
  linear: (t: number) => t,
  'ease-in': (t: number) => t * t,
  'ease-out': (t: number) => t * (2 - t),
  'ease-in-out': (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  'cubic-bezier': (t: number, p1x: number, p1y: number, p2x: number, p2y: number) => {
    // Simplified cubic bezier implementation
    const cx = 3 * p1x;
    const bx = 3 * (p2x - p1x) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * p1y;
    const by = 3 * (p2y - p1y) - cy;
    const ay = 1 - cy - by;
    
    const tSquared = t * t;
    const tCubed = tSquared * t;
    
    // Unused variable removed
    return tCubed;
    
    return ay * tCubed + by * tSquared + cy * t;
  }
};

export const applyEasing = 'worklet';
export const applyEasingFunction = (easing: EasingFunction, params: number[] = [], t: number): number => {
  'worklet';
  
  switch (easing) {
    case 'linear':
      return easingFunctions.linear(t);
    case 'ease-in':
      return easingFunctions['ease-in'](t);
    case 'ease-out':
      return easingFunctions['ease-out'](t);
    case 'ease-in-out':
      return easingFunctions['ease-in-out'](t);
    case 'cubic-bezier':
      return easingFunctions['cubic-bezier'](t, params[0] || 0, params[1] || 0, params[2] || 1, params[3] || 1);
    default:
      return t;
  }
};

export const lerp = (start: number, end: number, t: number): number => {
  'worklet';
  return start + (end - start) * t;
};

export const lerpTransform = (start: TransformState, end: TransformState, t: number): TransformState => {
  'worklet';
  return {
    x: lerp(start.x, end.x, t),
    y: lerp(start.y, end.y, t),
    scale: lerp(start.scale, end.scale, t),
    rotation: lerp(start.rotation, end.rotation, t),
    opacity: lerp(start.opacity, end.opacity, t)
  };
};

export const interpolateKeyframes = (
  keyframeSegments: KeyframeSegment[],
  currentFrame: number
): TransformState => {
  'worklet';
  
  if (keyframeSegments.length === 0) {
    return {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1
    };
  }
  
  // Find the appropriate segment
  for (const segment of keyframeSegments) {
    const { start, end, easing } = segment;
    
    if (currentFrame >= start.frame && currentFrame <= end.frame) {
      const segmentDuration = end.frame - start.frame;
      const localFrame = currentFrame - start.frame;
      const progress = localFrame / segmentDuration;
      
      const easedProgress = applyEasingFunction(easing, [], progress);
      
      return lerpTransform(start.transform, end.transform, easedProgress);
    }
  }
  
  // If we're before the first keyframe, return the first transform
  if (currentFrame < keyframeSegments[0].start.frame) {
    return keyframeSegments[0].start.transform;
  }
  
  // If we're after the last keyframe, return the last transform
  const lastSegment = keyframeSegments[keyframeSegments.length - 1];
  return lastSegment.end.transform;
};

export const useKeyframeAnimation = (
  keyframeSegments: KeyframeSegment[],
  currentFrame: SharedValue<number>
): SharedValue<TransformState> => {
  const transform = useSharedValue<TransformState>({
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    opacity: 1
  });
  
  useAnimatedReaction(
    () => currentFrame.value,
    (frame) => {
      transform.value = interpolateKeyframes(keyframeSegments, frame);
    },
    [keyframeSegments]
  );
  
  return transform;
};

export const createKeyframeSegment = (
  startFrame: number,
  endFrame: number,
  startTransform: TransformState,
  endTransform: TransformState,
  easing: EasingFunction = 'linear'
): KeyframeSegment => ({
  start: {
    frame: startFrame,
    transform: startTransform
  },
  end: {
    frame: endFrame,
    transform: endTransform
  },
  easing
});

// Utility functions for keyframe management
export const findKeyframeIndex = (keyframes: Keyframe[], frame: number): number => {
  return keyframes.findIndex(k => k.frame === frame);
};

export const insertKeyframe = (keyframes: Keyframe[], newKeyframe: Keyframe): Keyframe[] => {
  const index = findKeyframeIndex(keyframes, newKeyframe.frame);
  
  if (index >= 0) {
    // Replace existing keyframe
    const newKeyframes = [...keyframes];
    newKeyframes[index] = newKeyframe;
    return newKeyframes;
  } else {
    // Insert new keyframe
    return [...keyframes, newKeyframe].sort((a, b) => a.frame - b.frame);
  }
};

export const removeKeyframe = (keyframes: Keyframe[], frame: number): Keyframe[] => {
  return keyframes.filter(k => k.frame !== frame);
};

export const updateKeyframeTransform = (
  keyframes: Keyframe[],
  frame: number,
  transform: Partial<TransformState>
): Keyframe[] => {
  return keyframes.map(k => 
    k.frame === frame 
      ? { ...k, transform: { ...k.transform, ...transform } }
      : k
  );
};

// Convert keyframes to segments for interpolation
export const keyframesToSegments = (
  keyframes: Keyframe[],
  defaultEasing: EasingFunction = 'linear'
): KeyframeSegment[] => {
  if (keyframes.length < 2) return [];
  
  const sortedKeyframes = [...keyframes].sort((a, b) => a.frame - b.frame);
  const segments: KeyframeSegment[] = [];
  
  for (let i = 0; i < sortedKeyframes.length - 1; i++) {
    segments.push({
      start: sortedKeyframes[i],
      end: sortedKeyframes[i + 1],
      easing: defaultEasing
    });
  }
  
  return segments;
};
