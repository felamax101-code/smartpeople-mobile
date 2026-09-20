export interface ExportOptions {
  outputPath: string;
  resolution: {
    width: number;
    height: number;
  };
  bitrate: number;
  fps: number;
  format: 'mp4' | 'mov' | 'webm';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  enableHardwareAcceleration?: boolean;
  maxMemoryUsage?: number; // MB
}

export interface ExportProgress {
  phase: 'preparing' | 'processing' | 'encoding' | 'finalizing' | 'completed' | 'error';
  progress: number; // 0-100
  currentFrame?: number;
  totalFrames?: number;
  fps?: number;
  estimatedTimeRemaining?: number; // seconds
  error?: string;
}

export interface WaveformData {
  amplitudes: Float32Array;
  sampleRate: number;
  durationFrames: number;
  durationSeconds: number;
  peaks: number[]; // Downsampled peaks for visualization
}

export interface FrameExtractionOptions {
  frameNumber: number;
  outputPath: string;
  width?: number;
  height?: number;
  quality?: number; // 1-100
}

export interface VideoMetadata {
  duration: number; // seconds
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  format: string;
  hasAudio: boolean;
  hasVideo: boolean;
}

export interface ExportResult {
  success: boolean;
  outputPath?: string;
  fileSize?: number; // bytes
  duration?: number; // seconds
  error?: string;
  metadata?: VideoMetadata;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number; // milliseconds
  backoffMultiplier: number;
  maxRetryDelay: number; // milliseconds
}

export interface MemoryPressureConfig {
  maxMemoryUsage: number; // MB
  warningThreshold: number; // percentage
  criticalThreshold: number; // percentage
  enableMemoryMonitoring: boolean;
}
