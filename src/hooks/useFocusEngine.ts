import { useState, useEffect, useCallback } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useVideoEditorStore } from '@/stores/VideoEditorStore';
type FocusArea = 'timeline' | 'canvas' | 'controls' | 'clips' | 'overlays';
type FocusDirection = 'up' | 'down' | 'left' | 'right';
type FocusAction = 'select' | 'activate' | 'delete' | 'trimStart' | 'trimEnd' | 'playPause';

interface FocusPosition {
  area: FocusArea;
  index: number;
  subArea?: 'left' | 'right' | 'top' | 'bottom';
}

interface FocusItem {
  id: string;
  label: string;
  area: FocusArea;
  index: number;
  accessible: boolean;
  element?: any;
}

export const useFocusEngine = () => {
  const [focusPosition, setFocusPosition] = useState<FocusPosition>({
    area: 'controls',
    index: 0,
  });
  
  const [isKeyboardNavigation, setIsKeyboardNavigation] = useState(false);
  const [focusedItem, setFocusedItem] = useState<FocusItem | null>(null);
  const [focusableItems, setFocusableItems] = useState<FocusItem[]>([]);

  const { 
    project, 
    setCurrentFrame, 
    isPlaying,
    setIsPlaying,
    pixelsPerFrame,
    timelineOffset,
    setTimelineOffset,
    selectedClipId,
    selectedOverlayId,
    setSelectedClip,
    setSelectedOverlay
  } = useVideoEditorStore();

  // Handle keyboard events
  useEffect(() => {
    const handleKeyPress = (event: any) => {
      setIsKeyboardNavigation(true);
      
      switch (event.key) {
        case 'ArrowLeft':
          handleNavigation('left');
          break;
        case 'ArrowRight':
          handleNavigation('right');
          break;
        case 'ArrowUp':
          handleNavigation('up');
          break;
        case 'ArrowDown':
          handleNavigation('down');
          break;
        case ' ':
        case 'Space':
          handleAction('playPause');
          break;
        case 'Delete':
        case 'Backspace':
          handleAction('delete');
          break;
        case 'Tab':
          switchFocusArea();
          break;
        case 'Enter':
        case 'Return':
          handleAction('activate');
          break;
        case 'Home':
          navigateToStart();
          break;
        case 'End':
          navigateToEnd();
          break;
        case 'PageUp':
          navigatePageUp();
          break;
        case 'PageDown':
          navigatePageDown();
          break;
        case 't':
        case 'T':
          handleAction('trimStart');
          break;
        case 'y':
        case 'Y':
          handleAction('trimEnd');
          break;
      }
    };

    const subscription = Keyboard.addListener('keyboardDidShow', handleKeyPress);
    return () => subscription.remove();
  }, [focusPosition, project]);

  // Register focusable items
  const registerFocusableItem = useCallback((item: FocusItem) => {
    setFocusableItems(prev => {
      const filtered = prev.filter(existing => existing.id !== item.id);
      return [...filtered, item];
    });
  }, []);

  // Unregister focusable items
  const unregisterFocusableItem = useCallback((itemId: string) => {
    setFocusableItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  // Navigation handlers
  const handleNavigation = useCallback((direction: FocusDirection) => {
    const newPosition = calculateNewPosition(focusPosition, direction);
    setFocusPosition(newPosition);
    updateFocusedItem(newPosition);
  }, [focusPosition]);

  const calculateNewPosition = (current: FocusPosition, direction: FocusDirection): FocusPosition => {
    const { area, index } = current;

    switch (direction) {
      case 'left':
        return handleLeftNavigation(area, index);
      case 'right':
        return handleRightNavigation(area, index);
      case 'up':
        return handleUpNavigation(area, index);
      case 'down':
        return handleDownNavigation(area, index);
      default:
        return current;
    }
  };

  const handleLeftNavigation = (area: FocusArea, index: number): FocusPosition => {
    switch (area) {
      case 'timeline':
        return { area, index: Math.max(0, index - 1) };
      case 'controls':
        return { area, index: Math.max(0, index - 1) };
      case 'clips':
        return { area, index: Math.max(0, index - 1) };
      case 'overlays':
        return { area, index: Math.max(0, index - 1) };
      default:
        return { area, index };
    }
  };

  const handleRightNavigation = (area: FocusArea, index: number): FocusPosition => {
    const maxIndex = getMaxIndexForArea(area);
    return { area, index: Math.min(maxIndex, index + 1) };
  };

  const handleUpNavigation = (area: FocusArea, index: number): FocusPosition => {
    const areaOrder: FocusArea[] = ['controls', 'clips', 'overlays', 'timeline', 'canvas'];
    const currentIndex = areaOrder.indexOf(area);
    
    if (currentIndex > 0) {
      return { area: areaOrder[currentIndex - 1], index: 0 };
    }
    
    return { area, index };
  };

  const handleDownNavigation = (area: FocusArea, index: number): FocusPosition => {
    const areaOrder: FocusArea[] = ['controls', 'clips', 'overlays', 'timeline', 'canvas'];
    const currentIndex = areaOrder.indexOf(area);
    
    if (currentIndex < areaOrder.length - 1) {
      return { area: areaOrder[currentIndex + 1], index: 0 };
    }
    
    return { area, index };
  };

  const getMaxIndexForArea = (area: FocusArea): number => {
    const items = focusableItems.filter(item => item.area === area);
    return Math.max(0, items.length - 1);
  };

  // Action handlers
  const handleAction = useCallback((action: FocusAction) => {
    const { area, index } = focusPosition;
    
    switch (action) {
      case 'select':
        selectFocusedItem();
        break;
      case 'activate':
        activateFocusedItem();
        break;
      case 'delete':
        deleteFocusedItem();
        break;
      case 'playPause':
        togglePlayback();
        break;
      case 'trimStart':
        startTrimming('start');
        break;
      case 'trimEnd':
        startTrimming('end');
        break;
    }
  }, [focusPosition]);

  const selectFocusedItem = useCallback(() => {
    if (focusedItem) {
      switch (focusedItem.area) {
        case 'clips':
          setSelectedClip(focusedItem.id);
          break;
        case 'overlays':
          setSelectedOverlay(focusedItem.id);
          break;
      }
    }
  }, [focusedItem]);

  const activateFocusedItem = useCallback(() => {
    if (focusedItem) {
      // Handle activation based on area and context
      switch (focusedItem.area) {
        case 'controls':
          // Handle control activation (play, export, etc.)
          break;
        case 'clips':
          // Handle clip activation (select, open settings, etc.)
          break;
        case 'overlays':
          // Handle overlay activation (select, edit, etc.)
          break;
      }
    }
  }, [focusedItem]);

  const deleteFocusedItem = useCallback(() => {
    if (focusedItem) {
      switch (focusedItem.area) {
        case 'clips':
          if (selectedClipId === focusedItem.id) {
            // Delete the selected clip
            setSelectedClip(null);
          }
          break;
        case 'overlays':
          if (selectedOverlayId === focusedItem.id) {
            // Delete the selected overlay
            setSelectedOverlay(null);
          }
          break;
      }
    }
  }, [focusedItem, selectedClipId, selectedOverlayId]);

  const togglePlayback = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying, setIsPlaying]);

  const startTrimming = useCallback((side: 'start' | 'end') => {
    if (focusedItem && focusedItem.area === 'clips' && selectedClipId === focusedItem.id) {
      // Implement trimming logic
    }
  }, [focusedItem, selectedClipId]);

  // Navigation helpers
  const switchFocusArea = useCallback(() => {
    const areas: FocusArea[] = ['controls', 'clips', 'overlays', 'timeline', 'canvas'];
    const currentIndex = areas.indexOf(focusPosition.area);
    const nextIndex = (currentIndex + 1) % areas.length;
    
    setFocusPosition({
      area: areas[nextIndex],
      index: 0,
    });
  }, [focusPosition.area]);

  const navigateToStart = useCallback(() => {
    setCurrentFrame(0);
  }, [setCurrentFrame]);

  const navigateToEnd = useCallback(() => {
    if (project) {
      setCurrentFrame(project.durationFrames);
    }
  }, [setCurrentFrame, project]);

  const navigatePageUp = useCallback(() => {
    const jumpAmount = Math.floor(30 * pixelsPerFrame); // 30 seconds
    setTimelineOffset(Math.max(0, timelineOffset - jumpAmount));
  }, [setTimelineOffset, timelineOffset, pixelsPerFrame]);

  const navigatePageDown = useCallback(() => {
    const jumpAmount = Math.floor(30 * pixelsPerFrame); // 30 seconds
    setTimelineOffset(timelineOffset + jumpAmount);
  }, [setTimelineOffset, timelineOffset, pixelsPerFrame]);

  // Update focused item when position changes
  const updateFocusedItem = useCallback((position: FocusPosition) => {
    const items = focusableItems.filter(item => item.area === position.area);
    const item = items[position.index];
    setFocusedItem(item || null);
  }, [focusableItems]);

  // Focus management for screen readers
  const announceFocus = useCallback((label: string) => {
    if (Platform.OS === 'ios') {
      // Use iOS accessibility announcements
    } else {
      // Use Android accessibility announcements
    }
  }, []);

  // Get current focus context for screen readers
  const getFocusContext = useCallback((): string => {
    if (!focusedItem) return 'No item focused';
    
    const { area, index } = focusPosition;
    const totalItems = focusableItems.filter(item => item.area === area).length;
    
    return `${focusedItem.label}, ${index + 1} of ${totalItems}`;
  }, [focusedItem, focusPosition, focusableItems]);

  return {
    // Focus position and state
    focusPosition,
    focusedItem,
    isKeyboardNavigation,
    
    // Navigation methods
    handleNavigation,
    switchFocusArea,
    navigateToStart,
    navigateToEnd,
    navigatePageUp,
    navigatePageDown,
    
    // Action methods
    handleAction,
    selectFocusedItem,
    activateFocusedItem,
    deleteFocusedItem,
    togglePlayback,
    startTrimming,
    
    // Focus management
    registerFocusableItem,
    unregisterFocusableItem,
    updateFocusedItem,
    
    // Accessibility
    announceFocus,
    getFocusContext,
    
    // Utilities
    setFocusPosition,
    focusableItems,
  };
};
