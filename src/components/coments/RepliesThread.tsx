

/**
 * RepliesThread.tsx
 *
 * Fetches and displays replies for a comment.
 * Does NOT import CommentItem — avoids circular dependency.
 * Parent passes renderItem to control how each reply is rendered.
 */

import React, { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native"
import { useQuery } from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import { feedService } from "@/services/feed.service"
import { Comment } from "@/types"
import { Spacing, FontSize, FontWeight, Radius } from "@/constants/colors"

interface Props {
  commentId: string
  postSlug: string
    replyToCommentBody:string

  // parent decides how each reply renders — no circular import needed
  renderItem: (reply: Comment, onEditSuccess: any, onDeleteSuccess: any,replyToCommentBody:string) => React.ReactNode
  optimisticReplies: Comment[]
}

export const RepliesThread = React.memo(({
  commentId,
  postSlug,
  replyToCommentBody,
  renderItem,
  optimisticReplies = [],
}: Props) => {
  const theme = useTheme()
  const [page, setPage] = useState(1)

  const { data, isLoading, refetch, isError, isFetching } = useQuery({
    queryKey: ["replies", commentId, page],
    queryFn: () => feedService.getReplies(postSlug, commentId, page),
    staleTime: 2 * 60 * 1000,
  })



  // derive allReplies from query cache directly, not local state
  const [accumulatedReplies, setAccumulatedReplies] = useState<Comment[]>([])


  const handleReplyEdit = useCallback((commentId: string, newBody: string) => {
    setAccumulatedReplies(prev =>
      prev.map(r =>
        r.id === commentId ? { ...r, body: newBody, is_edited: true } : r
      )
    )
  }, [])

  const handleReplyDelete = useCallback((commentId: string) => {
    setAccumulatedReplies(prev =>
      prev.map(r =>
        r.id === commentId ? { ...r, is_deleted: true } : r
      )
    )
  }, [])
  useEffect(() => {
    if (data?.data?.comments) {
      if (page === 1) {
        setAccumulatedReplies(data.data.comments)
      } else {
        setAccumulatedReplies(prev => {
          const existingIds = new Set(prev.map(r => r.id))
          const newOnes = data.data?.comments?.filter((r: Comment) => !existingIds.has(r.id))
          return [...prev, ...newOnes]
        })
      }
    }
  }, [data, page])
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.primary} size="small" />
      </View>
    )
  }
  if (isError) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={[styles.errorText, { color: theme.textMuted }]}>Failed to load replies</Text>
        <TouchableOpacity style={[styles.retryBtn, { borderColor: theme.primary }]} onPress={() => refetch}>
          <Text style={[styles.retryText, { color: theme.primary }]}>Try again</Text>
        </TouchableOpacity>
      </View>)

  }
  if (accumulatedReplies.length === 0 && optimisticReplies.length === 0) return null

  return (
    <View style={styles.container}>
      {accumulatedReplies.map((reply) => renderItem(reply, handleReplyEdit, handleReplyDelete,replyToCommentBody))}
      {optimisticReplies.map((reply) => renderItem(reply, handleReplyEdit, handleReplyDelete,replyToCommentBody))}


      {/* load more */}
      {data?.data?.pagination?.has_next && (
        <TouchableOpacity
          style={styles.loadMore}
          onPress={() => setPage((p) => p + 1)}
          disabled={isFetching}
        >
          {isFetching ? (
            <ActivityIndicator color={theme.primary} size="small" />
          ) : (
            <Text style={[styles.loadMoreText, { color: theme.primary }]}>
              Load more replies
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.xs,
    gap: 2,
  },
  loading: {
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  loadMore: {
    paddingVertical: Spacing.sm,
    alignItems: "center",
    marginLeft: Spacing.lg,
  },
  loadMoreText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },

  errorIcon: { fontSize: 32, marginBottom: Spacing.sm, textAlign: "center" },
  errorText: { fontSize: FontSize.sm, textAlign: "center", marginBottom: Spacing.md },
  retryBtn: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  retryText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
})








