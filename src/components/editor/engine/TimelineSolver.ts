import { Clip, Track } from '@/types/timeline';

export class TimelineSolver {
  static addClip(track: Track, newClip: Clip, insertFrame: number): Track {
    const clips = [...track.clips];
    
    // Find insertion position
    const insertIndex = clips.findIndex(clip => clip.timelineStartFrame > insertFrame);
    
    // Adjust clip position to avoid overlaps
    newClip = {
      ...newClip,
      timelineStartFrame: insertFrame
    };
    
    // Insert clip
    if (insertIndex === -1) {
      clips.push(newClip);
    } else {
      clips.splice(insertIndex, 0, newClip);
    }
    
    // Resolve overlaps
    const resolvedClips = this.resolveOverlaps(clips);
    
    return {
      ...track,
      clips: resolvedClips
    };
  }

  static removeClip(track: Track, clipId: string): Track {
    const clips = track.clips.filter(clip => clip.id !== clipId);
    return {
      ...track,
      clips
    };
  }

  static trimClip(track: Track, clipId: string, newStartFrame: number, newEndFrame: number): Track {
    const clips = track.clips.map(clip => {
      if (clip.id === clipId) {
        const durationFrames = newEndFrame - newStartFrame;
        return {
          ...clip,
          sourceStartFrame: newStartFrame,
          sourceEndFrame: newEndFrame,
          durationFrames
        };
      }
      return clip;
    });
    
    return {
      ...track,
      clips
    };
  }

  static moveClip(track: Track, clipId: string, newTimelineFrame: number): Track {
    const clips = [...track.clips];
    const clipIndex = clips.findIndex(clip => clip.id === clipId);
    
    if (clipIndex === -1) return track;
    
    const clip = clips[clipIndex];
    const movedClip = {
      ...clip,
      timelineStartFrame: newTimelineFrame
    };
    
    // Remove from original position
    clips.splice(clipIndex, 1);
    
    // Find new insertion position
    const insertIndex = clips.findIndex(c => c.timelineStartFrame > newTimelineFrame);
    
    // Insert at new position
    if (insertIndex === -1) {
      clips.push(movedClip);
    } else {
      clips.splice(insertIndex, 0, movedClip);
    }
    
    // Resolve overlaps
    const resolvedClips = this.resolveOverlaps(clips);
    
    return {
      ...track,
      clips: resolvedClips
    };
  }

  static splitClip(track: Track, clipId: string, splitFrame: number): Track {
    const clips = [...track.clips];
    const clipIndex = clips.findIndex(clip => clip.id === clipId);
    
    if (clipIndex === -1) return track;
    
    const originalClip = clips[clipIndex];
    const clipStartFrame = originalClip.timelineStartFrame;
    const relativeSplitFrame = splitFrame - clipStartFrame;
    
    if (relativeSplitFrame <= 0 || relativeSplitFrame >= originalClip.durationFrames) {
      return track; // Split point is outside clip bounds
    }
    
    // Create two new clips
    const firstClip: Clip = {
      ...originalClip,
      id: `${originalClip.id}_1`,
      sourceEndFrame: originalClip.sourceStartFrame + relativeSplitFrame,
      durationFrames: relativeSplitFrame
    };
    
    const secondClip: Clip = {
      ...originalClip,
      id: `${originalClip.id}_2`,
      sourceStartFrame: originalClip.sourceStartFrame + relativeSplitFrame,
      timelineStartFrame: splitFrame,
      durationFrames: originalClip.durationFrames - relativeSplitFrame
    };
    
    // Replace original clip with two new clips
    clips.splice(clipIndex, 1, firstClip, secondClip);
    
    return {
      ...track,
      clips
    };
  }

  static rippleDelete(track: Track, clipId: string): Track {
    const clips = [...track.clips];
    const clipIndex = clips.findIndex(clip => clip.id === clipId);
    
    if (clipIndex === -1) return track;
    
    const deletedClip = clips[clipIndex];
    const deletedDuration = deletedClip.durationFrames;
    
    // Remove the clip
    clips.splice(clipIndex, 1);
    
    // Move all subsequent clips backward
    for (let i = clipIndex; i < clips.length; i++) {
      clips[i] = {
        ...clips[i],
        timelineStartFrame: clips[i].timelineStartFrame - deletedDuration
      };
    }
    
    return {
      ...track,
      clips
    };
  }

  private static resolveOverlaps(clips: Clip[]): Clip[] {
    const sortedClips = [...clips].sort((a, b) => a.timelineStartFrame - b.timelineStartFrame);
    const resolved: Clip[] = [];
    
    for (const clip of sortedClips) {
      if (resolved.length === 0) {
        resolved.push(clip);
        continue;
      }
      
      const lastClip = resolved[resolved.length - 1];
      const lastEndFrame = lastClip.timelineStartFrame + lastClip.durationFrames;
      
      if (clip.timelineStartFrame >= lastEndFrame) {
        // No overlap
        resolved.push(clip);
      } else {
        // Overlap detected - move clip to start after last clip
        const movedClip = {
          ...clip,
          timelineStartFrame: lastEndFrame
        };
        resolved.push(movedClip);
      }
    }
    
    return resolved;
  }

  static getTrackDuration(track: Track): number {
    if (track.clips.length === 0) return 0;
    
    const lastClip = track.clips.reduce((latest, clip) => {
      const clipEnd = clip.timelineStartFrame + clip.durationFrames;
      return clipEnd > latest ? clipEnd : latest;
    }, 0);
    
    return lastClip;
  }

  static getClipsInTimeRange(track: Track, startFrame: number, endFrame: number): Clip[] {
    return track.clips.filter(clip => {
      const clipStart = clip.timelineStartFrame;
      const clipEnd = clipStart + clip.durationFrames;
      return clipStart < endFrame && clipEnd > startFrame;
    });
  }
}
