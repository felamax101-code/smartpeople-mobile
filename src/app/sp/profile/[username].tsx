
import React, { useState, useCallback, useEffect } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { useTheme } from "@/hooks/useTheme"
import { SPProfileHeader } from "@/components/profile/SPProfileHeader"
import { useQueryClient } from "@tanstack/react-query"
import { useUserReviews } from "@/hooks/useUserReviews"
import { ListingsGrid } from "@/components/profile/ListingsGrid"
import { ReviewsList } from "@/components/profile/ReviewsList"
import { AuthPrompt } from "@/components/auth/AuthPrompt"
import { useAuthStore } from "@/stores/auth.store"
import { ReviewForm } from "@/components/reviews/ReviewForm"
import { Radius, Spacing, FontSize, FontWeight } from "@/constants/colors"
import { messagingService } from "@/services/messaging.service"
import { useSPProfile } from "@/hooks/useSPProfile"
import { useSPListings } from "@/hooks/useSPListings"
import { AnimatedBanner, BannerState, BannerType } from "@/components/activityIndicator/AnimatedBanner"
type Tab = "posts" | "reviews"
export default function PublicProfileScreen() {
  const { user } = useAuthStore()
  const theme = useTheme()
  const qc = useQueryClient()
  const { username } = useLocalSearchParams<{ username: string }>()
  const [activeTab, setActiveTab] = useState<Tab>("posts")
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [isStartingConversation, setIsStartingConversation] = useState(false)

  const [myExistingReview, setMyExistingReview] = useState<{
    rating: number
    comment: string
  } | null>(null)
  const [banner, setBanner] = useState<BannerState | null>(null);
  const {
    profile,
    isLoading,
    isOwn,
    handleFollow,
    isError,
    isFetching: isRefreshing,
    isFollowLoading,
    refetch,
  } = useSPProfile(username)

  const {
    listings,
    totalCount: listingsCount,
    isLoading: listingsLoading,
    fetchNextPage: fetchMoreListings,
    refetch: refetchlistings,
    isError: islistngsError,
    hasNextPage: hasMoreListings,
    isFetchingNextPage: loadingMoreListings,
  } = useSPListings(username)




  const {
    reviews,
    totalCount: reviewsCount,
    isLoading: reviewsLoading,
    fetchNextPage: fetchMoreReviews,
    hasNextPage: hasMoreReviews,
    isFetchingNextPage: loadingMoreReviews,
  } = useUserReviews(username)
  const showBanner = useCallback((type: BannerType, message: string) => {
    setBanner({ id: Date.now(), type, message });
  }, []);
  const handleMessage = useCallback(async () => {
    if (!profile) return
    setIsStartingConversation(true)
    try {
      const conversation = await messagingService.createConversation({
        recipient_id: profile.user_id,
        initial_message: "Hello",
      })
      qc.invalidateQueries({ queryKey: ["conversations"], });
      // Navigate to the conversation screen
      router.push(`/messages/${conversation.id}` as any)
    } catch (error: any) {
      showBanner(
        "error",
        error?.response?.data?.detail || "Could not start conversation. Please try again."
      )
    } finally {
      setIsStartingConversation(false)
    }
  }, [profile])



  useEffect(() => {
    if (reviews && user && !isOwn) {
      const mine = reviews.find((r) => r.reviewer.username === user.username)

      if (mine) {
        // Only update state if the data is actually different from what's already saved
        if (!myExistingReview ||
          myExistingReview.rating !== mine.rating ||
          myExistingReview.comment !== mine.comment) {
          setMyExistingReview({ rating: mine.rating, comment: mine.comment })
        }
      } else if (myExistingReview !== null) {
        // If no review is found but state still has one, clear it
        setMyExistingReview(null)
      }
    }
  }, [reviews, user, isOwn, myExistingReview])


  if (isLoading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    )
  }
  if (isError) {
    return (
      <View style={styles.loading}>
        <Text style={[styles.errorIcon]}>⚠️</Text>
        <Text style={[styles.errorText, { color: theme.textMuted }]}>
          Failed to loadthis users profile
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, { borderColor: theme.primary }]}
          onPress={() => refetch()}
        >
          <Text style={[styles.retryText, { color: theme.primary }]}>
            Try again
          </Text>
        </TouchableOpacity>
      </View>)
  }


  if
    (isStartingConversation) {
    return (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textPrimary }]}>
          Starting conversation...
        </Text>
      </View>)
  }

  if (!profile) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.textPrimary }]}>
          User not found
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: theme.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "posts", label: "Posts", count: listingsCount },
    { key: "reviews", label: "Reviews", count: reviewsCount },
  ]

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      {banner && (
        <AnimatedBanner
          key={banner.id}
          type={banner.type}
          message={banner.message}
          onHide={() => setBanner(null)}
        />
      )}
      {/*  header bar  */}
      <View style={[styles.headerBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.backIcon, { color: theme.textPrimary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          @{username}
        </Text>
        {/* more options */}
        <TouchableOpacity hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[styles.moreIcon, { color: theme.textPrimary }]}>⋮</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refetch}
          />}
        showsVerticalScrollIndicator={false}

      >
        {/*  profile header  */}
        <SPProfileHeader
          profile={profile}
          isOwn={isOwn}
          onFollow={handleFollow}
          isFollowLoading={isFollowLoading}
          onMessage={handleMessage}
          onEditProfile={() => router.push("/profile/edit")}
          isMessageButtonDisabled={isStartingConversation}
          isSP={true}

        />

        {/*  tab bar (sticky)  */}
        <View style={[styles.tabBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                {
                  borderColor: activeTab === tab.key
                    ? theme.primary
                    : theme.textPrimary,
                },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[
                styles.tabText,
                {
                  color: activeTab === tab.key
                    ? theme.primary
                    : theme.textSecondary,
                  fontWeight: activeTab === tab.key
                    ? FontWeight.bold
                    : FontWeight.regular,
                }
              ]}>
                {tab.label}
                {tab.count !== undefined && tab.count > 0
                  ? ` (${tab.count})`
                  : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/*  tab content ─ */}
        {activeTab === "posts" && (
          <ListingsGrid
            posts={listings}
            isLoading={listingsLoading}
            totalCount={listingsCount}
            hasNextPage={hasMoreListings}
            isFetchingNextPage={loadingMoreListings}
            onLoadMore={fetchMoreListings}
            isError={islistngsError}
            refetch={refetchlistings}
            isSP={true}
          />
        )}



        {activeTab === "reviews" && (
          <>
            {!isOwn && user && (
              <>
                <TouchableOpacity
                  style={[styles.writeReviewButton, {
                    backgroundColor: theme.primaryLight,
                    borderColor: theme.primary,
                  }]}
                  onPress={() => setShowReviewForm(true)}
                >
                  <Text style={[styles.writeReviewText, { color: theme.primary }]}>
                    {myExistingReview ? "✏️ Edit my review" : "⭐ Write a review"}
                  </Text>
                </TouchableOpacity>

                <ReviewForm
                  visible={showReviewForm}
                  onClose={() => setShowReviewForm(false)}
                  targetUsername={username}
                  existingReview={myExistingReview}
                />
              </>
            )}

            <ReviewsList
              reviews={reviews}
              isLoading={reviewsLoading}
              totalCount={reviewsCount}
              averageRating={ 0}
              hasNextPage={hasMoreReviews}
              isFetchingNextPage={loadingMoreReviews}
              onLoadMore={fetchMoreReviews}
            />
          </>
        )}


      </ScrollView>

      <AuthPrompt />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  backLink: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backIcon: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  moreIcon: {
    fontSize: 22,
    fontWeight: FontWeight.bold,
  },
  tabBar: {
    marginTop: Spacing.xs,
    flexDirection: "row",
    borderBottomWidth: 1,
    justifyContent: "space-between",
    alignItems: "center",
    gap: 2
  },
  tab: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,

  },
  tabText: {
    fontSize: FontSize.xs,
  },

  writeReviewButton: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: "center",
  },
  writeReviewText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
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
  retryText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },


  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },

})









