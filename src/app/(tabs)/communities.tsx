import  { useCallback, useEffect, useRef, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  TouchableOpacity,
} from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { GroupListItem } from "@/components/community/GroupListItem"
import { GroupSuggestion, GroupSuggestions } from "@/components/community/suggestion"
import { communityservice } from "@/services/community.sevice"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { useTheme } from "@/hooks/useTheme"
import { useAuthStore } from "@/stores/auth.store"
import { router } from "expo-router"
import { useMessageStore } from "@/stores/message.store"
import { messagingService } from "@/services/messaging.service"
import { AnimatedBanner, BannerType } from "@/components/activityIndicator/AnimatedBanner"
// how many rows from the end of a list to trigger prefetch
const PREFETCH_THRESHOLD = 3

interface InviteItem {
  id: string
  community_name: string
  community_slug: string
  created_at: string // ISO date
}

interface RequestItem {
  id: string
  community_name: string
  community_slug: string
  created_at: string // ISO date
}

type TabKey = "all" | "mine" | "invites" | "requests"

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return iso
  }
}
interface BannerState {
  id: number; // changing id forces AnimatedBanner to remount and re-animate
  type: BannerType;
  message: string;
}

//  invite card 
function InviteCard({
  item,
  onAccept,
  onReject,
  isAccepting,
  isRejecting,
}: {
  item: InviteItem
  onAccept: (id: string) => void
  onReject: (id: string) => void
  isAccepting: boolean
  isRejecting: boolean
}) {
  const theme = useTheme()
  const isBusy = isAccepting || isRejecting
  
  return (
    <View style={[cardStyles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <TouchableOpacity onPress={() => router.push(`/community/${item.community_slug}`)} activeOpacity={0.7}>
        <Text style={[cardStyles.cardName, { color: theme.textPrimary }]}>{item.community_name}</Text>
        <Text style={[cardStyles.cardDate, { color: theme.textMuted }]}>
          Invited {formatDate(item.created_at)}
        </Text>
      </TouchableOpacity>
      <View style={cardStyles.cardActions}>
        <TouchableOpacity
          style={[cardStyles.actionBtn, cardStyles.acceptBtn, isBusy && cardStyles.actionBtnDisabled]}
          onPress={() => onAccept(item.id)}
          disabled={isBusy}
        >
          {isAccepting ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={cardStyles.acceptBtnText}>Accept</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[cardStyles.actionBtn, cardStyles.rejectBtn, { borderColor: theme.border }, isBusy && cardStyles.actionBtnDisabled]}
          onPress={() => onReject(item.id)}
          disabled={isBusy}
        >
          {isRejecting ? (
            <ActivityIndicator color={Colors.warning} size="small" />
          ) : (
            <Text style={[cardStyles.rejectBtnText, { color: Colors.warning }]}>Reject</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

//  request card ─
function RequestCard({
  item,
  onCancel,
  isCancelling,
}: {
  item: RequestItem
  onCancel: (id: string) => void
  isCancelling: boolean
}) {
  const theme = useTheme()
  return (
    <View style={[cardStyles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <TouchableOpacity onPress={() => router.push(`/community/${item.community_slug}`)} activeOpacity={0.7}>
        <Text style={[cardStyles.cardName, { color: theme.textPrimary }]}>{item.community_name}</Text>
        <Text style={[cardStyles.cardDate, { color: theme.textMuted }]}>
          Requested {formatDate(item.created_at)}
        </Text>
      </TouchableOpacity>
      <View style={cardStyles.cardActions}>
        <TouchableOpacity
          style={[cardStyles.actionBtn, cardStyles.rejectBtn, { borderColor: theme.border }, isCancelling && cardStyles.actionBtnDisabled]}
          onPress={() => onCancel(item.id)}
          disabled={isCancelling}
        >
          {isCancelling ? (
            <ActivityIndicator color={Colors.warning} size="small" />
          ) : (
            <Text style={[cardStyles.rejectBtnText, { color: Colors.warning }]}>Cancel</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default function MyGroupsScreen() {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabKey>("all")
  const [banner, setBanner] = useState<BannerState | null>(null);
  const {setUnreadMessageCount}=useMessageStore()
  //  fetch the user's joined groups, paginated ─
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
    queryKey: ["groups", "mine", user?.username??""],
    queryFn: ({ pageParam = 1 }) => communityservice.getUserGroups({ page: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.data?.pagination?.has_next) return allPages.length + 1
      return undefined
    },
    initialPageParam: 1,
    staleTime: 3 * 60 * 1000,
  })
  const groups: GroupSuggestion[] = data?.pages.flatMap((page) => page.data.groups ?? []) ?? []
  // "My Communities"
  const myAdminGroups = groups.filter((g: GroupSuggestion) => g.role === "admin")
  const visibleGroups = activeTab === "mine" ? myAdminGroups : groups
  const [suggestionVisisble, setsuggestionVisisble] = useState<boolean>(true)
  //  fetch group suggestions shown at the bottom ─
  const { data: suggestedGroupsData } = useQuery({
    queryKey: ["groups", "suggestions", user?.username??""],
    queryFn: communityservice.getSuggestions,
    staleTime: 1000,
  })
  useEffect(()=>{
    if(!user) return
    
    messagingService.getUnreadCount()
    .then(setUnreadMessageCount)
    .catch((e)=>{})
    
    
  },[])
  //  fetch my pending invites ─
  const {
    data: myInvitesData,
    fetchNextPage: fetchMyInvitesNextPage,
    hasNextPage: myInvitesHasNextPage,
    isFetchingNextPage: myInvitesIsFetchingNextPage,
    isLoading: myInvitesIsLoading,
    isFetching: myInvitesIsRefreshing,
    refetch: refetchMyInvites,
    isError: isMyInvitesError,
  } = useInfiniteQuery({
    queryKey: ["groups", "invites", user?.username??""],
    queryFn: ({ pageParam = 1 }) => communityservice.getMyInvites(pageParam),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.data?.pagination?.has_next) return allPages.length + 1
      return undefined
    },
    initialPageParam: 1,
    staleTime: 3 * 60 * 1000,
    enabled: !!user && activeTab === "invites",
  })
  const invites: InviteItem[] = myInvitesData?.pages.flatMap((page) => page.data.invites ?? []) ?? []
  //  fetch my pending join requests 
  const {
    data: myRequestsData,
    fetchNextPage: fetchMyRequestsNextPage,
    hasNextPage: myRequestsHasNextPage,
    isFetchingNextPage: myRequestsIsFetchingNextPage,
    isLoading: myRequestsIsLoading,
    isFetching: myRequestsIsRefreshing,
    refetch: refetchMyRequests,
    isError: isMyRequestsError,
  } = useInfiniteQuery({
    queryKey: ["groups", "requests", user?.username??""],
    queryFn: ({ pageParam = 1 }) => communityservice.getMyRequests(pageParam),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.data?.pagination?.has_next) return allPages.length + 1
      return undefined
    },
    initialPageParam: 1,
    staleTime: 3 * 60 * 1000,
    enabled: !!user && activeTab === "requests",
  })
  const requests: RequestItem[] = myRequestsData?.pages.flatMap((page) => page.data.requests ?? []) ?? []

const showBanner = useCallback((type: BannerType, message: string) => {
    setBanner({ id: Date.now(), type, message });
  }, []);

  //  mutations: accept / reject invite, cancel request 
  const acceptInviteMutation = useMutation({
    mutationFn: (inviteId: string) => communityservice.acceptInvite(inviteId),
    onSuccess: () => {
      showBanner("success","Invite accepted")
      queryClient.invalidateQueries({ queryKey: ["groups", "invites", user?.username??""] })
      queryClient.invalidateQueries({ queryKey: ["groups", "mine", user?.username??""] })
    },
    onError:()=>{
      showBanner("error","Something went wrong. Truy again")
    }
  })

  const rejectInviteMutation = useMutation({
    mutationFn: (inviteId: string) => communityservice.rejectInvite(inviteId),
    onSuccess: () => {
      showBanner("success","Request rejected")
      queryClient.invalidateQueries({ queryKey: ["groups", "invites", user?.username??""] })
    },
      onError:()=>{
      showBanner("error","Something went wrong. Truy again")
    }
  })

  const cancelRequestMutation = useMutation({
    mutationFn: (requestId: string) => communityservice.cancelRequest(requestId),
    onSuccess: () => {
      showBanner("success","Request cancelled")
      queryClient.invalidateQueries({ queryKey: ["groups", "requests", user?.username??""] })
    },
      onError:()=>{
      showBanner("error","Something went wrong. Truy again")
    }
  })

  const handleAcceptInvite = useCallback((id: string) => acceptInviteMutation.mutate(id), [acceptInviteMutation])
  const handleRejectInvite = useCallback((id: string) => rejectInviteMutation.mutate(id), [rejectInviteMutation])
  const handleCancelRequest = useCallback((id: string) => cancelRequestMutation.mutate(id), [cancelRequestMutation])

  //  animated error banner ─
  const wasErrorRef = useRef(false)

  useEffect(() => {
    const hasError = isMyInvitesError || isMyRequestsError
    if (hasError && !wasErrorRef.current) {
      // a fresh error just appeared — make sure it's shown even if previously dismissed
      showBanner("error","Error loading your requests and invites")
    }
    wasErrorRef.current = hasError
  }, [isMyInvitesError, isMyRequestsError])

  

  
  //  prefetch next page (joined groups) 
  const prefetchNextPage = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const prefetchNextInvites = useCallback(() => {
    if (myInvitesHasNextPage && !myInvitesIsFetchingNextPage) {
      fetchMyInvitesNextPage()
    }
  }, [myInvitesHasNextPage, myInvitesIsFetchingNextPage, fetchMyInvitesNextPage])

  const prefetchNextRequests = useCallback(() => {
    if (myRequestsHasNextPage && !myRequestsIsFetchingNextPage) {
      fetchMyRequestsNextPage()
    }
  }, [myRequestsHasNextPage, myRequestsIsFetchingNextPage, fetchMyRequestsNextPage])

  //  render a joined-group row ─
  const renderGroup = useCallback(
    ({ item, index }: { item: GroupSuggestion; index: number }) => {
      if (index === visibleGroups.length - PREFETCH_THRESHOLD) {
        prefetchNextPage()
      }
      return <GroupListItem group={item} />
    },
    [visibleGroups.length, prefetchNextPage]
  )

  const renderInvite = useCallback(
    ({ item, index }: { item: InviteItem; index: number }) => {
      if (index === invites.length - PREFETCH_THRESHOLD) {
        prefetchNextInvites()
      }
      return (
        <InviteCard
          item={item}
          onAccept={handleAcceptInvite}
          onReject={handleRejectInvite}
          isAccepting={acceptInviteMutation.isPending && acceptInviteMutation.variables === item.id}
          isRejecting={rejectInviteMutation.isPending && rejectInviteMutation.variables === item.id}
        />
      )
    },
    [invites.length, prefetchNextInvites, handleAcceptInvite, handleRejectInvite, acceptInviteMutation, rejectInviteMutation]
  )

  const renderRequest = useCallback(
    ({ item, index }: { item: RequestItem; index: number }) => {
      if (index === requests.length - PREFETCH_THRESHOLD) {
        prefetchNextRequests()
      }
      return (
        <RequestCard
          item={item}
          onCancel={handleCancelRequest}
          isCancelling={cancelRequestMutation.isPending && cancelRequestMutation.variables === item.id}
        />
      )
    },
    [requests.length, prefetchNextRequests, handleCancelRequest, cancelRequestMutation]
  )

  //  footer: "loading more" spinner 
  const renderFooter = (loadingMore: boolean) => () =>
    loadingMore ? (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color={Colors.primary} size="small" />
        <Text style={styles.loadingText}>Loading more...</Text>
      </View>
    ) : null

  //  empty states ─
  const renderEmptyGroups = () => {
    if (isLoading) return null
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>👥</Text>
        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
          {activeTab === "mine" ? "You don't admin any group yet" : "You haven't joined any group yet"}
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
          Join one of the groups below to get started
        </Text>
      </View>
    )
  }

  const renderEmptyInvites = () => {
    if (myInvitesIsLoading) return null
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>✉️</Text>
        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No pending invites</Text>
      </View>
    )
  }

  const renderEmptyRequests = () => {
    if (myRequestsIsLoading) return null
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>⏳</Text>
        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No pending requests</Text>
      </View>
    )
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
        <View style={styles.guestScreen}>
          <Text style={styles.guestIcon}>
            <MaterialCommunityIcons name="account-group" size={19} />
          </Text>
          <Text style={[styles.guestTitle, { color: theme.textPrimary }]}>Your Communities</Text>
          <Text style={[styles.guestSub, { color: theme.textSecondary }]}>
            Log in to interact in your communities{" "}
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.loginButtonText}>Log In</Text>
          </TouchableOpacity>
          <Text style={[styles.guestSub, { color: theme.textSecondary }]}>Or new to marketplace? </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push("/(auth)/register")}
          >
            <Text style={styles.loginButtonText}>Register</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "mine", label: "My Communities" },
    { key: "invites", label: " Invites" },
    { key: "requests", label: "Sent Requests" },
  ]

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
      <View style={styles.header}>
        <View style={[{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", }]}  >
          <View>
            <Text style={[styles.headerTitle, styles.headerTitleOffset, { color: theme.textPrimary }]}>
              Smart Communities
            </Text>
          </View>
          <View>
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={() => router.push("/community/search")}
              hitSlop={10}
            >
              <MaterialCommunityIcons name="magnify" size={22} color={theme.textPrimary} />
            </TouchableOpacity></View></View>
        <TouchableOpacity onPress={() => router.push("/community/CreateGroupScreen")}>
          <View style={[styles.createGroupIcon, { borderColor: theme.border, backgroundColor: theme.textMuted }]}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Create your Community</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabChip,
                  {
                    borderColor: isActive ? theme.primary : theme.border,
                    backgroundColor: isActive ? theme.primary : "transparent",
                  },
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    { color: isActive ? Colors.white : theme.textPrimary },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
        
      </View>

      {(activeTab === "all" || activeTab === "mine") &&
        (isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loadingStateText}>Loading your groups...</Text>
          </View>
        ) : isError ? (
          <View style={styles.loading}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={[styles.errorText, { color: theme.textMuted }]}>Failed to load</Text>
            <TouchableOpacity style={[styles.retryBtn, { borderColor: theme.primary }]} onPress={() => refetch()}>
              <Text style={[styles.retryText, { color: theme.primary }]}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={visibleGroups}
            keyExtractor={(item) => item.id}
            renderItem={renderGroup}
            ListEmptyComponent={renderEmptyGroups}
            ListFooterComponent={renderFooter(isFetchingNextPage)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefreshing ?? false} onRefresh={refetch} tintColor={Colors.primary} />
            }
            removeClippedSubviews={true}
            initialNumToRender={8}
          />
        ))}

      {activeTab === "invites" &&
        (myInvitesIsLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loadingStateText}>Loading your invites...</Text>
          </View>
        ) : (
          <FlatList
            data={invites}
            keyExtractor={(item) => item.id}
            renderItem={renderInvite}
            ListEmptyComponent={renderEmptyInvites}
            ListFooterComponent={renderFooter(myInvitesIsFetchingNextPage)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={myInvitesIsRefreshing ?? false}
                onRefresh={refetchMyInvites}
                tintColor={Colors.primary}
              />
            }
            removeClippedSubviews={true}
            initialNumToRender={8}
          />
        ))}

      {activeTab === "requests" &&
        (myRequestsIsLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loadingStateText}>Loading your requests...</Text>
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            renderItem={renderRequest}
            ListEmptyComponent={renderEmptyRequests}
            ListFooterComponent={renderFooter(myRequestsIsFetchingNextPage)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={myRequestsIsRefreshing ?? false}
                onRefresh={refetchMyRequests}
                tintColor={Colors.primary}
              />
            }
            removeClippedSubviews={true}
            initialNumToRender={8}
          />
        ))}

      {((activeTab === "all" || activeTab === "mine") && suggestionVisisble) && (
        <GroupSuggestions groups={suggestedGroupsData ?? []} title="Discover more groups" onClose={() => setsuggestionVisisble(false)} showBanner={(type,message)=>showBanner(type,message)}/>
      )}
    </SafeAreaView>
  )
}

const cardStyles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  cardDate: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  acceptBtn: {
    backgroundColor: Colors.primary,
  },
  acceptBtnText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  rejectBtn: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  rejectBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  banner: {
    position: "absolute",
    bottom: -40,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingTop: Spacing.md,
  },
  bannerText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    flex: 1,
  },
  bannerClose: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    paddingLeft: Spacing.sm,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  searchBtn: {


    zIndex: 10,
    padding: 4,
  },
  createGroupIcon: {
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: Radius.md,
    marginTop: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  headerTitleOffset: {
    marginLeft: 32,
  },
  tabBar: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  tabChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  tabChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
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
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  retryBtn: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  retryText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    textAlign: "center",
  },
  guestScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  guestIcon: { fontSize: 64 },
  guestTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
  },
  guestSub: {
    fontSize: FontSize.md,
    textAlign: "center",
  },
  loginButton: {
    width: "100%",
    height: 54,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
})
