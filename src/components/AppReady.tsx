
import React, { useEffect } from "react"
import { View } from "react-native"
import * as SplashScreen from "expo-splash-screen"
import { useAuthStore } from "@/stores/auth.store"
import { useThemeStore } from "@/stores/theme.store"

interface Props {
  children: React.ReactNode
}

export const AppReady = ({ children }: Props) => {
  const authHydrated = useAuthStore((s) => s.isHydrated)
  const themeHydrated = useThemeStore((s) => s.isHydrated)

  // both stores must finish hydrating before rendering the app
  const isReady = authHydrated && themeHydrated
 useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {
        // no-op — hideAsync can reject if called when splash is already hidden
      })
    }
  }, [isReady])
  if (!isReady) {
    // blank screen while stores hydrate
    // usually takes < 100ms — users won't notice
    return (
      <View style={{ flex: 1, backgroundColor: "#07112F" }}>
        {/* intentionally empty — or add your splash screen here */}
      </View>
    )
  }

  return <>{children}</>
}







