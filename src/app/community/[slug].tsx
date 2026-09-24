

import  { useState, useCallback, useRef, useEffect, useMemo } from "react"
import {
  View,
  StyleSheet,
  Dimensions,
  TextInput,
  Image,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Animated
} from "react-native"
import { Feather } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query"
import { router, useLocalSearchParams } from "expo-router"
import { CommunityPostCard } from "@/components/feed/CommunityPostCard"
import { GroupSuggestion, GroupSuggestions } from "@/components/community/suggestion"
import { CategoryChips } from "@/components/feed/CategoryChips"
import { AuthPrompt } from "@/components/auth/AuthPrompt"
import { useAuthStore } from "@/stores/auth.store"
import { Post, FeedFilters, FeedApiResponse } from "@/types"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { useNotificationStore } from "@/stores/notification.store"
import { notificationService } from "@/services/notification.service"
import { useTheme } from "@/hooks/useTheme"
import { useWebSocket } from "@/hooks/useWebSocket"
import { communityservice } from "@/services/community.sevice"
import GuidelinesModal from "@/components/community/GuideLines"
import { AnimatedBanner, BannerType } from "@/components/activityIndicator/AnimatedBanner"
import { getAvatarColor } from "@/hooks/useUserGenerateAvatarColor"
import { ImageEditScreen } from "@/components/imageedit/ImageEditScreen"
const { height: SCREEN_HEIGHT } = Dimensions.get("window")

// how many posts from the end to trigger prefetch
const PREFETCH_THRESHOLD = 3
// show a row of group suggestions after every N posts in the feed
const GROUP_SUGGESTIONS_INTERVAL = 6
// how many groups to show per suggestions row
const GROUPS_PER_SLOT = 4

interface BannerState {
  id: number; // changing id forces AnimatedBanner to remount and re-animate
  type: BannerType;
  message: string;
}

export default function FeedScreen() {
  const theme = useTheme()

  const { slug: cslug, communityname, communityprivacy, is_member } = useLocalSearchParams<{ slug: string; communityname: string; communityprivacy: string, is_member: string }>()
  const scrollOffsetRef = useRef(0)
  const [filters, setFilters] = useState<FeedFilters>({
    sort: "newest",
    page: 1,
  })
  const [searchText, setSearchText] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const queryClient = useQueryClient()
  const feedQueryKey = ["com-feed", filters, selectedCategory, searchText]
  const { user } = useAuthStore()
  const [menuVisible, setMenuVisible] = useState<boolean>(false)

  const [banner, setBanner] = useState<BannerState | null>(null);
  const slideAnim = useRef(new Animated.Value(-300)).current // 300 = drawer width
  const [cMember,setCMember]=useState<string>("false")

  const handleWSEventRef = useRef<(event: any) => void>(null)
  handleWSEventRef.current = useCallback((event: any) => {
    switch (event.type) {
      case "new_post-com": {
        queryClient.setQueryData([...feedQueryKey, event.data.community_slug], (old: any) => {
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

      case "post_removed-com": {
        queryClient.setQueryData([...feedQueryKey, event.data.community_slug], (old: any) => {
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

      case "post_updated-community": {
        queryClient.setQueryData([...feedQueryKey, event.data.community_slug], (old: any) => {
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

      case "change_upvotes_count_post-com": {
        queryClient.setQueryData([...feedQueryKey, event.data.community_slug], (old: any) => {
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

      case "change_comments_count_post-com": {
        queryClient.setQueryData([...feedQueryKey, event.data.community_slug], (old: any) => {
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
        queryClient.setQueryData(["com-post", event.data.slug], (old: any) => ({
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
  setCMember(is_member)
} 
,[])


  const flatListRef = useRef<FlatList>(null)
  const { unreadCount, setUnreadCount } = useNotificationStore()
  const [guideLineModalVisisble, setGuideLineModalVisisble] = useState<boolean>(false)


  // fetch unread count on mount
  useEffect(() => {
    if (user) {
      notificationService.getUnreadCount().then(setUnreadCount)
    }
  }, [user])

  const showBanner = useCallback((type: BannerType, message: string) => {
    setBanner({ id: Date.now(), type, message });
  }, []);


  const { data: categoriesData } = useQuery({
    queryKey: ["categories", cslug],
    queryFn: () => communityservice.getCategories(cslug),
    staleTime: 10 * 60 * 1000,  // categories rarely change â€” cache for 10 mins
  })

  // minimal info only (avatar, name, description)  sprinkled into the feed below
  const { data: suggestedGroupsData } = useQuery({
    queryKey: ["groups", "suggestions",user?.username??""],
    queryFn: communityservice.getSuggestions,
    staleTime: 5 * 60 * 1000,
  })
  const suggestedGroups: GroupSuggestion[] = suggestedGroupsData?.data ?? []

  // split into rows of GROUPS_PER_SLOT  each insertion point in the feed
  // cycles through these rows so a long scroll doesn't repeat the same
  // groups every single time
  const groupChunks = useMemo(() => {
    if (!suggestedGroups.length) return []
    const chunks: GroupSuggestion[][] = []
    for (let i = 0; i < suggestedGroups.length; i += GROUPS_PER_SLOT) {
      chunks.push(suggestedGroups.slice(i, i + GROUPS_PER_SLOT))
    }
    return chunks
  }, [suggestedGroups])

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
    queryKey: ["com-feed", filters, selectedCategory, searchText, cslug],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await communityservice.getFeed({
        ...filters,
        category: selectedCategory ?? undefined,
        search: searchText || undefined,
        page: pageParam,
      }, cslug) as unknown as FeedApiResponse;

      return response
    },

    getNextPageParam: (lastPage, allPages) => {
      // if there's a next page URL, return next page number
      if (lastPage.data?.pagination?.has_next) return allPages.length + 1
      return undefined  // no more pages
    },
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,  // feed stays fresh for 2 mins before background refetch
  })
  // flatten all pages into a single post array
  const posts: Post[] = data?.pages.flatMap((page) => page.data?.posts ?? []) ?? []
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
  const {
    data: communityInfo

  } = useQuery({
    queryKey: ["communityInfo", cslug],
    queryFn: () => communityservice.getCommunityInfo(cslug),
  })
  const handleSearch = useCallback((text: string) => {
    setSearchText(text)
  }, [])
  // update the local cache immediately  don't wait for API response
  const handleUpvote = useCallback((slug: string, upvoted: boolean) => {
    queryClient.setQueryData(
      ["com-feed", filters, selectedCategory, searchText, cslug],
      (old: typeof data) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: {
              ...page.data,
              posts: page.data.posts.map((p: Post) =>
                p.slug === slug
                  ? {
                    ...p,
                     is_upvoted: !p.is_upvoted,
                      upvotes_count: p.upvotes_count + (p.is_upvoted && p.upvotes_count >= 0 ? -1 : 1),
                  }
                  : p
              ),
            },
          })),
        };
      }
    );

    // queryClient.setQueryData(["com-post", slug], (old: Post) => ({
    //   ...old,
    //   is_upvoted: !old.is_upvoted,
    //   upvotes_count: old.is_upvoted
    //     ? old.upvotes_count - 1
    //     : old.upvotes_count + 1,
    // }))
  }, [queryClient, filters, selectedCategory, searchText],




  )

  const [joining, setJoining] = useState<boolean>(false)
  const handleJoin = async () => {
    setJoining(true)

    try {
      const data = await communityservice.joingroup(cslug ?? "")
      queryClient.invalidateQueries({ queryKey: ["groups", "suggestions"] })
      queryClient.invalidateQueries({ queryKey: ["groups", "mine" ] })
      if (data.message === "success") {
        setCMember("true")
        showBanner("success", `Joined ${communityname}`)
      }
    }
    catch {
      showBanner("error", "Something went wrong. Try again")
    }
    finally {
      setJoining(false)
    }
  }

  const handleSave = useCallback((post_slug: string, saved: boolean) => {
    queryClient.setQueryData(
      ["com-feed", filters, selectedCategory, searchText, cslug],
      (old: typeof data) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: {
              ...page.data,
              posts: page.data.posts.map((p: Post) =>
                p.slug === post_slug ? { ...p, is_saved: saved ,saves_count:saved?p.saves_count+1:p.saves_count-1} : p
              ),
            },
          })),
        }
      }
    );
    // queryClient.setQueryData(["com-post", post_slug], (old: Post) => ({
    //   ...old,
    //   is_saved: !old.is_saved,
    //   saves_count:old.is_saved? old.saves_count-1:old.saves_count+1
    // }))
  }, [queryClient, filters, selectedCategory, searchText, data])

  const openMenu = () => {
    setMenuVisible(true)
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start()
  }

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: -300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setMenuVisible(false))
  }

  //  render post card 
  const renderPost = useCallback(
    ({ item, index }: { item: Post; index: number }) => {
      // when user is PREFETCH_THRESHOLD items from end â€” prefetch
      if (index === posts.length - PREFETCH_THRESHOLD) {
        prefetchNextPage()
      }

      // every GROUP_SUGGESTIONS_INTERVAL posts, slot in a row of group
      // suggestions  cycles through groupChunks so the same groups don't
      // repeat every time as the user scrolls
      let suggestionsForSlot: GroupSuggestion[] | null = null
      if (groupChunks.length > 0 && (index + 1) % GROUP_SUGGESTIONS_INTERVAL === 0) {
        const slotNumber = (index + 1) / GROUP_SUGGESTIONS_INTERVAL - 1
        suggestionsForSlot = groupChunks[slotNumber % groupChunks.length]
      }
      return (
        <>
          <CommunityPostCard
            post={item}
            onUpvote={handleUpvote}
            onSave={handleSave}
            index={index}
            scrollOffset={scrollOffsetRef}
            communityslug={cslug}
            communityname={communityname}

          />
          {suggestionsForSlot && <GroupSuggestions groups={suggestionsForSlot} />}
        </>
      )
    },
    [posts.length, prefetchNextPage, handleUpvote, handleSave, groupChunks]
  )

  // â”€â”€ render footer 
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
        <Text style={styles.emptyIcon}>😯</Text>
        <Text style={styles.emptyTitle}>
          {searchText
            ? `No results for "${searchText}"`
            : selectedCategory
              ? "Nothing has been posted under this category yet"
              : "No posts  in this group yet"}
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>

      {banner && (
        <AnimatedBanner
          key={banner.id}
          type={banner.type}
          message={banner.message}
          onHide={() => setBanner(null)}
        />
      )}

      {menuVisible && (
        <>
          {/* dimmed backdrop, tap to close */}
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={closeMenu}
          />
          <Animated.View
            style={[
              styles.menubar,
              { transform: [{ translateX: slideAnim }] },
            ]}
          >
            <View style={[styles.menuHeader]}>
              {communityInfo?.role === "admin" && (
                <View style={[styles.adminBar, { backgroundColor: theme.background, borderColor: theme.textMuted }]}>
                  <Text style={[styles.adminText, { color: theme.success }]} numberOfLines={2}>
                    Admin
                  </Text>
                </View>
              )}
              {communityInfo?.role === "moderator" && (
                <View style={[styles.adminBar, { backgroundColor: theme.background, borderColor: theme.textMuted }]}>
                  <Text style={[styles.adminText, { color: theme.success }]} numberOfLines={2}>
                    Moderator
                  </Text>
                </View>
              )}
              <Text style={[styles.menuTitle, { color: theme.primary, }]}>Menu</Text>
              <TouchableOpacity onPress={closeMenu} style={[{ backgroundColor: theme.textMuted }]}>
                <Feather name="x" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {communityInfo?.role === "admin" ? (
              <TouchableOpacity onPress={
                () => {
                  router.push({
                    pathname: `/community/AdminModeratorPanel/${cslug}` as any,
                    params: {
                      communityname: communityname,
                      communityslug: cslug,
                      communityprivacy: communityprivacy,
                      role: "admin"
                    },

                  })
                  setMenuVisible(false)
                }}>
                <View style={[styles.menuText, { backgroundColor: theme.background }]}>
                  <Text style={[styles.menuInnerText, { color: theme.textPrimary }]}>Admin Panel</Text>
                </View>
              </TouchableOpacity>
            ) : (communityInfo?.role === "moderator" && (
              <TouchableOpacity onPress={
                () => {
                  router.push({
                    pathname: `/community/AdminModeratorPanel/${cslug}` as any,
                    params: {
                      communityname: communityname,
                      communityslug: cslug,
                      communityprivacy: communityprivacy,
                      role: "moderator"
                    },

                  })
                  setMenuVisible(false)
                }}>
                <View style={[styles.menuText, { backgroundColor: theme.background }]}>
                  <Text style={[styles.menuInnerText, { color: theme.textPrimary }]}>Moderator Panel</Text>
                </View>
              </TouchableOpacity>
            ))
            }




            <TouchableOpacity onPress={
              () => {

                setMenuVisible(false)
                setGuideLineModalVisisble(true)
              }}>
              <View style={[styles.menuText, { backgroundColor: theme.background }]}>
                <Text style={[styles.menuInnerText, { color: theme.textPrimary }]}>Comminity Guidlines</Text>
              </View></TouchableOpacity>
          </Animated.View>
        </>
      )}



      {/*  sticky header  */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>

        {/* search bar */}
        <View style={styles.headerTop} >

          <TouchableOpacity onPress={openMenu}>
            <View style={styles.menu}>
              <Feather name="menu" size={22} color="#8ee41dfb" />
            </View>
          </TouchableOpacity>


          <View style={[styles.searchContainer, { borderColor: theme.primaryDark }]}>
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
        <View style={[styles.options, {}]}>
          {(communityInfo?.cover_image==null || communityInfo?.cover_image==undefined)?(
        <View style={[styles.avatar,{backgroundColor:getAvatarColor(communityInfo?.name??"")}]}>
          <Text>{communityInfo?.name.charAt(0)}</Text>  
        </View>
        
          ):(
          <Image
            source={{ uri: communityInfo?.cover_image ?? "" }}
            style={styles.avatar}
          />)}
          <View style={[styles.groupname, { backgroundColor: theme.textPrimary, borderColor: Colors.success }]}>
            <Text numberOfLines={1}>{communityname}</Text></View>

          {cMember === "true" ? (
            <Text onPress={() => router.push(`/community/createpost/${cslug}`)} style={[styles.innerText, { backgroundColor: theme.textPrimary }]}>Create Post</Text>
          ) : is_member === "false" ? (
            <Text onPress={() => handleJoin()} style={[styles.innerText, { backgroundColor: theme.textPrimary }]}>{joining ? "Joining" : "Join"}</Text>
          ) : null
          }
        </View>

        {/* category chips */}
        <CategoryChips
          categories={categoriesData?.data ?? []}
          selected={selectedCategory}
          onSelect={handleCategoryChange}
        />
      </View>

      {/*  feed list  */}
      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingStateText}>Loading feed...</Text>
        </View>
      ) :

        isError ? (
          <View style={styles.loading}>
            <Text style={[styles.errorIcon]}>🐻</Text>
            <Text style={[styles.errorText, { color: theme.textMuted }]}>
              Failed to load
            </Text>
            <Text style={[styles.errorText, { color: theme.textMuted }]}>
              Check your internet connection
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { borderColor: theme.primary }]}
              onPress={() => refetch()}
            >
              <Text style={[styles.retryText, { color: theme.primary }]}>
                Try again
              </Text>
            </TouchableOpacity>
          </View>) : (
          <FlatList
            onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y }}
            scrollEventThrottle={16}
            ref={flatListRef}
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={renderPost}
            extraData={groupChunks}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}

            showsVerticalScrollIndicator={false}
            // snap to each card  gives full-screen feel
            snapToInterval={undefined}  // we don't snap  just smooth scroll
            // pull to refresh
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing ?? false}
                onRefresh={refetch}
                tintColor={Colors.primary}
              />
            }
            // performance optimizations
            removeClippedSubviews={true}    // unmount off-screen items
            maxToRenderPerBatch={3}         // render 3 at a time
            windowSize={5}                  // keep 5 screens worth in memory
            initialNumToRender={2}          // start with just 2
            // getItemLayout={(_, index) => ({
            //   length: SCREEN_HEIGHT,        // approximate  actual varies by content
            //   offset: SCREEN_HEIGHT * index,
            //   index,
            // })}
          />
        )}

      {/*  auth prompt modal  */}
      {/* mounts at root level  shown globally when guest taps auth-required action */}
      <AuthPrompt />
      <GuidelinesModal visible={guideLineModalVisisble} title={`${communityname}GuideLine `} onClose={() => setGuideLineModalVisisble(false)} guidelines={communityInfo?.rules ?? []} />
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
    borderBottomRightRadius: Radius.sm,
    borderBottomLeftRadius: Radius.sm,
    borderBottomColor: Colors.gray[100],
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.gray[100],
    borderRadius: Radius.lg,
    borderWidth: 2,
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
  options: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 2
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
    color: Colors.primary,
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


  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(220, 189, 189, 0.4)",
    zIndex: 9,
  },
  menubar: {
    position: "absolute",
    top: 60,
    left: 0,
    width: 150,
    bottom: 120,
    backgroundColor: "#ffffff",
    paddingTop: 1,
    paddingHorizontal: Spacing.xs,
    zIndex: 15,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    borderRadius: 10
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 1,
    marginBottom: 6
  },
  groupname: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    borderRadius: Radius.md,
    paddingHorizontal: 2,
    borderWidth: 1,
    maxWidth:150


  },
  menuTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",

  },
  innerText: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    borderRadius: 7
  },
  menuInnerText: {

    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,




  },
  avatar: {
    position: "absolute",
    left: 15,
    top: -22,
    width: 25,
    height: 25,
    borderRadius: 24,
    zIndex: 10,
    elevation: 999
  },
  menu: {

  },
  menuText: {
    paddingVertical: 7,
    paddingHorizontal: 8,
    alignItems: "flex-start",
    justifyContent: "center",
    width: "100%",
    marginTop: 2,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.textMuted

  },
  adminBar: {
    position: "absolute",
    top: 1,
    left: 50,
    borderRadius: Radius.sm
  },
  adminText: {
    fontSize: FontSize.sm
  }
})


















