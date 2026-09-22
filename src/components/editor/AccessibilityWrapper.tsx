import React, { createContext, useContext, ReactNode } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useFocusEngine } from '@/hooks/useFocusEngine';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { generateAccessibilityLabel, generateAccessibilityHint, getAccessibilityRole, getAccessibilityState } from '@/utils/AccessibilityHelper';

interface AccessibilityContextType {
  // Focus engine
  focusEngine: ReturnType<typeof useFocusEngine>;
  
  // Reduce motion
  reduceMotion: ReturnType<typeof useReduceMotion>;
  
  // Accessibility helpers
  getAccessibilityProps: (type: string, data: any, isSelected?: boolean) => any;
  
  // Screen reader announcements
  announceToScreenReader: (message: string) => void;
  
  // Focus management
  setFocus: (elementId: string, area: string, index: number) => void;
  clearFocus: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

interface AccessibilityWrapperProps {
  children: ReactNode;
}

export const AccessibilityWrapper: React.FC<AccessibilityWrapperProps> = ({ children }) => {
  const focusEngine = useFocusEngine();
  const reduceMotion = useReduceMotion();

  // Get comprehensive accessibility properties
  const getAccessibilityProps = (type: string, data: any, isSelected = false) => {
    let accessibilityLabel = '';
    let accessibilityHint = '';
    let accessibilityRole = 'button';
    let accessibilityState = {};

    switch (type) {
      case 'clip':
        accessibilityLabel = generateAccessibilityLabel.forClip(data, isSelected);
        accessibilityHint = generateAccessibilityHint.forClip(data);
        accessibilityRole = getAccessibilityRole.forClip();
        accessibilityState = getAccessibilityState.forClip(data, isSelected);
        break;
        
      case 'overlay':
        accessibilityLabel = generateAccessibilityLabel.forOverlay(data, isSelected);
        accessibilityHint = generateAccessibilityHint.forOverlay(data);
        accessibilityRole = getAccessibilityRole.forOverlay();
        accessibilityState = getAccessibilityState.forOverlay(data, isSelected);
        break;
        
      case 'timeline':
        accessibilityLabel = generateAccessibilityLabel.forTimeline(data.totalDuration, data.fps);
        accessibilityHint = generateAccessibilityHint.forTimeline();
        accessibilityRole = getAccessibilityRole.forTimeline();
        break;
        
      case 'playbackControls':
        accessibilityLabel = generateAccessibilityLabel.forPlaybackControls(
          data.isPlaying, 
          data.currentFrame, 
          data.totalFrames, 
          data.fps
        );
        accessibilityHint = generateAccessibilityHint.forPlaybackControls();
        accessibilityRole = getAccessibilityRole.forPlaybackControls();
        accessibilityState = getAccessibilityState.forPlayback(data.isPlaying);
        break;
        
      case 'button':
        accessibilityLabel = generateAccessibilityLabel.forButton(data.action, data.description);
        accessibilityHint = generateAccessibilityHint.forButton(data.action);
        accessibilityRole = getAccessibilityRole.forButton();
        accessibilityState = getAccessibilityState.forButton(data.disabled);
        break;
        
      case 'slider':
        accessibilityLabel = generateAccessibilityLabel.forSlider(data.label, data.value, data.min, data.max);
        accessibilityHint = generateAccessibilityHint.forSlider(data.label);
        accessibilityRole = getAccessibilityRole.forSlider();
        break;
        
      case 'track':
        accessibilityLabel = generateAccessibilityLabel.forTrack(data);
        accessibilityRole = getAccessibilityRole.forTrack();
        break;
        
      case 'exportProgress':
        accessibilityLabel = generateAccessibilityLabel.forExportProgress(data.progress, data.stage);
        accessibilityRole = getAccessibilityRole.forProgress();
        break;
        
      case 'error':
        accessibilityLabel = generateAccessibilityLabel.forError(data.error, data.context);
        accessibilityRole = getAccessibilityRole.forAlert();
        break;
        
      default:
        accessibilityLabel = `${type} element`;
        accessibilityRole = getAccessibilityRole.forButton();
    }

    return {
      accessibilityLabel,
      accessibilityHint,
      accessibilityRole,
      accessibilityState,
      accessible: true,
      importantForAccessibility: 'auto',
    };
  };

  // Screen reader announcements
  const announceToScreenReader = (message: string) => {
    if (Platform.OS === 'ios') {
      // Use iOS accessibility announcements
      // This would typically use a native module to announce to VoiceOver
   
    } else {
      // Use Android accessibility announcements
      // This would typically use a native module to announce to TalkBack
      
    }
  };

  // Focus management
  const setFocus = (elementId: string, area: string, index: number) => {
    focusEngine.registerFocusableItem({
      id: elementId,
      label: `Element ${elementId}`,
      area: area as any,
      index,
      accessible: true,
    });
    
    focusEngine.setFocusPosition({
      area: area as any,
      index,
    });
  };

  const clearFocus = () => {
    focusEngine.updateFocusedItem({ area: 'controls', index: 0 });
  };

  const contextValue: AccessibilityContextType = {
    focusEngine,
    reduceMotion,
    getAccessibilityProps,
    announceToScreenReader,
    setFocus,
    clearFocus,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      <View style={styles.container}>
        {children}
      </View>
    </AccessibilityContext.Provider>
  );
};

// Hook to use accessibility context
export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityWrapper');
  }
  return context;
};

// Higher-order component for accessibility
export const withAccessibility = <P extends object>(
  Component: React.ComponentType<P & { accessibility: AccessibilityContextType }>
) => {
  return React.forwardRef<any, P>((props, ref) => {
    const accessibility = useAccessibility();
    const TypedComponent = Component as React.ComponentType<any>;

    return (
      <TypedComponent
        {...props}
        ref={ref}
        accessibility={accessibility}
      />
    );
  });
};

// Accessibility-enabled components
export const AccessibleButton: React.FC<{
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
  style?: any;
}> = ({ 
  children, 
  onPress, 
  accessibilityLabel, 
  accessibilityHint, 
  disabled = false,
  style 
}) => {
  const accessibility = useAccessibility();
  
  const props = {
    ...accessibility.getAccessibilityProps('button', {
      action: accessibilityLabel || 'Button',
      description: accessibilityHint,
      disabled,
    }),
    onPress,
    disabled,
    style: [
      style,
      accessibility.reduceMotion.getAccessibleStyles({
        opacity: disabled ? 0.5 : 1,
      }),
    ],
  };

  return <View {...props}>{children}</View>;
};

export const AccessibleSlider: React.FC<{
  value: number;
  minimumValue: number;
  maximumValue: number;
  onValueChange: (value: number) => void;
  accessibilityLabel?: string;
  style?: any;
}> = ({ 
  value, 
  minimumValue, 
  maximumValue, 
  onValueChange, 
  accessibilityLabel,
  style 
}) => {
  const accessibility = useAccessibility();
  
  const props = {
    ...accessibility.getAccessibilityProps('slider', {
      label: accessibilityLabel || 'Slider',
      value,
      min: minimumValue,
      max: maximumValue,
    }),
    value,
    minimumValue,
    maximumValue,
    onValueChange,
    style: [
      style,
      accessibility.reduceMotion.getAccessibleStyles({}),
    ],
  };

  return <View {...props} />;
};

export const AccessibleClip: React.FC<{
  clip: any;
  isSelected: boolean;
  onSelect: () => void;
  style?: any;
}> = ({ clip, isSelected, onSelect, style }) => {
  const accessibility = useAccessibility();
  
  const props = {
    ...accessibility.getAccessibilityProps('clip', clip, isSelected),
    onPress: onSelect,
    style: [
      style,
      accessibility.reduceMotion.getAccessibleStyles({
        backgroundColor: isSelected ? '#007AFF' : '#F0F0F0',
        borderColor: isSelected ? '#007AFF' : '#C6C6C8',
      }),
    ],
  };

  return <View {...props} />;
};

export const AccessibleOverlay: React.FC<{
  overlay: any;
  isSelected: boolean;
  onSelect: () => void;
  style?: any;
}> = ({ overlay, isSelected, onSelect, style }) => {
  const accessibility = useAccessibility();
  
  const props = {
    ...accessibility.getAccessibilityProps('overlay', overlay, isSelected),
    onPress: onSelect,
    style: [
      style,
      accessibility.reduceMotion.getAccessibleStyles({
        backgroundColor: isSelected ? '#007AFF' : 'transparent',
        borderColor: isSelected ? '#007AFF' : '#C6C6C8',
      }),
    ],
  };

  return <View {...props} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AccessibilityWrapper;
