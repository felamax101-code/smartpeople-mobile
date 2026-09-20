

import React from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from "react-native"
import { Image } from "expo-image"
import { router } from "expo-router"
import { useTheme } from "@/hooks/useTheme"
import { Post } from "@/types"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import truncate from "@/hooks/useTruncateBody"
import { MaterialCommunityIcons } from "@expo/vector-icons"
const { width: SCREEN_WIDTH } = Dimensions.get("window")
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm) / 2

interface Props {
  posts: Post[]
  isLoading: boolean
  hasNextPage: boolean | undefined
  isFetchingNextPage: boolean
  onLoadMore: () => void
  totalCount: number
  isError: boolean
  refetch: any

}

export const SavedListingsGrid = ({
  posts,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  totalCount,
  isError,
  refetch,
}: Props) => {
  const theme = useTheme()


  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
      </View>
    )
  }
  if (isError) {
    return (
      <View style={styles.loading}>
        <Text style={[styles.errorIcon]}>⚠️</Text>
        <Text style={[styles.errorText, { color: theme.textMuted }]}>
          Failed to load
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

  if (posts.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📦</Text>
        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
          No  saved posts yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
          Posts  will appear here
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* count */}
      <Text style={[styles.countText, { color: theme.textSecondary }]}>
        {totalCount} listing{totalCount !== 1 ? "s" : ""}
      </Text>

      {/* grid */}
      <View style={styles.grid}>
        {posts.map((post) => (
          <TouchableOpacity
            key={post?.id}
            style={[styles.card, { backgroundColor: theme.surface }]}
            onPress={() => router.push(`/post/${post?.slug}`)}
            activeOpacity={0.8}
          >
            {post.post_type === "text" ? (
              <View style={[styles.textConatiner]}>
                <View
                  style={[{}]}
                >
                  <Text style={[styles.textTitle, { color: theme.textPrimary }]}>{post.name}</Text>



                  <Text style={[styles.textBody, { color: theme.textMuted }]}>{truncate(post.description, 50)}</Text>
                </View>


                {/* interactions */}
                <View style={[styles.cardMeta, { paddingBottom: 10 }]}>
                  <Text style={[styles.cardMetaText, { color: theme.textPrimary }]}>
                    <MaterialCommunityIcons name="chevron-up-circle-outline" size={20} color={`${theme.primary}`} /> {post?.upvotes_count}
                  </Text>
                  <Text style={[styles.cardMetaText, { color: theme.textPrimary }]}>
                    <MaterialCommunityIcons name="comment-outline" color={`${theme.primary}`} size={20} /> {post?.comments_count}
                  </Text>
                  <Text style={[styles.cardMetaText, { color: theme.textPrimary }]}>
                    <MaterialCommunityIcons name="eye-outline" color={`${theme.primary}`} size={20} /> {post?.views_count}
                  </Text>

                </View>
              </View>
            ) : (
              <>
                <View style={styles.imageContainer}>
                  {post.post_type === "image" ? (
                    <Image
                      source={{ uri: post.images[0]?.image }}
                      style={styles.image}
                      contentFit="cover"
                    />
                  ) : (
                    <Image
                      source={{ uri: post.videos[0]?.video }}
                      style={styles.image}
                      contentFit="cover"
                    />
                  )}

                </View>

                {/* info */}
                <View style={styles.cardInfo}>
                  <Text
                    style={[styles.postName, { color: theme.textPrimary }]}
                    numberOfLines={1}
                  >
                    {post?.name}
                  </Text>
                  <Text
                    style={[styles.textBody, { color: theme.textMuted }]}
                    numberOfLines={2}
                  >
                    {truncate(post?.description, 50)}
                  </Text>


                  {/* interactions */}
                  <View style={styles.cardMeta}>
                    <Text style={[styles.cardMetaText, { color: theme.textMuted }]}>
                      <MaterialCommunityIcons name="chevron-up-circle-outline" size={20} color={`${theme.primary}`} /> {post?.upvotes_count}
                    </Text>
                    <Text style={[styles.cardMetaText, { color: theme.textMuted }]}>
                       <MaterialCommunityIcons name="comment-outline" color={`${theme.primary}`} size={20} />  {post?.comments_count}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </TouchableOpacity>
        ))}
      </View>

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
              Load more
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
  countText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: Radius.md,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  imageContainer: {
    width: "100%",
    height: CARD_WIDTH * 0.9,
    backgroundColor: Colors.gray[200],
  },
  image: {
    width: "100%",
    height: "100%",
  },
  textConatiner: {
    paddingHorizontal: Spacing.sm,
    minHeight: 160,
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 4
  },
  textTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm
  },
  textBody: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  conditionBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  conditionText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  cardInfo: {
    padding: Spacing.sm,
    gap: 4,
  },
  postName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    lineHeight: 18,
  },
  postPrice: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  cardMeta: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  cardMetaText: {
    fontSize: FontSize.xs,
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
  negotiableBadge: {
    position: "absolute",
    bottom: 10,
    backgroundColor: Colors.warning + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 0,
    borderRadius: Radius.full,
  },
  negotiableText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.warning,
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
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
})








