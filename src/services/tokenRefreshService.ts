//  services/auth/authInterceptor.ts 
// Shared 401-refresh logic — attach this to ANY axios instance (Django, FastAPI,
// or future ones). The refresh endpoint always lives on Django regardless of
// which instance's request triggered the 401.
import { useCallback } from "react"
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios"
import * as SecureStore from "expo-secure-store"
import { API } from "@/constants/api"
import { Platform } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"

//  module-level state — shared across EVERY instance this is attached to ─
// If messagingApi gets a 401 while api (Django) is already mid-refresh,
// messagingApi's request joins the same queue instead of starting a second
// refresh call.
let isRefreshing = false
let refreshQueue: Array<{
  resolve: (token: string) => void
  reject: (error: any) => void
}> = []

const processQueue = (error: any, token: string | null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token!)
    }
  })
  refreshQueue = []
}

// endpoints that should never trigger a refresh attempt themselves
const AUTH_ENDPOINT_PATTERNS = [
  "/auth/login",
  "/auth/register",
  "/auth/token/refresh",
  "/auth/verify-email",
  "/auth/password/reset",
]

/**
 * Attaches request + response interceptors handling:
 *   - injecting the access token on every request
 *   - on 401: refresh once, queue concurrent 401s, retry the original request
 *
 * Call this for every axios instance that needs authenticated requests.
 */
export const attachAuthInterceptors = (instance: AxiosInstance) => {

  //  request interceptor ─
  instance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const platform = Platform.OS

      const token=platform==='web'
      ? await AsyncStorage.getItem("access_token")
      :await SecureStore.getItemAsync("access_token")
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  //  response interceptor 
  instance.interceptors.response.use(
    (response) => response,


    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean
      }
      if (error.response?.status !== 401 || originalRequest._retry) {

        return Promise.reject(error)
      }

      const url = originalRequest.url ?? ""
      const isAuthEndpoint = AUTH_ENDPOINT_PATTERNS.some((p) => url.includes(p))
      if (isAuthEndpoint) {
        return Promise.reject(error)
      }

      const plartfom = Platform.OS
      const getToken = async () => {
        if (plartfom === "web") {
          return AsyncStorage.getItem("refresh_token")
        }
        else {
          return SecureStore.getItemAsync("refresh_token")
        }}

      const refreshToken = await getToken()

      if (!refreshToken) {
        const { useAuthStore } = require("@/stores/auth.store")
        useAuthStore.getState().clearUser()
        return Promise.reject(error)
      }

      //  another instance is already refreshing — queue this request 
      // NOTE: resolve() calls `instance(originalRequest)` — the CORRECT
      // instance (api or messagingApi), captured via closure, so the
      // retry happens on whichever API originally made the request.
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(instance(originalRequest))
            },
            reject,
          })
        })
      }

      //  start refresh ─
      originalRequest._retry = true
      isRefreshing = true

      try {
        // plain axios — never goes through any interceptor, avoids loops
        const { data } = await axios.post(
          `${API.DJANGO_BASE_URL}/token/refresh/`,
          { refresh: refreshToken },
          {
            headers: {
              "Content-Type": "application/json",
              "X-Client-Type": "mobile",
            },
            timeout: 10000,
          }
        )
        const newAccessToken: string = data.access_token
        const newRefreshToken: string | undefined = data.refresh_token


        if (Platform.OS === "web") {
          await AsyncStorage.setItem("access_token", data.access_token)
          await AsyncStorage.setItem("refresh_token", data.refresh_token)
        }
        else {
          await SecureStore.setItemAsync("access_token", newAccessToken)
          if (newRefreshToken) {
            await SecureStore.setItemAsync("refresh_token", newRefreshToken)
          }
        }


        // wake up every queued request — DM, group, or Django, doesn't matter
        processQueue(null, newAccessToken)

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return instance(originalRequest)

      } catch (refreshError: any) {
        processQueue(refreshError, null)

        if (Platform.OS === "web") {
          await AsyncStorage.removeItem("access_token",)
          await AsyncStorage.removeItem("refresh_token",)
        }
        else {
          await SecureStore.deleteItemAsync("access_token")
          await SecureStore.deleteItemAsync("refresh_token")
        }


        const { useAuthStore } = require("@/stores/auth.store")
        useAuthStore.getState().clearUser()

        return Promise.reject(refreshError)

      } finally {
        isRefreshing = false
      }
    }
  )
}
