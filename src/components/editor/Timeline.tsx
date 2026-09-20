import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, useAnimatedStyle, useAnimatedReaction, runOnUI } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { TimelineSolver } from './engine/TimelineSolver';
import { useVideoEditorStore } from '@/stores/VideoEditorStore';
import { runOnJS } from 'react-native-reanimated';
interface TimelineProps {
  width: number;
  height: number;
}

interface ClipComponentProps {
  clip: any;
  pixelsPerFrame: number;
  isSelected: boolean;
  onPress: () => void;
  onTrimStart: (newStart: number) => void;
  onTrimEnd: (newEnd: number) => void;
  onMove: (newPosition: number) => void;
}

const ClipComponent: React.FC<ClipComponentProps> = ({
  clip,
  pixelsPerFrame,
  isSelected,
  onPress,
  onTrimStart,
  onTrimEnd,
  onMove
}) => {
  const clipWidth = clip.durationFrames * pixelsPerFrame;
  const clipLeft = clip.timelineStartFrame * pixelsPerFrame;

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: clipLeft,
    width: clipWidth,
    height: 60,
    backgroundColor: isSelected ? '#007AFF' : '#34C759',
    borderRadius: 4,
    borderWidth: isSelected ? 2 : 1,
    borderColor: isSelected ? '#0051D5' : '#30D158',
  }));

  // Only commit to the store once, when the drag ends — not on every tick.
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // purely visual tracking could go here later; for now we wait for onEnd
    })
    .onEnd((event) => {
      const newFrame = Math.round(event.translationX / pixelsPerFrame) + clip.timelineStartFrame;
      runOnJS(onMove)(newFrame);
    });

  const trimStartGesture = Gesture.Pan()
    .onEnd((event) => {
      const deltaFrames = Math.round(event.translationX / pixelsPerFrame);
      const newStart = clip.sourceStartFrame + deltaFrames;
      runOnJS(onTrimStart)(newStart);
    });

  const trimEndGesture = Gesture.Pan()
    .onEnd((event) => {
      const deltaFrames = Math.round(event.translationX / pixelsPerFrame);
      const newEnd = clip.sourceEndFrame + deltaFrames;
      runOnJS(onTrimEnd)(newEnd);
    });

  return (
    <View>
      <Animated.View style={[styles.clip, animatedStyle]}>
        {/* Body of the clip: drag to move */}
        <GestureDetector gesture={panGesture}>
          <View style={StyleSheet.absoluteFill} />
        </GestureDetector>

        {/* Left edge: drag to trim start */}
        <GestureDetector gesture={trimStartGesture}>
          <View style={styles.trimHandleLeft} />
        </GestureDetector>

        {/* Right edge: drag to trim end */}
        <GestureDetector gesture={trimEndGesture}>
          <View style={styles.trimHandleRight} />
        </GestureDetector>
      </Animated.View>
    </View>
  );
};
  

const TrackComponent: React.FC<{
  track: any;
  pixelsPerFrame: number;
  selectedClipId: string | null;
  onClipSelect: (clipId: string) => void;
  onClipMove: (clipId: string, trackId: string, newFrame: number) => void;
  onClipTrim: (clipId: string, trackId: string, startFrame: number, endFrame: number) => void;
}> = ({ track, pixelsPerFrame, selectedClipId, onClipSelect, onClipMove, onClipTrim }) => {
  return (
    <View style={styles.track}>
      {track.clips.map((clip: any) => (
        <ClipComponent
          key={clip.id}
          clip={clip}
          pixelsPerFrame={pixelsPerFrame}
          isSelected={selectedClipId === clip.id}
          onPress={() => onClipSelect(clip.id)}
          onTrimStart={(newStart) => onClipTrim(clip.id, track.id, newStart, clip.sourceEndFrame)}
          onTrimEnd={(newEnd) => onClipTrim(clip.id, track.id, clip.sourceStartFrame, newEnd)}
          onMove={(newFrame) => onClipMove(clip.id, track.id, newFrame)}
        />
      ))}
    </View>
  );
};

export const Timeline: React.FC<TimelineProps> = ({ width, height }) => {
  const {
    project,
    currentFrame,
    selectedTrackId,
    selectedClipId,
    pixelsPerFrame,
    timelineOffset,
    setCurrentFrame,
    setSelectedClip,
    setPixelsPerFrame,
    setTimelineOffset,
    moveClip,
    trimClip
  } = useVideoEditorStore();

  const playheadPosition = useSharedValue(0);
  const isDraggingPlayhead = useSharedValue(false);

  const totalDuration = project ? project.durationFrames * pixelsPerFrame : 0;

  useAnimatedReaction(
    () => currentFrame * pixelsPerFrame,
    (position) => {
      if (!isDraggingPlayhead.value) {
        playheadPosition.value = position;
      }
    },
    [currentFrame, pixelsPerFrame]
  );

  const playheadStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: playheadPosition.value - timelineOffset,
    top: 0,
    width: 2,
    height: '100%',
    backgroundColor: '#FF3B30',
    zIndex: 1000,
  }));

  const scrubGesture = Gesture.Pan()
  .onStart(() => { isDraggingPlayhead.value = true; })
  .onUpdate((event) => {
    const newFrame = Math.round((event.absoluteX + timelineOffset) / pixelsPerFrame);
    runOnJS(setCurrentFrame)(Math.max(0, Math.min(newFrame, project?.durationFrames || 0)));
  })
  .onFinalize(() => { isDraggingPlayhead.value = false; });

  const zoomGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const newPixelsPerFrame = pixelsPerFrame * event.scale;
      setPixelsPerFrame(Math.max(0.5, Math.min(newPixelsPerFrame, 50)));
    });

  const scrollGesture = Gesture.Pan()
    .onUpdate((event) => {
      const newOffset = Math.max(0, timelineOffset - event.translationX);
      setTimelineOffset(newOffset);
    });

  const handleClipMove = (clipId: string, trackId: string, newFrame: number) => {
    moveClip(trackId, clipId, newFrame);
  };

  const handleClipTrim = (clipId: string, trackId: string, startFrame: number, endFrame: number) => {
    trimClip(trackId, clipId, startFrame, endFrame);
  };

  const visibleClips = useMemo(() => {
    if (!project) return [];

    const startFrame = Math.floor(timelineOffset / pixelsPerFrame);
    const endFrame = Math.ceil((timelineOffset + width) / pixelsPerFrame);

    return project.tracks.map(track => ({
      ...track,
      clips: TimelineSolver.getClipsInTimeRange(track, startFrame, endFrame)
    }));
  }, [project, timelineOffset, pixelsPerFrame, width]);

  if (!project) {
    return (
      <View style={[styles.container, { width, height }]}>
        <View style={styles.emptyState}>
          <View style={styles.emptyText} />
        </View>
      </View>
    );
  }

  return (
    <GestureDetector gesture={Gesture.Race(scrubGesture, zoomGesture, scrollGesture)}>
      <View style={[styles.container, { width, height }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ width: totalDuration }}
        >
          {/* Time ruler */}
          <View style={styles.timeRuler}>
            {Array.from({ length: Math.ceil(totalDuration / 100) }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.timeMark,
                  { left: i * 100 }
                ]}
              >
                <View style={styles.timeMarkLine} />
                <View style={styles.timeMarkText} />
              </View>
            ))}
          </View>

          {/* Tracks */}
          <View style={styles.tracksContainer}>
          {visibleClips
  .filter((track) => track.clips.length > 0 || track.type === 'video')
  .map((track) => (
    <TrackComponent
      key={track.id}
      track={track}
      pixelsPerFrame={pixelsPerFrame}
      selectedClipId={selectedClipId}
      onClipSelect={setSelectedClip}
      onClipMove={handleClipMove}
      onClipTrim={handleClipTrim}
    />
  ))}
          </View>

          {/* Playhead */}
          <View>
            <Animated.View style={[styles.playhead, playheadStyle]} />
          </View>
        </ScrollView>

        {/* Timeline controls */}
        <View style={styles.controls}>
          <View style={styles.zoomControls}>
            <View style={styles.zoomButton} />
            <View style={styles.zoomButton} />
          </View>
        </View>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1C1C1E',
    position: 'relative',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    width: 100,
    height: 20,
    backgroundColor: '#48484A',
    borderRadius: 4,
  },
  timeRuler: {
    height: 30,
    position: 'relative',
    backgroundColor: '#2C2C2E',
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3C',
  },
  timeMark: {
    position: 'absolute',
    alignItems: 'center',
  },
  timeMarkLine: {
    width: 1,
    height: 10,
    backgroundColor: '#48484A',
  },
  timeMarkText: {
    width: 30,
    height: 12,
    backgroundColor: '#48484A',
    borderRadius: 2,
    marginTop: 2,
  },
  tracksContainer: {
    flex: 1,
    position: 'relative',
  },
  track: {
    height: 70,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3C',
    position: 'relative',
  },
  clip: {
    position: 'absolute',
    top: 5,
  },
  trimHandleLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 8,
    height: '100%',
    backgroundColor: 'rgba(0, 122, 255, 0.5)',
    borderRadius: 2,
  },
  trimHandleRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 8,
    height: '100%',
    backgroundColor: 'rgba(0, 122, 255, 0.5)',
    borderRadius: 2,
  },
  playhead: {
    position: 'absolute',
  },
  controls: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
  },
  zoomControls: {
    flexDirection: 'row',
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    padding: 4,
  },
  zoomButton: {
    width: 30,
    height: 30,
    backgroundColor: '#48484A',
    borderRadius: 4,
    marginHorizontal: 2,
  },
});
