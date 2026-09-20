import api from "./api"
import { Post } from "@/types"

export type PostCondition = "new" | "used" | "refurbished"

export const splistingService = {

  createListing: async (payload: {
    name: string
    description: string
    category: string
    mediaFiles: { uri: string; name: string; type: string }[]
    mediaType: "photo" | "video" |"text"
    post_type:"image" | "video" | "text"
    location_display: string
    location_lat?: number
    location_lng?: number
    listing_type:string
    price:string
    rooms:string
    deposit:string|undefined
    monthly_installment:string |undefined
  }): Promise<Post> => {

    const formData = new FormData()

    // text fields
    formData.append("name", payload.name)
    formData.append("post_type", payload.post_type)
    formData.append("description", payload.description)
    formData.append("category", payload.category)
    formData.append("location_display", payload.location_display)
    // formData.append("location_lat", payload.location_lat.toString())
    // formData.append("location_lng", payload.location_lng.toString())
    formData.append("media_type", payload.mediaType)
    formData.append("price", payload.price)
    formData.append("listing_type", payload.listing_type)
    formData.append("rooms", payload.rooms)
    formData.append("deposit", payload.deposit??"")
    formData.append("monthly_installment", payload.monthly_installment??"")
    formData.append("house_type", payload.rooms??"")

    // files
    payload.mediaFiles.forEach((file) => {
      formData.append("media", {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any)
    })

    const { data } = await api.post("/sp/posts/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })

    return data
  },

   updateListing: async (slug:string,payload: {
    name: string
    description: string    
    category: string
    location_display: string
    location_lat: number
    location_lng: number
    listing_type:string
    price:string
    rooms:string
    deposit:string|undefined
    monthly_installment:string |undefined
  }): Promise<Post> => {

    const formData = new FormData()

    // text fields
     // text fields
    formData.append("name", payload.name)
    formData.append("description", payload.description)
    formData.append("category", payload.category)
    formData.append("location_display", payload.location_display)
    // formData.append("location_lat", payload.location_lat.toString())
    // formData.append("location_lng", payload.location_lng.toString())
    formData.append("price", payload.price)
    formData.append("listing_type", payload.listing_type)
    formData.append("rooms", payload.rooms)
    formData.append("deposit", payload.deposit??"")
    formData.append("monthly_installment", payload.monthly_installment??"")
    formData.append("house_type", payload.rooms??"")

    // files
   
    const { data } = await api.put(`/sp/posts/edit/${slug}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })

    return data
  },

}