import { Platform, NativeModules, DeviceEventEmitter } from 'react-native';
import { performanceMonitor, PerformanceAlert } from './PerformanceMonitor';

export interface MemoryPressureConfig {
  warningThreshold: number; // 0.0 - 1.0
  criticalThreshold: number; // 0.0 - 1.0
  maxMemoryUsage: number; // MB
  enableAutoCleanup: boolean;
  cleanupInterval: number; // ms
}

export interface MemoryPressureAction {
  type: 'cleanup' | 'reduce_quality' | 'pause_processing' | 'emergency_cleanup';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  executed: boolean;
  timestamp: number;
}

export class MemoryPressureHandler {
  private static instance: MemoryPressureHandler;
  private isActive = false;
  private config: MemoryPressureConfig;
  private cleanupInterval: any | null = null;
  private pressureHistory: number[] = [];
  private maxHistorySize = 100;
  private actionHistory: MemoryPressureAction[] = [];
  private alertCallbacks: ((alert: PerformanceAlert) => void)[] = [];

  private constructor(config: Partial<MemoryPressureConfig> = {}) {
    this.config = {
      warningThreshold: 0.7,
      criticalThreshold: 0.85,
      maxMemoryUsage: 512, // 512MB
      enableAutoCleanup: true,
      cleanupInterval: 5000, // 5 seconds
      ...config,
    };

    this.setupEventListeners();
  }

  static getInstance(config?: Partial<MemoryPressureConfig>): MemoryPressureHandler {
    if (!MemoryPressureHandler.instance) {
      MemoryPressureHandler.instance = new MemoryPressureHandler(config);
    }
    return MemoryPressureHandler.instance;
  }

  // Start memory pressure monitoring
  startMonitoring(): void {
    if (this.isActive) {
      console.warn('[MemoryPressureHandler] Already monitoring');
      return;
    }

    this.isActive = true;
    console.log('[MemoryPressureHandler] Starting memory pressure monitoring');

    // Add performance monitor callback
    performanceMonitor.addAlertCallback(this.handlePerformanceAlert.bind(this));

    // Start periodic cleanup if enabled
    if (this.config.enableAutoCleanup) {
      this.cleanupInterval = setInterval(() => {
        this.performPeriodicCleanup();
      }, this.config.cleanupInterval);
    }

    // Setup native memory pressure listeners
    this.setupNativeMemoryListeners();
  }

  // Stop memory pressure monitoring
  stopMonitoring(): void {
    if (!this.isActive) {
      console.warn('[MemoryPressureHandler] Not currently monitoring');
      return;
    }

    this.isActive = false;

    // Remove performance monitor callback
    performanceMonitor.removeAlertCallback(this.handlePerformanceAlert.bind(this));

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    console.log('[MemoryPressureHandler] Stopped memory pressure monitoring');
  }

  // Handle performance alerts
  private handlePerformanceAlert(alert: PerformanceAlert): void {
    if (alert.type === 'memory') {
      this.handleMemoryPressure(alert);
    }
  }

  // Handle memory pressure
  private handleMemoryPressure(alert: PerformanceAlert): void {
    const memoryUsage = alert.metrics.memoryUsage || 0;
    
    // Add to pressure history
    this.pressureHistory.push(memoryUsage);
    if (this.pressureHistory.length > this.maxHistorySize) {
      this.pressureHistory.shift();
    }

    // Determine action based on severity
    if (alert.severity === 'critical') {
      this.executeEmergencyCleanup();
    } else if (alert.severity === 'high') {
      this.executeHighPressureActions();
    } else if (alert.severity === 'medium') {
      this.executeMediumPressureActions();
    } else if (alert.severity === 'low') {
      this.executeLowPressureActions();
    }
  }

  // Execute low pressure actions
  private executeLowPressureActions(): void {
    const action: MemoryPressureAction = {
      type: 'cleanup',
      description: 'Light memory cleanup - clear caches and unused resources',
      severity: 'low',
      executed: true,
      timestamp: Date.now(),
    };

    this.executeAction(action);
  }

  // Execute medium pressure actions
  private executeMediumPressureActions(): void {
    const action: MemoryPressureAction = {
      type: 'reduce_quality',
      description: 'Reduce rendering quality and clear large caches',
      severity: 'medium',
      executed: true,
      timestamp: Date.now(),
    };

    this.executeAction(action);
  }

  // Execute high pressure actions
  private executeHighPressureActions(): void {
    const action: MemoryPressureAction = {
      type: 'pause_processing',
      description: 'Pause background processing and aggressive cleanup',
      severity: 'high',
      executed: true,
      timestamp: Date.now(),
    };

    this.executeAction(action);
  }

  // Execute emergency cleanup
  private executeEmergencyCleanup(): void {
    const action: MemoryPressureAction = {
      type: 'emergency_cleanup',
      description: 'Emergency cleanup - release all non-critical resources',
      severity: 'critical',
      executed: true,
      timestamp: Date.now(),
    };

    this.executeAction(action);
  }

  // Execute memory pressure action
  private executeAction(action: MemoryPressureAction): void {
    console.log(`[MemoryPressureHandler] Executing ${action.type}: ${action.description}`);
    
    this.actionHistory.push(action);

    switch (action.type) {
      case 'cleanup':
        this.performLightCleanup();
        break;
      case 'reduce_quality':
        this.reduceQuality();
        break;
      case 'pause_processing':
        this.pauseBackgroundProcessing();
        break;
      case 'emergency_cleanup':
        this.performEmergencyCleanup();
        break;
    }

    // Notify callbacks
    this.alertCallbacks.forEach(callback => {
      callback({
        type: 'memory',
        severity: action.severity,
        message: action.description,
        metrics: {},
        timestamp: action.timestamp,
      });
    });
  }

  // Perform light cleanup
  private performLightCleanup(): void {
    // Clear thumbnail cache
    this.clearThumbnailCache();
    
    // Clear waveform cache
    this.clearWaveformCache();
    
    // Release unused video instances
    this.releaseUnusedVideoInstances();
    
    // Clear temporary files
    this.clearTemporaryFiles();
    
    // Emit cleanup event
    DeviceEventEmitter.emit('memoryCleanup', { type: 'light' });
  }

  // Reduce quality
  private reduceQuality(): void {
    // Reduce Skia canvas resolution
    this.reduceCanvasResolution();
    
    // Lower export quality settings
    this.lowerExportQuality();
    
    // Reduce preview frame rate
    this.reducePreviewFrameRate();
    
    // Disable non-essential animations
    this.disableNonEssentialAnimations();
    
    // Emit quality reduction event
    DeviceEventEmitter.emit('memoryQualityReduction', {});
  }

  // Pause background processing
  private pauseBackgroundProcessing(): void {
    // Pause thumbnail generation
    this.pauseThumbnailGeneration();
    
    // Pause waveform processing
    this.pauseWaveformProcessing();
    
    // Pause export queue
    this.pauseExportQueue();
    
    // Emit pause event
    DeviceEventEmitter.emit('memoryProcessingPaused', {});
  }

  // Perform emergency cleanup
  private performEmergencyCleanup(): void {
    // Clear all caches
    this.clearAllCaches();
    
    // Release all video instances
    this.releaseAllVideoInstances();
    
    // Reset quality to minimum
    this.resetToMinimumQuality();
    
    // Clear all temporary files
    this.clearAllTemporaryFiles();
    
    // Force garbage collection if available
    this.forceGarbageCollection();
    
    // Emit emergency cleanup event
    DeviceEventEmitter.emit('memoryEmergencyCleanup', {});
  }

  // Perform periodic cleanup
  private performPeriodicCleanup(): void {
    const metrics = performanceMonitor.getCurrentMetrics();
    if (metrics && metrics.memoryUsage > this.config.warningThreshold) {
      this.performLightCleanup();
    }
  }

  // Cleanup methods
  private clearThumbnailCache(): void {
    // Emit event to clear thumbnail cache
    DeviceEventEmitter.emit('clearThumbnailCache', {});
  }

  private clearWaveformCache(): void {
    // Emit event to clear waveform cache
    DeviceEventEmitter.emit('clearWaveformCache', {});
  }

  private releaseUnusedVideoInstances(): void {
    // Emit event to release unused video instances
    DeviceEventEmitter.emit('releaseUnusedVideoInstances', {});
  }

  private clearTemporaryFiles(): void {
    // Emit event to clear temporary files
    DeviceEventEmitter.emit('clearTemporaryFiles', {});
  }

  private reduceCanvasResolution(): void {
    // Emit event to reduce canvas resolution
    DeviceEventEmitter.emit('reduceCanvasResolution', { scale: 0.5 });
  }

  private lowerExportQuality(): void {
    // Emit event to lower export quality
    DeviceEventEmitter.emit('lowerExportQuality', { quality: 'low' });
  }

  private reducePreviewFrameRate(): void {
    // Emit event to reduce preview frame rate
    DeviceEventEmitter.emit('reducePreviewFrameRate', { fps: 30 });
  }

  private disableNonEssentialAnimations(): void {
    // Emit event to disable animations
    DeviceEventEmitter.emit('disableAnimations', {});
  }

  private pauseThumbnailGeneration(): void {
    // Emit event to pause thumbnail generation
    DeviceEventEmitter.emit('pauseThumbnailGeneration', {});
  }

  private pauseWaveformProcessing(): void {
    // Emit event to pause waveform processing
    DeviceEventEmitter.emit('pauseWaveformProcessing', {});
  }

  private pauseExportQueue(): void {
    // Emit event to pause export queue
    DeviceEventEmitter.emit('pauseExportQueue', {});
  }

  private clearAllCaches(): void {
    // Emit event to clear all caches
    DeviceEventEmitter.emit('clearAllCaches', {});
  }

  private releaseAllVideoInstances(): void {
    // Emit event to release all video instances
    DeviceEventEmitter.emit('releaseAllVideoInstances', {});
  }

  private resetToMinimumQuality(): void {
    // Emit event to reset to minimum quality
    DeviceEventEmitter.emit('resetToMinimumQuality', {});
  }

  private clearAllTemporaryFiles(): void {
    // Emit event to clear all temporary files
    DeviceEventEmitter.emit('clearAllTemporaryFiles', {});
  }

  private forceGarbageCollection(): void {
    // Force garbage collection if available
    if (Platform.OS === 'android') {
      try {
        const { RNMemory } = NativeModules;
        if (RNMemory && RNMemory.forceGarbageCollection) {
          RNMemory.forceGarbageCollection();
        }
      } catch (error) {
        console.warn('[MemoryPressureHandler] Garbage collection not available');
      }
    }
  }

  // Setup native memory listeners
  private setupNativeMemoryListeners(): void {
    if (Platform.OS === 'ios') {
      // iOS memory pressure listener
      DeviceEventEmitter.addListener('memoryWarning', () => {
        this.handleMemoryWarning();
      });
    } else if (Platform.OS === 'android') {
      // Android memory pressure listener
      DeviceEventEmitter.addListener('memoryTrim', (level: string) => {
        this.handleMemoryTrim(level);
      });
    }
  }

  // Setup event listeners
  private setupEventListeners(): void {
    // Listen for app background/foreground
    DeviceEventEmitter.addListener('appStateChange', (state: string) => {
      if (state === 'background') {
        this.performLightCleanup();
      }
    });
  }

  // Handle iOS memory warning
  private handleMemoryWarning(): void {
    console.log('[MemoryPressureHandler] iOS memory warning received');
    this.executeMediumPressureActions();
  }

  // Handle Android memory trim
  private handleMemoryTrim(level: string): void {
    console.log(`[MemoryPressureHandler] Android memory trim: ${level}`);
    
    switch (level) {
      case 'RUNNING_MODERATE':
        this.executeLowPressureActions();
        break;
      case 'RUNNING_LOW':
      case 'RUNNING_CRITICAL':
        this.executeHighPressureActions();
        break;
      case 'UI_HIDDEN':
        this.performLightCleanup();
        break;
    }
  }

  // Public API methods

  // Get current memory pressure
  getCurrentMemoryPressure(): {
    level: 'normal' | 'warning' | 'critical' | 'emergency';
    usage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    const metrics = performanceMonitor.getCurrentMetrics();
    if (!metrics) {
      return { level: 'normal', usage: 0, trend: 'stable' };
    }

    const usage = metrics.memoryUsage;
    let level: 'normal' | 'warning' | 'critical' | 'emergency';
    
    if (usage >= this.config.criticalThreshold) {
      level = 'emergency';
    } else if (usage >= this.config.criticalThreshold * 0.9) {
      level = 'critical';
    } else if (usage >= this.config.warningThreshold) {
      level = 'warning';
    } else {
      level = 'normal';
    }

    // Calculate trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (this.pressureHistory.length >= 3) {
      const recent = this.pressureHistory.slice(-3);
      if (recent[2] > recent[1] && recent[1] > recent[0]) {
        trend = 'increasing';
      } else if (recent[2] < recent[1] && recent[1] < recent[0]) {
        trend = 'decreasing';
      }
    }

    return { level, usage, trend };
  }

  // Get action history
  getActionHistory(): MemoryPressureAction[] {
    return [...this.actionHistory];
  }

  // Add alert callback
  addAlertCallback(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  // Remove alert callback
  removeAlertCallback(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks = this.alertCallbacks.filter(cb => cb !== callback);
  }

  // Update configuration
  updateConfig(newConfig: Partial<MemoryPressureConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart monitoring if active
    if (this.isActive) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  // Get memory statistics
  getMemoryStatistics(): {
    currentUsage: number;
    peakUsage: number;
    averageUsage: number;
    actionsExecuted: number;
    lastAction: MemoryPressureAction | null;
    pressureTrend: 'increasing' | 'decreasing' | 'stable';
  } {
    const currentPressure = this.getCurrentMemoryPressure();
    const peakUsage = Math.max(...this.pressureHistory, 0);
    const averageUsage = this.pressureHistory.length > 0 
      ? this.pressureHistory.reduce((sum, usage) => sum + usage, 0) / this.pressureHistory.length 
      : 0;
    const actionsExecuted = this.actionHistory.length;
    const lastAction = this.actionHistory.length > 0 ? this.actionHistory[this.actionHistory.length - 1] : null;

    return {
      currentUsage: currentPressure.usage,
      peakUsage,
      averageUsage,
      actionsExecuted,
      lastAction,
      pressureTrend: currentPressure.trend,
    };
  }

  // Export memory pressure data
  exportData(): string {
    const stats = this.getMemoryStatistics();
    const exportData = {
      timestamp: Date.now(),
      config: this.config,
      currentPressure: this.getCurrentMemoryPressure(),
      statistics: stats,
      actionHistory: this.actionHistory.slice(-10), // Last 10 actions
      pressureHistory: this.pressureHistory.slice(-20), // Last 20 readings
    };

    return JSON.stringify(exportData, null, 2);
  }
}

// Singleton instance
export const memoryPressureHandler = MemoryPressureHandler.getInstance();
