// Design tokens — change these to rebrand the entire app
export const Colors = {
  // primary brand color
  primary: "#6C63FF",        // purple — modern, trustworthy
  primaryLight: "#EEF0FF",   // light tint for badges, chips
  primaryDark: "#4B44CC",    // pressed state

  // semantic colors
  success: "#10B981",        // verified badge, approved
  warning: "#F59E0B",        // business badge, negotiable
  error: "#EF4444",          // errors, banned
  info: "#3B82F6",           // trusted member badge

  // neutrals
  black: "#0F0F0F",
  dark: "#1A1A2E",
  gray: {
    100: "#F5F5F5",
    200: "#EEEEEE",
    300: "#E0E0E0",
    400: "#BDBDBD",
    500: "#9E9E9E",
    600: "#757575",
    700: "#616161",
    800: "#424242",
    900: "#212121",
  },
  white: "#FFFFFF",

  // surface colors
  background: "#F8F8FC",
  surface: "#FFFFFF",
  surfaceSecondary: "#F5F5F5",

  // text
  textPrimary: "#0F0F0F",
  textSecondary: "#757575",
  textMuted: "#BDBDBD",
  textInverse: "#FFFFFF",

  // feed card overlay
  overlayLight: "rgba(255,255,255,0.15)",
  overlayDark: "rgba(0,0,0,0.4)",
  overlayGradient: "rgba(0,0,0,0)",    // top of gradient
  overlayGradientEnd: "rgba(0,0,0,0.7)", // bottom of gradient
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}

export const Radius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
}

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
}

export const FontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  extrabold: "800" as const,
}





