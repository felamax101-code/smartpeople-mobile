import React, { useEffect, useState } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { VideoPreview } from './VideoPreview';
import { Timeline } from './Timeline';
import { PlaybackControls } from './PlaybackControls';
import { GestureSystem } from './GestureSystem';
import { Project, Track } from '@/types/timeline';
import { useVideoEditorStore } from '@/stores/VideoEditorStore';
interface VideoEditorProps {
  initialProject?: Project;
  width?: number;
  height?: number;
}

export const VideoEditor: React.FC<VideoEditorProps> = ({
  initialProject,
  width = 400,
  height = 700
}) => {
  const { project, setProject, isPlaying, currentFrame } = useVideoEditorStore();
  const [dimensions] = useState({ width, height });

  // Initialize with default project if none provided
  useEffect(() => {
    if (!project && !initialProject) {
      const defaultProject: Project = {
        fps: 30,
        tracks: [
          {
            id: 'video-track-1',
            type: 'video',
            clips: [],
            volume: 1.0
          },
          {
            id: 'audio-track-1',
            type: 'audio',
            clips: [],
            volume: 1.0
          }
        ],
        overlays: [],
        durationFrames: 0
      };
      setProject(defaultProject);
    } else if (initialProject) {
      setProject(initialProject);
    }
  }, [project, initialProject, setProject]);

  const previewHeight = Math.floor(dimensions.height * 0.4);
  const controlsHeight = 80;
  const timelineHeight = dimensions.height - previewHeight - controlsHeight;

  return (
    
      <View style={[styles.editorContainer, { width: dimensions.width, height: dimensions.height }]}>
        <GestureSystem width={dimensions.width} height={dimensions.height}>
        {/* Video Preview Section */}
        <View style={[styles.previewSection, { height: previewHeight }]}>
         <VideoPreview
  width={dimensions.width}
  height={previewHeight}
  onVideoLoad={(durationSeconds) => {
    const fps = project?.fps || 30;
    const realDurationFrames = Math.round(durationSeconds * fps);

    setProject({
      ...project!,
      durationFrames: realDurationFrames,
      tracks: project!.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          track.type !== 'audio'
            ? { ...clip, sourceEndFrame: realDurationFrames, durationFrames: realDurationFrames }
            : clip
        ),
      })),
    });
  }}
/>
        </View>

        {/* Timeline Section */}
        <View style={[styles.timelineSection, { height: timelineHeight }]}>
          <Timeline
            width={dimensions.width}
            height={timelineHeight}
          />
        </View>
        </GestureSystem>

        {/* Playback Controls */}
        <View style={[styles.controlsSection, { height: controlsHeight }]}>
          <PlaybackControls
            width={dimensions.width}
            height={controlsHeight}
          />
        </View>
      </View>
    
  );
};

const styles = StyleSheet.create({
  editorContainer: {
    flexDirection: 'column',
    backgroundColor: '#000000',
  },
  previewSection: {
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3C',
  },
  timelineSection: {
    backgroundColor: '#1C1C1E',
  },
  controlsSection: {
  
  },
});
