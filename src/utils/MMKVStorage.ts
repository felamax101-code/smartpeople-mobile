import { MMKV } from 'react-native-mmkv';

// Initialize MMKV storage instance
const storage = new MMKV({
  id: 'video-editor-storage',
  encryptionKey: 'video-editor-encryption-key',
});

export const StorageService = {
  // Project persistence
  saveProject: (projectId: string, project: any): void => {
    const key = `project_${projectId}`;
    storage.set(key, JSON.stringify(project));
  },

  loadProject: (projectId: string): any | null => {
    const key = `project_${projectId}`;
    const projectJson = storage.getString(key);
    return projectJson ? JSON.parse(projectJson) : null;
  },

  deleteProject: (projectId: string): void => {
    const key = `project_${projectId}`;
    storage.delete(key);
  },

  getAllProjectIds: (): string[] => {
    const keys = storage.getAllKeys();
    return keys
      .filter((key: string) => key.startsWith('project_'))
      .map((key: string) => key.replace('project_', ''));
  },

  // Settings persistence
  saveSettings: (settings: any): void => {
    storage.set('app_settings', JSON.stringify(settings));
  },

  loadSettings: (): any | null => {
    const settingsJson = storage.getString('app_settings');
    return settingsJson ? JSON.parse(settingsJson) : null;
  },

  // Cache management
  clearCache: (): void => {
    const keys = storage.getAllKeys();
    keys.forEach((key: string) => {
      if (key.startsWith('cache_')) {
        storage.delete(key);
      }
    });
  },

  saveToCache: (key: string, data: any): void => {
    const cacheKey = `cache_${key}`;
    storage.set(cacheKey, JSON.stringify(data));
  },

  loadFromCache: (key: string): any | null => {
    const cacheKey = `cache_${key}`;
    const dataJson = storage.getString(cacheKey);
    return dataJson ? JSON.parse(dataJson) : null;
  },

  // Utility methods
  clearAll: (): void => {
    storage.clearAll();
  },

  getStorageSize: (): number => {
    return storage.getAllKeys().length;
  },
};
