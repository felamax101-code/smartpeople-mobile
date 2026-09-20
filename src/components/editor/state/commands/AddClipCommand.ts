import { Command } from '../HistoryManager';
import { Project, Clip } from '@/types/timeline';

export interface AddClipCommandParams {
  trackId: string;
  clip: Clip;
  insertFrame: number;
}

export class AddClipCommand implements Command {
  public readonly id: string;
  public readonly type = 'addClip';
  public readonly timestamp: number;
  private params: AddClipCommandParams;

  constructor(params: AddClipCommandParams) {
    this.id = `addClip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = Date.now();
    this.params = params;
  }

  validate(project: Project): boolean {
    const track = project.tracks.find(t => t.id === this.params.trackId);
    if (!track) {
      console.error('[AddClipCommand] Track not found:', this.params.trackId);
      return false;
    }

    if (!this.params.clip) {
      console.error('[AddClipCommand] Clip data is required');
      return false;
    }

    if (this.params.clip.sourceStartFrame >= this.params.clip.sourceEndFrame) {
      console.error('[AddClipCommand] Invalid source frame range');
      return false;
    }

    if (this.params.clip.durationFrames <= 0) {
      console.error('[AddClipCommand] Clip duration must be positive');
      return false;
    }

    return true;
  }

  execute(project: Project): Project {
    const trackIndex = project.tracks.findIndex(t => t.id === this.params.trackId);
    if (trackIndex === -1) {
      throw new Error(`Track not found: ${this.params.trackId}`);
    }

    const newProject = { ...project };
    const newTracks = [...newProject.tracks];
    const track = { ...newTracks[trackIndex] };
    const newClips = [...track.clips];

    // Insert clip at the specified position
    const insertIndex = newClips.findIndex(
      clip => clip.timelineStartFrame > this.params.insertFrame
    );
    
    const adjustedClip = {
      ...this.params.clip,
      timelineStartFrame: this.params.insertFrame
    };

    if (insertIndex === -1) {
      newClips.push(adjustedClip);
    } else {
      newClips.splice(insertIndex, 0, adjustedClip);
    }

    track.clips = newClips;
    newTracks[trackIndex] = track;
    newProject.tracks = newTracks;

    // Update project duration
    newProject.durationFrames = Math.max(
      newProject.durationFrames,
      this.params.insertFrame + this.params.clip.durationFrames
    );

    return newProject;
  }

  undo(project: Project): Project {
    const trackIndex = project.tracks.findIndex(t => t.id === this.params.trackId);
    if (trackIndex === -1) {
      throw new Error(`Track not found: ${this.params.trackId}`);
    }

    const newProject = { ...project };
    const newTracks = [...newProject.tracks];
    const track = { ...newTracks[trackIndex] };
    const newClips = [...track.clips];

    // Remove the clip that was added
    const clipIndex = newClips.findIndex(
      clip => clip.id === this.params.clip.id
    );

    if (clipIndex === -1) {
      throw new Error(`Clip not found for undo: ${this.params.clip.id}`);
    }

    newClips.splice(clipIndex, 1);
    track.clips = newClips;
    newTracks[trackIndex] = track;
    newProject.tracks = newTracks;

    // Recalculate project duration
    newProject.durationFrames = this.calculateProjectDuration(newTracks);

    return newProject;
  }

  private calculateProjectDuration(tracks: any[]): number {
    let maxDuration = 0;
    tracks.forEach(track => {
      track.clips.forEach((clip: any) => {
        const clipEnd = clip.timelineStartFrame + clip.durationFrames;
        maxDuration = Math.max(maxDuration, clipEnd);
      });
    });
    return maxDuration;
  }
}
