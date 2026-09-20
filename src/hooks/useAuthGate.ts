

import { useCallback } from "react"
import { useAuthStore } from "@/stores/auth.store"
import { PendingAction, PendingActionType } from "@/types"

// contextual messages per action type
const AUTH_MESSAGES: Record<PendingActionType, string> = {
  upvote: "Join to like posts ",
  save: "Join to save this item",
  comment: "Join to join the conversation",
  message: "Join to message other developers",
  buy_intent: "Join to buy this item",
  follow: "Join to follow this person",
}

export const useAuthGate = () => {
  const { isAuthenticated, requireAuth } = useAuthStore()

  const gatedAction = useCallback(
    (
      action: PendingAction,
      onAuthenticated: () => void
    ) => {
      if (isAuthenticated) {
        // user is logged in → execute immediately
        onAuthenticated()
        return
      }
      // guest → save pending action → show auth prompt
      requireAuth(action, AUTH_MESSAGES[action.type])
    },
    [isAuthenticated, requireAuth]
  )

  return { gatedAction, isAuthenticated }
}







