import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native"
import { Image } from "expo-image"
import { router } from "expo-router"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { useTheme } from "@/hooks/useTheme"
import { Post } from "@/types"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import truncate from "@/hooks/useTruncateBody"

const { width: SCREEN_WIDTH } = Dimensions.get("window")
export const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm) / 2

interface Props {
  post: Post
  isSP?: boolean
}

export const SoundPostCard = ({ post, isSP = false }: Props) => {
  const theme = useTheme()
  const iconColor = theme.primary

  const Meta = ({ showViews }: { showViews: boolean }) => (
    <View style={styles.cardMeta}>
      <Text style={[styles.cardMetaText, { color: theme.textMuted }]}>
        <MaterialCommunityIcons name="chevron-up-circle-outline" size={13} color={iconColor} /> {post.upvotes_count}
      </Text>
      {!isSP && (
        <Text style={[styles.cardMetaText, { color: theme.textMuted }]}>
          <MaterialCommunityIcons name="comment-outline" size={13} color={iconColor} /> {post.comments_count}
        </Text>
      )}
      {showViews && (
        <Text style={[styles.cardMetaText, { color: theme.textPrimary }]}>
          <MaterialCommunityIcons name="eye-outline" size={13} color={iconColor} /> {post.views_count}
        </Text>
      )}
    </View>
  )

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.surfaceSecondary, borderColor: theme.borderFocus }]}
      onPress={() => router.push(isSP ? `/sp/post/${post.slug}` : `/post/${post.slug}`)}
      activeOpacity={0.8}
    >
      {post.post_type === "text" ? (
        <View style={styles.textContainer}>
          <View>
            <Text style={[styles.textTitle, { color: theme.textPrimary }]}>{post.name}</Text>
            <Text style={[styles.textBody, { color: theme.textMuted }]}>
              {truncate(post.description, 50)}
            </Text>
          </View>
          <View style={{ paddingBottom: 10 }}>
            <Meta showViews={false} />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.imageContainer}>
            <Image
              source={{
                uri: post.post_type === "image" ? post.images[0]?.image : post.videos[0]?.video,
              }}
              style={styles.image}
              contentFit="cover"
            />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.postName, { color: theme.textPrimary }]} numberOfLines={2}>
              {post.name}
            </Text>
            <Meta showViews />
          </View>
        </>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
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
  imageContainer: { width: "100%", height: CARD_WIDTH * 0.9, backgroundColor: Colors.gray[200] },
  image: { width: "100%", height: "100%" },
  textContainer: {
    paddingHorizontal: Spacing.sm,
    minHeight: 160,
    justifyContent: "space-between",
    gap: 4,
  },
  textTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  textBody: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  cardInfo: { padding: Spacing.sm, gap: 4 },
  postName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, lineHeight: 18 },
  cardMeta: { flexDirection: "row", gap: Spacing.sm },
  cardMetaText: { fontSize: FontSize.xs },
})