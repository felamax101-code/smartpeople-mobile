import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Project, Clip, Track, Overlay } from '../types/timeline';
import { enableMapSet } from 'immer';
enableMapSet();
export interface Command {
  id: string;
  type: string;
  timestamp: number;
  execute: (project: Project) => Project;
  undo: (project: Project) => Project;
}

export interface VideoEditorState {
  // Project state
  project: Project | null;
  
  // Undo/Redo system
  history: Command[];
  historyIndex: number;
  checkpoints: Map<number, Project>;
  
  // UI state
  currentFrame: number;
  isPlaying: boolean;
  selectedTrackId: string | null;
  selectedClipId: string | null;
  selectedOverlayId: string | null;
  
  // Timeline view state
  pixelsPerFrame: number;
  timelineOffset: number;
  
  // Actions
  setProject: (project: Project) => void;
  executeCommand: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  
  // UI actions
  setCurrentFrame: (frame: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setSelectedTrack: (trackId: string | null) => void;
  setSelectedClip: (clipId: string | null) => void;
  setSelectedOverlay: (overlayId: string | null) => void;
  
  // Timeline actions
  setPixelsPerFrame: (pixels: number) => void;
  setTimelineOffset: (offset: number) => void;
  
  // Project actions
  addTrack: (track: Track) => void;
  removeTrack: (trackId: string) => void;
  addClip: (trackId: string, clip: Clip) => void;
  removeClip: (trackId: string, clipId: string) => void;
  moveClip: (trackId: string, clipId: string, newFrame: number) => void;
  trimClip: (trackId: string, clipId: string, startFrame: number, endFrame: number) => void;
  splitClip: (trackId: string, clipId: string, splitFrame: number) => void;
  
  // Overlay actions
  addOverlay: (overlay: Overlay) => void;
  removeOverlay: (overlayId: string) => void;
  updateOverlay: (overlayId: string, overlay: Partial<Overlay>) => void;
}

const CHECKPOINT_INTERVAL = 20;

export const useVideoEditorStore = create<VideoEditorState>()(
  immer((set, get) => ({
    // Initial state
    project: null,
    history: [],
    historyIndex: -1,
    checkpoints: new Map(),
    
    currentFrame: 0,
    isPlaying: false,
    selectedTrackId: null,
    selectedClipId: null,
    selectedOverlayId: null,
    
    pixelsPerFrame: 1,
    timelineOffset: 0,
    
    // Project management
    setProject: (project) => {
      set((state) => {
        state.project = project;
        state.history = [];
        state.historyIndex = -1;
        state.checkpoints.clear();
      });
    },
    
    // Command execution
    executeCommand: (command) => {
      set((state) => {
        if (!state.project) return;
        
        // Execute command
        const newProject = command.execute(state.project);
        
        // Clear any redo history
        state.history = state.history.slice(0, state.historyIndex + 1);
        
        // Add command to history
        state.history.push(command);
        state.historyIndex++;
        
        // Create checkpoint if needed
        if (state.historyIndex % CHECKPOINT_INTERVAL === 0) {
          state.checkpoints.set(state.historyIndex, JSON.parse(JSON.stringify(newProject)));
        }
        
        // Update project
        state.project = newProject;
      });
    },
    
    undo: () => {
      set((state) => {
        if (state.historyIndex < 0 || !state.project) return;
        
        const command = state.history[state.historyIndex];
        const previousProject = command.undo(state.project);
        
        state.historyIndex--;
        state.project = previousProject;
      });
    },
    
    redo: () => {
      set((state) => {
        if (state.historyIndex >= state.history.length - 1 || !state.project) return;
        
        state.historyIndex++;
        const command = state.history[state.historyIndex];
        const nextProject = command.execute(state.project);
        
        state.project = nextProject;
      });
    },
    
    // UI actions
    setCurrentFrame: (frame) => {
      set((state) => {
        state.currentFrame = Math.max(0, Math.min(frame, state.project?.durationFrames || 0));
      });
    },
    
    setIsPlaying: (playing) => {
      set((state) => {
        state.isPlaying = playing;
      });
    },
    
    setSelectedTrack: (trackId) => {
      set((state) => {
        state.selectedTrackId = trackId;
        state.selectedClipId = null;
      });
    },
    
    setSelectedClip: (clipId) => {
      set((state) => {
        state.selectedClipId = clipId;
        state.selectedOverlayId = null;
      });
    },
    
    setSelectedOverlay: (overlayId) => {
      set((state) => {
        state.selectedOverlayId = overlayId;
        state.selectedClipId = null;
      });
    },
    
    // Timeline actions
    setPixelsPerFrame: (pixels) => {
      set((state) => {
        state.pixelsPerFrame = Math.max(0.1, Math.min(pixels, 100));
      });
    },
    
    setTimelineOffset: (offset) => {
      set((state) => {
        state.timelineOffset = Math.max(0, offset);
      });
    },
    
    // Project actions
    addTrack: (track) => {
      const { project, executeCommand } = get();
      if (!project) return;
      
      const command: Command = {
        id: `add-track-${Date.now()}`,
        type: 'addTrack',
        timestamp: Date.now(),
        execute: (proj) => ({
          ...proj,
          tracks: [...proj.tracks, track]
        }),
        undo: (proj) => ({
          ...proj,
          tracks: proj.tracks.filter(t => t.id !== track.id)
        })
      };
      
      executeCommand(command);
    },
    
    removeTrack: (trackId) => {
      const { project, executeCommand } = get();
      if (!project) return;
      
      const trackToRemove = project.tracks.find(t => t.id === trackId);
      if (!trackToRemove) return;
      
      const command: Command = {
        id: `remove-track-${Date.now()}`,
        type: 'removeTrack',
        timestamp: Date.now(),
        execute: (proj) => ({
          ...proj,
          tracks: proj.tracks.filter(t => t.id !== trackId)
        }),
        undo: (proj) => ({
          ...proj,
          tracks: [...proj.tracks, trackToRemove]
        })
      };
      
      executeCommand(command);
    },
    
    addClip: (trackId, clip) => {
      const { project, executeCommand } = get();
      if (!project) return;
      
      const command: Command = {
        id: `add-clip-${Date.now()}`,
        type: 'addClip',
        timestamp: Date.now(),
        execute: (proj) => {
          const trackIndex = proj.tracks.findIndex(t => t.id === trackId);
          if (trackIndex === -1) return proj;
          
          const newTracks = [...proj.tracks];
          newTracks[trackIndex] = {
            ...newTracks[trackIndex],
            clips: [...newTracks[trackIndex].clips, clip]
          };
          
          return { ...proj, tracks: newTracks };
        },
        undo: (proj) => {
          const trackIndex = proj.tracks.findIndex(t => t.id === trackId);
          if (trackIndex === -1) return proj;
          
          const newTracks = [...proj.tracks];
          newTracks[trackIndex] = {
            ...newTracks[trackIndex],
            clips: newTracks[trackIndex].clips.filter(c => c.id !== clip.id)
          };
          
          return { ...proj, tracks: newTracks };
        }
      };
      
      executeCommand(command);
    },
    
    removeClip: (trackId, clipId) => {
      const { project, executeCommand } = get();
      if (!project) return;
      
      const track = project.tracks.find(t => t.id === trackId);
      const clipToRemove = track?.clips.find(c => c.id === clipId);
      if (!clipToRemove) return;
      
      const command: Command = {
        id: `remove-clip-${Date.now()}`,
        type: 'removeClip',
        timestamp: Date.now(),
        execute: (proj) => {
          const trackIndex = proj.tracks.findIndex(t => t.id === trackId);
          if (trackIndex === -1) return proj;
          
          const newTracks = [...proj.tracks];
          newTracks[trackIndex] = {
            ...newTracks[trackIndex],
            clips: newTracks[trackIndex].clips.filter(c => c.id !== clipId)
          };
          
          return { ...proj, tracks: newTracks };
        },
        undo: (proj) => {
          const trackIndex = proj.tracks.findIndex(t => t.id === trackId);
          if (trackIndex === -1) return proj;
          
          const newTracks = [...proj.tracks];
          newTracks[trackIndex] = {
            ...newTracks[trackIndex],
            clips: [...newTracks[trackIndex].clips, clipToRemove]
          };
          
          return { ...proj, tracks: newTracks };
        }
      };
      
      executeCommand(command);
    },
    
    moveClip: (trackId, clipId, newFrame) => {
      const { project, executeCommand } = get();
      if (!project) return;
      
      const track = project.tracks.find(t => t.id === trackId);
      const originalClip = track?.clips.find(c => c.id === clipId);
      if (!originalClip) return;
      
      const command: Command = {
        id: `move-clip-${Date.now()}`,
        type: 'moveClip',
        timestamp: Date.now(),
        execute: (proj) => {
          const trackIndex = proj.tracks.findIndex(t => t.id === trackId);
          if (trackIndex === -1) return proj;
          
          const newTracks = [...proj.tracks];
          newTracks[trackIndex] = {
            ...newTracks[trackIndex],
            clips: newTracks[trackIndex].clips.map(c =>
              c.id === clipId ? { ...c, timelineStartFrame: newFrame } : c
            )
          };
          
          return { ...proj, tracks: newTracks };
        },
        undo: (proj) => {
          const trackIndex = proj.tracks.findIndex(t => t.id === trackId);
          if (trackIndex === -1) return proj;
          
          const newTracks = [...proj.tracks];
          newTracks[trackIndex] = {
            ...newTracks[trackIndex],
            clips: newTracks[trackIndex].clips.map(c =>
              c.id === clipId ? originalClip : c
            )
          };
          
          return { ...proj, tracks: newTracks };
        }
      };
      
      executeCommand(command);
    },
    
    trimClip: (trackId, clipId, startFrame, endFrame) => {
      const { project, executeCommand } = get();
      if (!project) return;
      
      const track = project.tracks.find(t => t.id === trackId);
      const originalClip = track?.clips.find(c => c.id === clipId);
      if (!originalClip) return;
      
      const command: Command = {
        id: `trim-clip-${Date.now()}`,
        type: 'trimClip',
        timestamp: Date.now(),
        execute: (proj) => {
          const trackIndex = proj.tracks.findIndex(t => t.id === trackId);
          if (trackIndex === -1) return proj;
          
          const durationFrames = endFrame - startFrame;
          const newTracks = [...proj.tracks];
          newTracks[trackIndex] = {
            ...newTracks[trackIndex],
            clips: newTracks[trackIndex].clips.map(c =>
              c.id === clipId
                ? {
                    ...c,
                    sourceStartFrame: startFrame,
                    sourceEndFrame: endFrame,
                    durationFrames
                  }
                : c
            )
          };
          
          return { ...proj, tracks: newTracks };
        },
        undo: (proj) => {
          const trackIndex = proj.tracks.findIndex(t => t.id === trackId);
          if (trackIndex === -1) return proj;
          
          const newTracks = [...proj.tracks];
          newTracks[trackIndex] = {
            ...newTracks[trackIndex],
            clips: newTracks[trackIndex].clips.map(c =>
              c.id === clipId ? originalClip : c
            )
          };
          
          return { ...proj, tracks: newTracks };
        }
      };
      
      executeCommand(command);
    },
    
    splitClip: (trackId, clipId, splitFrame) => {
      const { project, executeCommand } = get();
      if (!project) return;
      
      const track = project.tracks.find(t => t.id === trackId);
      const originalClip = track?.clips.find(c => c.id === clipId);
      if (!originalClip) return;
      
      const command: Command = {
        id: `split-clip-${Date.now()}`,
        type: 'splitClip',
        timestamp: Date.now(),
        execute: (proj) => {
          const trackIndex = proj.tracks.findIndex(t => t.id === trackId);
          if (trackIndex === -1) return proj;
          
          const relativeSplitFrame = splitFrame - originalClip.timelineStartFrame;
          
          if (relativeSplitFrame <= 0 || relativeSplitFrame >= originalClip.durationFrames) {
            return proj;
          }
          
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
          
          const newTracks = [...proj.tracks];
          newTracks[trackIndex] = {
            ...newTracks[trackIndex],
            clips: newTracks[trackIndex].clips
              .filter(c => c.id !== clipId)
              .concat([firstClip, secondClip])
          };
          
          return { ...proj, tracks: newTracks };
        },
        undo: (proj) => {
          const trackIndex = proj.tracks.findIndex(t => t.id === trackId);
          if (trackIndex === -1) return proj;
          
          const newTracks = [...proj.tracks];
          newTracks[trackIndex] = {
            ...newTracks[trackIndex],
            clips: newTracks[trackIndex].clips
              .filter(c => !c.id.startsWith(`${originalClip.id}_`))
              .concat([originalClip])
          };
          
          return { ...proj, tracks: newTracks };
        }
      };
      
      executeCommand(command);
    },
    
    // Overlay actions
    addOverlay: (overlay) => {
      const { project, executeCommand } = get();
      if (!project) return;
      
      const command: Command = {
        id: `add-overlay-${Date.now()}`,
        type: 'addOverlay',
        timestamp: Date.now(),
        execute: (proj) => ({
          ...proj,
          overlays: [...proj.overlays, overlay]
        }),
        undo: (proj) => ({
          ...proj,
          overlays: proj.overlays.filter(o => o.id !== overlay.id)
        })
      };
      
      executeCommand(command);
    },
    
    removeOverlay: (overlayId) => {
      const { project, executeCommand } = get();
      if (!project) return;
      
      const overlayToRemove = project.overlays.find(o => o.id === overlayId);
      if (!overlayToRemove) return;
      
      const command: Command = {
        id: `remove-overlay-${Date.now()}`,
        type: 'removeOverlay',
        timestamp: Date.now(),
        execute: (proj) => ({
          ...proj,
          overlays: proj.overlays.filter(o => o.id !== overlayId)
        }),
        undo: (proj) => ({
          ...proj,
          overlays: [...proj.overlays, overlayToRemove]
        })
      };
      
      executeCommand(command);
    },
    
    updateOverlay: (overlayId, updates) => {
      const { project, executeCommand } = get();
      if (!project) return;
      
      const originalOverlay = project.overlays.find(o => o.id === overlayId);
      if (!originalOverlay) return;
      
      const command: Command = {
        id: `update-overlay-${Date.now()}`,
        type: 'updateOverlay',
        timestamp: Date.now(),
        execute: (proj) => ({
          ...proj,
          overlays: proj.overlays.map(o =>
            o.id === overlayId ? { ...o, ...updates } : o
          )
        }),
        undo: (proj) => ({
          ...proj,
          overlays: proj.overlays.map(o =>
            o.id === overlayId ? originalOverlay : o
          )
        })
      };
      
      executeCommand(command);
    }
  })));
