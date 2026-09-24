/*
 * communityApi.ts
 *
 * Single source of truth for every community endpoint.
 * Import everything you need from here — types, API functions, and helpers.
 */

import api from "./api"
import {
  Post,
  Category,
  AdminRole,
  Comment, MyModeratorRoles,
  MyInvites,MyRequests,
  FeedFilters, PendingRequestsResponse, PendingInvitesResponse, UsersSearchResponse,
  FeedApiResponse, CommentApiResponse,
} from "@/types"
import { GroupSuggestion, CommunityInfo } from "@/components/community/suggestion"


// ─ Types ─

export interface ApiUser {
  id: number
  username: string
  avatar?: string
  verification_badge?: string
}

export interface PostImage {
  id: number
  image: string
  order: number
}

export interface PostVideo {
  id: number
  video: string
  order: number
}




export interface Community {
  id: number
  name: string
  description: string
  avatar?: string
  banner?: string
  members_count: number
  is_member: boolean
  slug: string
  category?: string
  posts_count?: number
}



export interface Pagination {
  page: number
  page_size: number
  total: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}


export interface UserGroupsApiResponse {
  data: {
    groups: GroupSuggestion[]
    pagination: {
      has_next: boolean
    }
  }
}

export type GroupPrivacy = "public" | "private" | "invite_only"

export interface CreateGroupPayload {
  name: string
  description: string
  privacy: GroupPrivacy
  rules: string[]
  cover_image?: string | null
}

export interface CreateGroupResponse {

  id: string
  slug?: string
}


export const communityservice = {

  //  feed 
  getFeed: async (filters: FeedFilters = {}, slug: string): Promise<FeedApiResponse> => {
    const params = new URLSearchParams()

    // only append params that have values
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, String(value))
      }
    })

    const { data } = await api.get(`/groups/${slug}/feed/?${params.toString()}`)
    return data
  },
//list posts that are pending admin approval
  getPendingFeed: async (filters: FeedFilters = {}, slug: string): Promise<FeedApiResponse> => {
    const params = new URLSearchParams()

    // only append params that have values
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, String(value))
      }
    })



    const { data } = await api.get(`/groups/pending/${slug}/feed/?${params.toString()}`)
    return data
  },
//lists posts that admin/moderator rejected
  getRejectedFeed: async (filters: FeedFilters = {}, slug: string): Promise<FeedApiResponse> => {
    const params = new URLSearchParams()

    // only append params that have values
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, String(value))
      }
    })

    const { data } = await api.get(`/groups/rejected/${slug}/feed/?${params.toString()}`)
    return data
  },

  deleteListing: async (slug: string): Promise<void> => {
    const { data } = await api.post(`/groups/posts/`, { slug })
    return data
  },
  //  post detail 
  getPost: async (slug: string): Promise<Post> => {
    
    const { data } = await api.get(`/groups/post/${slug}/`)
    return data
  },
  getPostById: async (id: string): Promise<Post> => {
    const { data } = await api.get(`/groups/postbyid/${id}/`)
    return data
  },
  //  categories 
  getCategories: async (slug: string): Promise<{ data: Category[] }> => {
    const { data } = await api.get(`/groups/categories/${slug}`)
    return data
  },

  //  upvote 


  //  wishlist 
  toggleSave: async (postId: string): Promise<{ saved: boolean }> => {
    const { data } = await api.post(`/groups/wishlist/${postId}/`)
    return data
  },

  //  buy intent 
  registerBuyIntent: async (slug: string): Promise<void> => {
    await api.post(`/groups/post/${slug}/buy-intent/`)
  },

  //  comments 
  getComments: async (slug: string, page: number): Promise<CommentApiResponse> => {
    const { data } = await api.get(`/groups/post/${slug}/comments/`, {
      params: { page }
    })

    return data
  },
  deleteComment: async (commentId: string): Promise<{ is_deleted: boolean }> => {
    const { data } = await api.delete(`/groups/comment/${commentId}/`)
    return data
  },


  editComment: async (commentId: string, body: string): Promise<Comment> => {
    const { data } = await api.put(`/groups/comment/${commentId}/`, { body })
    return data
  },
  reportComment: async (commentId: string, reason: string): Promise<{ message: string }> => {
    const { data } = await api.post(`/groups/user/report/${commentId}/`, { reason }
    )
    return data
  },

  reportFromMessage: async (Id: any, reason: string, description: string): Promise<void> => {
    const { data } = await api.post(`/groups/users/byid/${Id}/report/`, { reason, description }
    )
    return data
  },
  reportPost: async (Id: any, reason: string, description: string): Promise<void> => {
    const { data } = await api.post(`/groups/post/${Id}/report/`, { reason, description }
    )
    return data
  },

  reportUser: async (username: string, reason: string, description: string): Promise<{ message: string }> => {
    const { data } = await api.post(`/groups/users/${username}/report/`, { reason, description }
    )
    return data
  },
  blokUser: async (id: any, reason: string, description: string): Promise<{ message: string }> => {
    const { data } = await api.post(`/groups/block/${id}/`, { reason, description }
    )
    return data
  },

  unblokUser: async (id: any): Promise<{ message: string }> => {
    const { data } = await api.delete(`/groups/block/${id}/`)
    return data
  },
  postComment: async (slug: string, body: string): Promise<Comment> => {
    const { data } = await api.post(`/groups/post/${slug}/comments/`, { body })
    return data
  },

  //  comment votes ─
  voteComment: async (
    commentId: string,
    vote: "up" | "down"
  ): Promise<{ voted: boolean; type: string }> => {
    const { data } = await api.post(`/groups/comments/${commentId}/vote/`, { vote })
    return data
  },

  //  replies ─
  getReplies: async (
    slug: string,
    commentId: string,
    page = 1
  ): Promise<CommentApiResponse> => {
    const { data } = await api.get(
      `/groups/post/${slug}/comments/${commentId}/replies/`,
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
      `/groups/post/${slug}/comments/${commentId}/reply/`,
      { body, reply_to_id: replyToId ,replied_to_comment_id:replied_to_comment_id}
    )
    return data
  },




//suggested groups to a user
  getSuggestions: async (): Promise<{ data: GroupSuggestion[] }> => {
    const response = await api.get("/groups/suggestions/")
    return response.data
  },

//indinvidual user groups both owned and joined
  getUserGroups: async (params: { page: number }): Promise<UserGroupsApiResponse> => {
    const response = await api.get("/groups/mine/", { params })
    return response.data
  },


  //normal group joining
  joingroup: async (slug: string): Promise<{


    message: string

  }> => {
    const { data } = await api.post("/groups/join/community/", {
      slug: slug
    })
    return data
  },


  getCommunityInfo: async (slug: string): Promise<CommunityInfo> => {
    const { data } = await api.get(`/groups/get/user/community/${slug}/`,
    )
    return data
  },



  createGroup: async (payload: CreateGroupPayload): Promise<CreateGroupResponse> => {
    const formData = new FormData()
    formData.append("name", payload.name)
    formData.append("description", payload.description)
    formData.append("privacy", payload.privacy)
    formData.append("rules", JSON.stringify(payload.rules)) // backend expects rules as JSON

    if (payload.cover_image) {
      const filename = payload.cover_image.split("/").pop() ?? "avatar.jpg"
      const extMatch = /\.(\w+)$/.exec(filename)
      const ext = extMatch ? extMatch[1] : "jpg"
      // React Native's FormData wants this {uri, name, type} shape for files —
      // not a real Blob. 
      formData.append("cover_image", {
        uri: payload.cover_image,
        name: filename,
        type: `image/${ext}`,
      } as unknown as Blob)
    }

    const response = await api.post("/groups/create/community/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return response.data
  },





  fetchGroupMembers: async (
    cslug: string,
    page: number,
    searchQuery?: string
  ): Promise<UsersSearchResponse> => {
    const { data } = await api.get(`/groups/members/${cslug}/`,
      {
        params: {
          page: page,
          search: searchQuery
        }
      }
    )
    return data;
  },

  // Pending join requests — only relevant for PRIVATE groups.
  fetchPendingRequests: async (
    cslug: string,
    page: number,
    searchQuery?: string
  ): Promise<PendingRequestsResponse> => {
    const { data } = await api.get(`/groups/pending/requests/${cslug}/`,
      {
        params: {
          page: page,
          search: searchQuery
        }
      }
    )
    return data;
  },

  // Pending outgoing invites — only relevant for INVITE_ONLY groups.
  fetchPendingInvites: async (
    cslug: string,
    page: number,
    searchQuery?: string
  ): Promise<PendingInvitesResponse> => {
    const { data } = await api.get(`/groups/fetch/pending/invites/${cslug}/`,
      {
        params: {
          page: page,
          search: searchQuery
        }
      }
    )
    return data;
  },

  // Search users who are NOT in the group, to invite them.
  searchUsersToInvite: async (
    cslug: string,
    page: number,
    searchQuery: string
  ): Promise<UsersSearchResponse> => {
    const { data } = await api.get(`/groups/searchusers/${cslug}/`,
      {
        params: {
          page: page,
          search: searchQuery
        }
      }
    )
    return data;
  },

  // admin removing community memeber
  removeMember: async (cslug: string, userId: string): Promise<void> => {
    await api.post(`/groups/remove-member/${cslug}/${userId}/`)
  },
//admin approving request reseived
  approveRequest: async (cslug: string, requestId: string): Promise<void> => {
    await api.post(`/groups/approve/${cslug}/request/${requestId}/`)
  },
  //admin rejecting the request sent to a user
  rejectRequest: async (cslug: string, requestId: string): Promise<void> => {
    await api.delete(`/groups/reject/${cslug}/request/${requestId}/`)
  },
  //admin cancelling an invite sent
  cancelInvite: async (cslug: string, inviteId: string): Promise<void> => {
    await api.delete(`/groups/cancel/invite/${cslug}/${inviteId}/`)
  },
  // admin inviting a user 
  inviteUser: async (cslug: string, userId: string): Promise<void> => {
    await api.post(`/groups/invite/${cslug}/`, { user_id: userId })
  },
  getAdimnModerator: async (
    slug: string,
    page: number,
    search: string,
  ): Promise<UsersSearchResponse> => {
    const { data } = await api.get(`/groups/moderators/admin/${slug}/`,
      {
        params: {
          page: page,
          search: search
        }
      }
    )

    return data
  },

  //minimun community info
  getCommunityData: async (
    slug: string,

  ): Promise<CreateGroupPayload> => {
    const { data } = await api.get(`/groups/info/${slug}/`)
    return data
  },
  //list invites that was sent to me inviting me to join a community
  getMyInvites: async (
    page: number
  ): Promise<MyInvites> => {
    const { data } = await api.get(`/groups/myinvites/`,
      {
        params: {
          page: page
        }
      }
    )
    return data
  },
  //list requests that i sent requesting to join a agroup
  getMyRequests: async (
    page: number
  ): Promise<MyRequests> => {
    const { data } = await api.get(`/groups/mysentrequests/`,
      {
        params: {
          page: page
        }
      }
    )
    return data
  },
  //accecpt invite that was sent by the admin
  acceptInvite: async (
    
    inviteId: string
  ): Promise<void> => {
    await api.post(`/groups/acceptinvite/${inviteId}/`)
  },
  //cancell the invite that was sent
  rejectInvite: async (
    inviteId: string
  ): Promise<void> => {
    await api.delete(`/groups/rejectinvite/${inviteId}/`)
  },
 //user requesting to join a private group
  joinGroupRequest:async(
    slug:string
  ):Promise<{message:string}>=>{
   const {data}= await api.post(`/groups/request-to-join/${slug}/`)
  
  return data
  },
  //cancel request that was sent requesting to join a community
  cancelRequest: async (
    requestId: string
  ): Promise<void> => {
    await api.delete(`/groups/cancellrequest/${requestId}/`)
  },
//update community details
  updateGroup: async (
    slug: string,
    payload: Partial<CreateGroupPayload>
  ): Promise<void> => {

    const formData = new FormData()
    if (payload.name) formData.append("name", payload.name)
    if (payload.description) formData.append("description", payload.description)
    if (payload.privacy) formData.append("privacy", payload.privacy)
    if (payload.rules) formData.append("rules", JSON.stringify(payload.rules)) // backend expects rules as JSON

    if (payload.cover_image) {
      const filename = payload.cover_image.split("/").pop() ?? "avatar.jpg"
      const extMatch = /\.(\w+)$/.exec(filename)
      const ext = extMatch ? extMatch[1] : "jpg"
      // React Native's FormData wants this {uri, name, type} shape for files —
      // not a real Blob. 
      formData.append("cover_image", {
        uri: payload.cover_image,
        name: filename,
        type: `image/${ext}`,
      } as unknown as Blob)//Binary large object
    }
    await api.put(`/groups/edit/group/${slug}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    }
    )
  },

  //admin assingning roles to a moderator
  assignRole: async (
    cslug: string,
    userId: string,
    role: AdminRole
  ): Promise<void> => {
    await api.post(`/groups/make-a-user-admin-or-moderator/${cslug}/`, { user_id: userId, role: role })
  },


  addCategory: async (
    cslug: string,
    
    category: string
  ): Promise<void> => {
   await api.post(`/groups/category/add/${cslug}/`, {  category: category })
  },

   removeCategory: async (
    cslug: string,
    
    categoryId: string
  ): Promise<void> => {
    
     await api.delete(`/groups/category/remove/${cslug}/${categoryId}`,
 
      )
  },
//list users searched by admin when assigning admin/moderator roles
  searchUsersForRoleAssignment: async (
    cslug: string,
    page: number,
    searchQuery: string,
    role: AdminRole
  ): Promise<UsersSearchResponse> => {
    const { data } = await api.get(`/groups/searchUser-to-asign-community-roles/${cslug}/`,
      {
        params: {
          page: page,
          search: searchQuery
        }
      })
    return data

  },

//list roles that have been assigned to a moderator
  fetchModeratorRoles: async (
    slug: string
  ): Promise<MyModeratorRoles> => {
    const { data } = await api.get(`/groups/user/asigned-roles/${slug}`)

    return data

  },
//admin/moderator rejecting a post
  rejectPost: async (
    cslug: string,
    pslug: string,
    reason: string
  ): Promise<{ message: string }> => {
    const { data } = await api.post(`/groups/rejectpost/${cslug}/`,
      {
        post_slug: pslug,
        reason: reason
      }
    )
    return data
  },
//admin/moderator approving post
  approvePost: async (
    cslug: string,
    pslug: string
  ): Promise<{ message: string }> => {
    const { data } = await api.post(`/groups/approvepost/${cslug}/`,
      {
        post_slug: pslug
      }
    )
    return data
  },

  toggleUpvote: async (slug: string): Promise<{ upvoted: boolean; count: number }> => {
    const { data } = await api.post(`/groups/post/${slug}/upvote/`)
    return data
  },
  
fetchViewsCount:async(
    slug:string

  ):Promise<{views_count:string}>=>{
    const data=await api.get(`/groups/get/--views/${slug}/`)
    return data.data.views_count
     
  },
    viewsEndpoint:async(
    slug:string

  ):Promise<void>=>{
    await api.post(`/groups/views/--views/${slug}/`)
     
  },

  


 

}

