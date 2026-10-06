import { useEffect } from "react"
import { Platform } from "react-native"
import * as Device from "expo-device"
import * as Notifications from "expo-notifications"
import Constants from "expo-constants"
import api from "@/services/api"
import { useNotificationToast } from "@/components/activityIndicator/ToastNotification"
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

async function registerForPush() {
  if (!Device.isDevice) {
    return
  }
  // Android 13+: the channel must exist before asking for permission
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    })
  }

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== "granted") {
    return
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId

  try {
    const expoToken = await Notifications.getExpoPushTokenAsync({ projectId })

    api.post(`/push-notifications/`,{
      platform:Platform.OS,
      push_token:expoToken.data
    })
    const deviceToken = await Notifications.getDevicePushTokenAsync()
  } catch (e) {
  }
}

export function usePushToken() {
  useEffect(() => {
    registerForPush()
  }, [])
}