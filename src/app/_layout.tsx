import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
//@ts-ignore
import { QueryClientProviders } from '@/providers/queryclientprovider';
import { ToastProvider } from '@/components/activityIndicator/ToastProvider';
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { useThemeStore } from '@/stores/theme.store';
import { useEffect, useRef } from 'react';
import { StatusBar } from "expo-status-bar";
import { Stack, router, usePathname, useGlobalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { AppReady } from '@/components/AppReady';
import { ToastNotificationProvider } from '@/components/activityIndicator/ToastNotification';
import { UploadQueueProvider } from '@/components/createpost/UploadQueuecontext';
import * as Notitications from "expo-notifications"
import { useUnstableConnectionWarning } from '@/hooks/useNetworkCheck';
SplashScreen.preventAutoHideAsync();
const KEY = 'last-path';
const PARAMLESS_PATHS = ["/two-factor"];

function InnerLayout() {
  const lasResponse = Notitications.useLastNotificationResponse()
  useEffect(() => {
    if (lasResponse?.actionIdentifier === Notitications.DEFAULT_ACTION_IDENTIFIER) {
      const url = lasResponse.notification.request.content.data?.url;
      if (typeof url === "string") router.push(url)
    }
  }, [lasResponse])
  useUnstableConnectionWarning()
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const paramsKey = JSON.stringify(params); // stable dependency (params object changes identity)

  type SavedRoute = { pathname: string; params: Record<string, string | string[]> };

  const restoreTarget = useRef<SavedRoute | null>(null);
  const ready = useRef(false);
  const splashHidden = useRef(false);

  const hideSplash = () => {
    if (splashHidden.current) return;
    splashHidden.current = true;
    requestAnimationFrame(() => SplashScreen.hideAsync().catch(() => { }));
  };

  // Restore once on launch
  useEffect(() => {
    (async () => {
      const initialUrl = await Linking.getInitialURL();
      const raw = await AsyncStorage.getItem(KEY);

      let saved: SavedRoute | null = null;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          saved = typeof parsed === "string"
            ? { pathname: parsed, params: {} }   // old format (plain string)
            : parsed;
        } catch {
          saved = { pathname: raw, params: {} }; // old format, not JSON
        }
      }

      if (!initialUrl && saved && saved.pathname !== "/") {
        restoreTarget.current = saved;
        router.replace("/");
        setTimeout(() => {
          router.push({ pathname: saved!.pathname, params: saved!.params } as any);
        }, 300);

        // safety net
        setTimeout(() => {
          restoreTarget.current = null;
          ready.current = true;
          hideSplash();
        }, 1500);
      } else {
        ready.current = true;
        hideSplash();
      }
    })();
  }, []);

  // Save on every route or params change
  useEffect(() => {
    if (restoreTarget.current) {
      if (pathname !== restoreTarget.current.pathname) return;
      restoreTarget.current = null;
      ready.current = true;
      hideSplash();
    }
    if (!ready.current) return;

    const safeParams = PARAMLESS_PATHS.includes(pathname) ? {} : params;

    AsyncStorage.setItem(
      KEY,
      JSON.stringify({ pathname, params: safeParams })
    );
  }, [pathname, paramsKey]);
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
        <Stack.Screen name="settings/two-factor/backup-codes" />
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
              <UploadQueueProvider>
                <QueryClientProviders>
                  <InnerLayout />
                </QueryClientProviders>
              </UploadQueueProvider>
            </ToastNotificationProvider>
          </ToastProvider>
        </AppReady>

      </GestureHandlerRootView>
    </ThemeProvider>
  );
}













