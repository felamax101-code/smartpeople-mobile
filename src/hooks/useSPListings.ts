
import { useInfiniteQuery } from "@tanstack/react-query"
import { useAuthStore } from "@/stores/auth.store"
import { propertyProfileService } from "@/services/SPProfile.service"
import { FeedApiResponse } from "@/types"
export const useSPListings = (username: string) => {
  const {user}=useAuthStore()
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isError,
  } = useInfiniteQuery({
    queryKey: ["sp-user-listings", username],
    queryFn: ({ pageParam = 1 }) =>
      user?.username === username?
      propertyProfileService.getOwnListings( pageParam)
      :propertyProfileService.getUserListings(username,pageParam),
    getNextPageParam: (lastPage:FeedApiResponse, allPages:FeedApiResponse[]) =>{
      if (lastPage.data?.pagination?.has_next){
        return allPages.length + 1
      } return undefined
    },
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
  })

  const listings = data?.pages.flatMap((page:FeedApiResponse) => page.data?.posts ??[]) ?? []
  const totalCount = data?.pages[0]?.data?.pagination.total ?? 0

  return {
    listings,
    totalCount,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isError,
    refetch,
    isFetchingNextPage,
  }
}










