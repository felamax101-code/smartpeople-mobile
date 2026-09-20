import { Stack } from "expo-router"
import { useTheme } from "@/hooks/useTheme"

export default function AuthLayout() {
  const theme = useTheme()

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
        animation: "fade",
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="two-factor" />        
      <Stack.Screen name="forgot-password" />
    </Stack>
  )
}