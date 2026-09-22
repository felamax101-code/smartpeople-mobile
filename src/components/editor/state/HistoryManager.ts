import RNFS from 'react-native-fs';
import { crc32 } from '@/utils/crc32';
import { Project } from '@/types/timeline';

const CHECKPOINT_DIR = `${RNFS.DocumentDirectoryPath}/editor_checkpoints`;
const AUTOSAVE_FILE = `${CHECKPOINT_DIR}/autosave.json`;
const MAX_CHECKPOINTS = 5;
const CHECKPOINT_INTERVAL = 20; // save every 20 commands

export interface Command {
  id: string;
  type: string;
  timestamp: number;
  execute: (project: Project) => Project;
  undo: (project: Project) => Project;
  validate: (project: Project) => boolean;
}

interface Checkpoint {
  id: string;
  timestamp: number;
  commandIndex: number; // index in the history after which this snapshot was taken
  data: string;          // serialised Project
  checksum: number;
}

interface RecoveryResult {
  success: boolean;
  project: Project | null;
  error?: string;
  recoveredFromBackup?: boolean;
}

export class HistoryManager {
  private commands: Command[] = [];
  private pointer = -1;
  private checkpoints: Checkpoint[] = [];
  private commandCounterSinceCheckpoint = 0;
  private lastKnownGoodProject: Project | null = null;
  private persistenceLock = false; // prevent concurrent autosave
  private isRecovering = false;

  // ─── Public API ────────────────────────────────

  async push(command: Command): Promise<void> {
    this.commands = this.commands.slice(0, this.pointer + 1);
    this.commands.push(command);
    this.pointer++;
    this.commandCounterSinceCheckpoint++;

    if (this.commandCounterSinceCheckpoint >= CHECKPOINT_INTERVAL) {
      // Trigger checkpoint creation (called from store middleware)
      this.scheduleCheckpoint();
    }
  }

  undo(current: Project): Project | null {
    if (this.pointer < 0) return null;
    const cmd = this.commands[this.pointer];
    
    try {
      const result = cmd.undo(current);
      if (result) {
        this.pointer--;
        this.commandCounterSinceCheckpoint = 0; // reset to force next checkpoint sooner if many undos
        return result;
      }
    } catch (error) {
      console.error('[HistoryManager] Undo failed:', error);
      // Attempt to recover by moving pointer back anyway
      this.pointer--;
    }
    
    return null;
  }

  redo(current: Project): Project | null {
    if (this.pointer >= this.commands.length - 1) return null;
    this.pointer++;
    const cmd = this.commands[this.pointer];
    
    try {
      return cmd.execute(current);
    } catch (error) {
      console.error('[HistoryManager] Redo failed:', error);
      // Revert pointer on failure
      this.pointer--;
      return null;
    }
  }

  // ─── Persistence ───────────────────────────────

  /** Called after each store change. The store debounces this. */
  async persistCheckpoint(project: Project): Promise<void> {
    if (this.persistenceLock || this.isRecovering) return;
    this.persistenceLock = true;
    
    try {
      await this.saveCheckpoint(project, this.pointer);
    } catch (error) {
      console.error('[HistoryManager] Failed to persist checkpoint:', error);
      // Try backup mechanism
      await this.saveBackupCheckpoint(project, this.pointer);
    } finally {
      this.persistenceLock = false;
    }
  }

  private async saveCheckpoint(project: Project, commandIndex: number): Promise<void> {
    await RNFS.mkdir(CHECKPOINT_DIR, { NSURLIsExcludedFromBackupKey: true }); // don't back up large temp files
    const serialized = JSON.stringify(project);
    const checksum = crc32(serialized);
    const checkpoint: Checkpoint = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      commandIndex,
      data: serialized,
      checksum,
    };

    // Write atomically to a temp file, then rename
    const tmpPath = `${AUTOSAVE_FILE}.tmp`;
    const newPath = `${AUTOSAVE_FILE}`;
    
    await RNFS.writeFile(tmpPath, JSON.stringify(checkpoint), 'utf8');
    await RNFS.moveFile(tmpPath, newPath); // atomic on same filesystem

    // Remove old checkpoints (prune)
    this.checkpoints.push(checkpoint);
    if (this.checkpoints.length > MAX_CHECKPOINTS) {
      const toRemove = this.checkpoints.shift()!;
      // Optionally delete old checkpoint file (but we only keep the latest autosave file)
    }

    this.commandCounterSinceCheckpoint = 0;
    this.lastKnownGoodProject = project;
  }

  private async saveBackupCheckpoint(project: Project, commandIndex: number): Promise<void> {
    try {
      const backupPath = `${CHECKPOINT_DIR}/backup_${Date.now()}.json`;
      const serialized = JSON.stringify(project);
      const checksum = crc32(serialized);
      const checkpoint: Checkpoint = {
        id: `backup_${Date.now()}`,
        timestamp: Date.now(),
        commandIndex,
        data: serialized,
        checksum,
      };
      
      await RNFS.writeFile(backupPath, JSON.stringify(checkpoint), 'utf8');
    } catch (error) {
      console.error('[HistoryManager] Failed to create backup:', error);
    }
  }

  /** Recover the latest state on app launch. Returns null if no valid state found. */
  async recoverLatestState(): Promise<RecoveryResult> {
    this.isRecovering = true;
    
    try {
      // Try primary autosave file first
      const primaryResult = await this.tryRecoverFromFile(AUTOSAVE_FILE);
      if (primaryResult.success) {
        return primaryResult;
      }

      // Try backup checkpoints
      const backupResult = await this.tryRecoverFromBackups();
      if (backupResult.success) {
        return { ...backupResult, recoveredFromBackup: true };
      }

      return { success: false, project: null, error: 'No valid checkpoints found' };
      
    } catch (error) {
      console.error('[HistoryManager] Recovery failed:', error);
      return { success: false, project: null, error: (error as Error).message };
    } finally {
      this.isRecovering = false;
    }
  }

  private async tryRecoverFromFile(filePath: string): Promise<RecoveryResult> {
    try {
      const exists = await RNFS.exists(filePath);
      if (!exists) {
        return { success: false, project: null, error: 'File does not exist' };
      }

      const raw = await RNFS.readFile(filePath, 'utf8');
      const checkpoint: Checkpoint = JSON.parse(raw);

      // Verify checksum
      const dataChecksum = crc32(checkpoint.data);
      if (dataChecksum !== checkpoint.checksum) {
        console.warn('[HistoryManager] Corrupted checkpoint detected, discarding');
        await RNFS.unlink(filePath);
        return { success: false, project: null, error: 'Checksum mismatch' };
      }

      // Verify project structure
      const project: Project = JSON.parse(checkpoint.data);
      if (!this.validateProject(project)) {
        console.warn('[HistoryManager] Invalid project structure, discarding');
        await RNFS.unlink(filePath);
        return { success: false, project: null, error: 'Invalid project structure' };
      }

      // Rebuild history state
      this.pointer = checkpoint.commandIndex;
      this.commands = []; // Commands are not persisted for simplicity
      this.checkpoints = [checkpoint];
      this.commandCounterSinceCheckpoint = 0;
      this.lastKnownGoodProject = project;

      return { success: true, project };
      
    } catch (error) {
      console.error('[HistoryManager] File recovery failed:', error);
      // Remove corrupted file
      try { await RNFS.unlink(filePath); } catch (_) {}
      return { success: false, project: null, error: (error as Error).message };
    }
  }

  private async tryRecoverFromBackups(): Promise<RecoveryResult> {
    try {
      const exists = await RNFS.exists(CHECKPOINT_DIR);
      if (!exists) {
        return { success: false, project: null, error: 'No backup directory' };
      }

      const files = await RNFS.readDir(CHECKPOINT_DIR);
      const backupFiles = files
        .filter(file => file.name.startsWith('backup_') && file.name.endsWith('.json'))
        .sort((a, b) => (b.mtime?.getTime() || 0) - (a.mtime?.getTime() || 0)); // Most recent first

      for (const file of backupFiles) {
        const result = await this.tryRecoverFromFile(file.path);
        if (result.success) {
          return result;
        }
      }

      return { success: false, project: null, error: 'No valid backups found' };
      
    } catch (error) {
      console.error('[HistoryManager] Backup recovery failed:', error);
      return { success: false, project: null, error: (error as Error).message };
    }
  }

  private validateProject(project: any): project is Project {
    return (
      project &&
      typeof project === 'object' &&
      typeof project.id === 'string' &&
      typeof project.fps === 'number' &&
      Array.isArray(project.tracks) &&
      Array.isArray(project.overlays) &&
      typeof project.durationFrames === 'number'
    );
  }

  // ─── Housekeeping ──────────────────────────────

  /** Clear all persistence data (e.g., on logout) */
  async clearAll(): Promise<void> {
    try {
      await RNFS.unlink(CHECKPOINT_DIR);
    } catch (error) {
      // Directory might not exist
    }
    
    this.commands = [];
    this.pointer = -1;
    this.checkpoints = [];
    this.commandCounterSinceCheckpoint = 0;
    this.lastKnownGoodProject = null;
  }

  /** Clean up old backup files */
  async cleanupOldBackups(): Promise<void> {
    try {
      const exists = await RNFS.exists(CHECKPOINT_DIR);
      if (!exists) return;

      const files = await RNFS.readDir(CHECKPOINT_DIR);
      const backupFiles = files
        .filter(file => file.name.startsWith('backup_') && file.name.endsWith('.json'))
        .sort((a, b) => (b.mtime?.getTime() || 0) - (a.mtime?.getTime() || 0));

      // Keep only the 3 most recent backups
      const filesToDelete = backupFiles.slice(3);
      for (const file of filesToDelete) {
        try {
          await RNFS.unlink(file.path);
        } catch (error) {
          console.warn(`[HistoryManager] Failed to delete backup ${file.name}:`, error);
        }
      }
    } catch (error) {
      console.error('[HistoryManager] Cleanup failed:', error);
    }
  }

  /** Get recovery statistics */
  getRecoveryStats(): {
    totalCommands: number;
    currentPointer: number;
    checkpointCount: number;
    lastCheckpointTime: number | null;
  } {
    return {
      totalCommands: this.commands.length,
      currentPointer: this.pointer,
      checkpointCount: this.checkpoints.length,
      lastCheckpointTime: this.checkpoints.length > 0 
        ? this.checkpoints[this.checkpoints.length - 1].timestamp 
        : null
    };
  }

  // ─── Private Helpers ───────────────────────────

  private scheduleCheckpoint(): void {
    // This will be called by the store middleware with debouncing
    if (this.commandCounterSinceCheckpoint >= CHECKPOINT_INTERVAL) {
      this.commandCounterSinceCheckpoint = 0;
    }
  }

  /** Force immediate checkpoint (useful for critical operations) */
  async forceCheckpoint(project: Project): Promise<void> {
    await this.persistCheckpoint(project);
  }

  /** Check if recovery is in progress */
  get isRecoveringInProgress(): boolean {
    return this.isRecovering;
  }
}
