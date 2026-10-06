

import { useCallback } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native"
import { Image } from "expo-image"
import { router } from "expo-router"
import { useTheme } from "@/hooks/useTheme"
import { useAuthGate } from "@/hooks/useAuthGate"
import { feedService } from "@/services/feed.service"
// import { VerifiedBadge } from "@/components/ui/VerifiedBadge"
import { Post } from "@/types"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { getAvatarColor } from "@/hooks/useUserGenerateAvatarColor"
import truncate from "@/hooks/useTruncateBody"
import {Ionicons} from "@expo/vector-icons"
import {MaterialCommunityIcons} from "@expo/vector-icons"
const { width: SCREEN_WIDTH } = Dimensions.get("window")
const GRID_IMAGE = (SCREEN_WIDTH / 2) - Spacing.lg
const LIST_IMAGE = 90

interface Props {
  post: Post
  viewMode: "list" | "grid"
  onUpvote?: (slug: string, upvoted: boolean) => void
  onSave?: (id: string, saved: boolean) => void
}

export const SearchResultCard = ({
  post,
  viewMode,
  onUpvote,
  onSave,
}: Props) => {
  const theme = useTheme()
  const { gatedAction } = useAuthGate()

 

  const handleSave = useCallback(() => {
    gatedAction(
      { type: "save", postId: post.id },
      async () => {
        const result = await feedService.toggleSave(post.id)
        onSave?.(post.id, result.saved)
      }
    )
  }, [post.id, gatedAction, onSave])

  const handleUpvote = useCallback(() => {
    gatedAction(
      { type: "upvote", postSlug: post.slug },
      async () => {
        const result = await feedService.toggleUpvote(post.slug)
        onUpvote?.(post.slug, result.upvoted)
      }
    )
  }, [post.slug, gatedAction, onUpvote])

  // ── grid card 
  if (viewMode === "grid") {
    return (
      <TouchableOpacity
        style={[styles.gridCard, { backgroundColor: theme.surface,borderColor:theme.textMuted }]}
         onPress={() => router.push(`/post/${post.slug}`)}
        activeOpacity={0.8}
      >
        <View style={[styles.gridImageContainer,{backgroundColor:theme.backgroundMuted}]}>
          {post.post_type==="video"?(
            <Image
            source={{ uri: post.videos[0]?.video }}
            style={styles.gridImage}
            contentFit="cover"
            transition={200}
          />

          ):
            post.post_type==="text"?
            <View  
            style={[{display:"flex",flexDirection:"row", alignItems:"center",justifyContent:"center"}]}
            >
              <Ionicons size={40} name="text" color="blue" />
                
            </View>
          : 
            
           <Image
            source={{ uri: post.videos[0]?.video }}
            style={styles.gridImage}
            contentFit="cover"
            transition={200}
          />
        
        }
          <Image
            source={{ uri: post.images[0]?.image }}
            style={styles.gridImage}
            contentFit="cover"
            transition={200}
          />
          {/* save button */}
          <TouchableOpacity
            style={styles.gridSaveButton}
            onPress={handleSave}
          >
            <Text style={[styles.gridSaveIcon,{color:theme.textPrimary}]}>
              {post.is_saved ? "Save" : "Saved"}
            </Text>
          </TouchableOpacity>

        </View>

        <View style={styles.gridInfo}>
        
           <View style={styles.userRow}>
          {(post.owner.avatar === null || post.owner.avatar === undefined || !post.owner.avatar.trim()) ?
            (<View style={[styles.usernamePlcaholder, { backgroundColor: `${getAvatarColor(post.owner.username)}` }]}>
              <Text>{post.owner.username.charAt(0)}</Text>
            </View>
            ) : (
              <Image
                source={{ uri: post.owner.avatar ?? undefined }}
                style={styles.userAvatar}
                contentFit="cover"
              />)}

          <Text style={[styles.userName, { color: theme.textSecondary }]}>
            @{post.owner.username}
          </Text>
          {/* <VerifiedBadge badge={post.owner.verification_badge} size="sm" /> */}
        </View>
        {/* name */}
        <Text
          style={[styles.listName, { color: theme.textPrimary }]}
          numberOfLines={2}
        >
          {post.name}
        </Text>
        {/* name */}
        <Text
          style={[styles.listDescription, { color: theme.textPrimary }]}
          numberOfLines={2}
        >
          {truncate(post.description)}
        </Text>

       
        {/* interactions */}
        <View style={styles.interactionsRow}>
          <TouchableOpacity
            style={styles.interaction}
            onPress={handleUpvote}
          >
            <Text style={styles.interactionIcon}>
              {post.is_upvoted ? <MaterialCommunityIcons name="chevron-up-circle-outline" size={20} color={`${theme.primary}`} /> : <MaterialCommunityIcons name="chevron-up-circle-outline" size={20} color={"white"} />}

            </Text>
            <Text style={[styles.interactionCount, { color: theme.textMuted }]}>
              {post.upvotes_count}
            </Text>
          </TouchableOpacity>

          <View style={styles.interaction}>
            <Text style={styles.interactionIcon}>
                                            <MaterialCommunityIcons name="comment-outline" color={`${theme.primary}`} size={20} />

            </Text>
            <Text style={[styles.interactionCount, { color: theme.textMuted }]}>
              {post.comments_count}
            </Text>
          </View>
          </View>
         
        </View>
      </TouchableOpacity>
    )
  }

  // ── list card 
  return (
    <TouchableOpacity
      style={[styles.listCard, { backgroundColor: theme.surface, borderColor: theme.textMuted,borderBottomWidth:3 }]}
      onPress={() => router.push(`/post/${post.slug}`)}
      activeOpacity={0.8}
    >
      {/* image */}
      <View style={[styles.listImageContainer,{backgroundColor:theme.backgroundMuted}]}>
           {post.post_type==="video"?(
            <Image
            source={{ uri: post.videos[0]?.video }}
            style={styles.gridImage}
            contentFit="cover"
            transition={200}
          />

          ):
            post.post_type==="text"?
            <View  
            style={[{display:"flex",flexDirection:"row", alignItems:"center",justifyContent:"center"}]}
            >
              <Ionicons size={40} name="text" color="blue" />
                
            </View>
          : 
            
           <Image
            source={{ uri: post.videos[0]?.video }}
            style={styles.gridImage}
            contentFit="cover"
            transition={200}
          />
        
        }

      </View>

      {/* info */}
      <View style={styles.listInfo}>
        
        {/* user */}
        <View style={styles.userRow}>
          {(post.owner.avatar === null || post.owner.avatar === undefined || !post.owner.avatar.trim()) ?
            (<View style={[styles.usernamePlcaholder, { backgroundColor: `${getAvatarColor(post.owner.username)}` }]}>
              <Text>{post.owner.username.charAt(0)}</Text>
            </View>
            ) : (
              <Image
                source={{ uri: post.owner.avatar ?? undefined }}
                style={styles.userAvatar}
                contentFit="cover"
              />)}

          <Text style={[styles.userName, { color: theme.textSecondary }]}>
            @{post.owner.username}
          </Text>
          {/* <VerifiedBadge badge={post.owner.verification_badge} size="sm" /> */}
        </View>
        {/* name */}
        <Text
          style={[styles.listName, { color: theme.textPrimary }]}
          numberOfLines={2}
        >
          {post.name}
        </Text>
        {/* name */}
        <Text
          style={[styles.listDescription, { color: theme.textPrimary }]}
          numberOfLines={2}
        >
          {truncate(post.description)}
        </Text>

       
        {/* interactions */}
        <View style={styles.interactionsRow}>
          <TouchableOpacity
            style={styles.interaction}
            onPress={handleUpvote}
          >
            <Text style={styles.interactionIcon}>
                              {post.is_upvoted ? <MaterialCommunityIcons name="chevron-up-circle-outline" size={20} color={`${theme.primary}`} /> : <MaterialCommunityIcons name="chevron-up-circle-outline" size={20} color={"white"} />}
              
            </Text>
            <Text style={[styles.interactionCount, { color: "#fff" }]}>
              {post.upvotes_count}
            </Text>
          </TouchableOpacity>

          <View style={styles.interaction}>
            <Text style={styles.interactionIcon}>
                              <MaterialCommunityIcons name="comment-outline" color={`${theme.primary}`} size={20} />
              
            </Text>
            <Text style={[styles.interactionCount, { color: "#fff" }]}>
              {post.comments_count}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.interaction, styles.saveButton]}
            onPress={handleSave}
          >
            <Text style={[styles.interactionIcon,{color:theme.textPrimary}]}>
              {post.is_saved ? "Save" : "Saved"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  // ── grid 
  gridCard: {
    width: GRID_IMAGE,
    borderRadius: Radius.md,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth:1
  },
  gridImageContainer: {
    width: "100%",
    height: GRID_IMAGE,
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  gridSaveButton: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.4)",
    width: 35,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  gridSaveIcon: { fontSize: 10 },
  gridInfo: {
    padding: Spacing.sm,
    gap: 3,
  },
  gridName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    lineHeight: 18,
  },
  

  // ── list 
  listCard: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    margin:2,
    borderRadius:Radius.md,
    elevation:10
  },
  listImageContainer: {
    width: LIST_IMAGE,
    height: LIST_IMAGE,
    borderRadius: Radius.md,
    overflow: "hidden",
    backgroundColor: Colors.gray[200],
    flexShrink: 0,
    position: "relative",
  },
  listImage: {
    width: "100%",
    height: "100%",
  },
  listConditionBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },


  listInfo: {
    flex: 1,
    gap: 4,
  },
  listName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    lineHeight: 20,
  },
   listDescription: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,
    lineHeight: 15,
  },

  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  userAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.gray[200],
  },
  usernamePlcaholder: {
    width: 20,
    alignItems: "center",
    justifyContent: "center",
    height: 20,
    borderRadius: 14,
  },
  userName: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  listLocation: {
    fontSize: FontSize.xs,
  },
  interactionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: 2,
  },
  interaction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  interactionIcon: { fontSize: 14 },
  interactionCount: { fontSize: FontSize.xs },
  saveButton: { marginLeft: "auto" },
})







