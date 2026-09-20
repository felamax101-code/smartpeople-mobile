import { AudioClip,VolumeKeyframe } from '@/types/timeline';
import { SharedValue, useSharedValue, useAnimatedReaction } from 'react-native-reanimated';

export interface WaveformData {
  amplitudes: Float32Array;
  sampleRate: number;
  durationFrames: number;
}

export class AudioProcessor {
  static generateWaveform(audioClip: AudioClip): Promise<WaveformData> {
    // This would integrate with a native module to extract waveform data
    return new Promise((resolve) => {
      // Mock waveform data for now
      const durationFrames = audioClip.durationFrames;
      const amplitudes = new Float32Array(durationFrames);
      
      // Generate mock waveform
      for (let i = 0; i < durationFrames; i++) {
        const t = i / durationFrames;
        amplitudes[i] = Math.sin(t * Math.PI * 8) * (0.5 + Math.random() * 0.5);
      }
      
      resolve({
        amplitudes,
        sampleRate: 44100,
        durationFrames
      });
    });
  }

  static interpolateVolume(keyframes: VolumeKeyframe[], currentFrame: number): number {
    if (keyframes.length === 0) return 1.0;
    
    // Find surrounding keyframes
    let prevKeyframe = keyframes[0];
    let nextKeyframe = keyframes[keyframes.length - 1];
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (currentFrame >= keyframes[i].frame && currentFrame <= keyframes[i + 1].frame) {
        prevKeyframe = keyframes[i];
        nextKeyframe = keyframes[i + 1];
        break;
      }
    }
    
    if (prevKeyframe.frame === nextKeyframe.frame) {
      return prevKeyframe.volume;
    }
    
    // Linear interpolation
    const progress = (currentFrame - prevKeyframe.frame) / (nextKeyframe.frame - prevKeyframe.frame);
    return prevKeyframe.volume + (nextKeyframe.volume - prevKeyframe.volume) * progress;
  }
}

export const useWaveformRenderer = (
  waveformData: WaveformData | null,
  pixelsPerFrame: SharedValue<number>,
  visibleStartFrame: SharedValue<number>,
  visibleEndFrame: SharedValue<number>
) => {
  const pathData = useSharedValue<string>('');

  useAnimatedReaction(
    () => {
      if (!waveformData) return '';
      
      const startFrame = Math.max(0, Math.floor(visibleStartFrame.value));
      const endFrame = Math.min(waveformData.durationFrames, Math.ceil(visibleEndFrame.value));
      const ppf = pixelsPerFrame.value;
      
      if (endFrame <= startFrame) return '';
      
      let path = `M 0 ${50}`;
      const samplesPerPixel = Math.max(1, Math.floor((endFrame - startFrame) / 200));
      
      for (let frame = startFrame; frame < endFrame; frame += samplesPerPixel) {
        const amplitude = waveformData.amplitudes[frame] || 0;
        const x = (frame - startFrame) * ppf;
        const y = 50 - amplitude * 40; // Center at y=50, scale to 40px max
        
        path += ` L ${x} ${y}`;
      }
      
      return path;
    },
    (path) => {
      pathData.value = path;
    },
    [waveformData]
  );

  return pathData;
};

export const useAudioVolumeControl = (
  volumeKeyframes: VolumeKeyframe[],
  currentFrame: SharedValue<number>
): SharedValue<number> => {
  const volume = useSharedValue(1.0);

  useAnimatedReaction(
    () => currentFrame.value,
    (frame) => {
      volume.value = AudioProcessor.interpolateVolume(volumeKeyframes, frame);
    },
    [volumeKeyframes]
  );

  return volume;
};
