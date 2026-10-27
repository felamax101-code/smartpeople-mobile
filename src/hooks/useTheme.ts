
import { useColorScheme } from "react-native"
import { useThemeStore } from "@/stores/theme.store"

const light = {
  background: "#F5F5FC",
  backgroundMuted: "#E8E8F5",

  surface: "#FFFFFF",
  surfaceSecondary: "#F0F0FA",
  border: "#DCDCEE",
  borderFocus: "#6C63FF",
  borderMuted: "#EBEBF5",

  textPrimary: "#14142B",
  textPrimarylight: "rgba(20,20,43,0.7)",
  textSecondary: "#5A5A7A",
  textMuted: "#9A9ABA",
  textInverse: "#FFFFFF",
  textPlaceholder: "#9A9ABA",

  primary: "#6C63FF",
  primaryLight: "#EEEDFF",
  primaryDark: "#4F46E5",

  success: "#059669",
  successLight: "#D1FAE5",
  error: "#DC2626",
  errorLight: "#FEE2E2",
  warning: "#D97706",

  inputBackground: "#F0F0FA",
  inputBackgroundFocus: "#FFFFFF",
  overlayBackground: "rgba(15,15,26,0.5)",
  ALLwarning: "#e30a0a",
};
 

const dark = {
  background: "#0F0F1A",
    backgroundMuted: "#25253d",

  surface: "#1A1A2E",
  surfaceSecondary: "#252540",
  border: "#2E2E4A",
  borderFocus: "#6C63FF",
    borderMuted:"#1E1E30",

  textPrimary: "#F0F0FF",
  textPrimarylight: "rgb(240,240,255,0.7)",
  textSecondary: "#A0A0C0",
  textMuted: "#505070",
  textInverse: "#0F0F1A",
  textPlaceholder: "#505070",
  primary: "#6C63FF",
  primaryLight: "#1E1B4B",
  primaryDark: "#6C63FF",
  success: "#10B981",
  successLight: "#064E3B",
  error: "#EF4444",
  errorLight: "#7F1D1D",
  warning: "#F59E0B",
  inputBackground: "#252540",
  inputBackgroundFocus: "#2E2E50",
  overlayBackground: "rgba(0,0,0,0.7)",
    ALLwarning:"#e30a0a"

}


export type Theme = typeof light

export const useTheme = (): Theme => {
  // both hooks always called — order never changes
  const systemScheme = useColorScheme()    // hook 1
  const preference = useThemeStore(        // hook 2 — always called
    (s) => s.preference
  )
  const resolved =
    preference === "system"
      ? (systemScheme ?? "light")
      : preference

  return resolved === "dark" ? dark : light
}

