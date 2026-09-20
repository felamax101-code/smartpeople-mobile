import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { User, PendingAction } from "@/types"
import * as SecureStore from "expo-secure-store"
import { Platform } from "react-native"
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isHydrated: boolean        // ← add this
  pendingAction: PendingAction | null
  isAuthPromptVisible: boolean
  authPromptMessage: string
  setUser: (user: User) => void
  clearUser: () => void
  setLoading: (loading: boolean) => void
  requireAuth: (action: PendingAction, message: string) => void
  clearPendingAction: () => void
  hideAuthPrompt: () => void
  setHydrated: () => void    // ← add this
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isHydrated: false,      // ← starts false
      pendingAction: null,
      isAuthPromptVisible: false,
      authPromptMessage: "",

      setUser: (user) =>
        set({ user, isAuthenticated: true, isLoading: false }),

      clearUser: async () => {
        
        set({
          user: null,
          isAuthenticated: false,
          pendingAction: null,
          isAuthPromptVisible: false,
        })
      },

      setLoading: (isLoading) => set({ isLoading }),

      requireAuth: (action, message) => {
        const { isAuthenticated } = get()
        if (isAuthenticated) return
        set({
          pendingAction: action,
          isAuthPromptVisible: true,
          authPromptMessage: message,
        })
      },
      logout: async () => {

        if (Platform.OS === "web") {
             await AsyncStorage.removeItem("access_token")
             await AsyncStorage.removeItem("refresh_token")
            }
            else {
              await SecureStore.deleteItemAsync("access_token")
        await SecureStore.deleteItemAsync("refresh_token")
            }
      
        set({
          user: null,
          isAuthenticated: false,
          pendingAction: null,
          isAuthPromptVisible: false,
        })
      },

      clearPendingAction: () => set({ pendingAction: null }),
      hideAuthPrompt: () =>
        set({ isAuthPromptVisible: false, pendingAction: null }),

      setHydrated: () => set({ isHydrated: true }), 
    }),
    {
      name: "auth-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // called when hydration completes
        state?.setHydrated()
      },
    }
  )
)










