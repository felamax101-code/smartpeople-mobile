import { useState, useEffect } from 'react';
import { Platform, Appearance } from 'react-native';

interface ReduceMotionSettings {
  reduceMotion: boolean;
  preferReducedTransparency: boolean;
  preferHighContrast: boolean;
  systemFontSize: number;
  systemBoldText: boolean;
}

export const useReduceMotion = () => {
  const [settings, setSettings] = useState<ReduceMotionSettings>({
    reduceMotion: false,
    preferReducedTransparency: false,
    preferHighContrast: false,
    systemFontSize: 16,
    systemBoldText: false,
  });

  useEffect(() => {
    // Detect system reduce motion preference
    const detectReduceMotion = () => {
      if (Platform.OS === 'ios') {
        // iOS: Check for reduce motion in accessibility settings
        // This would typically use a native module to check iOS settings
        // For now, we'll use a placeholder implementation
        return false; // Placeholder - would check iOS accessibility settings
      } else if (Platform.OS === 'android') {
        // Android: Check for reduce motion in accessibility settings
        // This would typically use a native module to check Android settings
        return false; // Placeholder - would check Android accessibility settings
      }
      return false;
    };

    // Detect other accessibility preferences
    const detectAccessibilityPreferences = () => {
      const colorScheme = Appearance.getColorScheme();
      const preferHighContrast = colorScheme === 'dark'; // Simplified detection
      
      return {
        reduceMotion: detectReduceMotion(),
        preferReducedTransparency: false, // Would detect from system settings
        preferHighContrast,
        systemFontSize: 16, // Would detect from system settings
        systemBoldText: false, // Would detect from system settings
      };
    };

    // Initial detection
    setSettings(detectAccessibilityPreferences());

    // Listen for appearance changes
    const subscription = Appearance.addChangeListener(() => {
      setSettings(detectAccessibilityPreferences());
    });

    return () => subscription?.remove();
  }, []);

  // Animation configuration based on reduce motion settings
  const getAnimationConfig = (defaultConfig: any) => {
    if (settings.reduceMotion) {
      return {
        ...defaultConfig,
        duration: 0, // No animation
        delay: 0,
        useNativeDriver: false, // Disable native animations
      };
    }
    
    return defaultConfig;
  };

  // Get easing function based on reduce motion settings
  const getEasingFunction = (defaultEasing: string) => {
    if (settings.reduceMotion) {
      return 'linear'; // Use linear easing for reduced motion
    }
    return defaultEasing;
  };

  // Get transition duration based on reduce motion settings
  const getTransitionDuration = (defaultDuration: number) => {
    if (settings.reduceMotion) {
      return 0; // No transition
    }
    return defaultDuration;
  };

  // Check if animations should be disabled
  const shouldDisableAnimations = () => {
    return settings.reduceMotion;
  };

  // Get accessible animation configuration
  const getAccessibleAnimation = ({
    duration = 300,
    delay = 0,
    easing = 'ease-in-out',
    useNativeDriver = true,
  }: {
    duration?: number;
    delay?: number;
    easing?: string;
    useNativeDriver?: boolean;
  } = {}) => {
    if (settings.reduceMotion) {
      return {
        duration: 0,
        delay: 0,
        easing: 'linear',
        useNativeDriver: false,
      };
    }
    
    return {
      duration,
      delay,
      easing,
      useNativeDriver,
    };
  };

  // Get accessible style properties
  const getAccessibleStyles = (defaultStyles: any) => {
    const accessibleStyles = { ...defaultStyles };
    
    if (settings.preferHighContrast) {
      // Increase contrast for better visibility
      accessibleStyles.opacity = Math.max(accessibleStyles.opacity || 1, 0.8);
      
      // Add border for better definition if needed
      if (accessibleStyles.backgroundColor && !accessibleStyles.borderColor) {
        accessibleStyles.borderColor = '#000000';
        accessibleStyles.borderWidth = 1;
      }
    }
    
    if (settings.systemBoldText) {
      // Use bold text if system prefers it
      accessibleStyles.fontWeight = 'bold';
    }
    
    return accessibleStyles;
  };

  // Get accessible color scheme
  const getColorScheme = () => {
    if (settings.preferHighContrast) {
      return {
        background: '#FFFFFF',
        text: '#000000',
        primary: '#000000',
        secondary: '#666666',
        border: '#000000',
        accent: '#0000FF',
        success: '#008000',
        warning: '#FF8C00',
        error: '#FF0000',
      };
    }
    
    // Default color scheme
    return {
      background: '#FFFFFF',
      text: '#000000',
      primary: '#007AFF',
      secondary: '#8E8E93',
      border: '#C6C6C8',
      accent: '#007AFF',
      success: '#34C759',
      warning: '#FF9500',
      error: '#FF3B30',
    };
  };

  // Check if component should use reduced motion
  const useReducedMotion = (componentType: 'animation' | 'transition' | 'gesture') => {
    return settings.reduceMotion;
  };

  // Get gesture configuration for reduced motion
  const getGestureConfig = (defaultConfig: any) => {
    if (settings.reduceMotion) {
      return {
        ...defaultConfig,
        activeOffsetX: undefined, // Disable gesture animations
        activeOffsetY: undefined,
        failOffsetX: undefined,
        failOffsetY: undefined,
      };
    }
    
    return defaultConfig;
  };

  return {
    // Current settings
    settings,
    reduceMotion: settings.reduceMotion,
    preferReducedTransparency: settings.preferReducedTransparency,
    preferHighContrast: settings.preferHighContrast,
    systemFontSize: settings.systemFontSize,
    systemBoldText: settings.systemBoldText,
    
    // Animation helpers
    getAnimationConfig,
    getEasingFunction,
    getTransitionDuration,
    shouldDisableAnimations,
    getAccessibleAnimation,
    
    // Style helpers
    getAccessibleStyles,
    getColorScheme,
    
    // Component helpers
    useReducedMotion,
    getGestureConfig,
  };
};
