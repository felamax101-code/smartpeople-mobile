import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
//@ts-ignore
import { QueryClientProviders } from '@/providers/queryclientprovider';
import { ToastProvider } from '@/components/activityIndicator/ToastProvider';
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { useThemeStore } from '@/stores/theme.store';
import { StatusBar } from "expo-status-bar";
import {Stack} from 'expo-router';
import { AppReady } from '@/components/AppReady';
import { ToastNotificationProvider } from '@/components/activityIndicator/ToastNotification';
SplashScreen.preventAutoHideAsync();

function InnerLayout() {
  const { preference } = useThemeStore()
  return (
    <>
      <StatusBar style={preference === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, animation: "fade", }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" options={{ presentation: "modal" }} />
        <Stack.Screen name="post/[slug]" />
        <Stack.Screen name="profile/[username]" />
        <Stack.Screen name="messages/[id]" />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="settings/edit-profile" />
        <Stack.Screen name="settings/privacy" />
        <Stack.Screen name="settings/change-password" />
        <Stack.Screen name="settings/sessions" />
        <Stack.Screen name="settings/two-factor" />
        <Stack.Screen name="settings/notifications" />
        <Stack.Screen name="settings/verification/identity" />
        <Stack.Screen name="settings/verification/business" />
        <Stack.Screen name="settings/two-factor/setup" />
        <Stack.Screen name="settings/two-factor/backup-codes"  />
        <Stack.Screen name="settings/two-factor/trusted-devices" />
      </Stack>
    </>
  )
}
export default function TabLayout(
) {
  const colorScheme = useColorScheme();
  return (

    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <AppReady>
      <ToastProvider>
        <ToastNotificationProvider>
      <QueryClientProviders>
        <InnerLayout/>
      </QueryClientProviders>
      </ToastNotificationProvider>
      </ToastProvider>
      </AppReady>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}













