
import { useInfiniteQuery } from "@tanstack/react-query"
import { ReviewApiResponse } from "@/types"
import { propertyProfileService } from "@/services/SPProfile.service"
export const useUserReviews = (username: string) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["sp-user-reviews", username],
    queryFn: ({ pageParam = 1 }) =>
      propertyProfileService.getUserReviews(username, pageParam),
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






