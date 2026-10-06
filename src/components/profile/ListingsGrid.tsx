

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  FlatList,
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
  isOwn?: boolean
  isSP?: boolean
}

export const ListingsGrid = ({
  posts,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  totalCount,
  isError,
  refetch,
  isSP = false,
  isOwn = false,
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
        <Text style={[styles.errorIcon]}>
          <MaterialCommunityIcons name="alert-outline" size={30} color={theme.ALLwarning} />
        </Text>
        <Text style={[styles.errorText, { color: theme.textMuted }]}>
          Error loading your posts.This might be due to a problem we are working on

        </Text>
        <Text style={[styles.errorText, { color: theme.textMuted, fontWeight: FontWeight.regular, }]}>
         Click Try again or come back later

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
          No posts yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
          Posts  will appear here
        </Text>
      </View>
    )
  }
  return (
    <View style={styles.container}>

      {/* grid */}
      <View style={styles.grid}>
        {posts.map((post) => (
          <TouchableOpacity
            key={post?.id}
            style={[styles.card, { backgroundColor: theme.surfaceSecondary, borderColor: theme.borderFocus }]}
            onPress={() => router.push(isSP ? `/sp/post/${post.slug}` : `/post/${post.slug}`)}
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
                  <Text style={[styles.cardMetaText, { color: theme.textMuted }]}>
                    <MaterialCommunityIcons name="chevron-up-circle-outline" size={13} color={`${theme.primary}`} /> {post?.upvotes_count}
                  </Text>
                  {!isSP && <Text style={[styles.cardMetaText, { color: theme.textMuted }]}>
                    <MaterialCommunityIcons name="comment-outline" color={`${theme.primary}`} size={13} /> {post?.comments_count}
                  </Text>}
                  {/* <Text style={[styles.cardMetaText, { color: theme.textMuted }]}>
                    <MaterialCommunityIcons name="eye-outline" color={`${theme.primary}`}size={13}/> {post?.views_count}
                  </Text> */}


                </View>
                {isOwn && post.status === "rejected" && (
                  <View
                    style={[{ position: "absolute", top: 70, right: 3, left: 3 }]}
                  >
                    <Text
                      style={[styles.postStatus, { color: theme.ALLwarning }]}
                      numberOfLines={2}
                    >
                      {post.rejection_reason ?? "Rejected"}
                    </Text>
                  </View>
                )}
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
                  {isOwn && post.status === "rejected" && (
                    <View
                      style={[{ position: "absolute", top: 70, right: 3, left: 3 }]}
                    >
                      <Text
                        style={[styles.postStatus, { color: theme.ALLwarning }]}
                        numberOfLines={2}
                      >
                        {post.rejection_reason ?? "Rejected"}
                      </Text>
                    </View>
                  )}
                </View>

                {/* info */}
                <View style={styles.cardInfo}>
                  <Text
                    style={[styles.postName, { color: theme.textPrimary }]}
                    numberOfLines={2}
                  >
                    {post?.name}
                  </Text>

                  {/* interactions */}
                  <View style={styles.cardMeta}>
                    <Text style={[styles.cardMetaText, { color: theme.textMuted }]}>
                      <MaterialCommunityIcons name="chevron-up-circle-outline" size={13} color={`${theme.primary}`} /> {post?.upvotes_count}
                    </Text>
                    <Text style={[styles.cardMetaText, { color: theme.textMuted }]}>
                      <MaterialCommunityIcons name="comment-outline" size={13} color={`${theme.primary}`} /> {post?.comments_count}
                    </Text>
                    <Text style={[styles.cardMetaText, { color: theme.textPrimary }]}>
                      <MaterialCommunityIcons name="eye-outline" size={13} color={`${theme.primary}`} /> {post?.views_count}
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

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: Radius.md,
    overflow: "hidden",
    borderWidth: 0.3,
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
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  postStatus: {
    position: "absolute",
    right: 2,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.regular,
  }
})








