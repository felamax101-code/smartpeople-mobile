import { Project, Clip, Overlay, KeyframeSegment } from '@/types/timeline';
import { ExportProgress, ExportOptions } from '@/types/VideoExporter';
import { VideoExporter as VideoExporterBridge  } from '../native/VideoExporterBridge';
export interface FilterGraph {
  inputs: string[];
  filters: FilterDescription[];
  outputs: string[];
}

export interface FilterDescription {
  name: string;
  parameters: Record<string, string>;
  inputs?: string[];
  outputs?: string[];
}

export class FilterGraphCompiler {
  static compileProject(project: Project, options: ExportOptions): FilterGraph {
    const videoTracks = project.tracks.filter(t => t.type === 'video');
    const audioTracks = project.tracks.filter(t => t.type === 'audio');
    
    const graph: FilterGraph = {
      inputs: [],
      filters: [],
      outputs: []
    };

    // Process video tracks
    if (videoTracks.length > 0) {
      const videoFilterChain = this.compileVideoTracks(videoTracks, project.overlays, options);
      graph.filters.push(...videoFilterChain.filters);
      graph.inputs.push(...videoFilterChain.inputs);
    }

    // Process audio tracks
    if (audioTracks.length > 0) {
      const audioFilterChain = this.compileAudioTracks(audioTracks, options);
      graph.filters.push(...audioFilterChain.filters);
      graph.inputs.push(...audioFilterChain.inputs);
    }

    // Add final output
    graph.outputs.push('output');

    return graph;
  }

  private static compileVideoTracks(
    videoTracks: any[],
    overlays: Overlay[],
    options: ExportOptions
  ): FilterGraph {
    const chain: FilterGraph = {
      inputs: [],
      filters: [],
      outputs: []
    };

    // Create concat input for video clips
    const videoInputs: string[] = [];
    
    videoTracks.forEach((track, trackIndex: number) => {
      track.clips.forEach((clip: Clip, clipIndex: number) => {
        const inputName = `v${trackIndex}_${clipIndex}`;
        videoInputs.push(inputName);
        chain.inputs.push(inputName);

        // Trim filter for each clip
        chain.filters.push({
          name: 'trim',
          parameters: {
            start: String(clip.sourceStartFrame),
            end: String(clip.sourceEndFrame),
            fps: String(options.fps)
          },
          inputs: [inputName],
          outputs: [`${inputName}_trimmed`]
        });

        // Set aspect ratio if needed
        chain.filters.push({
          name: 'setsar',
          parameters: { sar: '1:1' },
          inputs: [`${inputName}_trimmed`],
          outputs: [`${inputName}_ready`]
        });
      });
    });

    // Concat video clips
    if (videoInputs.length > 1) {
      chain.filters.push({
        name: 'concat',
        parameters: {
          n: String(videoInputs.length),
          v: '1',
          a: '0'
        },
        inputs: videoInputs.map(input => `${input}_ready`),
        outputs: ['video_concat']
      });
    } else if (videoInputs.length === 1) {
      chain.filters.push({
        name: 'copy',
        parameters: {},
        inputs: [`${videoInputs[0]}_ready`],
        outputs: ['video_concat']
      });
    }

    // Add overlays
    let currentVideoInput = 'video_concat';
    overlays.forEach((overlay, overlayIndex) => {
      const overlayFilter = this.compileOverlay(overlay, currentVideoInput, overlayIndex);
      chain.filters.push(...overlayFilter.filters);
      currentVideoInput = overlayFilter.outputs[0];
    });

    // Scale to output resolution
    chain.filters.push({
      name: 'scale',
      parameters: {
        width: String(options.resolution.width),
        height: String(options.resolution.height)
      },
      inputs: [currentVideoInput],
      outputs: ['video_scaled']
    });

    return chain;
  }

  private static compileOverlay(overlay: Overlay, videoInput: string, index: number): FilterGraph {
    const chain: FilterGraph = {
      inputs: [],
      filters: [],
      outputs: []
    };

    const overlayInput = `overlay_${index}`;
    chain.inputs.push(overlayInput);

    // Generate overlay position expression based on keyframes
    const positionExpr = this.generatePositionExpression(overlay.keyframeSegments);
    const scaleExpr = this.generateScaleExpression(overlay.keyframeSegments);
    const opacityExpr = this.generateOpacityExpression(overlay.keyframeSegments);

    // Apply transformations to overlay
    chain.filters.push({
      name: 'scale',
      parameters: {
        w: scaleExpr,
        h: scaleExpr
      },
      inputs: [overlayInput],
      outputs: [`${overlayInput}_scaled`]
    });

    // Overlay on video
    chain.filters.push({
      name: 'overlay',
      parameters: {
        x: positionExpr,
        y: positionExpr,
        enable: this.generateEnableExpression(overlay.keyframeSegments),
        format: 'auto',
        alpha: opacityExpr
      },
      inputs: [videoInput, `${overlayInput}_scaled`],
      outputs: [`video_with_overlay_${index}`]
    });

    chain.outputs = [`video_with_overlay_${index}`];

    return chain;
  }

  private static generatePositionExpression(keyframeSegments: KeyframeSegment[]): string {
    if (keyframeSegments.length === 0) return '0';
    
    // Generate complex expression for keyframe-based positioning
    const expressions: string[] = [];
    
    keyframeSegments.forEach((segment, _index) => {
      const { start, end } = segment;
      const duration = end.frame - start.frame;
      
      // Linear interpolation between keyframes
      const expr = `if(between(t,${start.frame/30},${end.frame/30}),${start.transform.x}+(${end.transform.x}-${start.transform.x})*((t-${start.frame/30})/${duration/30}),`;
      expressions.push(expr);
    });
    
    // Default position
    expressions.push(String(keyframeSegments[0].start.transform.x));
    
    return expressions.join('') + ')';
  }

  private static generateScaleExpression(keyframeSegments: KeyframeSegment[]): string {
    if (keyframeSegments.length === 0) return 'iw';
    
    // Similar to position but for scale
    const expressions: string[] = [];
    
    keyframeSegments.forEach((segment, _index) => {
      const { start, end } = segment;
      const duration = end.frame - start.frame;
      
      const expr = `if(between(t,${start.frame/30},${end.frame/30}),${start.transform.scale}+(${end.transform.scale}-${start.transform.scale})*((t-${start.frame/30})/${duration/30}),`;
      expressions.push(expr);
    });
    
    expressions.push(String(keyframeSegments[0].start.transform.scale));
    
    return `iw*(${expressions.join('')})`;
  }

  private static generateOpacityExpression(keyframeSegments: KeyframeSegment[]): string {
    if (keyframeSegments.length === 0) return '1';
    
    const expressions: string[] = [];
    
    keyframeSegments.forEach((segment, _index) => {
      const { start, end } = segment;
      const duration = end.frame - start.frame;
      
      const expr = `if(between(t,${start.frame/30},${end.frame/30}),${start.transform.opacity}+(${end.transform.opacity}-${start.transform.opacity})*((t-${start.frame/30})/${duration/30}),`;
      expressions.push(expr);
    });
    
    expressions.push(String(keyframeSegments[0].start.transform.opacity));
    
    return expressions.join('') + ')';
  }

  private static generateEnableExpression(keyframeSegments: KeyframeSegment[]): string {
    if (keyframeSegments.length === 0) return '0';
    
    const startFrame = keyframeSegments[0].start.frame;
    const endFrame = keyframeSegments[keyframeSegments.length - 1].end.frame;
    
    return `between(t,${startFrame/30},${endFrame/30})`;
  }

  private static compileAudioTracks(audioTracks: any[], options: ExportOptions): FilterGraph {
    const chain: FilterGraph = {
      inputs: [],
      filters: [],
      outputs: []
    };

    const audioInputs: string[] = [];
    
    audioTracks.forEach((track, trackIndex: number) => {
      track.clips.forEach((clip: Clip, clipIndex: number) => {
        const inputName = `a${trackIndex}_${clipIndex}`;
        audioInputs.push(inputName);
        chain.inputs.push(inputName);

        // Trim filter for audio clip
        chain.filters.push({
          name: 'atrim',
          parameters: {
            start: String(clip.sourceStartFrame / options.fps),
            end: String(clip.sourceEndFrame / options.fps)
          },
          inputs: [inputName],
          outputs: [`${inputName}_trimmed`]
        });

        // Volume filter
        chain.filters.push({
          name: 'volume',
          parameters: {
            volume: String(clip.volume * track.volume)
          },
          inputs: [`${inputName}_trimmed`],
          outputs: [`${inputName}_ready`]
        });
      });
    });

    // Mix audio tracks
    if (audioInputs.length > 1) {
      chain.filters.push({
        name: 'amix',
        parameters: {
          inputs: String(audioInputs.length),
          duration: 'longest'
        },
        inputs: audioInputs.map(input => `${input}_ready`),
        outputs: ['audio_mix']
      });
    } else if (audioInputs.length === 1) {
      chain.filters.push({
        name: 'copy',
        parameters: {},
        inputs: [`${audioInputs[0]}_ready`],
        outputs: ['audio_mix']
      });
    }

    return chain;
  }

  static generateFFmpegCommand(graph: FilterGraph, options: ExportOptions): string {
    const inputs = graph.inputs.map(input => `-i ${input}`).join(' ');
    
    const filterComplex = graph.filters
      .map(filter => {
        const filterName = filter.name;
        const params = Object.entries(filter.parameters)
          .map(([key, value]) => `${key}=${value}`)
          .join(':');
        
        const inputSpec = filter.inputs ? filter.inputs.join(',') : '';
        const outputSpec = filter.outputs ? filter.outputs.join(',') : '';
        
        let filterStr = '';
        if (inputSpec) filterStr += `[${inputSpec}]`;
        filterStr += `${filterName}=${params}`;
        if (outputSpec) filterStr += `[${outputSpec}]`;
        
        return filterStr;
      })
      .join(';');

    const outputSpec = graph.outputs.map(output => `[${output}]`).join('');
    
    return `ffmpeg ${inputs} -filter_complex "${filterComplex}" -map ${outputSpec} -c:v libx264 -preset medium -crf ${this.getCRFValue(options.quality)} -c:a aac -b:a ${options.bitrate}k -r ${options.fps} ${options.outputPath}`;
  }

  private static getCRFValue(quality: ExportOptions['quality']): number {
    switch (quality) {
      case 'low': return 28;
      case 'medium': return 23;
      case 'high': return 18;
      case 'ultra': return 15;
      default: return 23;
    }
  }
}


export class VideoExporter {
  static async exportProject(
    project: Project,
    options: ExportOptions,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<string> {
    try {
      // Validate project and options
      this.validateProject(project);
      this.validateExportOptions(options);
      
      // Compile filter graph
      const filterGraph = FilterGraphCompiler.compileProject(project, options);
      
      // Prepare project JSON for native module
      const projectJSON = JSON.stringify({
        ...project,
        filterGraph,
        exportOptions: options
      });
      
      // Use native FFmpeg bridge
      if (onProgress) {
        return await VideoExporterBridge.exportVideoWithProgress(
          projectJSON,
          options,
          onProgress
        );
      } else {
        return await VideoExporterBridge.exportVideo(projectJSON, options);
      }
      
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error(`Export failed: ${(error as Error).message}`);
    }
  }

  private static validateProject(project: Project): void {
    if (!project) {
      throw new Error('Project is required');
    }
    
    if (!project.tracks || project.tracks.length === 0) {
      throw new Error('Project must have at least one track');
    }
    
    if (project.fps <= 0) {
      throw new Error('Project FPS must be greater than 0');
    }
    
    if (project.durationFrames <= 0) {
      throw new Error('Project duration must be greater than 0');
    }
  }

  private static validateExportOptions(options: ExportOptions): void {
    if (!options) {
      throw new Error('Export options are required');
    }
    
    if (!options.outputPath) {
      throw new Error('Output path is required');
    }
    
    if (!options.resolution || options.resolution.width <= 0 || options.resolution.height <= 0) {
      throw new Error('Valid resolution is required');
    }
    
    if (options.bitrate <= 0) {
      throw new Error('Bitrate must be greater than 0');
    }
    
    if (options.fps <= 0) {
      throw new Error('FPS must be greater than 0');
    }
    
    const validFormats = ['mp4', 'mov', 'webm'];
    if (!validFormats.includes(options.format)) {
      throw new Error(`Format must be one of: ${validFormats.join(', ')}`);
    }
    
    const validQualities = ['low', 'medium', 'high', 'ultra'];
    if (!validQualities.includes(options.quality)) {
      throw new Error(`Quality must be one of: ${validQualities.join(', ')}`);
    }
  }

  static async exportWithFallback(
    project: Project,
    options: ExportOptions,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<string> {
    try {
      return await this.exportProject(project, options, onProgress);
    } catch (_error) {
      console.warn('Primary export failed, trying with reduced quality...');
      
      // Fallback with reduced quality
      const fallbackOptions: ExportOptions = {
        ...options,
        quality: 'medium',
        bitrate: Math.floor(options.bitrate * 0.7),
        resolution: {
          width: Math.floor(options.resolution.width * 0.8),
          height: Math.floor(options.resolution.height * 0.8)
        }
      };
      
      return await this.exportProject(project, fallbackOptions, onProgress);
    }
  }
}
