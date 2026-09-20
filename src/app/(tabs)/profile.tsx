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
import { router } from "expo-router"
import { useTheme } from "@/hooks/useTheme"
import { useAuthStore } from "@/stores/auth.store"
import { useProfile } from "@/hooks/useProfile"
import { useUserListings } from "@/hooks/useUserListings"
import { useUserReviews } from "@/hooks/useUserReviews"
import { ProfileHeader } from "@/components/profile/ProfileHeader"
import { ListingsGrid } from "@/components/profile/ListingsGrid"
import { ReviewsList } from "@/components/profile/ReviewsList"
import { AboutTab } from "@/components/profile/AboutTab"
import { authService } from "@/services/auth.service"
import { ReviewForm } from "@/components/reviews/ReviewForm"
import { Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { useQueryClient } from "@tanstack/react-query"
import { useUserSavedListings } from "@/hooks/useUserSavedListings"
import { SavedListingsGrid } from "@/components/profile/SavedProductGrid"
import { useToast } from "@/components/activityIndicator/ToastProvider"
import { MaterialCommunityIcons } from "@expo/vector-icons"
type Tab = "My posts" | "reviews" | "about" | "saved"

// 
// 1. THE GATEKEEPER (Main Screen Export)
// 
export default function OwnProfileScreen() {
  const theme = useTheme()
  const { user } = useAuthStore()
  // Guest Check FIRST — Safe from Hook violations because no data hooks are called here yet
  if (!user) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={["top"]}
      >
        <View style={styles.guestScreen}>
          <Text style={styles.guestIcon}>👤</Text>
          <Text style={[styles.guestTitle, { color: theme.textPrimary }]}>
            Your Profile
          </Text>
          <Text style={[styles.guestSubtitle, { color: theme.textSecondary }]}>
            Log in to view your profile, posts and reviews
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.loginButtonText}>Log In</Text>
          </TouchableOpacity>
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <Text style={[styles.dividerText, { color: theme.textMuted }]}>
              or not yet a smartpeopler?
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>
          <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
            <Text style={[styles.registerLink, { color: theme.primary }]}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // If user exists, safely pass the user data down to the authenticated profile layout
  return <AuthenticatedProfile user={user} theme={theme} />
}

// 
// 2. THE AUTHENTICATED CONTENT (Only runs if user is logged in)
function AuthenticatedProfile({ user, theme }: { user: any; theme: any }) {
  const { clearUser, setUser } = useAuthStore()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<Tab>("My posts")
  const [showReviewForm, setShowReviewForm] = useState(false)
  const queryClient = useQueryClient()
  const [myExistingReview, setMyExistingReview] = useState<{
    rating: number
    comment: string
  } | null>(null)

  // Hooks are now guaranteed to have a valid username and won't fire for guests
  const {
    isOwn,
    profile,
    isLoading,
    isFetching: isRefreshing,
    isError,
    refetch,
  } = useProfile(user.username)
  const {
    savedListings,
    refetch: refetchsaved,
    isError: IsErrorSaved,
    totalCount: savedCount,
    isLoading: savedlistingsLoading,
    fetchNextPage: fetchMoresavedListings,
    hasNextPage: hasMoresavedListings,
    isFetchingNextPage: loadingMoresavedListings,
  } = useUserSavedListings()
  useEffect(() => {
    if (profile) {
      setUser(profile)
    }
  }, [profile])
  const {
    listings,
    totalCount: listingsCount,
    isLoading: listingsLoading,
    isError: IsErrorListings,
    fetchNextPage: fetchMoreListings,
    refetch: refetchlistings,
    hasNextPage: hasMoreListings,
    isFetchingNextPage: loadingMoreListings,
  } = useUserListings(user.username)
  const {
    reviews,
    totalCount: reviewsCount,
    isLoading: reviewsLoading,
    fetchNextPage: fetchMoreReviews,
    hasNextPage: hasMoreReviews,
    isFetchingNextPage: loadingMoreReviews,
  } = useUserReviews(user.username)

  const handleLogout = useCallback(() => {

    showToast({
      title: "Log out?",
      message: "Are you sure you want to log out?",
      onConfirm: async () => {

        await authService.logout()
        queryClient.clear()
        clearUser()
        router.push("/(tabs)")
      },

    })


  }, [clearUser])

  // check if current user already reviewed this seller
  useEffect(() => {
    if (reviews && user && !isOwn) {
      const mine = reviews.find((r) => r.reviewer.username === user.username)
      if (mine) {
        setMyExistingReview({ rating: mine.rating, comment: mine.comment })
      }
    }
  }, [reviews, user, isOwn])

  if (isLoading || !profile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    )
  }

  if (isError) {
    return (
      <View style={styles.loading}>
        <Text style={[styles.errorIcon]}>⚠️</Text>
        <Text style={[styles.errorText, { color: theme.textMuted }]}>
          Failed to load  your profile
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
        >
          <Text style={[styles.retryText, { color: theme.primary }]}>
            Try again
          </Text>
        </TouchableOpacity>
      </View>)
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "My posts", label: "My posts", count: listingsCount },
    { key: "reviews", label: "Reviews", count: reviewsCount },
    { key: "about", label: "About" },
    { key: "saved", label: "Saved" }
  ]
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      {/*  header bar ─ */}
      <View style={[styles.headerBar, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          My Profile
        </Text>

        {/* Actions Row */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleLogout}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.logoutText, { color: theme.error }]}>
              <MaterialCommunityIcons name="logout" size={14} color={`${theme.textPrimary}`} /> Logout
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/settings")}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.settingsIcon, { color: theme.textPrimary }]}>
              <MaterialCommunityIcons name="cog" size={20} color={`${theme.textPrimary}`} />
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              refetch();
              refetchsaved;
            }}
          />}
        showsVerticalScrollIndicator={false}
      >
        {/*  profile header  */}
        <ProfileHeader
          profile={profile}
          isOwn={true}
          onFollow={() => { }}
          isFollowLoading={false}
          onMessage={() => { }}
          onEditProfile={() => router.push("/profile/edit")}

        />

        {/*  tab bar (sticky)  */}
        <View style={[
          styles.tabBar,
          {
            backgroundColor: theme.surface,
            borderBottomColor: theme.border,
          }
        ]}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                {
                  borderColor: activeTab === tab.key
                    ? theme.primary
                    : theme.textPrimary,
                }
                ,
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
        {activeTab === "My posts" && (
          <ListingsGrid
            posts={listings}
            isLoading={listingsLoading}
            totalCount={listingsCount}
            hasNextPage={hasMoreListings}
            isFetchingNextPage={loadingMoreListings}
            isError={IsErrorListings}
            onLoadMore={fetchMoreListings}
            refetch={refetchlistings}
            isOwn={true}
          />
        )}

        {/* in the reviews tab — above the ReviewsList */}
        {activeTab === "reviews" && !isOwn && user && (
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
              targetUsername={user.username}
              existingReview={myExistingReview}
            />
          </>
        )}




        {activeTab === "reviews" && (
          <ReviewsList
            reviews={reviews}
            isLoading={reviewsLoading}
            totalCount={reviewsCount}
            averageRating={profile.rating}
            hasNextPage={hasMoreReviews}
            isFetchingNextPage={loadingMoreReviews}
            onLoadMore={fetchMoreReviews}
          />
        )}

        {activeTab === "about" && (
          <AboutTab profile={profile} isOwn={true} />
        )}

        {activeTab === "saved" && (
          <SavedListingsGrid
            posts={savedListings}
            isLoading={savedlistingsLoading}
            totalCount={savedCount}
            hasNextPage={hasMoresavedListings}
            isFetchingNextPage={loadingMoresavedListings}
            onLoadMore={fetchMoresavedListings}
            isError={IsErrorSaved}
            refetch={refetchsaved}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ─
// STYLES
// ─
const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  logoutText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
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
  guestScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  guestIcon: {
    fontSize: 64,
    marginBottom: Spacing.sm,
  },
  guestTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    textAlign: "center",
  },
  guestSubtitle: {
    fontSize: FontSize.md,
    textAlign: "center",
    lineHeight: 22,
  },
  loginButton: {
    width: "100%",
    height: 54,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  registerLink: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: FontSize.md,
  },
  settingsIcon: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
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
  errorText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
})
