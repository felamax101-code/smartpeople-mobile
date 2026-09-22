import { NativeModules, Platform } from 'react-native';

export interface VideoExporterInterface {
  exportAsync(
    projectJSON: string,
    outputPath: string,
    options: ExportOptions
  ): Promise<string>;
  
  generateWaveform(
    videoPath: string
  ): Promise<WaveformData>;
  
  extractFrame(
    videoPath: string,
    frameNumber: number,
    outputPath: string
  ): Promise<string>;
}

export interface ExportOptions {
  resolution: {
    width: number;
    height: number;
  };
  bitrate: number;
  fps: number;
  format: 'mp4' | 'mov' | 'webm';
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

export interface WaveformData {
  amplitudes: number[];
  sampleRate: number;
  durationFrames: number;
}

const { VideoExporterModule } = NativeModules;

export class VideoExporterBridge {
  static isAvailable(): boolean {
    return !!VideoExporterModule;
  }

  static async exportAsync(
    projectJSON: string,
    outputPath: string,
    options: ExportOptions
  ): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('VideoExporterModule is not available');
    }

    try {
      return await VideoExporterModule.exportAsync(projectJSON, outputPath, options);
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  static async generateWaveform(videoPath: string): Promise<WaveformData> {
    if (!this.isAvailable()) {
      throw new Error('VideoExporterModule is not available');
    }

    try {
      return await VideoExporterModule.generateWaveform(videoPath);
    } catch (error) {
      console.error('Waveform generation failed:', error);
      throw error;
    }
  }

  static async extractFrame(
    videoPath: string,
    frameNumber: number,
    outputPath: string
  ): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('VideoExporterModule is not available');
    }

    try {
      return await VideoExporterModule.extractFrame(videoPath, frameNumber, outputPath);
    } catch (error) {
      console.error('Frame extraction failed:', error);
      throw error;
    }
  }

  static getPlatformSpecificPath(relativePath: string): string {
    if (Platform.OS === 'android') {
      return `file://${relativePath}`;
    }
    return relativePath;
  }
}

// Mock implementation for development
export class MockVideoExporterBridge implements VideoExporterInterface {
  async exportAsync(
    projectJSON: string,
    outputPath: string,
    options: ExportOptions
  ): Promise<string> {
    
    // Simulate export progress
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(outputPath);
      }, 3000);
    });
  }

  async generateWaveform(videoPath: string): Promise<WaveformData> {
    
    // Generate mock waveform data
    const durationFrames = 900; // 30 seconds at 30fps
    const amplitudes = new Array(durationFrames).fill(0).map(() => Math.random());
    
    return {
      amplitudes,
      sampleRate: 44100,
      durationFrames
    };
  }

  async extractFrame(
    videoPath: string,
    frameNumber: number,
    outputPath: string
  ): Promise<string> {
    
    // Simulate frame extraction
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(outputPath);
      }, 500);
    });
  }
}

// Export appropriate bridge based on availability
export const VideoExporter = VideoExporterBridge.isAvailable() 
  ? VideoExporterBridge 
  : new MockVideoExporterBridge();
