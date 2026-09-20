import { useState,useRef } from "react"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { messagingService, Conversation, Message } from "@/services/messaging.service"
import { useAuthStore } from "@/stores/auth.store"
import { MaterialCommunityIcons } from "@expo/vector-icons"

export const useConversations = () => {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
 const [typingUsers, setTypingUsers] = useState<string[]>([])
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const {
    data: conversations,
    isLoading,
    refetch,
    isError,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: messagingService.getConversations,
    staleTime: 30 * 1000,
  })

  // ── update preview when a new WS message arrives 
  // Called from messages.tsx handleWSEvent on every "message" event.
  // Mutates the cache directly so the list updates without a full refetch.
  const updateConversationPreview = useCallback((message: Message) => {
    queryClient.setQueryData(["conversations"], (old: Conversation[] | undefined) => {
      if (!old) return old
      return old
        .map((conv) => {
          if (conv.id !== message.conversation_id) return conv

          // ── build the preview string 
          // Groups prefix the sender name so the user knows who spoke.
          // DMs show the body directly — same as before.
          let preview: string
          if (message.is_deleted) {
            preview = "🚫 Message deleted"
          } else if (message.message_type === "image") {
            preview = conv.is_group
              ? `${message.sender_username}: 📷 Image`
              : "📷 Image"
          } else if (message.message_type === "offer") {
            preview = conv.is_group
              ? `${message.sender_username}: 💰 Offer`
              : "💰 Offer"
          }
           else if (message.message_type === "video") {
            preview = conv.is_group
              ? `${message.sender_username}: video`
              : `📽️ Video`
          } else {
            preview = conv.is_group
              ? message.sender_username===user?.username
                ? `You:${message.body ?? ""}`
                :`${message.sender_username ?? ""}: ${message.body ?? ""}`
              
              : (message.body ?? "")
          }
          if (message.reply_to_id){
            preview=`↩${preview  }`

          }

          // ── unread count 
          // Compare against the current user's id — only increment for messages
          // sent by someone else.
          const isIncoming = message.sender_id !== user?.id

          return {
            ...conv,
            last_message_preview: preview,
            last_message_at: message.created_at,
            unread_count: isIncoming
              ? conv.unread_count + 1
              : conv.unread_count,
          }
        })
        // re-sort so the conversation with the latest message floats to top
        .sort((a, b) => {
          const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
          const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
          return timeB - timeA
        })
    })
  }, [queryClient, user?.id])

  // ── zero unread badge when user opens a conversation ──────────────────────
  const clearUnread = useCallback((conversationId: string) => {
    queryClient.setQueryData(["conversations"], (old: Conversation[] | undefined) =>
      old?.map((conv) =>
        conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
      )
    )
  }, [queryClient])
const handleTyping = useCallback((userId: string, isTyping: boolean) => {
      if (userId === user?.id) return
  
      if (isTyping) {
        setTypingUsers((prev) => (prev.includes(userId) ? prev : [...prev, userId]))
        clearTimeout(typingTimeoutsRef.current[userId])
        typingTimeoutsRef.current[userId] = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((id) => id !== userId))
        }, 6000)
      } else {
        clearTimeout(typingTimeoutsRef.current[userId])
        setTypingUsers((prev) => prev.filter((id) => id !== userId))
      }
    }, [user?.id])
  // ── update group name / avatar from a group_updated WS event 
  // Fired when an admin renames the group or changes its avatar.
  // Updates the conversation in the list in place — no refetch needed.
  const updateGroupInfo = useCallback((data: {
    conversation_id: string
    group_name: string
    group_avatar: string | null
  }) => {
    queryClient.setQueryData(["conversations"], (old: Conversation[] | undefined) =>
      old?.map((conv) =>
        conv.id === data.conversation_id
          ? {
              ...conv,
              group_name: data.group_name,
              group_avatar: data.group_avatar,
            }
          : conv
      )
    )
  }, [queryClient])

  // ── remove a conversation when the current user leaves or is kicked ───────
  // Fired on group_member_removed when removed_user_id === current user's id.
  // Also used locally after a successful leaveGroup() call.
  const removeConversation = useCallback((conversationId: string) => {
    queryClient.setQueryData(["conversations"], (old: Conversation[] | undefined) =>
      old?.filter((conv) => conv.id !== conversationId) ?? []
    )
    // clean up the message cache for this conversation too
    queryClient.removeQueries({ queryKey: ["messages", conversationId] })
  }, [queryClient])

  return {
    conversations: conversations ?? [],
    isLoading,
    isError,
    refetch,
    updateConversationPreview,
    clearUnread,
    updateGroupInfo,      
    removeConversation,   
     handleTyping,
    typingUsers,
  }
}