import { SoundDetail, PostsPage } from "@/types"
import api from "./api"
export const fetchSound = async (id: string): Promise<SoundDetail> => {
  const res = await api.get(`/sounds/${id}/`)
  return res.data.data
}

export type SoundSort = "newest" | "most_viewed" | "most_upvoted"

export const fetchSoundPosts = async (
  id: string,
  page: number,
  sort: SoundSort = "newest"
): Promise<PostsPage> => {
  const res = await api.get(`/sounds/${id}/posts/`, { params: { page, sort } })
  return res.data.data
}