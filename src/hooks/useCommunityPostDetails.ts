
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/stores/auth.store"
import { communityservice } from "@/services/community.sevice"
import { useAuthGate } from "@/hooks/useAuthGate"
import { Post  } from "@/types"
import {useState} from "react"
import { FeedFilters } from "@/types"
export const useCommunityPostDetail = (slug: string,cslug:string) => {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { gatedAction } = useAuthGate()
  const [filters, setFilters] = useState<FeedFilters>({
      sort: "newest",
      page: 1,
    })
    const [searchText, setSearchText] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  
  // ── fetch post 
  const {
    data: post,
    isLoading,
    error,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["com-post", slug],
    queryFn: () => communityservice.getPost(slug),
    staleTime: 5 * 60 * 1000,
  })

  // ── optimistic upvote ─────────────────────────────────────
  const upvoteMutation = useMutation({
    mutationFn: () => communityservice.toggleUpvote(slug),
    onMutate: async () => {
      // cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["com-post", slug] })

      // snapshot current state
      const previous = queryClient.getQueryData(["com-post", slug])
      // optimistically update
      queryClient.setQueryData(["com-post", slug], (old: Post) => ({
        ...old,
        is_upvoted: !old.is_upvoted,
        upvotes_count: old.is_upvoted
          ? old.upvotes_count - 1
          : old.upvotes_count + 1,
      }))
      queryClient.setQueryData(
            ["com-feed", filters, selectedCategory, searchText,cslug],
            (old: any) => {
              if (!old) return old
              return {
                ...old,
                pages: old.pages.map((page:any) => ({
                  ...page,
                  data: {
                    ...page.data,
                    posts: page.data.posts.map((p: Post) =>
                      p.slug === slug
                        ? {
                          ...p,
                          is_upvoted: !p.is_upvoted,
                          // upvotes_count: p.upvotes_count + (upvoted ? 1 : -1),
                        }
                        : p
                    ),
                  },
                })),
              };
            }
          );
        

      // return snapshot for rollback
      return { previous }
    },
    onError: (_, __, context) => {
      // rollback on error
      queryClient.setQueryData(["com-post", slug], context?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["com-post", slug] })
    },
  })

  // ── optimistic save ───────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => communityservice.toggleSave(post!.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["com-post", slug] })
      const previous = queryClient.getQueryData(["com-post", slug])
      queryClient.setQueryData(["com-post", slug], (old: Post) => ({
        ...old,
        is_saved: !old.is_saved,
        saves_count:old.is_saved?old.saves_count-1:old.saves_count+1
      }));
       queryClient.setQueryData(
            ["com-feed", filters, selectedCategory, searchText,cslug],
            (old: any) => {
              if (!old) return old
              return {
                ...old,
                pages: old.pages.map((page:any) => ({
                  ...page,
                  data: {
                    ...page.data,
                    posts: page.data.posts.map((p: Post) =>
                      p.slug === slug ? { ...p, is_saved: !p.is_saved ,saves_count:p.is_saved?p.saves_count-1:p.saves_count+1} : p
                    ),
                  },
                })),
              }
            }
          );
      return { previous }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(["com-post", slug], context?.previous)
    },
  })

 
  // ── gated actions ─────────────────────────────────────────
  const handleUpvote = () => {
    gatedAction(
      { type: "upvote", postSlug: slug },
      () => upvoteMutation.mutate()
    )
  }

  const handleSave = () => {
    gatedAction(
      { type: "save", postSlug: slug },
      () => saveMutation.mutate()
    )
  }

 

  return {
    post,
    isLoading,
    error,
    isError,
    refetch,
    handleUpvote,
    handleSave,
    isOwner: user?.id === post?.owner?.id,
  }
}











