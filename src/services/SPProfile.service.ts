
import api from "@/services/api"
import { FeedApiResponse,ReviewApiResponse,ProfileViwersAPIResponse } from "@/types"
export interface PropertyProfile {
  id: string
  username: string
  name?:string
  user_id:string
  org_name?:string
  can_post_listings: boolean
  created_at: string
}

export const propertyProfileService = {
  getMyProfile: async (): Promise<PropertyProfile> => {
    const response = await api.get("/sp/property-profile/me/")
    return response.data
  },
   getOtherPersonProfile: async (
    username:string
   ): Promise<PropertyProfile> => {
    const response = await api.get(`/sp/other/property-profile/${username}/`)
    return response.data
  },
    getUserListings: async (
      username: string,
      page = 1
    ): Promise<FeedApiResponse> => {
      const { data } = await api.get(`/sp/feed/`, {
        params: { user: username, page, status: "approved" },
      })
      return data
    },
     getOwnListings: async (
    
    page = 1
  ): Promise<FeedApiResponse> => {
    const { data } = await api.get("/sp/user/listings/", {
      params: { page },
    })
    return data
  },
  //  get user reviews 
  getUserReviews: async (
    username: string,
    page = 1
  ): Promise<ReviewApiResponse> => {
    const { data } = await api.get(`/sp/users/${username}/reviews/`, {
      params: { page },
    })
    return data
  },
    viewProfile: async (
              id:string
      ): Promise<{ message: string }> => {
          const { data } = await api.post(`/view/profile/${id}`, {
  
          })
          return data
      },
      getProfileViwers: async (
  
      ): Promise<ProfileViwersAPIResponse> => {
          const { data } = await api.get("/list/profile-viewers/", {
          })
          return data
      },
}