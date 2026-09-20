

"use client"



import { create } from "zustand"

interface MessageState {
  unreadMesageCount: number
  setUnreadMessageCount: (count: number) => void
  decrementMessageUnread: () => void
  clearMessageUnread: () => void
}

export const useMessageStore = create<MessageState>((set) => ({
  unreadMesageCount: 0,

  setUnreadMessageCount: (count) => set({ unreadMesageCount: count }),

  decrementMessageUnread: () =>
    set((state) => ({
      unreadMesageCount: Math.max(0, state.unreadMesageCount - 1),
    })),

  clearMessageUnread: () => set({ unreadMesageCount: 0 }),
}

))



