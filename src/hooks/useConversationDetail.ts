

import { useState, useCallback, useRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { messagingService, Message } from "@/services/messaging.service"
import { useAuthStore } from "@/stores/auth.store"
import { ReaderInfo } from "./useWebSocket"
import { useQuery } from "@tanstack/react-query"
import { QuotedMessage, MessageApiResponse } from "@/services/messaging.service"
//  New shared types 

export interface ReactionSummary {
  emoji: string
  count: number
  reacted_by_me: boolean
  reactors: string[]   // first 3 usernames — used for the tooltip
}



//  Extended Message type ─
export type MessageWithExtras = Message & {
  readers: ReaderInfo[]
  reply_to_id?: string | null
  replied_to?: QuotedMessage | null
  reactions?: ReactionSummary[]
}
//hardcoded
export const REACTION_EMOJIS = [

  "👍", "👎", "❤️", "🔥", "😂", "😮", "😢", "😡", "🙏", "👏",
  "😍", "🤩", "😎", "🥳", "😱", "🤔", "🤣", "😭", "😤", "🥺",
  "😏", "🙄", "😴", "🤯", "😬", "🤗", "😇", "🥰", "😈", "💀",
  "✌️", "🤞", "🤙", "💪", "🫶", "🤝", "👋", "🫡", "🤌", "👀",
  "💯", "🎉", "✅", "❌", "💥", "⚡", "🎯", "💰", "🚀", "👑",
]

export const useConversationDetail = (conversationId: string) => {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  //  typing state 
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(true) 

  //  reply state 
  // The message currently being replied to — shown in the reply bar above
  // the input. Cleared automatically once the reply is sent.
  const [replyingTo, setReplyingTo] = useState<MessageWithExtras | null>(null)
  // ref mirrors state so onMutate (which runs in a microtask) always sees
  // the value that was active at the moment send was triggered
  const replyingToRef = useRef<MessageWithExtras | null>(null)
  const [showBanner, setShowBanner] = useState<{ show: boolean; type: "error" | "success"; message: string }>({
    show: false,
    type: "success",
    message: ""
  })

  const startReply = useCallback((message: MessageWithExtras) => {
    replyingToRef.current = message
    setReplyingTo(message)
  }, [])

  const cancelReply = useCallback(() => {
    replyingToRef.current = null
    setReplyingTo(null)
  }, [])

  const {
    data: messages = [],
    isLoading,
    isError,
    refetch,
    error,
  } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const res = await messagingService.getMessages(conversationId) as unknown as MessageApiResponse
      setHasMoreMessages(res.data.has_next)
      return res.data.messages as MessageWithExtras[]
    },
    staleTime: 0,
  })
  const loadOlderMessages = useCallback(async () => {
    if (isLoadingMore || !hasMoreMessages || messages.length === 0) return

    const oldestId = messages[0].id
    setIsLoadingMore(true)
    try {
      const res = await messagingService.getMessages(
        conversationId,
        oldestId,
      ) as unknown as MessageApiResponse

      queryClient.setQueryData(
        ["messages", conversationId],
        (old: MessageWithExtras[] | undefined) => {
          const existingIds = new Set((old ?? []).map((m) => m.id))
          const older = (res.data.messages as MessageWithExtras[])
            .filter((m) => !existingIds.has(m.id))
          return [...older, ...(old ?? [])] // prepend, oldest-first preserved
        }
      )

      setHasMoreMessages(res.data.has_next)
    } catch {
      // leave hasMoreMessages as-is — scrolling to top again will retry
    } finally {
      setIsLoadingMore(false)
    }
  }, [conversationId, messages, isLoadingMore, hasMoreMessages, queryClient])

  //  send message (with optimistic update + reply support) ─
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const sendMutation = useMutation({
    mutationFn: ({ tempId, payload }: {
      tempId: string
      payload: Parameters<typeof messagingService.sendMessage>[1]
    }) =>

      messagingService.sendMessage(conversationId, payload, (percent) => {
        setUploadProgress((prev) => ({ ...prev, [tempId]: percent }))
      }),

    onMutate: async ({ tempId, payload }) => {
      const repliedToSnapshot = replyingToRef.current

      // build the quoted preview locally — server will send back the same
      // shape, but showing it immediately keeps the UI from "jumping"
      const repliedToPreview: QuotedMessage | null = repliedToSnapshot
        ? {
          id: repliedToSnapshot.id,
          sender_id: repliedToSnapshot.sender_id,
          sender_username: repliedToSnapshot.sender_username,
          message_type: repliedToSnapshot.message_type,
          body: repliedToSnapshot.body,
          media_url: repliedToSnapshot.media_url,
          is_deleted: repliedToSnapshot.is_deleted,
        }
        : null

      const optimistic: MessageWithExtras = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: user!.id,
        sender_username: user!.username,
        sender_avatar: user!.avatar,
        message_type: payload.message_type,
        body: payload.body ?? null,
        media_url: payload.media_url ?? null,
        offer_data: payload.offer_data
          ? { ...payload.offer_data, status: "pending" }
          : null,
        is_read: false,
        read_at: null,
        is_deleted: false,
        created_at: new Date().toISOString(),
        is_target_blocked: false,
        readers: [],
        reply_to_id: payload.reply_to_id ?? null,
        replied_to: repliedToPreview,
        reactions: [],
      }

      queryClient.setQueryData(
        ["messages", conversationId],
        (old: MessageWithExtras[] | undefined) => [...(old ?? []), optimistic]
      )

      // clear the reply bar now that the message is "sent"
      replyingToRef.current = null
      setReplyingTo(null)

      return { optimistic }
    },

    onSuccess: (real, { tempId }, context) => {
      queryClient.setQueryData(
        ["messages", conversationId],
        (old: MessageWithExtras[] | undefined) => {
          const replaced = old?.map((m) =>
            m.id === context?.optimistic.id
              ? { ...real, readers: real.readers ?? [], reactions: real.reactions ?? [] }
              : m
          ) ?? []
          const seen = new Set<string>()
          return replaced.filter((m) => {
            if (seen.has(m.id)) return false
            seen.add(m.id)
            return true
          })
        }
      )
      setUploadProgress((prev) => {
        const next = { ...prev }
        delete next[tempId]
        return next
      })
    },

    onError: (_, { tempId }, context) => {
      setShowBanner({
        show: true,
        type: "error",
        message: "Failed to send.Try again"
      })
      queryClient.setQueryData(
        ["messages", conversationId],
        (old: MessageWithExtras[] | undefined) =>
          old?.filter((m) => m.id !== context?.optimistic.id) ?? []
      )
      setUploadProgress((prev) => {
        const next = { ...prev }
        delete next[tempId]
        return next
      })
    },
  })


  // wrapper so the screen doesn't need to know about reply_to_id —
  // it's pulled from replyingToRef automatically
  const sendMessage = useCallback((

    payload: Omit<Parameters<typeof messagingService.sendMessage>[1], "reply_to_id">
  ) => {
    const tempId = `temp-${Date.now()}`
    sendMutation.mutate({
      tempId,
      payload: {
        ...payload,
        reply_to_id: replyingToRef.current?.id,
      },
    })
  }, [sendMutation])

  //  append incoming WS message ─
  const appendMessage = useCallback((message: MessageWithExtras) => {
    queryClient.setQueryData(
      ["messages", conversationId],
      (old: MessageWithExtras[] | undefined) => {
        const normalised = {
          ...message,
          readers: message.readers ?? [],
          reactions: message.reactions ?? [],
        }
        if (message.sender_id == user?.id) return
        if (!old) return [normalised]
        if (old.some((m) => m.id === message.id)) return old
        return [...old, normalised]
      }
    )
    if (message.sender_id !== user?.id) {
      messagingService.markRead(message.id).catch(() => { })
    }
  }, [conversationId, user?.id, queryClient])

  //  handle read receipt ─
  const handleReadReceipt = useCallback((data: {
    message_id: string
    reader_id?: string
    read_at?: string
    readers?: ReaderInfo[]
  }) => {
    queryClient.setQueryData(
      ["messages", conversationId],
      (old: MessageWithExtras[] | undefined) =>
        old?.map((m) => {
          if (m.id !== data.message_id) return m
          if (data.readers !== undefined) {
            return { ...m, readers: data.readers, is_read: data.readers.length > 0 }
          } else if (data.reader_id && data.read_at) {
            return { ...m, is_read: true, read_at: data.read_at }
          }
          return m
        }) ?? []
    )
  }, [conversationId, queryClient])

  //  handle offer update ─
  const handleOfferUpdate = useCallback((messageId: string, offerData: any) => {
    queryClient.setQueryData(
      ["messages", conversationId],
      (old: MessageWithExtras[] | undefined) =>
        old?.map((m) => (m.id === messageId ? { ...m, offer_data: offerData } : m)) ?? []
    )
  }, [conversationId, queryClient])

  //  handle message deleted 
  const handleMessageDeleted = useCallback((messageId: string) => {
    queryClient.setQueryData(
      ["messages", conversationId],
      (old: MessageWithExtras[] | undefined) =>
        old?.map((m) =>
          m.id === messageId
            ? { ...m, is_deleted: true, body: null, image_url: null, offer_data: null }
            : m
        ) ?? []
    )
  }, [conversationId, queryClient])

  //  handle reaction update (WS: reaction_added / reaction_removed) 
  // Server sends the FULL updated summary list — we just replace it.
  const handleReactionUpdate = useCallback((data: {
    message_id: string
    reactions: ReactionSummary[]
  }) => {
    queryClient.setQueryData(
      ["messages", conversationId],
      (old: MessageWithExtras[] | undefined) =>
        old?.map((m) =>
          m.id === data.message_id ? { ...m, reactions: data.reactions } : m
        ) ?? []
    )
  }, [conversationId, queryClient])

  //  toggle reaction (optimistic) 
  // If the current user already reacted with this emoji → remove it.
  // Otherwise → add it. Updates the local cache immediately, then calls
  // the API. The WS broadcast (handleReactionUpdate) will reconcile with
  // the server's authoritative count shortly after.
  const reactionMutation = useMutation({
    mutationFn: ({ messageId, emoji, isAdding }: { messageId: string; emoji: string; isAdding: boolean }) =>
      isAdding
        ? messagingService.addReaction(conversationId, messageId, emoji)
        : messagingService.removeReaction(conversationId, messageId, emoji),

    onMutate: async ({ messageId, emoji, isAdding }) => {
      const previous = queryClient.getQueryData<MessageWithExtras[]>(["messages", conversationId])

      queryClient.setQueryData(
        ["messages", conversationId],
        (old: MessageWithExtras[] | undefined) =>
          old?.map((m) => {
            if (m.id !== messageId) return m
            const reactions = [...(m.reactions ?? [])]
            const idx = reactions.findIndex((r) => r.emoji === emoji)

            if (isAdding) {
              if (idx >= 0) {
                reactions[idx] = {
                  ...reactions[idx],
                  count: reactions[idx].count + 1,
                  reacted_by_me: true,
                  reactors: [...reactions[idx].reactors, user?.username ?? ""].slice(0, 3),
                }
              } else {
                reactions.push({
                  emoji,
                  count: 1,
                  reacted_by_me: true,
                  reactors: [user?.username ?? ""],
                })
              }
            } else if (idx >= 0) {
              const newCount = reactions[idx].count - 1
              if (newCount <= 0) {
                reactions.splice(idx, 1)
              } else {
                reactions[idx] = {
                  ...reactions[idx],
                  count: newCount,
                  reacted_by_me: false,
                  reactors: reactions[idx].reactors.filter((u) => u !== user?.username),
                }
              }
            }

            return { ...m, reactions }
          }) ?? []
      )

      return { previous }
    },

    onError: (_, __, context) => {
      setShowBanner({
        show: true,
        type: "error",
        message: "Request failed.Try again"
      })
      if (context?.previous) {
        queryClient.setQueryData(["messages", conversationId], context.previous)
      }
    },
  })

  const toggleReaction = useCallback((message: MessageWithExtras, emoji: string) => {
    const existing = message.reactions?.find((r) => r.emoji === emoji)
    const isAdding = !existing?.reacted_by_me
    reactionMutation.mutate({ messageId: message.id, emoji, isAdding })
  }, [reactionMutation])

  //  typing indicators ─
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

  //  offer response 
  const respondToOffer = useCallback(async (
    messageId: string,
    action: "accepted" | "declined" | "countered",
    counterAmount?: number
  ) => {
    await messagingService.respondToOffer(messageId, action, counterAmount)
  }, [])
  const deleteForMeMutation = useMutation({
    mutationFn: ({ messageId, conversationId }: { messageId: string; conversationId: string }) =>
      messagingService.deleteMessageForMe(messageId, conversationId),

    onMutate: async ({ messageId, conversationId }) => {
      const previous = queryClient.getQueryData<MessageWithExtras[]>(["messages", conversationId])
      queryClient.setQueryData(
        ["messages", conversationId],
        (old: MessageWithExtras[] | undefined) =>
          old?.filter((m) => m.id != messageId) ?? []
      )
      return { previous }
    },
    onSuccess: () => {
      setShowBanner({
        show: true,
        type: "success",
        message: "Message Deleted"
      })
    },

    onError: (_, { conversationId }, context) => {
      setShowBanner({
        show: true,
        type: "error",
        message: "Failed to delete.Try again"
      })
      // showToast("error", "Failed to delete.You may not be coonected to the internet. Try again")
      if (context?.previous) {
        queryClient.setQueryData(["messages", conversationId], context.previous)
      }
    },
  })
  //  delete f0r all message (optimistic) ─
  const deleteMutation = useMutation({
    mutationFn: ({ messageId, conversationId }: { messageId: string; conversationId: string }) =>
      messagingService.deleteMessage(messageId, conversationId),

    onMutate: async ({ messageId, conversationId }) => {
      const previous = queryClient.getQueryData<MessageWithExtras[]>(["messages", conversationId])
      queryClient.setQueryData(
        ["messages", conversationId],
        (old: MessageWithExtras[] | undefined) =>
          old?.map((m) =>
            m.id === messageId
              ? { ...m, is_deleted: true, body: null, image_url: null, offer_data: null }
              : m
          ) ?? []
      )
      return { previous }
    }, onSuccess: () => {
      setShowBanner({
        show: true,
        type: "success",
        message: "Message delete."
      })
    },

    onError: (_, { conversationId }, context) => {
      setShowBanner({
        show: true,
        type: "error",
        message: "Failed to delete.Try again"
      })
      if (context?.previous) {
        queryClient.setQueryData(["messages", conversationId], context.previous)
      }
    },
  })



  return {
    messages: (messages as MessageWithExtras[] | undefined) ?? [],
    isLoading,
    isLoadingMore,
    hasMoreMessages,
    loadOlderMessages,
    isError,
    refetch,
    sendMessage,
    sendError: sendMutation.error,
    isSending: sendMutation.isPending,
    appendMessage,
    handleReadReceipt,
    handleOfferUpdate,
    handleMessageDeleted,
    handleReactionUpdate,
    toggleReaction,
    handleTyping,
    typingUsers,
    respondToOffer,
    deleteMessage: deleteMutation.mutate,
    replyingTo,
    startReply,
    cancelReply,
    uploadProgress,
    deleteForMe: deleteForMeMutation.mutate,
    showBanner
  }
}





