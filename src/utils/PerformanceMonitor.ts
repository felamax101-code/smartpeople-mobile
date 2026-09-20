import { Platform, NativeModules, DeviceEventEmitter } from 'react-native';

export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  cpuUsage: number;
  thermalState: 'normal' | 'fair' | 'serious' | 'critical';
  batteryLevel: number;
  batteryState: 'unplugged' | 'charging' | 'full';
  networkType: 'wifi' | 'cellular' | 'none' | 'unknown';
  storageSpace: {
    total: number;
    free: number;
    used: number;
  };
  timestamp: number;
}

export interface PerformanceAlert {
  type: 'memory' | 'thermal' | 'battery' | 'storage' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metrics: Partial<PerformanceMetrics>;
  timestamp: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private currentMetrics: PerformanceMetrics | null = null;
  private alertCallbacks: ((alert: PerformanceAlert) => void)[] = [];
  private metricsHistory: PerformanceMetrics[] = [];
  private maxHistorySize = 100;

  // Performance thresholds
  private readonly THRESHOLDS = {
    FPS_WARNING: 45,
    FPS_CRITICAL: 30,
    MEMORY_WARNING: 0.7, // 70% of available memory
    MEMORY_CRITICAL: 0.85, // 85% of available memory
    CPU_WARNING: 0.8, // 80% CPU usage
    CPU_CRITICAL: 0.9, // 90% CPU usage
    BATTERY_WARNING: 0.2, // 20% battery
    BATTERY_CRITICAL: 0.1, // 10% battery
    STORAGE_WARNING: 0.9, // 90% storage used
    STORAGE_CRITICAL: 0.95, // 95% storage used
  };

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private constructor() {
    this.setupEventListeners();
  }

  // Start performance monitoring
  startMonitoring(intervalMs: number = 1000): void {
    if (this.isMonitoring) {
      console.warn('[PerformanceMonitor] Monitoring already started');
      return;
    }

    this.isMonitoring = true;
    console.log('[PerformanceMonitor] Starting performance monitoring');

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    // Initial metrics collection
    this.collectMetrics();
  }

  // Stop performance monitoring
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      console.warn('[PerformanceMonitor] Monitoring not started');
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('[PerformanceMonitor] Stopped performance monitoring');
  }

  // Collect performance metrics
  private async collectMetrics(): Promise<void> {
    try {
      const metrics: PerformanceMetrics = {
        fps: await this.getFPS(),
        memoryUsage: await this.getMemoryUsage(),
        cpuUsage: await this.getCPUUsage(),
        thermalState: await this.getThermalState(),
        batteryLevel: await this.getBatteryLevel(),
        batteryState: await this.getBatteryState(),
        networkType: await this.getNetworkType(),
        storageSpace: await this.getStorageSpace(),
        timestamp: Date.now(),
      };

      this.currentMetrics = metrics;
      this.addToHistory(metrics);
      this.checkThresholds(metrics);
      
      // Emit metrics for listeners
      DeviceEventEmitter.emit('performanceMetrics', metrics);
      
    } catch (error) {
      console.error('[PerformanceMonitor] Error collecting metrics:', error);
    }
  }

  // Get current FPS
  private async getFPS(): Promise<number> {
    // This would typically use a native module to get actual FPS
    // For now, we'll return a placeholder
    return 60; // Placeholder - would measure actual FPS
  }

  // Get memory usage
  private async getMemoryUsage(): Promise<number> {
    if (Platform.OS === 'ios') {
      // iOS memory usage
      try {
        const { RNPerformance } = NativeModules;
        if (RNPerformance) {
          return await RNPerformance.getMemoryUsage();
        }
      } catch (error) {
        console.warn('[PerformanceMonitor] iOS memory module not available');
      }
    } else if (Platform.OS === 'android') {
      // Android memory usage
      try {
        const { RNPerformance } = NativeModules;
        if (RNPerformance) {
          return await RNPerformance.getMemoryUsage();
        }
      } catch (error) {
        console.warn('[PerformanceMonitor] Android memory module not available');
      }
    }

    // Fallback: estimate memory usage
    return 0.5; // 50% memory usage as fallback
  }

  // Get CPU usage
  private async getCPUUsage(): Promise<number> {
    try {
      const { RNPerformance } = NativeModules;
      if (RNPerformance) {
        return await RNPerformance.getCPUUsage();
      }
    } catch (error) {
      console.warn('[PerformanceMonitor] CPU module not available');
    }

    return 0.3; // 30% CPU usage as fallback
  }

  // Get thermal state
  private async getThermalState(): Promise<'normal' | 'fair' | 'serious' | 'critical'> {
    if (Platform.OS === 'ios') {
      try {
        const { RNPerformance } = NativeModules;
        if (RNPerformance) {
          const state = await RNPerformance.getThermalState();
          return state || 'normal';
        }
      } catch (error) {
        console.warn('[PerformanceMonitor] iOS thermal module not available');
      }
    } else if (Platform.OS === 'android') {
      try {
        const { RNPerformance } = NativeModules;
        if (RNPerformance) {
          const state = await RNPerformance.getThermalState();
          return state || 'normal';
        }
      } catch (error) {
        console.warn('[PerformanceMonitor] Android thermal module not available');
      }
    }

    return 'normal';
  }

  // Get battery level
  private async getBatteryLevel(): Promise<number> {
    try {
      const { RNPerformance } = NativeModules;
      if (RNPerformance) {
        return await RNPerformance.getBatteryLevel();
      }
    } catch (error) {
      console.warn('[PerformanceMonitor] Battery module not available');
    }

    return 1.0; // 100% battery as fallback
  }

  // Get battery state
  private async getBatteryState(): Promise<'unplugged' | 'charging' | 'full'> {
    try {
      const { RNPerformance } = NativeModules;
      if (RNPerformance) {
        return await RNPerformance.getBatteryState();
      }
    } catch (error) {
      console.warn('[PerformanceMonitor] Battery state module not available');
    }

    return 'unplugged';
  }

  // Get network type
  private async getNetworkType(): Promise<'wifi' | 'cellular' | 'none' | 'unknown'> {
    try {
      const { RNPerformance } = NativeModules;
      if (RNPerformance) {
        return await RNPerformance.getNetworkType();
      }
    } catch (error) {
      console.warn('[PerformanceMonitor] Network module not available');
    }

    return 'unknown';
  }

  // Get storage space
  private async getStorageSpace(): Promise<{ total: number; free: number; used: number }> {
    try {
      const { RNPerformance } = NativeModules;
      if (RNPerformance) {
        return await RNPerformance.getStorageSpace();
      }
    } catch (error) {
      console.warn('[PerformanceMonitor] Storage module not available');
    }

    // Fallback values (in MB)
    return {
      total: 1024 * 1024, // 1TB
      free: 512 * 1024,   // 512GB
      used: 512 * 1024,   // 512GB
    };
  }

  // Check thresholds and generate alerts
  private checkThresholds(metrics: PerformanceMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // FPS checks
    if (metrics.fps < this.THRESHOLDS.FPS_CRITICAL) {
      alerts.push({
        type: 'performance',
        severity: 'critical',
        message: `Critical FPS drop: ${metrics.fps.toFixed(1)} fps`,
        metrics: { fps: metrics.fps },
        timestamp: Date.now(),
      });
    } else if (metrics.fps < this.THRESHOLDS.FPS_WARNING) {
      alerts.push({
        type: 'performance',
        severity: 'medium',
        message: `Low FPS: ${metrics.fps.toFixed(1)} fps`,
        metrics: { fps: metrics.fps },
        timestamp: Date.now(),
      });
    }

    // Memory checks
    if (metrics.memoryUsage > this.THRESHOLDS.MEMORY_CRITICAL) {
      alerts.push({
        type: 'memory',
        severity: 'critical',
        message: `Critical memory usage: ${(metrics.memoryUsage * 100).toFixed(1)}%`,
        metrics: { memoryUsage: metrics.memoryUsage },
        timestamp: Date.now(),
      });
    } else if (metrics.memoryUsage > this.THRESHOLDS.MEMORY_WARNING) {
      alerts.push({
        type: 'memory',
        severity: 'medium',
        message: `High memory usage: ${(metrics.memoryUsage * 100).toFixed(1)}%`,
        metrics: { memoryUsage: metrics.memoryUsage },
        timestamp: Date.now(),
      });
    }

    // Thermal checks
    if (metrics.thermalState === 'critical') {
      alerts.push({
        type: 'thermal',
        severity: 'critical',
        message: 'Critical thermal state detected',
        metrics: { thermalState: metrics.thermalState },
        timestamp: Date.now(),
      });
    } else if (metrics.thermalState === 'serious') {
      alerts.push({
        type: 'thermal',
        severity: 'high',
        message: 'Serious thermal state detected',
        metrics: { thermalState: metrics.thermalState },
        timestamp: Date.now(),
      });
    }

    // Battery checks
    if (metrics.batteryLevel < this.THRESHOLDS.BATTERY_CRITICAL && metrics.batteryState === 'unplugged') {
      alerts.push({
        type: 'battery',
        severity: 'critical',
        message: `Critical battery level: ${(metrics.batteryLevel * 100).toFixed(1)}%`,
        metrics: { batteryLevel: metrics.batteryLevel, batteryState: metrics.batteryState },
        timestamp: Date.now(),
      });
    } else if (metrics.batteryLevel < this.THRESHOLDS.BATTERY_WARNING && metrics.batteryState === 'unplugged') {
      alerts.push({
        type: 'battery',
        severity: 'medium',
        message: `Low battery level: ${(metrics.batteryLevel * 100).toFixed(1)}%`,
        metrics: { batteryLevel: metrics.batteryLevel, batteryState: metrics.batteryState },
        timestamp: Date.now(),
      });
    }

    // Storage checks
    const storageUsageRatio = metrics.storageSpace.used / metrics.storageSpace.total;
    if (storageUsageRatio > this.THRESHOLDS.STORAGE_CRITICAL) {
      alerts.push({
        type: 'storage',
        severity: 'critical',
        message: `Critical storage usage: ${(storageUsageRatio * 100).toFixed(1)}%`,
        metrics: { storageSpace: metrics.storageSpace },
        timestamp: Date.now(),
      });
    } else if (storageUsageRatio > this.THRESHOLDS.STORAGE_WARNING) {
      alerts.push({
        type: 'storage',
        severity: 'medium',
        message: `High storage usage: ${(storageUsageRatio * 100).toFixed(1)}%`,
        metrics: { storageSpace: metrics.storageSpace },
        timestamp: Date.now(),
      });
    }

    // Send alerts to callbacks
    alerts.forEach(alert => {
      this.alertCallbacks.forEach(callback => callback(alert));
      DeviceEventEmitter.emit('performanceAlert', alert);
    });
  }

  // Add metrics to history
  private addToHistory(metrics: PerformanceMetrics): void {
    this.metricsHistory.push(metrics);
    
    // Keep history size limited
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }
  }

  // Setup event listeners
  private setupEventListeners(): void {
    // Listen for memory warnings
    if (Platform.OS === 'ios') {
      // iOS memory warning listener
      // This would typically use a native module
    } else if (Platform.OS === 'android') {
      // Android memory warning listener
      // This would typically use a native module
    }
  }

  // Public API methods

  // Get current metrics
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.currentMetrics;
  }

  // Get metrics history
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metricsHistory];
  }

  // Add alert callback
  addAlertCallback(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  // Remove alert callback
  removeAlertCallback(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks = this.alertCallbacks.filter(cb => cb !== callback);
  }

  // Get performance summary
  getPerformanceSummary(): {
    averageFPS: number;
    averageMemoryUsage: number;
    peakMemoryUsage: number;
    thermalEvents: number;
    batteryDrainRate: number;
    uptime: number;
  } {
    if (this.metricsHistory.length === 0) {
      return {
        averageFPS: 0,
        averageMemoryUsage: 0,
        peakMemoryUsage: 0,
        thermalEvents: 0,
        batteryDrainRate: 0,
        uptime: 0,
      };
    }

    const fpsValues = this.metricsHistory.map(m => m.fps);
    const memoryValues = this.metricsHistory.map(m => m.memoryUsage);
    const thermalEvents = this.metricsHistory.filter(m => m.thermalState !== 'normal').length;
    
    const firstMetrics = this.metricsHistory[0];
    const lastMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    const batteryDrainRate = firstMetrics.batteryLevel - lastMetrics.batteryLevel;
    const uptime = (lastMetrics.timestamp - firstMetrics.timestamp) / 1000; // seconds

    return {
      averageFPS: fpsValues.reduce((sum, fps) => sum + fps, 0) / fpsValues.length,
      averageMemoryUsage: memoryValues.reduce((sum, mem) => sum + mem, 0) / memoryValues.length,
      peakMemoryUsage: Math.max(...memoryValues),
      thermalEvents,
      batteryDrainRate: batteryDrainRate / (uptime / 3600), // per hour
      uptime,
    };
  }

  // Export metrics for analytics
  exportMetrics(): string {
    const summary = this.getPerformanceSummary();
    const exportData = {
      timestamp: Date.now(),
      summary,
      currentMetrics: this.currentMetrics,
      history: this.metricsHistory.slice(-10), // Last 10 data points
    };

    return JSON.stringify(exportData, null, 2);
  }
}

// Singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();
