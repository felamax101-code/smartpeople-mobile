
import { useState ,useCallback} from "react"
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { feedService } from "@/services/feed.service"
import { useAuthGate } from "@/hooks/useAuthGate"
import { Comment,VerificationBadge,Post } from "@/types"
import {useAuthStore} from "@/stores/auth.store"
export const useComments = (slug: string) => {
  const queryClient = useQueryClient()
  const { gatedAction } = useAuthGate()
  const [commentText, setCommentText] = useState("")
const [replyingTo, setReplyingTo] = useState<Comment | null>(null)
const [optimisticReplies,setOptimisticReplies]=useState<Record<string,Comment[]>>({})
  const [replyiRootId,setRelyRootId]=useState<string|null>(null)

 //  fetch comments 
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["comments", slug],
    queryFn: ({ pageParam = 1 }) =>
      feedService.getComments(slug, pageParam),
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

  //  post comment 
  //  post comment mutation ─
  const postCommentMutation = useMutation<Comment, Error, string, { tempComment: Comment }>({
    mutationFn: (body) => feedService.postComment(slug, body),

    onMutate: (body) => {
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
        reply_to: null,
        parent_id: null,
        is_deleted: false,
        is_edited: false,
        replied_to:null
      }
      queryClient.setQueryData(["comments", slug], (old: any) => ({
        ...old,
        pages: old.pages.map((page: any, i: number) =>
          i === 0
            ? { ...page, data: { ...page.data, comments: [tempComment, ...page.data.comments] } }
            : page
        ),
      }))
      return { tempComment }
    },
    onSuccess: (_, __, context) => {
      //  invalidate after a delay to let the temp comment show briefly
      queryClient.setQueryData(["post", slug], (old: Post) => ({
          ...old,
          comments_count: old.comments_count+1
        }))
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["comments", slug] })
      }, 500)
    },

    onError: (_, __, context) => {

      // roll back temp comment on failure
      queryClient.setQueryData(["comments", slug], (old: any) => ({
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

  //  post reply mutation ─
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
      };replied_to_comment_id:string
    },
    { tempReply: Comment; commentId: string }>
    ({
      mutationFn: ({ commentId, body, replyToId,replied_to_comment_id }) =>
        feedService.postReply(slug, commentId, body, replyToId?.id,replied_to_comment_id),


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
          reply_to: replyingTo ? { id: replyingTo?.author.id, username: replyingTo?.author.username, } : null,
          is_deleted: false,
          is_edited: false,
          replied_to:null
        }

        setOptimisticReplies(prev => ({
          ...prev,
          [commentId]: [...(prev[commentId] ?? []), tempReply],
        }))


        return { tempReply, commentId }
      },

      onSuccess: (_, __, context) => {

        // invalidate both replies AND comments (to update replies_count)
         queryClient.setQueryData(["post", slug], (old: Post) => ({
          ...old,
          comments_count: old.comments_count+1
        }))
        queryClient.invalidateQueries({ queryKey: ["replies", context!.commentId] })
        queryClient.invalidateQueries({ queryKey: ["comments", slug] })
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
    if (!commentText.trim()) return

    gatedAction(
      { type: "comment", postSlug: slug },
      async () => {
        if (replyingTo && replyiRootId) {
          postReplyMutation.mutate({
            commentId: replyiRootId,
            body: commentText.trim(),
            replyToId: replyingTo.author,
            replied_to_comment_id:replyingTo.id

          })
          setReplyingTo(null)
          setRelyRootId(null)
        } else {
          postCommentMutation.mutate(commentText.trim())
        }
        setCommentText("")
      }
    )
  }, [commentText, replyingTo,replyiRootId, slug, gatedAction])


  return {
    replyingTo,
    setReplyingTo,
    comments,
    optimisticReplies,
    totalCount,
    isLoading,
    setRelyRootId,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    commentText,
    setCommentText,
    handlePost,
    isError,
    refetch,
    isPosting: postCommentMutation.isPending || postReplyMutation.isPending,
    ProcessError: postCommentMutation.isError || postReplyMutation.isError

  }


}






