

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import AsyncStorage from "@react-native-async-storage/async-storage"

export type ThemePreference = "light" | "dark" | "system"

interface ThemeState {
  preference: ThemePreference
  isHydrated: boolean                        
  setPreference: (preference: ThemePreference) => void
  setHydrated: () => void                    
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: "system",
      isHydrated: false,                     // ← starts false

      setPreference: (preference) => set({ preference }),

      setHydrated: () => set({ isHydrated: true }), // ← add
    }),
    {
      name: "theme-preference",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    }
  )
)







