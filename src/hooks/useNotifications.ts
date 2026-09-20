

import { useCallback } from "react"
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { notificationService } from "@/services/notification.service"
import { useNotificationStore } from "@/stores/notification.store"
import { Notification } from "@/types"

export type NotificationFilter = "all" | "unread" | "social" | "system"

const SOCIAL_TYPES = [
  "new_follower",
  "product_upvote",
  "new_comment",
  "comment_reply",
  "new_review",
]

const SYSTEM_TYPES = [
  "product_approved",
  "product_rejected",
  "account_warning",
  "account_suspended",
  "verification",
  "appeal_update",
  "two_fa",
  "system",
]

export const useNotifications = (filter: NotificationFilter) => {
  const queryClient = useQueryClient()
  const { decrementUnread, clearUnread } = useNotificationStore()

  // ── fetch ─────────────────────────────────────────────────
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["notifications", filter],
    queryFn: ({ pageParam = 1 }) =>
      notificationService.getNotifications(
        pageParam,
        filter === "unread" ? false : undefined
      ),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.next ? allPages.length + 1 : undefined,
    initialPageParam: 1,
    staleTime: 30 * 1000,
  })

  // flatten + apply client-side type filter
  const allNotifications: Notification[] =
    data?.pages.flatMap((p) => p.results) ?? []

  const notifications = allNotifications.filter((n) => {
    if (filter === "social") return SOCIAL_TYPES.includes(n.notification_type)
    if (filter === "system") return SYSTEM_TYPES.includes(n.notification_type)
    return true  // "all" and "unread" already filtered by API
  })

  const totalCount = data?.pages[0]?.count ?? 0

  // ── mark one as read ──────────────────────────────────────
  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onMutate: async (id) => {
      // optimistic update
      queryClient.setQueryData(
        ["notifications", filter],
        (old: any) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              results: page.results.map((n: Notification) =>
                n.id === id ? { ...n, is_read: true } : n
              ),
            })),
          }
        }
      )
      decrementUnread()
    },
  })

  // ── mark all as read ──────────────────────────────────────
  const markAllReadMutation = useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess: () => {
      queryClient.setQueryData(
        ["notifications", filter],
        (old: any) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              results: page.results.map((n: Notification) => ({
                ...n,
                is_read: true,
              })),
            })),
          }
        }
      )
      clearUnread()
    },
  })

  // ── delete one ────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationService.deleteOne(id),
    onMutate: async (id) => {
      queryClient.setQueryData(
        ["notifications", filter],
        (old: any) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              results: page.results.filter(
                (n: Notification) => n.id !== id
              ),
            })),
          }
        }
      )
    },
  })

  // ── delete all ────────────────────────────────────────────
  const deleteAllMutation = useMutation({
    mutationFn: notificationService.deleteAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      clearUnread()
    },
  })

  const handleMarkRead = useCallback(
    (id: string, isRead: boolean) => {
      if (!isRead) markReadMutation.mutate(id)
    },
    [markReadMutation]
  )

  return {
    notifications,
    totalCount,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    markRead: handleMarkRead,
    markAllRead: markAllReadMutation.mutate,
    deleteOne: deleteMutation.mutate,
    deleteAll: deleteAllMutation.mutate,
    isMarkingAll: markAllReadMutation.isPending,
  }
}








