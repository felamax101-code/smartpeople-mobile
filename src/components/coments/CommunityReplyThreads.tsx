

/**
 * RepliesThread.tsx
 *
 * Fetches and displays replies for a comment.
 * Does NOT import CommentItem — avoids circular dependency.
 * Parent passes renderItem to control how each reply is rendered.
 */

import React, { useState,useEffect ,useCallback} from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native"
import { useQuery } from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import { Comment } from "@/types"
import { Spacing, FontSize, FontWeight ,Radius} from "@/constants/colors"
import { communityservice } from "@/services/community.sevice"

interface Props {
  commentId: string
  productSlug: string
  // parent decides how each reply renders — no circular import needed
  renderItem: (reply: Comment,onEditSuccess: any,onDeleteSuccess:any) => React.ReactNode
  onReplyPress?:(Comment:Comment)=>void
  optimisticReplies:Comment[]
     onEditSuccess?:(commentId:string,newBody:string)=>void
    onDeleteSuccess?:(CommentId:string)=>void
}

export const CommunityRepliesThread = React.memo(({
  commentId,
  productSlug,
  renderItem,
  optimisticReplies =[],
}: Props) => {
  const theme = useTheme()
  const [page, setPage] = useState(1)
  // const [allReplies, setAllReplies] = useState<Comment[]>([])

const { data, isLoading,refetch, isError,isFetching } = useQuery({
  queryKey: ["com-replies", commentId, page],
  queryFn: () => communityservice.getReplies(productSlug, commentId, page),
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
  if (data?.results) {
    if (page === 1) {
      setAccumulatedReplies(data.results)
    } else {
      setAccumulatedReplies(prev => {
        const existingIds = new Set(prev.map(r => r.id))
        const newOnes = data.results.filter((r: Comment) => !existingIds.has(r.id))
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
if (isError){
    return(
          <View style={styles.loading}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={[styles.errorText, { color: theme.textMuted }]}>Failed to load replies</Text>
            <TouchableOpacity style={[styles.retryBtn, { borderColor: theme.primary }]} onPress={()=>refetch}>
              <Text style={[styles.retryText, { color: theme.primary }]}>Try again</Text>
            </TouchableOpacity>
          </View>)
        
}
  if (accumulatedReplies.length === 0&& optimisticReplies.length===0) return null

  return (
    <View style={styles.container}>
      {/* parent renders each reply — no CommentItem import here */}
      {accumulatedReplies.map((reply) => renderItem(reply,handleReplyEdit,handleReplyDelete))}
            {optimisticReplies.map((reply) => renderItem(reply,handleReplyEdit,handleReplyDelete))}

      
      {/* load more */}
      {data?.next && (
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
    height:10,
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








