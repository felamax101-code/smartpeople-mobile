import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useVideoEditorStore } from '@/stores/VideoEditorStore';
import { Ionicons } from '@expo/vector-icons';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Radius } from '@/constants/colors';
interface PlaybackControlsProps {
  width: number;
  height: number;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({ width, height }) => {
  const {
    isPlaying,
    currentFrame,
    project,
    setIsPlaying,
    setCurrentFrame,
    undo,
    redo
  } = useVideoEditorStore();
const theme=useTheme()
  const playButtonScale = useSharedValue(1);
  const skipButtonScale = useSharedValue(1);

  const playButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playButtonScale.value }]
  }));

  const skipButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: skipButtonScale.value }]
  }));

  const triggerHaptic = () => {
    const options = {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false
    };
   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePlayPause = () => {
    triggerHaptic();
    playButtonScale.value = withSpring(0.8, {}, () => {
      playButtonScale.value = withSpring(1);
    });
    
    setIsPlaying(!isPlaying);
  };

  const handleSkipBackward = () => {
    triggerHaptic();
    skipButtonScale.value = withSpring(0.8, {}, () => {
      skipButtonScale.value = withSpring(1);
    });
    
    const fps = project?.fps || 30;
    const newFrame = Math.max(0, currentFrame - fps);
    setCurrentFrame(newFrame);
  };

  const handleSkipForward = () => {
    triggerHaptic();
    skipButtonScale.value = withSpring(0.8, {}, () => {
      skipButtonScale.value = withSpring(1);
    });
    
    const fps = project?.fps || 30;
    const maxFrame = project?.durationFrames || 0;
    const newFrame = Math.min(maxFrame, currentFrame + fps);
    setCurrentFrame(newFrame);
  };

  const handleUndo = () => {
    const options = {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false
    };
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRedo = () => {
    const options = {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false
    };
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);    redo();
  };

  const formatTime = (frame: number, fps: number): string => {
    const totalSeconds = Math.floor(frame / fps);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const frames = frame % fps;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
  };

  const currentTime = project ? formatTime(currentFrame, project.fps) : '00:00.00';
  const totalTime = project ? formatTime(project.durationFrames, project.fps) : '00:00.00';

  return (
    <View style={[styles.container, { width, height,backgroundColor:theme.backgroundMuted,borderColor:theme.textPlaceholder }]}>
      {/* Time display */}
    <View style={styles.timeDisplay}>
  <View style={styles.timeText}>
    <Text style={styles.currentTimeText}>{currentTime}</Text>
    <Text style={styles.separatorText}>/</Text>
    <Text style={styles.totalTimeText}>{totalTime}</Text>
  </View>
</View>

     <View style={styles.controlsRow}>
  {/* Undo/Redo */}
  <View style={styles.historyControls}>
    <TouchableOpacity style={styles.historyButton} onPress={handleUndo}>
      <Text style={[{color:"white"}]} >Undo</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.historyButton} onPress={handleRedo}>
      <Text style={[{color:"white"}]} >redo</Text>
    </TouchableOpacity>
  </View>

  {/* Skip backward */}
  <TouchableOpacity style={styles.skipButton} onPress={handleSkipBackward}>
    <Animated.View style={skipButtonStyle}>
      <Ionicons name="play-skip-back" size={20} color="#007AFF" />
    </Animated.View>
  </TouchableOpacity>

  {/* Play/Pause */}
  <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
   
<MaterialCommunityIcons size={20} name={isPlaying? "pause-circle-outline" :"play-circle-outline"} color="white" />   
  </TouchableOpacity>

  {/* Skip forward */}
  <TouchableOpacity style={styles.skipButton} onPress={handleSkipForward}>
    <Animated.View style={skipButtonStyle}>
      <Ionicons name="play-skip-forward" size={20} color="#007AFF" />
    </Animated.View>
  </TouchableOpacity>

  {/* Export button */}
  <TouchableOpacity style={styles.exportButton}>
    <Ionicons name="download-outline" size={20} color="#FFFFFF" />
  </TouchableOpacity>
</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius:Radius.md
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: 12,
  },
  currentTimeText: {
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: '600',
},
separatorText: {
  color: '#8E8E93',
  fontSize: 13,
  marginHorizontal: 8,
},
totalTimeText: {
  color: '#8E8E93',
  fontSize: 13,
},
  timeText: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentTimeBox: {
    width: 60,
    height: 16,
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  separator: {
    width: 8,
    height: 2,
    backgroundColor: '#48484A',
    marginHorizontal: 8,
  },
  totalTimeBox: {
    width: 60,
    height: 16,
    backgroundColor: '#48484A',
    borderRadius: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyControls: {
    flexDirection: 'row',
  },
  historyButton: {
    width: 40,
    height: 32,
    backgroundColor: '#3A3A3C',
    borderRadius: 16,
    borderWidth:1,
    borderColor:'#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  undoIcon: {
    width: 16,
    height: 16,
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  redoIcon: {
    width: 16,
    height: 16,
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  skipButton: {
    width: 30,
    height: 30,
    backgroundColor: '#3A3A3C',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  skipIcon: {
    width: 16,
    height: 16,
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  playButton: {
    width: 30,
    height: 30,
    backgroundColor: '#007AFF',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  playIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderLeftColor: '#FFFFFF',
    borderRightWidth: 0,
    borderTopWidth: 8,
    borderTopColor: 'transparent',
    borderBottomWidth: 8,
    borderBottomColor: 'transparent',
  },
  pauseIcon: {
    width: 16,
    height: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  exportButton: {
    width: 40,
    height: 40,
    backgroundColor: '#34C759',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 20,
  },
  exportIcon: {
    width: 20,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
});
