

import api from "./api"
import { ENDPOINTS } from "@/constants/api"
import {
  Post,
  Category,
  Comment,
  FeedFilters,
   FeedApiResponse,CommentApiResponse,UsersSearchResponse,ListingFilterValues
} from "@/types"

export const spfeedService = {

  //  feed 
  getFeed: async (filters: ListingFilterValues = {}): Promise<FeedApiResponse> => {
    const params = new URLSearchParams()

    // only append params that have values
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, String(value))
      }
    })

    const { data } = await api.get(`/sp/feed/?${params.toString()}`)
    return data
  },
  deleteListing: async (slug: string): Promise<void> => {
    await api.delete(`/sp/post/${slug}/`)
  },
  //  post detail 
  getPost: async (slug: string): Promise<Post> => {
    const { data } = await api.get(`/sp/post/${slug}/`)
    return data
  },
  getPostById: async (id: string): Promise<Post> => {
    const { data } = await api.get(`/sp/postbyid/${id}/`)
    return data
  },
  //  categories 
  getCategories: async (): Promise<{ data: Category[] }> => {
    const { data } = await api.get(`/sp/categories/`)
    return data
  },

  //  upvote 
  toggleUpvote: async (slug: string): Promise<{ upvoted: boolean; count: number }> => {
    const { data } = await api.post(`/sp/post/${slug}/upvote/`)
    return data
  },

  //  wishlist 
  toggleSave: async (postId: string): Promise<{ saved: boolean }> => {
    const { data } = await api.post(`/sp/wishlist/${postId}/`)
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
    const { data } = await api.post(`/sp/post/${Id}/report/`, { reason, description }
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
  postComment: async (slug: string, body: string): Promise<Comment> => {
    const { data } = await api.post(ENDPOINTS.COMMENTS(slug), { body })
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
    replyToId?: string,  // optional — who specifically being replied to
    replied_to_comment_id?:string
  ): Promise<Comment> => {
    const { data } = await api.post(
      `/post/${slug}/comments/${commentId}/reply/`,
      { body, reply_to_id: replyToId ,replied_to_comment_id:replied_to_comment_id}
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
    const data=await api.get(`/sp/get/--views/${slug}/`)
    return data.data.views_count
     
  },
    viewsEndpoint:async(
    slug:string

  ):Promise<void>=>{
    await api.post(`/sp/views/--views/${slug}/`)
     
  },

}


