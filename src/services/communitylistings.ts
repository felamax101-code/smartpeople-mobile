import api from "./api"
import { Post } from "@/types"


export const communitylistingService = {

  createListing: async (payload: {
    name: string
    description: string
    category: string
    post_type:string
    mediaFiles: { uri: string; name: string; type: string }[]
    mediaType: "photo" | "video" |"text"
    location_display: string
    location_lat: number
    location_lng: number
  },slug:string): Promise<Post> => {

    const formData = new FormData()

    // text fields
    formData.append("name", payload.name)
    formData.append("description", payload.description)
   
    formData.append("category", payload.category)
    formData.append("location_display", payload.location_display)
    formData.append("post_type", payload.post_type)
    formData.append("location_lat", payload.location_lat.toString())
    formData.append("location_lng", payload.location_lng.toString())
    formData.append("media_type", payload.mediaType)

    // files
    payload.mediaFiles.forEach((file) => {
      formData.append("media", {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any)
    })

    const { data } = await api.post(`/groups/${slug}/posts/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })

    return data
  },



   updateListing: async (slug:string,payload: {
    name: string
    description: string
    
    category: string
    location_lat: number
    location_lng: number
  }): Promise<Post> => {

    const formData = new FormData()

    // text fields
    formData.append("name", payload.name)
    formData.append("description", payload.description)
    
    formData.append("category", payload.category)
    formData.append("location_lat", payload.location_lat.toString())
    formData.append("location_lng", payload.location_lng.toString())

    // files
   
    const { data } = await api.put(`/groups/posts/edit/${slug}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })

    return data
  },

}