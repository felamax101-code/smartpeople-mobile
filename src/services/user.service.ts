
import api from "./api"
import { ENDPOINTS } from "@/constants/api"
import { User, FeedApiResponse, ReviewApiResponse, DisableCode } from "@/types"



export const userService = {

  //  get public profile 
  getProfile: async (username: string): Promise<User> => {
    const { data } = await api.get(ENDPOINTS.PROFILE(username))
    return data.data ?? data
  },

  //  get own profile ─
  getMe: async (): Promise<User> => {
    const { data } = await api.get(ENDPOINTS.ME)
    return data
  },
  changeEmailRequest: async (email: string): Promise<User> => {
    const { data } = await api.post(`/users/me/change-email/`, { email })
    return data
  },
  changeEmailVerify: async (email: string, otp: string): Promise<User> => {
    const { data } = await api.post(`/users/me/change-email/confirm/`, { email, otp })
    return data
  },

  changePhoneRequest: async (phone: string): Promise<User> => {
    const { data } = await api.post(`/users/me/phone/`, { phone })
    return data
  },

  getPermissions: async (): Promise<{
    is_allowed_to_change_email: boolean,
    is_allowed_to_change_username: boolean,
    remaining_username_days:number,
    remaining_email_days:number
  }> => {
    const { data } = await api.post(`/users/me/permissions/`,)
    return data
  },
  changePhoneVerify: async (phone: string, otp: string): Promise<User> => {
    const { data } = await api.post(`users/me/phone/verify/`, { phone, otp })
    return data
  },
  //  update own profile 
  updateProfile: async (payload: {
    name?: string
    username?: string
    bio?: string
    location?: string
    avatarFile?: { uri: string; name: string; type: string } | null
    phone?: string
  }): Promise<User> => {

    // if there's a file, use FormData
    if (payload.avatarFile) {
      const formData = new FormData()

      if (payload.name) formData.append("name", payload.name)
      if (payload.bio !== undefined) formData.append("bio", payload.bio)
      if (payload.location) formData.append("location", payload.location)

      formData.append("avatar", payload.avatarFile as any)
      const { data } = await api.patch(ENDPOINTS.ME, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      return data
    }

    // no file — regular JSON
    const { data } = await api.patch(ENDPOINTS.ME, payload)
    return data
  },

  //  follow / unfollow ─
  toggleFollow: async (username: string): Promise<{ following: boolean }> => {
    const { data } = await api.post(ENDPOINTS.FOLLOW(username))
    return data
  },

  //own listings
  getOwnListings: async (
    
    page = 1
  ): Promise<FeedApiResponse> => {
    const { data } = await api.get("/user/listings/", {
      params: { page },
    })
    return data
  },


  //  get user listings ─
  getUserListings: async (
    username: string,
    page = 1
  ): Promise<FeedApiResponse> => {
    const { data } = await api.get(ENDPOINTS.FEED, {
      params: { user: username, page, status: "approved" },
    })
    return data
  },
getUserSavedListings: async (
    page = 1
  ): Promise<FeedApiResponse> => {
    const { data } = await api.get("wishlist/", {
      params: {  page     }})
    return data
  },

  getDisableCodes: async (
    method: string,

  ): Promise<DisableCode> => {
    const { data } = await api.get(`/users/disable-codes/`, {
      params: { method },
    })
    return data
  },
  //  get user reviews 
  getUserReviews: async (
    username: string,
    page = 1
  ): Promise<ReviewApiResponse> => {
    const { data } = await api.get(`/users/${username}/reviews/`, {
      params: { page },
    })
    return data
  },
}







