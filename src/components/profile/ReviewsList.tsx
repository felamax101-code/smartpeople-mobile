

import React from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native"
import { Image } from "expo-image"
import { router } from "expo-router"
import { useTheme } from "@/hooks/useTheme"
import { Review } from "@/types/index"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"

interface Props {
  reviews: Review[]
  isLoading: boolean
  totalCount: number
  averageRating: number
  isSP?:boolean
  hasNextPage: boolean | undefined
  isFetchingNextPage: boolean
  onLoadMore: () => void
}

const StarRating = ({ rating }: { rating: number }) => (
  <View style={starStyles.container}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Text key={star} style={starStyles.star}>
        {star <= rating ? "⭐" : "☆"}
      </Text>
    ))}
  </View>
)

const starStyles = StyleSheet.create({
  container: { flexDirection: "row", gap: 2 },
  star: { fontSize: 14 },
})

export const ReviewsList = ({
  reviews,
  isLoading,
  totalCount,
  averageRating,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  isSP
}: Props) => {
  const theme = useTheme()

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
      </View>
    )
  }

  if (reviews.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>⭐</Text>
        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
          No reviews yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
          Reviews from other people will appear here
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
 { isSP && <Text style={[styles.ratingNumber, { color: theme.textPrimary }]}>
         These ratings only iclude the reviews tied to this SmartProperty account i.e They exclude ratings from the main profile
        </Text>}
      {/* ── rating summary ────────────────────────────────── */}
      <View style={[styles.ratingSummary, { backgroundColor: theme.surfaceSecondary }]}>
        <Text style={[styles.ratingNumber, { color: theme.textPrimary }]}>
          {averageRating.toFixed(1)}
        </Text>
        <View style={styles.ratingRight}>
          <StarRating rating={Math.round(averageRating)} />
          <Text style={[styles.ratingCount, { color: theme.textSecondary }]}>
            Based on {totalCount} review{totalCount !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* ── reviews list ──────────────────────────────────── */}
      {reviews.map((review) => (
        <View
          key={review.id}
          style={[styles.reviewCard, { borderColor: theme.border }]}
        >
          {/* reviewer info */}
          <TouchableOpacity
            style={styles.reviewerRow}
            onPress={() => router.push(`/profile/${review.reviewer.username}`)}
          >
            <Image
              source={{ uri: review.reviewer.avatar ?? undefined }}
              style={styles.reviewerAvatar}
              contentFit="cover"
            />
            <View style={styles.reviewerInfo}>
              <Text style={[styles.reviewerName, { color: theme.textPrimary }]}>
                @{review.reviewer.username}
              </Text>
              <Text style={[styles.reviewDate, { color: theme.textMuted }]}>
                {new Date(review.created_at).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
            <StarRating rating={review.rating} />
          </TouchableOpacity>

          {/* comment */}
          {review.comment && (
            <Text style={[styles.reviewComment, { color: theme.textSecondary }]}>
              {review.comment}
            </Text>
          )}
        </View>
      ))}

      {/* load more */}
      {hasNextPage && (
        <TouchableOpacity
          style={[styles.loadMoreButton, { borderColor: theme.border }]}
          onPress={onLoadMore}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? (
            <ActivityIndicator color={theme.primary} size="small" />
          ) : (
            <Text style={[styles.loadMoreText, { color: theme.primary }]}>
              Load more reviews
            </Text>
          )}
        </TouchableOpacity>
      )}

    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  centered: {
    paddingVertical: Spacing.xxl,
    alignItems: "center",
  },
  ratingSummary: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    gap: Spacing.lg,
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -2,
  },
  ratingRight: {
    gap: Spacing.xs,
  },
  ratingCount: {
    fontSize: FontSize.sm,
  },
  reviewCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  reviewerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray[200],
  },
  reviewerInfo: {
    flex: 1,
    gap: 2,
  },
  reviewerName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  reviewDate: {
    fontSize: FontSize.xs,
  },
  reviewComment: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    textAlign: "center",
  },
  loadMoreButton: {
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
})










