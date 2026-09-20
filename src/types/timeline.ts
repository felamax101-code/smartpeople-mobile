export type Project = {
  fps: number;
  tracks: Track[];
  overlays: Overlay[];
  durationFrames: number;
};

export type Clip = {
  id: string;
  sourceUri: string;
  sourceStartFrame: number;
  sourceEndFrame: number;
  timelineStartFrame: number;
  durationFrames: number;
  volume: number;
  disabled: boolean;
};

export type Track = {
  id: string;
  type: 'video' | 'audio' | 'text';
  clips: Clip[];
  volume: number;
};

export type Overlay = {
  id: string;
  type: 'sticker' | 'text' | 'drawing';
  keyframeSegments: KeyframeSegment[];
  easing: EasingDescription;
};

export type Keyframe = {
  frame: number;
  transform: TransformState;
};

export type KeyframeSegment = {
  start: Keyframe;
  end: Keyframe;
  easing: EasingFunction;
};

export type TransformState = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
};

export type EasingFunction = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic-bezier';

export type EasingDescription = {
  type: EasingFunction;
  params?: number[];
};

export type VolumeKeyframe = {
  frame: number;
  volume: number;
};

export type AudioClip = Clip & {
  volumeKeyframes: VolumeKeyframe[];
};
