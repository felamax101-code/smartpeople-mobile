import  { useState, useCallback, useRef, useEffect } from "react"
import {
  View,
  StyleSheet,
  Dimensions,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  ScrollView,
  Modal
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query"
import { router } from "expo-router"
import { PostCard } from "@/components/feed/PostCard"
import { CategoryChips } from "@/components/feed/CategoryChips"
import { AuthPrompt } from "@/components/auth/AuthPrompt"
import { feedService } from "@/services/feed.service"
import { useAuthStore } from "@/stores/auth.store"
import { Post, FeedFilters, FeedApiResponse } from "@/types"
import { Colors, Spacing, Radius, FontSize ,FontWeight} from "@/constants/colors"
import { useNotificationStore } from "@/stores/notification.store"
import { notificationService } from "@/services/notification.service"
import { useTheme } from "@/hooks/useTheme"
import { useWebSocket } from "@/hooks/useWebSocket"
import { loadFeedCache,saveFeedCache } from "@/hooks/useFeedCacheHelper"
import LoadingIndicator from "@/components/ui/loadingindicator"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { useMessageStore } from "@/stores/message.store"
import { messagingService } from "@/services/messaging.service"
import { UploadProgressBadge } from "@/components/createpost/UploadProgressbadge"
const { height: SCREEN_HEIGHT } = Dimensions.get("window")

// how many posts from the end to trigger prefetch
const PREFETCH_THRESHOLD = 3
export default function FeedScreen() {
  const {setUnreadMessageCount}=useMessageStore()
  const theme = useTheme()
  const scrollOffsetRef=useRef(0)
  const [filters, setFilters] = useState<FeedFilters>({
    sort: "newest",
    page: 1,
  })
  const [searchText, setSearchText] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const[categorydropdownVisisble,setCategorydropdownVisible]=useState<boolean>(false)
  const queryClient = useQueryClient()
  const feedQueryKey = ["feed", filters, selectedCategory, searchText]
  const { user } = useAuthStore()
  const handleWSEventRef = useRef<(event: any) => void>(null)
  handleWSEventRef.current = useCallback((event: any) => {
    switch (event.type) {
      case "new_post": {
        queryClient.setQueryData(feedQueryKey, (old: any) => {
          if (!old?.pages?.length) return old
          const alreadyExist = old.pages.some((page: any) =>
            page.data.posts?.some((p: any) => p.id === event.data.id))
          if (alreadyExist) return old
          return {
            ...old,
            pages: [
              {
                //                 ...old.pages[0],
                data: {
                  ...old.pages[0].data,
                  posts: [
                    event.data,
                    ...old.pages[0].data.posts,
                  ],
                },
              },
              ...old.pages.slice(1),
            ],
          }
        })
        break
      }

      case "post_removed": {
        queryClient.setQueryData(feedQueryKey, (old: any) => {
          if (!old?.pages) return old

          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              data: {
                ...page.data,
                posts: page.data.posts.filter(
                  (p: any) => p.id !== event.data.id
                ),
              },
            })),
          }
        })
        break
      }

      case "post_updated": {
        queryClient.setQueryData(feedQueryKey, (old: any) => {
          if (!old?.pages) return old

          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              data: {
                ...page.data,
                posts: page.data.posts.map((p: any) =>
                  p.id === event.data.id
                    ? { ...p, ...event.data }
                    : p
                ),
              },
            })),
          }
        })
        break
      }

      case "change_upvotes_count_post": {
        queryClient.setQueryData(feedQueryKey, (old: any) => {
          if (!old?.pages) return old

          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              data: {
                ...page.data,
                posts: page.data.posts.map((p: Post) =>
                  p.id === event.data.id
                    ? { ...p, ...event.data }
                    : p
                ),
              },
            })),
          }
        })
        break
      }

      case "change_comments_count_post": {
        queryClient.setQueryData(feedQueryKey, (old: any) => {
          if (!old?.pages) return old

          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              data: {
                ...page.data,
                posts: page.data.posts.map((p: any) =>
                  p.id === event.data.id
                    ? { ...p, ...event.data }
                    : p
                ),
              },
            })),
          }
        });
        queryClient.setQueryData(["post", event.data.slug], (old: any) => ({
        ...old,
        comments_count: event.data.comments_count,
      }));
        break
      }



    }
  }, [feedQueryKey])

  const stableHandler = useCallback((event: any) => {
    handleWSEventRef.current?.(event)
  }, [])

  const { status } = useWebSocket({
    userId: user?.id ?? "",
    onEvent: stableHandler,
  })

  useEffect(()=>{
    if(!user) return
    
    messagingService.getUnreadCount().then(setUnreadMessageCount)
    
    
  },[user])
  // const viewabilityConfig = { itemVisiblePercentThreshold: 65}

  const flatListRef = useRef<FlatList>(null)
  const { unreadCount, setUnreadCount } = useNotificationStore()
  //  filter state 



  // fetch unread count on mount
  useEffect(() => {
    if (user) {
      notificationService.getUnreadCount().then(setUnreadCount)
    }
  }, [user])
 


 
  //  fetch categories 
  const { data: categoriesData,refetch:refetchCategory } = useQuery({
    queryKey: ["categories",user?.username??""],
    queryFn: feedService.getCategories,
    staleTime: 10 * 60 * 1000,  // categories rarely change — cache for 10 mins
  })

  //  fetch feed with pagination 
  // useInfiniteQuery manages paginated data automatically
  // each "page" is appended to the previous pages' results

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching: isRefreshing,
    refetch,
    isError,
  } = useInfiniteQuery({
    queryKey: ["feed", filters, selectedCategory, searchText],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await feedService.getFeed({
        ...filters,
        category: selectedCategory ?? undefined,
        search: searchText || undefined,
        page: pageParam,
      }) as unknown as FeedApiResponse;

      return response
    },

    getNextPageParam: (lastPage: FeedApiResponse, allPages: any) => {
      // if there's a next page URL, return next page number
      if (lastPage.data?.pagination?.has_next) return allPages.length + 1
      return undefined  // no more pages
    },
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,  // feed stays fresh for 2 mins before background refetch
  })

useEffect(() => {
  // Only hydrate the default view (no active filters/search),
  // since that's the state the user lands on when opening the app
  if (!selectedCategory && !searchText) {
    loadFeedCache().then((cached) => {
      if (cached) {
        queryClient.setQueryData(["feed", filters, selectedCategory, searchText], {
          pages: [cached.page],
          pageParams: [1],
        });
      }
    });
  }
}, []);
useEffect(() => {
  if (data?.pages?.[0] && !selectedCategory && !searchText) {
    saveFeedCache(data.pages[0]);
  }
}, [data?.pages?.[0]]);
  // flatten all pages into a single post array
  const posts: Post[] = data?.pages.flatMap((page:any) => page.data.posts ?? []) ?? []

  //  prefetch next page 
  // called when user is PREFETCH_THRESHOLD items from the end
  const prefetchNextPage = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  //  category change 
  const handleCategoryChange = useCallback((slug: string | null) => {
    setSelectedCategory(slug)
    // scroll back to top when category changes
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
  }, [])

  //  search 
  const handleSearch = useCallback((text: string) => {
    setSearchText(text)
  }, [])

  //  optimistic updates for upvote/save 
  // update the local cache immediately — don't wait for API response
  const handleUpvote = useCallback((slug: string, upvoted: boolean) => {
    queryClient.setQueryData(
      ["feed", filters, selectedCategory, searchText],
      (old: typeof data) => {
        if (!old) {    return old}
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
                    upvotes_count: p.upvotes_count + (p.is_upvoted  ? -1 : 1),
                  }
                  : p
              ),
            },
          })),
        };
      }
    );
     
    // queryClient.setQueryData(["post", slug], (old: Post) => ({
    //       ...old,
    //       is_upvoted: !old.is_upvoted,
    //       upvotes_count: old.is_upvoted
    //         ? old.upvotes_count - 1
    //         : old.upvotes_count + 1,
    //     }))
  }, [queryClient, filters, selectedCategory, searchText],

  
        

)
  const handleSave = useCallback((post_slug: string, saved: boolean) => {
    queryClient.setQueryData(
      ["feed", filters, selectedCategory, searchText],
      (old: typeof data) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page:any) => ({
            ...page,
            data: {
              ...page.data,
              posts: page.data.posts.map((p: Post) =>
                p.slug === post_slug ? { ...p, is_saved: saved ,saves_count:saved? p.saves_count+1:p.saves_count-1} : p
              ),
            },
          })),
        }
      }
    );
    // queryClient.setQueryData(["post", post_slug], (old: Post) => ({
    //     ...old,
    //     is_saved: !old.is_saved,
    //     saves_count:old.is_saved?old.saves_count-1:old.saves_count+1
    //   }))
  }, [queryClient, filters, selectedCategory, searchText, data])

  //  render post card 
  const renderPost = useCallback(
    ({ item, index }: { item: Post; index: number }) => {
      // when user is PREFETCH_THRESHOLD items from end — prefetch
      if (index === posts.length - PREFETCH_THRESHOLD) {
        prefetchNextPage()
      }

      return (
        <PostCard
          post={item}
          onUpvote={handleUpvote}
          onSave={handleSave}
          index={index}
          scrollOffset={scrollOffsetRef}
        />
      )
    },
    [posts.length, prefetchNextPage, handleUpvote, handleSave,]
  )

  //  render footer 
  const renderFooter = () => {
    if (!isFetchingNextPage) return null
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color={Colors.primary} size="small" />
        <Text style={styles.loadingText}>Loading more...</Text>
      </View>
    )
  }

  //  empty state 
  const renderEmpty = () => {
    if (isLoading) return null
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyTitle}>
          {searchText
            ? `No results for "${searchText}"`
            : selectedCategory
              ? "No posts in this category yet"
              : "No posts yet"}
        </Text>
        <Text style={styles.emptySubtitle}>
          {searchText ? "Try a different search term" : "Check back soon"}
        </Text>
        {searchText && (
          <TouchableOpacity onPress={() => setSearchText("")}>
            <Text style={styles.clearSearch}>Clear search</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container,{backgroundColor:theme.background}]} edges={["top"]}>
   {categorydropdownVisisble && (
  <TouchableOpacity
      onPress={()=>setCategorydropdownVisible(false)}
      style={[{position:"absolute",zIndex:3000, top:0,bottom:0,left:0,right:0,}]}
      >

      </TouchableOpacity>
   ) } 


      {categorydropdownVisisble && (
 <Modal
 visible={categorydropdownVisisble}
 onRequestClose={()=>setCategorydropdownVisible(false)}
  style={[styles.catDrop, { backgroundColor: theme.backgroundMuted, borderColor: theme.textPrimarylight }]}
>
  <TouchableOpacity
     style={[{justifyContent:"flex-end",alignItems:"flex-end",paddingRight:10,marginBottom:5}]}
      onPress={()=>setCategorydropdownVisible(false)}
     
    >
      <Text style={[{ color: theme.textPrimary, fontSize: FontSize.lg }]}>X</Text>
    </TouchableOpacity>
  <ScrollView>
  {categoriesData?.data.map((c) => (
    <TouchableOpacity
      key={c.id}
      onPress={()=>handleCategoryChange(c.slug)}
      style={[{ borderWidth: 1, borderColor: theme.textMuted, borderRadius: Radius.md, paddingHorizontal: 2,marginBottom:8,paddingLeft:2,backgroundColor:c.slug==selectedCategory?theme.backgroundMuted:"transparent" }]}
    >
      <Text style={[{ color: theme.textPrimary, fontSize: FontSize.lg }]}>{c.name}</Text>
    </TouchableOpacity>
  ))}
  </ScrollView>
</Modal>
      )}


      {/*  sticky header  */}
      <View style={[styles.header,{backgroundColor:theme.background}]}>
        {/* search bar */}
        <View style= {styles.headerTop} >
        <View style={[styles.searchContainer,{borderColor:theme.primaryDark}]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search posts..."
            placeholderTextColor={Colors.textMuted}
            value={searchText}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push("/notifications")}
            >
              <Text style={styles.headerButtonIcon}>🔔</Text>
              {unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity> 
            </View>
        </View>

        {/* category chips */}
        <View
        style={[{flexDirection:"row",alignItems:"center",justifyContent:"space-between"}]}
        >
        <CategoryChips
          categories={categoriesData?.data ?? []}
          selected={selectedCategory}
          onSelect={handleCategoryChange}
        />
        <View>
              <TouchableOpacity
              style={[{display:"flex",borderRadius:Radius.lg,borderWidth:2,paddingHorizontal:2, alignItems:"center",justifyContent:"center",
                borderColor:theme.textPlaceholder

              }]}
              onPress={()=>setCategorydropdownVisible((v)=>!v)}
              >
                <Text
                style={[{color:theme.textPrimary,fontSize:FontSize.lg}]}
                >
                  More
                </Text>
              </TouchableOpacity>

        </View>
        </View>
      </View>

      {/*  feed list  */}
      {isLoading ? (
        <View style={styles.loadingState}>
          <LoadingIndicator fullScreen={true}  />
          <Text style={styles.loadingStateText}>Loading feed...</Text>
        </View>
      ) :

        isError ? (
          <View style={styles.loading}>
            <Text style={[styles.errorIcon]}>
              <MaterialCommunityIcons
                          name="alert-circle-outline"
                            size={25}
                            color={`${theme.textPrimary}`}
                            />
                        
            </Text>
            <Text style={[styles.errorText, { color: theme.textMuted }]}>
              Failed to load
            </Text>
            <Text style={[styles.errorText, { color: theme.textMuted,fontSize:FontSize.sm }]}>
              This is might be a problem we are working on  </Text>
            
            <Text style={[styles.errorText, { color: theme.textMuted,fontSize:FontSize.sm }]}>
              MeanWhile make sure you are well connected to the internet       </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { borderColor: theme.primary }]}
              onPress={() => {refetch(),refetchCategory()}}
            >
              <Text style={[styles.retryText, { color: theme.primary }]}>
                Try again
              </Text>
            </TouchableOpacity>
          </View>) : (
          <FlatList
          onScroll={(e)=>{scrollOffsetRef.current=e.nativeEvent.contentOffset.y}}
          scrollEventThrottle={16}
            ref={flatListRef}
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={renderPost}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            
            showsVerticalScrollIndicator={false}
            // snap to each card — gives full-screen feel
            snapToInterval={undefined}  // we don't snap — just smooth scroll
            // pull to refresh
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing ?? false}
                onRefresh={()=>{refetch(),refetchCategory()}}
                tintColor={Colors.primary}
              />
            }
            // performance optimizations
            removeClippedSubviews={true}    // unmount off-screen items
            maxToRenderPerBatch={3}         // render 3 at a time
            windowSize={5}                  // keep 5 screens worth in memory
            initialNumToRender={2}          // start with just 2
            // getItemLayout={(_, index) => ({
            //   length: SCREEN_HEIGHT,        // approximate — actual varies by content
            //   offset: SCREEN_HEIGHT * index,
            //   index,
            // })}
          />
        )}

      {/*  auth prompt modal  */}
      {/* mounts at root level — shown globally when guest taps auth-required action */}
      <AuthPrompt />
<UploadProgressBadge/>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomRightRadius:Radius.sm,
    borderBottomLeftRadius:Radius.sm,
    borderBottomColor: Colors.gray[100],
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  catDrop:{
    position:"absolute",
    top:100,
    bottom:50,
    right:2,
    width:150,
    left:170,
    zIndex:3000,
    flexDirection:"column",
    borderRadius:Radius.lg,
    borderWidth:2,
    paddingVertical:4
  },
  scrollCont:{
    display:"flex",
    flexDirection:"column",
    gap:7
  },
  headerTop: {
    flexDirection: "row",
    
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  logo: {
    fontSize: FontSize.md,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray[100],
    alignItems: "center",
    justifyContent: "center",
  },
  headerButtonIcon: {
    fontSize: 15,
  },
  avatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: "700",
  },
  searchContainer: {
    flex:1,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.gray[100],
    borderRadius: Radius.lg,
    borderWidth:2,
    paddingHorizontal: Spacing.md,
    height: 36,
    gap: Spacing.sm,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  clearIcon: {
    fontSize: 14,
    color: Colors.textMuted,
    padding: 4,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  loadingStateText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  loadingFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: SCREEN_HEIGHT * 0.15,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  clearSearch: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: "600",
    marginTop: Spacing.sm,
  },


  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  avatarImage: {
    width: 30,
    height: 30,
    borderRadius: 25,

  },
  retryText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },


  retryBtn: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  errorText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
})



















