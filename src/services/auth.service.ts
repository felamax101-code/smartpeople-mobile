
import api from "./api"
import * as SecureStore from "expo-secure-store"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { ENDPOINTS } from "@/constants/api"
import { RegisterPayload, LoginPayload, LoginResponse, User,ProfileViwersAPIResponse ,ViewerPeriod} from "@/types"
import { Platform } from "react-native"


export const authService = {

    register: async (payload: RegisterPayload): Promise<{ success: boolean; message: string, user: any }> => {
        const { data } = await api.post(ENDPOINTS.REGISTER, payload, {
            timeout: 150000
        })
        return data
    },

    verifyEmail: async (email: string, otp: string, user_id: string): Promise<{ success: boolean }> => {
        const { data } = await api.post("/verify-email/", { email, otp, user_id })
        if (Platform.OS === "web") {
            await AsyncStorage.setItem("access_token", data.access_token)
            await AsyncStorage.setItem("refresh_token", data.refresh_token)
        }
        else {
            await SecureStore.setItemAsync("access_token", data.access_token)
            await SecureStore.setItemAsync("refresh_token", data.refresh_token)
        }
        return data
    },

    resendOTP: async (email: string): Promise<void> => {
        await api.post("/resend-verification/", { email },
            {
                timeout: 150000
            }


        )
    },

    login: async (payload: LoginPayload): Promise<LoginResponse> => {
        const { data } = await api.post(ENDPOINTS.LOGIN, payload)

        // store tokens securely if login is complete (no 2FA)
        if (data.access_token && data.refresh_token) {

            if (Platform.OS === "web") {
                await AsyncStorage.setItem("access_token", data.access_token)
                await AsyncStorage.setItem("refresh_token", data.refresh_token)
            }
            else {
                await SecureStore.setItemAsync("access_token", data.access_token)
                await SecureStore.setItemAsync("refresh_token", data.refresh_token)
            }
        }

        return data
    },

    getMe: async (): Promise<User> => {

        const { data } = await api.get(ENDPOINTS.ME)
        return data
    },

    logout: async (): Promise<void> => {
        try {
            await api.post(ENDPOINTS.LOGOUT)
        } finally {
            // always clear local tokens even if API call fails
            const { useAuthStore } = require("@/stores/auth.store")

            await useAuthStore.getState().logout()
            if (Platform.OS === "web") {
                await AsyncStorage.removeItem("access_token")
                await AsyncStorage.removeItem("refresh_token")
            }
            else {
                await SecureStore.deleteItemAsync("access_token")
                await SecureStore.deleteItemAsync("refresh_token")
            }

        }
    },



    verify2FA: async (payload: {
        resolvedTempToken: string
        code: string
        trust_device: boolean
    }): Promise<{ success: boolean; warning?: string }> => {
        const { data } = await api.post("/2fa/verify/", payload)

        // store tokens after successful 2FA
        if (data.success && data.access_token && data.refresh_token) {
            if (Platform.OS === "web") {
                await AsyncStorage.setItem("access_token", data.access_token)
                await AsyncStorage.setItem("refresh_token", data.refresh_token)
            }
            else {
                await SecureStore.setItemAsync("access_token", data.access_token)
                await SecureStore.setItemAsync("refresh_token", data.refresh_token)
            }

        }

        return data
    },

    resend2FA: async (temp_token: string): Promise<{ success: boolean, message: string, error: string }> => {
        const { data } = await api.post("/2fa/resend/", { temp_token })
        return data
    },



    requestPasswordReset: async (email: string): Promise<void> => {
        await api.post("/password/reset/", { email })
    },

    confirmPasswordReset: async (
        email: string,
        otp: string,
        new_password: string
    ): Promise<void> => {
        await api.post("/password/reset/confirm/", {
            email,
            otp,
            new_password,
        })
    },
    deactivateAccount: async (

    ): Promise<{ message: string }> => {
        const { data } = await api.post("/users/me/deactivate/", {
        })
        return data

    },

    deleteAccountRequest: async (

    ): Promise<{ message: string }> => {
        const { data } = await api.post("/users/me/account-delete/request/", {

        })
        return data
    },
    deleteAccountConfirm: async (
        otp: string,
        password: string


    ): Promise<{ message: string }> => {
        const { data } = await api.post("/users/me/account-delete/confirm/", {
            otp, password
        })
        return data
    },
    viewProfile: async (
            id:string
    ): Promise<{ message: string }> => {
        const { data } = await api.post(`/view/profile/${id}/`, {

        })
        return data
    },
    getProfileViewers: async (
  page = 1,
  pageSize = 20,
  period: ViewerPeriod = "all"
): Promise<ProfileViwersAPIResponse> => {
  const { data } = await api.get("/list/profile-viewers/", {
    params: {
      page,
      page_size: pageSize,
      // omit the param for "all" so the backend returns all-time
      ...(period !== "all" && { period }),
    },
  });
  return data;
},
}






