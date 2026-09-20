import { Platform } from 'react-native';
import VideoExporterTurboModule from './VideoExporterTurboModule';
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

export class VideoExporterBridge {
  private static instance: VideoExporterBridge;
  private progressListeners: Map<string, (progress: ExportProgress) => void> = new Map();
  private memoryPressureListeners: Set<(usage: number, pressure: 'normal' | 'warning' | 'critical') => void> = new Set();
  private activeExports: Set<string> = new Set();

  static getInstance(): VideoExporterBridge {
    if (!VideoExporterBridge.instance) {
      VideoExporterBridge.instance = new VideoExporterBridge();
    }
    return VideoExporterBridge.instance;
  }

  private constructor() {
    this.setupEventListeners();
  }

  async exportVideo(
    projectJSON: string,
    options: ExportOptions,
    retryConfig?: Partial<RetryConfig>,
    memoryConfig?: Partial<MemoryPressureConfig>
  ): Promise<string> {
    if (!VideoExporterTurboModule) {
      throw new Error('VideoExporter Turbo Module is not available');
    }

    const defaultRetryConfig: RetryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2.0,
      maxRetryDelay: 10000
    };

    const defaultMemoryConfig: MemoryPressureConfig = {
      maxMemoryUsage: 512,
      warningThreshold: 0.7,
      criticalThreshold: 0.9,
      enableMemoryMonitoring: true
    };

    const finalRetryConfig = { ...defaultRetryConfig, ...retryConfig };
    const finalMemoryConfig = { ...defaultMemoryConfig, ...memoryConfig };

    try {
      const result = await VideoExporterTurboModule.exportVideo(
        projectJSON,
        options,
        finalRetryConfig,
        finalMemoryConfig
      );

      if (result.success) {
        return result.outputPath!;
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  async exportVideoWithProgress(
    projectJSON: string,
    options: ExportOptions,
    onProgress: (progress: ExportProgress) => void,
    retryConfig?: Partial<RetryConfig>,
    memoryConfig?: Partial<MemoryPressureConfig>
  ): Promise<string> {
    const exportId = this.generateExportId();
    this.activeExports.add(exportId);
    this.progressListeners.set(exportId, onProgress);

    try {
      const result = await this.exportVideo(projectJSON, options, retryConfig, memoryConfig);
      return result;
    } finally {
      this.activeExports.delete(exportId);
      this.progressListeners.delete(exportId);
    }
  }

  async getExportProgress(exportId: string): Promise<ExportProgress> {
    if (!VideoExporterTurboModule) {
      throw new Error('VideoExporter Turbo Module is not available');
    }

    return await VideoExporterTurboModule.getExportProgress(exportId);
  }

  async cancelExport(exportId: string): Promise<boolean> {
    if (!VideoExporterTurboModule) {
      return false;
    }

    const success = await VideoExporterTurboModule.cancelExport(exportId);
    if (success) {
      this.activeExports.delete(exportId);
      this.progressListeners.delete(exportId);
    }
    return success;
  }

  async generateWaveform(
    videoPath: string,
    targetSampleRate?: number,
    downsampleFactor?: number
  ): Promise<WaveformData> {
    if (!VideoExporterTurboModule) {
      throw new Error('VideoExporter Turbo Module is not available');
    }

    try {
      return await VideoExporterTurboModule.generateWaveform(
        videoPath,
        targetSampleRate,
        downsampleFactor
      );
    } catch (error) {
      console.error('Waveform generation failed:', error);
      throw error;
    }
  }

  async extractFrame(
    videoPath: string,
    options: FrameExtractionOptions
  ): Promise<string> {
    if (!VideoExporterTurboModule) {
      throw new Error('VideoExporter Turbo Module is not available');
    }

    try {
      return await VideoExporterTurboModule.extractFrame(videoPath, options);
    } catch (error) {
      console.error('Frame extraction failed:', error);
      throw error;
    }
  }

  async getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
    if (!VideoExporterTurboModule) {
      throw new Error('VideoExporter Turbo Module is not available');
    }

    try {
      return await VideoExporterTurboModule.getVideoMetadata(videoPath);
    } catch (error) {
      console.error('Metadata extraction failed:', error);
      throw error;
    }
  }

  async setMemoryPressureConfig(config: MemoryPressureConfig): Promise<void> {
    if (!VideoExporterTurboModule) {
      return;
    }

    try {
      await VideoExporterTurboModule.setMemoryPressureConfig(config);
    } catch (error) {
      console.error('Failed to set memory config:', error);
    }
  }

  async getCurrentMemoryUsage(): Promise<number> {
    if (!VideoExporterTurboModule) {
      return 0;
    }

    try {
      return await VideoExporterTurboModule.getCurrentMemoryUsage();
    } catch (error) {
      console.error('Failed to get memory usage:', error);
      return 0;
    }
  }

  async getHardwareCapabilities(): Promise<{
    supportsHardwareEncoding: boolean;
    supportsHardwareDecoding: boolean;
    maxConcurrentExports: number;
    recommendedMaxResolution: { width: number; height: number };
  }> {
    if (!VideoExporterTurboModule) {
      return {
        supportsHardwareEncoding: false,
        supportsHardwareDecoding: false,
        maxConcurrentExports: 1,
        recommendedMaxResolution: { width: 1920, height: 1080 }
      };
    }

    try {
      return await VideoExporterTurboModule.getHardwareCapabilities();
    } catch (error) {
      console.error('Failed to get hardware capabilities:', error);
      return {
        supportsHardwareEncoding: false,
        supportsHardwareDecoding: false,
        maxConcurrentExports: 1,
        recommendedMaxResolution: { width: 1920, height: 1080 }
      };
    }
  }

  async cleanupTempFiles(): Promise<number> {
    if (!VideoExporterTurboModule) {
      return 0;
    }

    try {
      return await VideoExporterTurboModule.cleanupTempFiles();
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
      return 0;
    }
  }

  async clearCaches(): Promise<void> {
    if (!VideoExporterTurboModule) {
      return;
    }

    try {
      await VideoExporterTurboModule.clearCaches();
    } catch (error) {
      console.error('Failed to clear caches:', error);
    }
  }

  // Event listener management
  addProgressListener(exportId: string, callback: (progress: ExportProgress) => void): void {
    this.progressListeners.set(exportId, callback);
  }

  removeProgressListener(exportId: string): void {
    this.progressListeners.delete(exportId);
  }

  addMemoryPressureListener(callback: (usage: number, pressure: 'normal' | 'warning' | 'critical') => void): void {
    this.memoryPressureListeners.add(callback);
  }

  removeMemoryPressureListener(callback: (usage: number, pressure: 'normal' | 'warning' | 'critical') => void): void {
    this.memoryPressureListeners.delete(callback);
  }

  // Utility methods
  private generateExportId(): string {
    return `export_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }

  private setupEventListeners(): void {
    if (Platform.OS === 'android') {
      this.setupAndroidEventListeners();
    } else if (Platform.OS === 'ios') {
      this.setupIOSEventListeners();
    }
  }

  private setupAndroidEventListeners(): void {
    // Android event listeners would be set up here
    // This would involve listening to native events through the Turbo Module
  }

  private setupIOSEventListeners(): void {
    // iOS event listeners would be set up here
    // This would involve listening to native events through the Turbo Module
  }

  // Cleanup
  cleanup(): void {
    this.progressListeners.clear();
    this.memoryPressureListeners.clear();
    this.activeExports.clear();
  }
}

// Export singleton instance
export const VideoExporter = VideoExporterBridge.getInstance();

// Export types for convenience
export type {
  ExportOptions,
  ExportProgress,
  WaveformData,
  FrameExtractionOptions,
  VideoMetadata,
  ExportResult,
  RetryConfig,
  MemoryPressureConfig
};
