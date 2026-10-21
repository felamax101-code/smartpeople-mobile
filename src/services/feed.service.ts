

import api from "./api"
import { ENDPOINTS } from "@/constants/api"
import {
  Post,
  Category,
  Comment,
  FeedFilters,
   FeedApiResponse,CommentApiResponse,UsersSearchResponse,
   ListingFilterValues,PickedImage,Sticker
} from "@/types"


const stickerFields = (sticker?: Sticker | null): Record<string, string> =>
  sticker
    ? {
        sticker_id: sticker.id,
        sticker_source: sticker.source,
        sticker_url: sticker.url,
        sticker_preview_url: sticker.preview_url,
        sticker_width: String(sticker.width),
        sticker_height: String(sticker.height),
      }
    : {}
const buildCommentForm = (
  body: string,
  image?: PickedImage | null,
  extra: Record<string, string | undefined> = {}
): FormData => {
  const form = new FormData()

  if (body) form.append("body", body)

  Object.entries(extra).forEach(([key, value]) => {
    if (value) form.append(key, value)
  })

  if (image) {
    form.append("image", {
      uri: image.uri,
      name: `comment-${Date.now()}.jpg`,
      type: image.mimeType,
    } as any) // React Native's FormData file shape
    form.append("image_width", String(image.width))
    form.append("image_height", String(image.height))
  }

  return form
}
export const feedService = {

  //  feed 
  getFeed: async (filters: ListingFilterValues = {}): Promise<FeedApiResponse> => {
    const params = new URLSearchParams()

    // only append params that have values
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, String(value))
      }
    })

    const { data } = await api.get(`${ENDPOINTS.FEED}?${params.toString()}`)
    return data
  },
  deleteListing: async (slug: string): Promise<void> => {
    await api.delete(ENDPOINTS.PRODUCT_DETAIL(slug))
  },
  //  post detail 
  getPost: async (slug: string): Promise<Post> => {
    const { data } = await api.get(ENDPOINTS.PRODUCT_DETAIL(slug))
    return data
  },
  getPostById: async (id: string): Promise<Post> => {
    const { data } = await api.get(`/postbyid/${id}/`)
    return data
  },
  //  categories 
  getCategories: async (): Promise<{ data: Category[] }> => {
    const { data } = await api.get(ENDPOINTS.CATEGORIES)
    return data
  },

  //  upvote 
  toggleUpvote: async (slug: string): Promise<{ upvoted: boolean; count: number }> => {
    const { data } = await api.post(ENDPOINTS.PRODUCT_UPVOTE(slug))
    return data
  },

  //  wishlist 
  toggleSave: async (postId: string): Promise<{ saved: boolean }> => {
    const { data } = await api.post(ENDPOINTS.WISHLIST_TOGGLE(postId))
    return data
  },
  repostPost: async (slug: string): Promise<{ saved: boolean }> => {
    const { data } = await api.post(`/repost/${slug}/post/`)
    return data
  },
  deleteRepostPost: async (slug: string): Promise<{ saved: boolean }> => {
    const { data } = await api.delete(`/repost/${slug}/post/`)
    return data
  },

  //  buy intent 
  registerBuyIntent: async (slug: string): Promise<void> => {
    await api.post(ENDPOINTS.PRODUCT_BUY_INTENT(slug))
  },

  //  comments 
  getComments: async (id: string, page: number): Promise<CommentApiResponse> => {
    const { data } = await api.get(ENDPOINTS.COMMENTS(id), {
      params: { page }
    })

    return data
  },
  deleteComment: async (commentId: string): Promise<{ is_deleted: boolean }> => {
    const { data } = await api.delete(`/comment/${commentId}/`)
    return data
  },


  editComment: async (commentId: string, body: string): Promise<Comment> => {
    const { data } = await api.put(`/comment/${commentId}/`, { body })
    return data
  },
  reportComment: async (commentId: string, reason: string): Promise<{ message: string }> => {
    const { data } = await api.post(`/comment/report/${commentId}/`, { reason }
    )
    return data
  },

  reportFromMessage: async (Id: any, reason: string, description: string): Promise<void> => {
    const { data } = await api.post(`/users/byid/${Id}/report/`, { reason, description }
    )
    return data
  },
reportPost: async (Id: any, reason: string, description: string): Promise<void> => {
    const { data } = await api.post(`/post/${Id}/report/`, { reason, description }
    )
    return data
  },

  reportUser: async (username: string, reason: string, description: string): Promise<{ message: string }> => {
    const { data } = await api.post(`users/${username}/report/`, { reason, description }
    )
    return data
  },
  blokUser: async (id: any, username: any, reason: string, description: string): Promise<{ message: string }> => {
    const { data } = await api.post(`block/${id}/`, { reason, description }
    )
    return data
  },

  unblokUser: async (id: any): Promise<{ message: string }> => {
    const { data } = await api.delete(`block/${id}/`)
    return data
  },
  postComment: async (
  slug: string,
  body: string,
  image?: PickedImage | null,
    sticker?: Sticker | null

): Promise<Comment> => {
  const { data } = await api.post(
    ENDPOINTS.COMMENTS(slug),
    buildCommentForm(body, image, stickerFields(sticker)),
    { headers: { "Content-Type": "multipart/form-data" } }
  )
  return data
},

  //  comment votes 
  voteComment: async (
    commentId: string,
    vote: "up" | "down"
  ): Promise<{ voted: boolean; type: string }> => {
    const { data } = await api.post(`/comments/${commentId}/vote/`, { vote })
    return data
  },

  //  replies 
  getReplies: async (
    slug: string,
    commentId: string,
    page = 1
  ): Promise<CommentApiResponse> => {
    const { data } = await api.get(
      `/post/${slug}/comments/${commentId}/replies/`,
      { params: { page } }
    )
    return data
  },

 postReply: async (
  slug: string,
  commentId: string,
  body: string,
  replyToId?: string, // optional: who specifically is being replied to
  replied_to_comment_id?: string,
  image?: PickedImage | null,
    sticker?: Sticker | null

): Promise<Comment> => {
  console.log("postrep",body)
  const { data } = await api.post(
    `/post/${slug}/comments/${commentId}/reply/`,
    buildCommentForm(body, image, {
      reply_to_id: replyToId,
      replied_to_comment_id,
      ...stickerFields(sticker),
    },),
    { headers: { "Content-Type": "multipart/form-data" } }
  )
  return data
},
      searchUsers: async (
    page: number,
    searchQuery?: string
  ): Promise<UsersSearchResponse> => {
    const { data } = await api.get(`/search/users/`,
      {
        params: {
          page: page,
          search: searchQuery
        }
      }
    )
    return data;
  },
  fetchViewsCount:async(
    slug:string

  ):Promise<{views_count:string}>=>{
    const data=await api.get(`/get/--views/${slug}/`)
    return data.data.views_count
     
  },
    viewsEndpoint:async(
    slug:string

  ):Promise<void>=>{
    await api.post(`/views/--views/${slug}/`)
     
  },

}
