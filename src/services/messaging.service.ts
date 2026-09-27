import axios from "axios"
import { API } from "@/constants/api"
import api from "./api"
import { attachAuthInterceptors } from "./tokenRefreshService"
// separate axios instance for FastAPI
const messagingApi = axios.create({
  baseURL: API.MESSAGE_ENDPOINT,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "X-Client-Type": "mobile",
  },
})






attachAuthInterceptors(messagingApi)
//  Types 


export interface UserSearchResult {
  id: string
  username: string
  avatar: string | null
}


export interface Participant {
  id: string
  username: string
  avatar: string | null
  is_admin: boolean             // NEW — whether this member is a group admin
}

export interface Conversation {
  id: string
  is_group: boolean            
  group_name: string | null     
  group_avatar: string | null  
  created_by_id: string | null  
  post_id: string | null
  participants: Participant[]
  last_message_preview: string | null
  last_message_at: string | null
  unread_count: number
  created_at: string
}

export interface ReaderInfo {
  user_id: string
  username: string
  avatar: string | null
  read_at: string
}
export interface ReactionSummary {
  emoji: string
  count: number
  reacted_by_me: boolean
  reactors: string[]
}
  export interface QuotedMessage {
  id: string
  sender_id: string
  sender_username: string
  message_type: "text" | "image" | "offer" | "video"
  body: string | null
  media_url: string | null
  is_deleted: boolean
}


export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  sender_username: string
  sender_avatar: string | null
  message_type: "text" | "image" | "offer" | "video"
  body: string | null
  media_url: string | null
  offer_data: {
    amount: number
    currency: string
    status: "pending" | "accepted" | "declined" | "countered"
    counter_amount?: number
  } | null
  is_read: boolean
  read_at: string | null
  is_deleted: boolean
  created_at: string
  is_target_blocked: boolean
  readers: ReaderInfo[]
  reply_to_id: string | null   
  reactions: ReactionSummary[]
  replied_to: QuotedMessage | null
}

export interface SendMessagePayload {
  body?: string
  message_type: "text" | "image" | "offer" | "video"
  media_url?: string
  media_width?: number
  media_height?: number
  localUri?: string
  mimType?:string|undefined
  file?:File
  media_duration?: number
  reply_to_id?: string
  offer_data?: {
    amount: number
    currency: string
    status: string
  }
}

//  Group-specific payloads ─

export interface CreateGroupPayload {
  group_name: string
  participant_ids: string[]
  initial_message: string
}

export interface GroupMember {
  id: string
  username: string
  avatar: string | null
  is_admin: boolean
  joined_at: string | null
}

export interface UpdateGroupPayload {
 conversationId: string
  group_name?: string
  group_avatar?: { uri: string; name: string; type: string }
}
export interface MessageApiResponse{
  success:boolean,
  data:{
    messages:Message[],
    has_next:boolean
  }
}

//  Service 

export const messagingService = {

  //  conversations 

  getConversations: async (): Promise<Conversation[]> => {
    const { data } = await messagingApi.get("/conversations/")
    return data
  },

  // Start a 1-to-1 DM (unchanged)
  createConversation: async (payload: {
    recipient_id: string
    post_id?: string
    initial_message: string
  }): Promise<Conversation> => {
    const { data } = await messagingApi.post("/conversations/", payload)
    return data
  },

  //  messages ─

  getMessages: async (
    conversationId: string,
    oldestId?: string,
    limit:number=10
  ): Promise<MessageApiResponse> => {
    const params = oldestId ? { before_id: oldestId,limit:limit } : {}
    const { data } = await messagingApi.get(
      `/conversations/${conversationId}/messages/`,
      { params }
    )
    return data
  },


  sendMessage: async (
    conversationId: string,
    payload: SendMessagePayload,
    onUploadProgress?: (percent: number) => void
  ): Promise<Message> => {
    const isMedia = payload.message_type === "image" || payload.message_type === "video"

   

    const formData = new FormData()
    formData.append("message_type", payload.message_type)
    formData.append("body", payload.body?? "")
    if (payload.reply_to_id) formData.append("reply_to", payload.reply_to_id)
    if (payload.media_url && payload.message_type==="image" ) {
      formData.append("image_url", {
        uri:payload.media_url,
        name:payload.media_url.split("/").pop() || `upload-${Date.now()}.jpg`,
        type:payload.mimType 
      }as any
       ) 
    }
    if (payload.media_url && payload.message_type==="video" ) {
      formData.append("video_url", {
        uri:payload.media_url,
        name:payload.media_url.split("/").pop() || `upload-${Date.now()}.jpg`,
        type:payload.mimType 
      }as any
       ) 
    }
    const data = await messagingApi.post(
      `/conversations/${conversationId}/messages/`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },

        onUploadProgress: (event) => {
          if (!onUploadProgress || !event.total || !isMedia) return
          onUploadProgress(Math.round((event.loaded * 100) / event.total))
        },
      }
    )
    return data.data



  },

  markRead: async (messageId: string): Promise<void> => {
    await messagingApi.patch(`/conversations/messages/${messageId}/read/`)
  },

  deleteMessage: async (messageId: string, conversationId: string): Promise<void> => {
    await messagingApi.delete(`/conversations/${conversationId}/messages/${messageId}/`)
  },
   deleteMessageForMe: async (messageId: string, conversationId: string): Promise<void> => {
    await messagingApi.delete(`/conversations/message/delete-for-me/${conversationId}/${messageId}/`)
  },


  deleteConversation: async ( conversationId: string): Promise<{success:boolean}> => {
  const{data}=  await messagingApi.delete(`/conversations/delete/${conversationId}/conversation/`)
  return data
  },

  reportFromMessage: async (messageId: any, reason: string): Promise<void> => {
    const { data } = await messagingApi.delete(
      `/conversations/report/messages/${messageId}/`,
      { data: { reason } }
    )
    return data
  },

  respondToOffer: async (
    messageId: string,
    action: "accepted" | "declined" | "countered",
    counterAmount?: number
  ): Promise<void> => {
    await messagingApi.post(`/conversations/${messageId}/offer/`, {
      action,
      ...(counterAmount ? { counter_amount: counterAmount } : {}),
    })
  },

  //  group conversations ─

  /**
   * Create a new group chat.
   * The calling user is automatically added as creator + admin.
   * participant_ids should NOT include the caller.
   */
  createGroup: async (payload: CreateGroupPayload): Promise<Conversation> => {
    const { data } = await messagingApi.post("/conversations/groups/", payload)
    return data
  },

  /**
   * Fetch the full member list for a group — used in the Group Info sheet.
   * Includes is_admin and joined_at per member.
   */
  getGroupMembers: async (conversationId: string): Promise<GroupMember[]> => {
    const { data } = await messagingApi.get(
      `/conversations/groups/${conversationId}/members/`
    )
    return data
  },

  /**
   * Add one or more users to a group. Requires admin role.
   * Server performs pairwise block checks before inserting.
   */
  addGroupMembers: async (
    conversationId: string,
    userIds: string[]
  ): Promise<{ success: boolean; added: { id: string; username: string }[] }> => {
    const { data } = await messagingApi.post(
      `/conversations/groups/${conversationId}/members/`,
      { user_ids: userIds }
    )
    return data
  },

  /**
   * Remove a specific member from a group. Requires admin role.
   * If the admin removes themselves, the server auto-promotes
   * the earliest-joined remaining member.
   */
  removeGroupMember: async (
    conversationId: string,
    targetUserId: string
  ): Promise<void> => {
    await messagingApi.delete(
      `/conversations/groups/${conversationId}/members/${targetUserId}/`
    )
  },

  /**
   * Leave a group. Works for any member regardless of admin status.
   * Separate endpoint from removeGroupMember so the UX can distinguish
   * "I'm leaving" from "I'm kicking someone".
   */
  leaveGroup: async (conversationId: string): Promise<void> => {
    await messagingApi.delete(
      `/conversations/groups/${conversationId}/leave/`
    )
  },

  /**
   * Rename the group or change its avatar. Requires admin role.
   * Pass only the fields you want to change — both are optional
   * but at least one must be present (validated server-side).
   */

 
updateGroup: async ({
  conversationId,
  group_name,
  group_avatar,
}: UpdateGroupPayload): Promise<Conversation> => {
  const formData = new FormData()
 
  if (group_name !== undefined) {
    formData.append("group_name", group_name)
  }
 
  if (group_avatar !== undefined) {
    formData.append("group_avatar", group_avatar as any)
  }
 
  const { data } = await messagingApi.patch(
    `/conversations/groups/${conversationId}/`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
    // Note: on React Native, letting axios/fetch set the Content-Type
    // automatically (with the multipart boundary) is safer than setting
    // it manually. If uploads fail with a boundary error, remove this
    // headers override.
  )
  return data
},






  searchUsers: async (query: string): Promise<UserSearchResult[]> => {
    if (!query.trim()) return []
    const { data } = await messagingApi.get("/users/search/", {
      params: { q: query, limit: 20 },
    })
    return data
  },

  // add inside messagingService object

  uploadImage: async (formData: FormData): Promise<string> => {
    // posts the image as multipart/form-data
    // returns the hosted URL string from  FastAPI upload endpoint
    const { data } = await api.post("/api/upload/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return data.url
  },

  addReaction: async (conversationId: string, messageId: string, emoji: string) =>
    messagingApi.post(`/conversations/${conversationId}/messages/${messageId}/reactions/`, { emoji }),

  removeReaction: async (conversationId: string, messageId: string, emoji: string) =>
    messagingApi.delete(`/conversations/${conversationId}/messages/${messageId}/reactions/${emoji}/`),

  getUnreadCount: async (

  ): Promise<any> => {
    const { data } = await messagingApi.get(
      "/conversations/unreadCount/",

    )
    return data.total_unread
  },
}



