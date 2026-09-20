import type {TurboModule} from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import type {
  ExportOptions,
  ExportProgress,
  WaveformData,
  FrameExtractionOptions,
  VideoMetadata,
  ExportResult,
  RetryConfig,
  MemoryPressureConfig
} from '@/types/VideoExporter';

// Native module interface specification
export interface Spec extends TurboModule {
  // Core export functionality
  exportVideo(
    projectJSON: string,
    options: ExportOptions,
    retryConfig?: RetryConfig,
    memoryConfig?: MemoryPressureConfig
  ): Promise<ExportResult>;

  // Progress tracking
  getExportProgress(exportId: string): Promise<ExportProgress>;
  
  // Cancel ongoing export
  cancelExport(exportId: string): Promise<boolean>;

  // Waveform generation
  generateWaveform(
    videoPath: string,
    targetSampleRate?: number,
    downsampleFactor?: number
  ): Promise<WaveformData>;

  // Frame extraction
  extractFrame(
    videoPath: string,
    options: FrameExtractionOptions
  ): Promise<string>;

  // Video metadata extraction
  getVideoMetadata(videoPath: string): Promise<VideoMetadata>;

  // Memory management
  setMemoryPressureConfig(config: MemoryPressureConfig): Promise<void>;
  getCurrentMemoryUsage(): Promise<number>; // MB

  // Hardware capabilities
  getHardwareCapabilities(): Promise<{
    supportsHardwareEncoding: boolean;
    supportsHardwareDecoding: boolean;
    maxConcurrentExports: number;
    recommendedMaxResolution: { width: number; height: number };
  }>;

  // Cleanup and maintenance
  cleanupTempFiles(): Promise<number>; // Returns number of files cleaned
  clearCaches(): Promise<void>;

  // Event listeners (for real-time progress)
  addExportProgressListener(callback: (exportId: string, progress: ExportProgress) => void): void;
  removeExportProgressListener(): void;
  
  // Memory pressure events
  addMemoryPressureListener(callback: (usage: number, pressure: 'normal' | 'warning' | 'critical') => void): void;
  removeMemoryPressureListener(): void;
}

// Register the Turbo Module
export default TurboModuleRegistry.get<Spec>('VideoExporter') as Spec | null;
