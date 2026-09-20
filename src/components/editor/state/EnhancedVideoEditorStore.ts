import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { HistoryManager, Command } from './HistoryManager';
import { Project, Track, Overlay } from '@/types/timeline';

interface UIState {
  currentFrame: number;
  isPlaying: boolean;
  zoom: number;
  scrollX: number;
  selectedTrackId: string | null;
  selectedClipId: string | null;
  selectedOverlayId: string | null;
}

interface TimelineState {
  viewportStartFrame: number;
  viewportEndFrame: number;
  pixelsPerFrame: number;
  snapEnabled: boolean;
  snapThreshold: number;
}

interface EnhancedEditorState {
  project: Project;
  ui: UIState;
  timeline: TimelineState;
  history: HistoryManager;
  isRecovering: boolean;
  recoveryError?: string;
  dispatch: (cmd: Command) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  recoverFromCrash: () => Promise<void>;
  forceCheckpoint: () => Promise<void>;
  getRecoveryStats: () => ReturnType<HistoryManager['getRecoveryStats']>;
}

export const useEnhancedVideoEditorStore = create<EnhancedEditorState>()(
  immer((set, get) => {
    const history = new HistoryManager();

    return {
      // Inherit all existing VideoEditorState properties
      ...createInitialState(),
      
      // Enhanced history management
      history,
      isRecovering: false,
      recoveryError: undefined,

      dispatch: async (cmd: Command) => {
        try {
          // Validate command
          if (!cmd.validate(get().project)) {
            throw new Error(`Command validation failed: ${cmd.type}`);
          }

          // Execute command
          set((state) => {
            state.project = cmd.execute(state.project);
          });

          // Add to history
          await history.push(cmd);
          
          // Schedule autosave (debounced)
          scheduleAutosave(get());
          
        } catch (error) {
          console.error('[Store] Command execution failed:', error);
          throw error;
        }
      },

      undo: async () => {
        try {
          set((state) => {
            const result = state.history.undo(state.project);
            if (result) {
              state.project = result;
            }
          });
          
          // Schedule autosave after undo
          scheduleAutosave(get());
        } catch (error) {
          console.error('[Store] Undo failed:', error);
          throw error;
        }
      },

      redo: async () => {
        try {
          set((state) => {
            const result = state.history.redo(state.project);
            if (result) {
              state.project = result;
            }
          });
          
          // Schedule autosave after redo
          scheduleAutosave(get());
        } catch (error) {
          console.error('[Store] Redo failed:', error);
          throw error;
        }
      },

      recoverFromCrash: async () => {
        set((state) => {
          state.isRecovering = true;
          state.recoveryError = undefined;
        });

        try {
          const result = await history.recoverLatestState();
          
          if (result.success && result.project) {
            set((state) => {
              state.project = result.project!;
              state.isRecovering = false;
              state.recoveryError = undefined;
            });
            
            console.log('[Store] Successfully recovered from crash');
          } else {
            set((state) => {
              state.isRecovering = false;
              state.recoveryError = result.error || 'Unknown recovery error';
            });
            
            console.warn('[Store] Recovery failed:', result.error);
          }
        } catch (error) {
          set((state) => {
            state.isRecovering = false;
            state.recoveryError = (error as Error).message;
          });
          
          console.error('[Store] Recovery failed:', error);
        }
      },

      forceCheckpoint: async () => {
        try {
          await history.persistCheckpoint(get().project);
          console.log('[Store] Force checkpoint completed');
        } catch (error) {
          console.error('[Store] Force checkpoint failed:', error);
        }
      },

      getRecoveryStats: () => {
        return history.getRecoveryStats();
      }
    };
  })
);

// ─── Debounced Autosave ──────────────────────────
let autosaveTimeout: ReturnType<typeof setTimeout> | null = null;
function scheduleAutosave(state: EnhancedEditorState) {
  if (autosaveTimeout) clearTimeout(autosaveTimeout);
  
  autosaveTimeout = setTimeout(() => {
    state.history.persistCheckpoint(state.project).catch(error => {
      console.error('[Store] Autosave failed:', error);
    });
  }, 500); // debounce 500ms
}

// ─── Initial State Helper ──────────────────────────
function createInitialState(): Pick<EnhancedEditorState, 'project' | 'ui' | 'timeline'> {  return {
    project: {
      fps: 30,
      tracks: [],
      overlays: [],
      durationFrames: 0
    },
    ui: {
      currentFrame: 0,
      isPlaying: false,
      zoom: 1.0,
      scrollX: 0,
      selectedTrackId: null,
      selectedClipId: null,
      selectedOverlayId: null
    },
    timeline: {
      viewportStartFrame: 0,
      viewportEndFrame: 1000,
      pixelsPerFrame: 1,
      snapEnabled: true,
      snapThreshold: 5
    }
  };
}

// ─── Cleanup Helper ──────────────────────────────
export const cleanupEnhancedStore = () => {
  if (autosaveTimeout) {
    clearTimeout(autosaveTimeout);
    autosaveTimeout = null;
  }
};
