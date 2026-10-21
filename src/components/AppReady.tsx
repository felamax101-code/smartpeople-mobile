
import React, { useEffect } from "react"
import { View } from "react-native"
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

  if (!isReady) {
    // blank screen while stores hydrate
    // usually takes < 100ms — users won't notice
    return (
      <View style={{ flex: 1, backgroundColor: "#07112F" }}>
        {/* intentionally empty —*/}
      </View>
    )
  }

  return <>{children}</>
}







