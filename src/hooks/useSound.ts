import { useQuery, useInfiniteQuery ,keepPreviousData} from "@tanstack/react-query"
import { fetchSound ,fetchSoundPosts,SoundSort} from "@/services/sounds"
export const useSound = (id?: string) =>
  useQuery({
    queryKey: ["sound", id],
    queryFn: () => fetchSound(id as string),
    enabled: !!id,
  })

export const useSoundPosts = (id?: string, sort: SoundSort = "newest") =>
  useInfiniteQuery({
    queryKey: ["sound-posts", id, sort],
    queryFn: ({ pageParam }) => fetchSoundPosts(id as string, pageParam, sort),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.has_next ? last.pagination.page + 1 : undefined,
    placeholderData: keepPreviousData, // keeps old posts visible while the new sort loads
    enabled: !!id,
  })