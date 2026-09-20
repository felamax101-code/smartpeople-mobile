import React, { useEffect,useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import { Canvas, Group, Rect } from '@shopify/react-native-skia';
import { useSharedValue, useAnimatedReaction, runOnUI } from 'react-native-reanimated';
import { useVideoEditorStore } from '@/stores/VideoEditorStore';
import { TransformState } from '@/types/timeline';
import { interpolateKeyframes } from './engine/KeyframeInterpolation';
import { runOnJS } from 'react-native-worklets';
interface VideoPreviewProps {
  width: number;
  height: number;
  onVideoLoad?: (durationSeconds: number) => void;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ width, height, onVideoLoad }) => {
  const {
    project,
    currentFrame,
    isPlaying,
    setCurrentFrame,
    setIsPlaying
  } = useVideoEditorStore();
  const hasSeekedRef = useRef(false);

  // Shared values for UI thread operations
  const scrubFrame = useSharedValue(0);
  const videoTime = useSharedValue(0);
  const isScrubbing = useSharedValue(false);

  const getCurrentVideoClip = () => {
    if (!project) return null;

    for (const track of project.tracks) {
      if (track.type === 'video') {
        for (const clip of track.clips) {
          const clipStart = clip.timelineStartFrame;
          const clipEnd = clipStart + clip.durationFrames;

          if (currentFrame >= clipStart && currentFrame < clipEnd) {
            return clip;
          }
        }
      }
    }

    return null;
  };

  const currentClip = getCurrentVideoClip();
useEffect(() => {
    hasSeekedRef.current = false;
  }, [currentClip?.sourceUri]);
  // expo-video player, created once per source URI
  const player = useVideoPlayer(
    currentClip?.sourceUri ?? null,
    (p) => {
      p.loop = false;
      p.timeUpdateEventInterval = 0.1; // fire ~10x/sec
    }
  );

  // Sync store frame with UI thread
  useAnimatedReaction(
    () => currentFrame,
    (frame) => {
      scrubFrame.value = frame;
    },
    [currentFrame]
  );

  // Handle video time synchronization
  useAnimatedReaction(
    () => videoTime.value,
    (time) => {
      if (!isScrubbing.value && project) {
        const frame = Math.floor(time * project.fps / 1000);
        if (Math.abs(frame - scrubFrame.value) > 2) {
            const targetTime = (scrubFrame.value * 1000) / project.fps;
            // This would be handled by a native module call
         
        }
      }
    },
    [project, isScrubbing]
  );

  // Play/pause driven by store state
  useEffect(() => {
    if (isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [isPlaying, player]);

  // Fires repeatedly during playback, replaces onProgress
  useEventListener(player, 'timeUpdate', (payload) => {
    'worklet';
    videoTime.value = payload.currentTime * 1000;
  });

  // Fires when playback reaches the end, replaces onEnd
  useEventListener(player, 'playToEnd', () => {
    setIsPlaying(false);
    if (project) {
      setCurrentFrame(0);
    }
  });

  // Fires when the player is ready, replaces onLoad
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay' && currentClip) {
      const duration = player.duration; // seconds
      onVideoLoad?.(duration);

      if (project) {
        const clipRelativeFrame = currentFrame - currentClip.timelineStartFrame;
        const sourceRelativeFrame = currentClip.sourceStartFrame + clipRelativeFrame;
        const seekTime = sourceRelativeFrame / project.fps; // seconds
        player.currentTime = seekTime;
      }
    }
  });
  

  const renderOverlay = (overlayId: string) => {
    const overlay = project?.overlays.find(o => o.id === overlayId);
    if (!overlay) return null;

    const transform = useSharedValue<TransformState>({
      x: 0, y: 0, scale: 1, rotation: 0, opacity: 1
    });

    useAnimatedReaction(
      () => scrubFrame.value,
      (frame) => {
        transform.value = interpolateKeyframes(overlay.keyframeSegments, frame);
      },
      [overlay.keyframeSegments]
    );

    return (
      <Group
        transform={[
          { translateX: transform.value.x },
          { translateY: transform.value.y },
          { scale: transform.value.scale },
          { rotate: transform.value.rotation * Math.PI / 180 }
        ]}
        opacity={transform.value.opacity}
      >
        {overlay.type === 'text' && (
          <Rect x={0} y={0} width={100} height={50} color="rgba(255, 255, 255, 0.8)" />
        )}
        {overlay.type === 'sticker' && (
          <Rect x={0} y={0} width={80} height={80} color="rgba(255, 200, 0, 0.8)" />
        )}
        {overlay.type === 'drawing' && (
          <Rect x={0} y={0} width={120} height={60} color="rgba(0, 255, 255, 0.6)" />
        )}
      </Group>
    );
  };

  return (
    <View style={[styles.container, { width, height }]}>
      {currentClip && (
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={false}
        />
      )}

      <Canvas style={styles.overlayCanvas}>
        {project?.overlays.map(overlay => (
          <View key={overlay.id}>
            {renderOverlay(overlay.id)}
          </View>
        ))}
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    position: 'relative',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  overlayCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
});