import { useState, useCallback, useRef, useEffect } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { feedService } from "@/services/feed.service"
import { FeedFilters, Post } from "@/types"
import { FeedApiResponse,UsersSearchResponse,SearchableUser } from "@/types"
const RECENT_KEY = "recent_searches"
const MAX_RECENT = 8
const DEBOUNCE_MS = 600  // delay before searching as user types

export type ViewMode = "list" | "grid"
type TABS = "posts" | "users" | "communities"

export const useSearch = () => {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [filters, setFilters] = useState<Omit<FeedFilters, "search" | "page">>({
    sort: "newest",
  })
  const debounceRef = useRef<ReturnType<typeof setTimeout>|null>(null)
   const [rootSearch, setRootSearch] = useState<TABS>("posts")

  //  load recent searches on mount 
  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY).then((stored) => {
      if (stored) setRecentSearches(JSON.parse(stored))
    })
  }, [])

  //  debounce query 
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setDebouncedQuery("")
      return
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, DEBOUNCE_MS)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  //  save to recent searches ─
  const saveToRecent = useCallback(async (term: string) => {
    if (!term.trim()) return
    const updated = [
      term,
      ...recentSearches.filter((s) => s !== term),
    ].slice(0, MAX_RECENT)

    setRecentSearches(updated)
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated))
  }, [recentSearches])

  //  remove one recent search 
  const removeRecent = useCallback(async (term: string) => {
    const updated = recentSearches.filter((s) => s !== term)
    setRecentSearches(updated)
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated))
  }, [recentSearches])

  //  clear all recent searches ─
  const clearRecent = useCallback(async () => {
    setRecentSearches([])
    await AsyncStorage.removeItem(RECENT_KEY)
  }, [])

  //  submit search ─
  const submitSearch = useCallback((term: string) => {
    const trimmed = term.trim()
    if (!trimmed) return
    saveToRecent(trimmed)
    setDebouncedQuery(trimmed)
  }, [saveToRecent])

  //  fetch results ─
  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ["search", debouncedQuery, filters],
    queryFn: ({ pageParam = 1 }) =>
      feedService.getFeed({
        ...filters,
        search: debouncedQuery,
        page: pageParam,
      }) ,
    getNextPageParam: (lastPage :FeedApiResponse, allPages) =>{
      if (lastPage.data?.pagination?.has_next){
        return allPages.length+1
      }
      return undefined
    },
    initialPageParam: 1,
    enabled: !!debouncedQuery,  // only fetch when query exists
    staleTime: 60 * 1000,
  })
const {
    data: users,
    isLoading: isLooadingUsers,
    isFetchingNextPage: isFetchingNextPageUsers,
    fetchNextPage: fetchNextPageUsers,
    hasNextPage: hasNextPageUsers,
  } = useInfiniteQuery({
    queryKey: ["search", "users", debouncedQuery, filters],
    queryFn:
      ({ pageParam = 1 }) =>
        feedService.searchUsers(
          pageParam,
          debouncedQuery
        ) as unknown as UsersSearchResponse,
    getNextPageParam: (lastPage: UsersSearchResponse, allPages) => {
      if (lastPage.data.pagination.has_next) {
        return allPages.length + 1
      }
      return undefined
    },
    initialPageParam: 1,
    enabled: (!!debouncedQuery && rootSearch === "users"),  // only fetch when query exists
    staleTime: 60 * 1000,
  })
  const results: Post[] = data?.pages.flatMap((page:FeedApiResponse) => page.data?.posts??[]) ?? []
  const totalCount = data?.pages[0]?.data?.pagination?.total ?? 0
  const isSearching = !!debouncedQuery
  const userResults: SearchableUser[] = users?.pages.flatMap((page: UsersSearchResponse) => page.data?.users ?? []) ?? []

  return {
    query,
    setQuery,
    debouncedQuery,
    submitSearch,
    recentSearches,
    removeRecent,
    clearRecent,
    results,
    totalCount,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isSearching,
    viewMode,
    setViewMode,
    filters,
    setFilters,
     setRootSearch,
    userResults,
    isLooadingUsers,
    isFetchingNextPageUsers,
    fetchNextPageUsers,
    hasNextPageUsers,
    
  }
}






