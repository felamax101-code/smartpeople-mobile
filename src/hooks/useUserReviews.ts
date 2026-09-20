
import { useInfiniteQuery } from "@tanstack/react-query"
import { userService } from "@/services/user.service"
import { ReviewApiResponse } from "@/types"
export const useUserReviews = (username: string) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["user-reviews", username],
    queryFn: ({ pageParam = 1 }) =>
      userService.getUserReviews(username, pageParam),
   getNextPageParam: (lastPage:ReviewApiResponse, allPages:ReviewApiResponse[]) =>{
      if (lastPage.data?.pagination?.has_next){
        return allPages.length + 1
      } return undefined
    },
    initialPageParam: 1,
  })
  const reviews =data?.pages.flatMap((page:ReviewApiResponse) => page.data?.reviews ) ?? []
  const totalCount = data?.pages[0]?.data?.pagination.total ?? 0

  return {
    reviews,
    totalCount,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  }
}






