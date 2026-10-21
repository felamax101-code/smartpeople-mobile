import { useEffect, useMemo, useState } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { stickerService, StickerPage } from "@/services/sticker.service"
import { Sticker } from "@/types"

export type StickerScope = "discover" | "mine"

const useDebouncedValue = <T,>(value: T, delay: number) => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/**
 * discover: empty query -> trending, otherwise search (debounced)
 * mine:     the user's saved stickers (query is ignored)
 *
 * Mount only while the picker is open so nothing is fetched otherwise.
 */
export const useStickers = (query: string, scope: StickerScope = "discover") => {
  const isMine = scope === "mine"
  const debounced = useDebouncedValue(query.trim(), 400)

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    // ["stickers", "mine"] is the prefix useStickerActions invalidates
    queryKey: isMine ? ["stickers", "mine"] : ["stickers", "discover", debounced],
    queryFn: ({ pageParam = 1 }): Promise<StickerPage> => {
      if (isMine) return stickerService.mine(pageParam)
      return debounced
        ? stickerService.search(debounced, pageParam)
        : stickerService.trending(pageParam)
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.data?.pagination?.has_next ? allPages.length + 1 : undefined,
    initialPageParam: 1,
    staleTime: isMine ? 0 : 5 * 60 * 1000,
  })

  // providers can repeat items across pages -> dedupe so keyExtractor stays unique
  const stickers = useMemo<Sticker[]>(() => {
    const map = new Map<string, Sticker>()
    data?.pages.forEach((p) =>
      p.data?.stickers?.forEach((s) => map.set(`${s.source}:${s.id}`, s))
    )
    return Array.from(map.values())
  }, [data])

  return {
    stickers,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isDebouncing: !isMine && query.trim() !== debounced,
  }
}