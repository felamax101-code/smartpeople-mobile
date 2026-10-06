
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { feedService } from "@/services/feed.service"
import { useAuthStore } from "@/stores/auth.store"
import { useAuthGate } from "@/hooks/useAuthGate"
import { Post  } from "@/types"
import {useState} from "react"
import { FeedFilters } from "@/types"
import { useNotificationToast } from "@/components/activityIndicator/ToastNotification"
export const usePostDetail = (slug: string) => {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { gatedAction } = useAuthGate()
const {showNotifToast}=useNotificationToast() 
  const [filters, setFilters] = useState<FeedFilters>({
      sort: "newest",
      page: 1,
    })
    const [searchText, setSearchText] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  
  //  fetch post ─
  const {
    data: post,
    isLoading,
    error,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["post", slug],
    queryFn: () => feedService.getPost(slug),
    staleTime: 5 * 60 * 1000,
  })

  //  optimistic upvote ─
  const upvoteMutation = useMutation({
    mutationFn: () => feedService.toggleUpvote(slug),
    onMutate: async () => {
      // cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["post", slug] })

      // snapshot current state
      const previous = queryClient.getQueryData(["post", slug])
      // optimistically update
      queryClient.setQueryData(["post", slug], (old: Post) => ({
        ...old,
        is_upvoted: !old.is_upvoted,
        upvotes_count: old.is_upvoted && old.upvotes_count>=0
          ? old.upvotes_count - 1
          : old.upvotes_count + 1,
      }))
      queryClient.setQueryData(
            ["com-feed", filters, selectedCategory, searchText],
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
      queryClient.setQueryData(["post", slug], context?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["post", slug] })
    },
  })

  //  optimistic save ─
  const saveMutation = useMutation({
    mutationFn: () => feedService.toggleSave(post!.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["post", slug] })
      const previous = queryClient.getQueryData(["post", slug])
      queryClient.setQueryData(["post", slug], (old: Post) => ({
        ...old,
        saves_count:(old.is_saved && old.saves_count>=0)? old.saves_count-1:old.saves_count+1 ,
        is_saved: !old.is_saved,
        
      }));
      showNotifToast(post?.is_saved?"Removed from your profile":"Save to your","success")
       queryClient.setQueryData(
            ["com-feed", filters, selectedCategory, searchText],
            (old: any) => {
              if (!old) return old
              return {
                ...old,
                pages: old.pages.map((page:any) => ({
                  ...page,
                  data: {
                    ...page.data,
                    posts: page.data.posts.map((p: Post) =>
                      p.slug === slug ? { ...p, is_saved: !p.is_saved,saves_count:p.is_saved?p.saves_count-1:p.saves_count+1 } : p
                    ),
                  },
                })),
              }
            }
          );
      return { previous }
    },
    onError: (_, __, context) => {
      showNotifToast("Error saving","error")
      queryClient.setQueryData(["post", slug], context?.previous)
    },
  })

  //  buy intent 
  const buyIntentMutation = useMutation({
    mutationFn: () => feedService.registerBuyIntent(slug),
  })

  //  gated actions ─
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

  const handleBuyNow = (onAuthenticated: () => void) => {
    gatedAction(
      { type: "buy_intent", postSlug: slug },
      () => {
        buyIntentMutation.mutate()
        onAuthenticated()
      }
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
    handleBuyNow,
    isOwner: user?.id === post?.owner?.id,
  }
}











