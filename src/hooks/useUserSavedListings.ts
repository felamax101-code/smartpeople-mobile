
import { useInfiniteQuery } from "@tanstack/react-query"
import { userService } from "@/services/user.service"
import { FeedApiResponse } from "@/types"
export const useUserSavedListings = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["user-listings"],
    queryFn: ({ pageParam = 1 }) =>
      userService.getUserSavedListings(pageParam),
    getNextPageParam: (lastPage:FeedApiResponse, allPages:FeedApiResponse[]) =>{
      if (lastPage.data?.pagination?.has_next){
        return allPages.length + 1
      } return undefined
    },
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
  })

  const savedListings = data?.pages.flatMap((page:FeedApiResponse) => page.data?.posts ??[]) ?? []
  const totalCount = data?.pages[0]?.data?.pagination.total ?? 0

  return {
    savedListings,
    totalCount,
    isLoading,
    fetchNextPage,
    hasNextPage,
    refetch,
    isError,
    isFetchingNextPage,
  }
}










