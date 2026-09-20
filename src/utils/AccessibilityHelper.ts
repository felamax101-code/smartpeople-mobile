import { Clip, Overlay } from '../types/timeline';

export const generateAccessibilityLabel = {
  forClip: (clip: Clip, isSelected: boolean): string => {
    const duration = (clip.durationFrames / 30).toFixed(1); // Assuming 30fps
    const position = (clip.timelineStartFrame / 30).toFixed(1);
    const status = clip.disabled ? 'disabled' : 'enabled';
    const selected = isSelected ? 'selected' : '';
    
    return `Video clip, ${duration} seconds, starts at ${position} seconds, ${status} ${selected}`.trim();
  },

  forOverlay: (overlay: Overlay, isSelected: boolean): string => {
    const animationCount = overlay.keyframeSegments.length;
    const selected = isSelected ? 'selected' : '';
    
    return `${overlay.type} overlay with ${animationCount} animations ${selected}`.trim();
  },

  forTimeline: (totalDuration: number, fps: number): string => {
    const minutes = Math.floor(totalDuration / (fps * 60));
    const seconds = Math.floor((totalDuration % (fps * 60)) / fps);
    
    return `Timeline, ${minutes} minutes ${seconds} seconds total duration, ${fps} frames per second`;
  },

  forPlaybackControls: (isPlaying: boolean, currentFrame: number, totalFrames: number, fps: number): string => {
    const currentTime = (currentFrame / fps).toFixed(1);
    const totalTime = (totalFrames / fps).toFixed(1);
    const status = isPlaying ? 'playing' : 'paused';
    
    return `Playback controls, ${status}, ${currentTime} of ${totalTime} seconds`;
  },

  forButton: (action: string, description?: string): string => {
    return `Button, ${action}${description ? `, ${description}` : ''}`;
  },

  forSlider: (label: string, value: number, min: number, max: number): string => {
    return `${label} slider, value ${value}, minimum ${min}, maximum ${max}`;
  },

  forTrack: (track: { type: string; clips: Clip[] }): string => {
    const clipCount = track.clips.length;
    return `${track.type} track with ${clipCount} clips`;
  },

  forExportProgress: (progress: number, stage: string): string => {
    return `Export progress, ${progress}% complete, ${stage}`;
  },

  forError: (error: string, context?: string): string => {
    return `Error, ${error}${context ? `, ${context}` : ''}`;
  }
};

export const generateAccessibilityHint = {
  forClip: (clip: Clip): string => {
    return 'Double tap to select, long press to drag, use trim handles to adjust duration';
  },

  forOverlay: (overlay: Overlay): string => {
    return 'Double tap to select, drag to move position, pinch to resize';
  },

  forTimeline: (): string => {
    return 'Swipe left or right to scrub through timeline, pinch to zoom in or out';
  },

  forPlaybackControls: (): string => {
    return 'Double tap to play or pause, swipe left or right to seek';
  },

  forButton: (action: string): string => {
    return `Double tap to ${action}`;
  },

  forSlider: (label: string): string => {
    return `Swipe up or down to adjust ${label}`;
  },

  forExportButton: (): string => {
    return 'Double tap to export video with current settings';
  },

  forUndoButton: (): string => {
    return 'Double tap to undo last action';
  },

  forRedoButton: (): string => {
    return 'Double tap to redo last undone action';
  }
};

export const getAccessibilityRole = {
  forClip: (): string => 'button',
  forOverlay: (): string => 'button',
  forTimeline: (): string => 'scrollbar',
  forPlaybackControls: (): string => 'toolbar',
  forButton: (): string => 'button',
  forSlider: (): string => 'adjustable',
  forTrack: (): string => 'list',
  forProgress: (): string => 'progressbar',
  forAlert: (): string => 'alert',
  forImage: (): string => 'image',
  forText: (): string => 'text'
};

export const getAccessibilityState = {
  forClip: (clip: Clip, isSelected: boolean) => ({
    selected: isSelected,
    disabled: clip.disabled
  }),

  forOverlay: (overlay: Overlay, isSelected: boolean) => ({
    selected: isSelected
  }),

  forPlayback: (isPlaying: boolean) => ({
    playing: isPlaying
  }),

  forButton: (disabled: boolean = false) => ({
    disabled
  })
};

// Helper function to format time for accessibility
export const formatTimeForAccessibility = (frames: number, fps: number): string => {
  const totalSeconds = Math.floor(frames / fps);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  
  return `${seconds} second${seconds !== 1 ? 's' : ''}`;
};

// Helper function to get clip position in timeline
export const getClipPositionInTimeline = (clip: Clip, totalClips: number): string => {
  const position = Math.floor(clip.timelineStartFrame / 30); // Convert to seconds
  const ordinal = getOrdinal(position + 1);
  
  return `${ordinal} clip in timeline, ${totalClips} clips total`;
};

// Helper function to get ordinal number
export const getOrdinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// Helper function to describe overlay type
export const describeOverlayType = (type: string): string => {
  const descriptions: Record<string, string> = {
    'text': 'text overlay',
    'sticker': 'sticker graphic',
    'drawing': 'drawing annotation'
  };
  
  return descriptions[type] || 'overlay';
};

// Helper function to describe animation count
export const describeAnimationCount = (count: number): string => {
  if (count === 0) return 'no animations';
  if (count === 1) return 'one animation';
  if (count === 2) return 'two animations';
  return `${count} animations`;
};
