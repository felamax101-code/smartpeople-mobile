
import { useState, useCallback } from "react"
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { useAuthGate } from "@/hooks/useAuthGate"
import { AxiosError } from "axios"
import { communityservice } from "@/services/community.sevice"
import { Comment, VerificationBadge, PickedImage,Sticker } from "@/types"
import { pickCommentImage } from "./usePickCommentImage"
import { useAuthStore } from "@/stores/auth.store"
export const useCommunityComments = (slug: string) => {
  const queryClient = useQueryClient()
  const { gatedAction } = useAuthGate()
  const [commentText, setCommentText] = useState("")
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null)
  const [optimisticReplies, setOptimisticReplies] = useState<Record<string, Comment[]>>({})
  const [replyiRootId, setRelyRootId] = useState<string | null>(null)
  const [image, setImage] = useState<PickedImage | null>(null)
  const [sticker, setSticker] = useState<Sticker | null>(null)
  

  const pickImage = useCallback(async () => {
    const picked = await pickCommentImage()

    if (picked) {setImage(picked);    setSticker(null);}
  }, [])
    const selectSticker = useCallback((s: Sticker) => {
    setSticker(s)
    setImage(null)
  }, [])
  // ── fetch comments ────────────────────────────────────────
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["com-comments", slug],
    queryFn: ({ pageParam = 1 }) =>
      communityservice.getComments(slug, pageParam),
    getNextPageParam: (lastPage: any, allPages) => {
      if (lastPage.data?.pagination?.has_next) {
        return allPages.length + 1
      } return undefined
    },
    initialPageParam: 1,
  })
  const { user } = useAuthStore()
  const comments = data?.pages.flatMap((page: any) => page.data?.comments) ?? []
  const totalCount = data?.pages[0]?.data?.pagination.total ?? 0

  // ── post comment ──────────────────────────────────────────
  // ── post comment mutation ─────────────────────────────
  const postCommentMutation = useMutation<Comment, Error, { body: string; image: PickedImage | null;sticker: Sticker | null }, { tempComment: Comment }>({
    mutationFn: ({ body, image }) => communityservice.postComment(slug, body, image,sticker),

    onMutate: ({ body, image }) => {
      const tempComment: Comment = {
        id: `temp-${Date.now()}`,
        body,
        created_at: new Date().toISOString(),
        author: user as any,
        upvotes_count: 0,
        downvotes_count: 0,
        has_upvoted: false,
        has_downvoted: false,
        replies_count: 0,
        parent_id: null,
        reply_to: null,
        is_deleted: false,
        is_edited: false,
        replied_to: null,
        image: image ? image.uri : null,
                sticker


      }
      queryClient.setQueryData(["com-comments", slug], (old: any) => (
        old ? {
          ...old,
          pages: old.pages.map((page: any, i: number) =>
            i === 0
              ? { ...page, data: { ...page.data, comments: [tempComment, ...page.data.comments] } }
              : page
          ),
        } : old))
      return { tempComment }
    },
    onSuccess: (_, __, context) => {
      setImage(null)
      setSticker(null)
      //  invalidate after a delay to let the temp comment show briefly
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["com-comments", slug] })
      }, 500)
    },

    onError: (_, __, context) => {

      // roll back temp comment on failure
      queryClient.setQueryData(["com-comments", slug], (old: any) => ({
        ...old,
        pages: old.pages.map((page: any, i: number) =>
          i === 0
            ? {
              ...page,
              data: {
                ...page.data,
                comments: page.data.comments.filter(
                  (c: Comment) => c.id !== context?.tempComment.id
                ),
              },
            }
            : page
        ),
      }))
    },


  })
  // ── post reply mutation ───────────────────────────────
  const postReplyMutation = useMutation<
    Comment,
    Error,
    {
      commentId: string; body: string; replyToId?: {
        id: string
        username: string
        name: string | null
        avatar: string | null
        verification_badge: VerificationBadge
      }; replied_to_comment_id: string; image: PickedImage | null;sticker: Sticker | null
    },
    { tempReply: Comment; commentId: string }>
    ({
      mutationFn: ({ commentId, body, replyToId, replied_to_comment_id, image }) =>
        
        communityservice.postReply(slug, commentId, body, replyToId?.id, replied_to_comment_id, image,sticker),

      //  commentId is already correctly resolved in handlePost
      onMutate: ({ body, commentId }) => {
        const tempReply: Comment = {
          id: `temp-${Date.now()}`,
          body,
          created_at: new Date().toISOString(),
          author: user as any,
          upvotes_count: 0,
          downvotes_count: 0,
          has_upvoted: false,
          has_downvoted: false,
          replies_count: 0,
          parent_id: commentId,
          reply_to: replyingTo ? { id: replyingTo?.author.id, username: replyingTo?.author.username } : null,
          is_deleted: false,
          is_edited: false,
          replied_to: null,
          image: image ? image.uri : null,
          sticker

        }

        setOptimisticReplies(prev => ({
          ...prev,
          [commentId]: [...(prev[commentId] ?? []), tempReply],
        }))


        return { tempReply, commentId }
      },

      onSuccess: (_, __, context) => {
         setReplyingTo(null)
          setRelyRootId(null)
          setImage(null)
          setSticker(null)
        // invalidate both replies AND comments (to update replies_count)
        queryClient.invalidateQueries({ queryKey: ["com-replies", context!.commentId] })
        queryClient.invalidateQueries({ queryKey: ["com-comments", slug] })
        // clear optimistic only AFTER invalidation settles
        setTimeout(() => {
          setOptimisticReplies(prev => ({
            ...prev,
            [context!.commentId]: (prev[context!.commentId] ?? [])
              .filter(r => r.id !== context!.tempReply.id)
          }))
        }, 500)
      },

      onError: (_, __, context) => {

        setOptimisticReplies(prev => ({
          ...prev,
          [context!.commentId]: prev[context!.commentId].filter(r => r.id !== context!.tempReply.id),
        }))
      },
    })


  const handlePost = useCallback(() => {
    if (!commentText.trim() && !image && !sticker) return
    const body = commentText.trim()
    gatedAction(
      { type: "comment", postSlug: slug },
      async () => {

        if (replyingTo && replyiRootId) {
          postReplyMutation.mutate({
            commentId: replyiRootId,
            image,
            sticker,
            body: commentText.trim(),
            replyToId: replyingTo.author,
            replied_to_comment_id: replyingTo.id
          })
         
        } else {

          postCommentMutation.mutate({ body, image ,sticker})
        }
        setCommentText("")
      }
    )
  }, [commentText, replyingTo, slug, gatedAction, replyiRootId,image,sticker])


  return {
    replyingTo,
    setReplyingTo,
    comments,
    optimisticReplies,
    totalCount,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    commentText,
    setCommentText,
    handlePost,
    isError,
    refetch,
    image,
    pickImage,
    setImage,
    setRelyRootId,
    sticker,
    setSticker,
    selectSticker,
    isPosting: postCommentMutation.isPending || postReplyMutation.isPending,
    ProcessError: postCommentMutation.isError || postReplyMutation.isError

  }


}






