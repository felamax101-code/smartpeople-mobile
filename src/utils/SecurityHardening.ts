import { Platform, NativeModules, Alert } from 'react-native';
import CryptoJS from 'crypto-js';

export interface SecurityConfig {
  enableInputValidation: boolean;
  enableFileValidation: boolean;
  enableNetworkSecurity: boolean;
  enableDataEncryption: boolean;
  enableAuditLogging: boolean;
  maxFileSize: number; // MB
  allowedFileTypes: string[];
  encryptionKey: string;
}

export interface SecurityAuditLog {
  timestamp: number;
  event: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: any;
  userId?: string;
  sessionId: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: any;
}

export class SecurityHardening {
  private static instance: SecurityHardening;
  private config: SecurityConfig;
  private auditLogs: SecurityAuditLog[] = [];
  private maxLogSize = 1000;
  private sessionId: string;
  private encryptionKey: string;

  private constructor(config: Partial<SecurityConfig> = {}) {
    this.sessionId = this.generateSessionId();
    this.encryptionKey = config.encryptionKey || this.generateEncryptionKey();
    
    this.config = {
      enableInputValidation: true,
      enableFileValidation: true,
      enableNetworkSecurity: true,
      enableDataEncryption: true,
      enableAuditLogging: true,
      maxFileSize: 100, // 100MB
      allowedFileTypes: ['mp4', 'mov', 'avi', 'mkv', 'jpg', 'jpeg', 'png'],
      encryptionKey: this.encryptionKey,
      ...config,
    };

    this.logEvent('security_system_initialized', 'low', {
      config: this.config,
      sessionId: this.sessionId,
    });
  }

  static getInstance(config?: Partial<SecurityConfig>): SecurityHardening {
    if (!SecurityHardening.instance) {
      SecurityHardening.instance = new SecurityHardening(config);
    }
    return SecurityHardening.instance;
  }

  // Input validation
  validateInput(input: string, type: 'text' | 'filename' | 'url' | 'projectName'): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!this.config.enableInputValidation) {
      return result;
    }

    try {
      // Basic validation
      if (!input || typeof input !== 'string') {
        result.isValid = false;
        result.errors.push('Input must be a non-empty string');
        return result;
      }

      // Length validation
      const maxLengths = {
        text: 10000,
        filename: 255,
        url: 2048,
        projectName: 100,
      };

      if (input.length > maxLengths[type]) {
        result.isValid = false;
        result.errors.push(`Input exceeds maximum length of ${maxLengths[type]} characters`);
      }

      // Type-specific validation
      switch (type) {
        case 'text':
          this.validateText(input, result);
          break;
        case 'filename':
          this.validateFilename(input, result);
          break;
        case 'url':
          this.validateURL(input, result);
          break;
        case 'projectName':
          this.validateProjectName(input, result);
          break;
      }

      // Sanitize input
      if (result.isValid) {
        result.sanitizedData = this.sanitizeInput(input, type);
      }

      this.logEvent('input_validation', 'low', {
        type,
        inputLength: input.length,
        isValid: result.isValid,
        errors: result.errors.length,
      });

    } catch (error) {
      result.isValid = false;
      result.errors.push('Validation error occurred');
      
      this.logEvent('input_validation_error', 'high', {
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  // Validate text input
  private validateText(input: string, result: ValidationResult): void {
    // Check for dangerous patterns
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /data:text\/html/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(input)) {
        result.isValid = false;
        result.errors.push('Input contains potentially dangerous content');
        break;
      }
    }

    // Check for SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/gi,
      /(\b(UNION|OR|AND)\b.*\b(=|LIKE)\b)/gi,
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        result.warnings.push('Input contains SQL-like patterns');
        break;
      }
    }
  }

  // Validate filename
  private validateFilename(input: string, result: ValidationResult): void {
    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(input)) {
      result.isValid = false;
      result.errors.push('Filename contains invalid characters');
    }

    // Check for reserved names (Windows)
    const reservedNames = [
      'CON', 'PRN', 'AUX', 'NUL',
      'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
      'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
    ];

    const nameWithoutExt = input.split('.')[0].toUpperCase();
    if (reservedNames.includes(nameWithoutExt)) {
      result.isValid = false;
      result.errors.push('Filename is a reserved name');
    }

    // Check file extension
    const extension = input.split('.').pop()?.toLowerCase();
    if (extension && !this.config.allowedFileTypes.includes(extension)) {
      result.isValid = false;
      result.errors.push(`File type .${extension} is not allowed`);
    }
  }

  // Validate URL
  private validateURL(input: string, result: ValidationResult): void {
    try {
      const url = new URL(input);
      
      // Only allow HTTP/HTTPS
      if (!['http:', 'https:'].includes(url.protocol)) {
        result.isValid = false;
        result.errors.push('Only HTTP and HTTPS URLs are allowed');
      }

      // Check for localhost in production
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        result.warnings.push('Localhost URL detected');
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push('Invalid URL format');
    }
  }

  // Validate project name
  private validateProjectName(input: string, result: ValidationResult): void {
    // Check for empty or whitespace-only names
    if (!input.trim()) {
      result.isValid = false;
      result.errors.push('Project name cannot be empty');
    }

    // Check for special characters
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(input)) {
      result.warnings.push('Project name contains special characters');
    }
  }

  // Sanitize input
  private sanitizeInput(input: string, type: string): string {
    let sanitized = input;

    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // Remove dangerous protocols
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/vbscript:/gi, '');
    sanitized = sanitized.replace(/data:text\/html/gi, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    // Type-specific sanitization
    switch (type) {
      case 'filename':
        sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
        break;
      case 'projectName':
        sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1f]/g, '');
        break;
    }

    return sanitized;
  }

  // File validation
  validateFile(file: { uri: string; name: string; size: number }): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!this.config.enableFileValidation) {
      return result;
    }

    try {
      // Validate filename
      const filenameResult = this.validateInput(file.name, 'filename');
      if (!filenameResult.isValid) {
        result.isValid = false;
        result.errors.push(...filenameResult.errors);
      }

      // Validate file size
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > this.config.maxFileSize) {
        result.isValid = false;
        result.errors.push(`File size ${sizeMB.toFixed(2)}MB exceeds maximum of ${this.config.maxFileSize}MB`);
      }

      // Additional file-specific checks
      if (file.name.toLowerCase().endsWith('.mp4')) {
        this.validateVideoFile(file, result);
      }

      this.logEvent('file_validation', 'low', {
        filename: file.name,
        size: file.size,
        isValid: result.isValid,
        errors: result.errors.length,
      });

    } catch (error) {
      result.isValid = false;
      result.errors.push('File validation error occurred');
      
      this.logEvent('file_validation_error', 'high', {
        filename: file.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  // Validate video file
  private validateVideoFile(file: { uri: string; name: string; size: number }, result: ValidationResult): void {
    // Check minimum video file size (avoid empty files)
    const minSize = 1024; // 1KB
    if (file.size < minSize) {
      result.warnings.push('Video file appears to be very small');
    }

    // Check for suspicious file extensions
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (suspiciousExtensions.includes(`.${extension}`)) {
      result.isValid = false;
      result.errors.push('File extension is not allowed for video files');
    }
  }

  // Data encryption
  encryptData(data: string): string {
    if (!this.config.enableDataEncryption) {
      return data;
    }

    try {
      const encrypted = CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
      
      this.logEvent('data_encryption', 'low', {
        dataLength: data.length,
        encrypted: true,
      });

      return encrypted;
    } catch (error) {
      this.logEvent('encryption_error', 'high', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw new Error('Encryption failed');
    }
  }

  // Data decryption
  decryptData(encryptedData: string): string {
    if (!this.config.enableDataEncryption) {
      return encryptedData;
    }

    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey).toString(CryptoJS.enc.Utf8);
      
      this.logEvent('data_decryption', 'low', {
        dataLength: decrypted.length,
        decrypted: true,
      });

      return decrypted;
    } catch (error) {
      this.logEvent('decryption_error', 'high', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw new Error('Decryption failed');
    }
  }

  // Network security
  validateNetworkRequest(url: string, method: string = 'GET'): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!this.config.enableNetworkSecurity) {
      return result;
    }

    try {
      // Validate URL
      const urlResult = this.validateInput(url, 'url');
      if (!urlResult.isValid) {
        result.isValid = false;
        result.errors.push(...urlResult.errors);
      }

      // Check for sensitive operations
      const sensitiveMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
      if (sensitiveMethods.includes(method.toUpperCase())) {
        result.warnings.push('Sensitive network operation detected');
      }

      // Check for HTTPS
      if (!url.startsWith('https://')) {
        result.warnings.push('Unencrypted HTTP request detected');
      }

      this.logEvent('network_request_validation', 'medium', {
        url,
        method,
        isValid: result.isValid,
        isHttps: url.startsWith('https://'),
      });

    } catch (error) {
      result.isValid = false;
      result.errors.push('Network request validation failed');
      
      this.logEvent('network_validation_error', 'high', {
        url,
        method,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  // Audit logging
  private logEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', details: any): void {
    if (!this.config.enableAuditLogging) {
      return;
    }

    const logEntry: SecurityAuditLog = {
      timestamp: Date.now(),
      event,
      severity,
      details,
      sessionId: this.sessionId,
    };

    this.auditLogs.push(logEntry);

    // Keep log size limited
    if (this.auditLogs.length > this.maxLogSize) {
      this.auditLogs.shift();
    }

    // Log critical events immediately
    if (severity === 'critical') {
      console.error('[Security] CRITICAL:', logEntry);
    }
  }

  // Public API methods

  // Get audit logs
  getAuditLogs(severity?: 'low' | 'medium' | 'high' | 'critical'): SecurityAuditLog[] {
    if (severity) {
      return this.auditLogs.filter(log => log.severity === severity);
    }
    return [...this.auditLogs];
  }

  // Clear audit logs
  clearAuditLogs(): void {
    this.auditLogs = [];
    this.logEvent('audit_logs_cleared', 'medium', {
      previousLogCount: this.auditLogs.length,
    });
  }

  // Generate security report
  generateSecurityReport(): {
    timestamp: number;
    sessionId: string;
    config: SecurityConfig;
    statistics: {
      totalEvents: number;
      criticalEvents: number;
      highEvents: number;
      mediumEvents: number;
      lowEvents: number;
      recentActivity: SecurityAuditLog[];
    };
    recommendations: string[];
  } {
    const totalEvents = this.auditLogs.length;
    const criticalEvents = this.auditLogs.filter(log => log.severity === 'critical').length;
    const highEvents = this.auditLogs.filter(log => log.severity === 'high').length;
    const mediumEvents = this.auditLogs.filter(log => log.severity === 'medium').length;
    const lowEvents = this.auditLogs.filter(log => log.severity === 'low').length;
    
    const recentActivity = this.auditLogs.slice(-10);

    const recommendations = this.generateRecommendations();

    return {
      timestamp: Date.now(),
      sessionId: this.sessionId,
      config: this.config,
      statistics: {
        totalEvents,
        criticalEvents,
        highEvents,
        mediumEvents,
        lowEvents,
        recentActivity,
      },
      recommendations,
    };
  }

  // Generate security recommendations
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const report = this.generateSecurityReport();

    if (report.statistics.criticalEvents > 0) {
      recommendations.push('Review critical security events immediately');
    }

    if (report.statistics.highEvents > 10) {
      recommendations.push('High number of security events detected - review system configuration');
    }

    if (!this.config.enableDataEncryption) {
      recommendations.push('Enable data encryption for better security');
    }

    if (!this.config.enableInputValidation) {
      recommendations.push('Enable input validation to prevent injection attacks');
    }

    return recommendations;
  }

  // Utility methods
  private generateSessionId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  private generateEncryptionKey(): string {
    return CryptoJS.lib.WordArray.random(256/8).toString();
  }

  // Update configuration
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    this.logEvent('security_config_updated', 'medium', {
      oldConfig,
      newConfig: this.config,
    });
  }

  // Export security data
  exportSecurityData(): string {
    const report = this.generateSecurityReport();
    return JSON.stringify(report, null, 2);
  }
}

// Singleton instance
export const securityHardening = SecurityHardening.getInstance();
