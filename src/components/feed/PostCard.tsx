

import { useCallback, useRef, useState, useEffect } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Share,
  BackHandler
} from "react-native"
import * as Clipboard from "expo-clipboard"
import { Image } from "expo-image"  // expo-image has better caching than RN Image
import { router } from "expo-router"
import { useFocusEffect, useNavigation } from "expo-router"
import { Post } from "@/types"
import { useQueryClient } from "@tanstack/react-query"
import { saveMediaToDevice } from "@/hooks/useSaveMediaToDevice"
import { Colors, Spacing, FontSize, FontWeight, Radius } from "@/constants/colors"
import { ImageCarousel } from "./ImageCarousel"
import { useAuthGate } from "@/hooks/useAuthGate"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { feedService } from "@/services/feed.service"
import { spfeedService } from "@/services/realestate.service"
import { useTheme } from "@/hooks/useTheme"
import { usePostRepost } from "@/hooks/usePostRepost"
import { getAvatarColor } from "@/hooks/useUserGenerateAvatarColor"
import truncate from "@/hooks/useTruncateBody"
import { useAuthStore } from "@/stores/auth.store"
import { DownloadProgressRing } from "../ui/DownloadProgress"
import { useNotificationToast } from "../activityIndicator/ToastNotification"
import { useToast } from "../activityIndicator/ToastProvider"
import { parseText } from "@/hooks/useTextParser"
import { useWatchTime } from "@/hooks/useWatchTime"
import ReportPostModal from "../reportpost/ReportPostModal"
const { width: SCREEN_WIDTH } = Dimensions.get("window")

interface Props {
  post: Post
  //isVisible:boolean
  onSave?: (post_slug: string, saved: boolean) => void
  onUpvote?: (slug: string, upvoted: boolean) => void
  index: number
  scrollOffset: any
  isSP?: boolean
}

export const PostCard = ({ post, onSave, onUpvote, index, scrollOffset, isSP = false }: Props) => {

  const { gatedAction } = useAuthGate()
  const theme = useTheme()
  const { showToast } = useToast()
  const [moreOptionsVisible, setMoreOptionsVisisble] = useState<boolean>(false)
  const [downloadStatus, setDownloadStatus] = useState<"idle" | "downloading" | "success" | "error">("idle")
  const [downloadProgress, setDownloadProgress] = useState(0)
  const { user } = useAuthStore()
  const [expanded, setExpanded] = useState<boolean>(false)
  const [shareModalVisible, setShareModalVisible] = useState<boolean>(false)
  const queryClient = useQueryClient()
  //  upvote 

  const handleUpvote = useCallback(() => {

    gatedAction(
      { type: "upvote", postSlug: post.slug },
      async () => {
        onUpvote?.(post.slug, !post.is_upvoted)
        try {
          //  onUpvote?.(post.slug, result.upvoted)
          isSP ? await spfeedService.toggleUpvote(post.slug) : feedService.toggleUpvote(post.slug)

        } catch (error) {
        }
      }
    )
  }, [post.slug, gatedAction, onUpvote])

  //  save 
  const handleSave = useCallback(() => {
    onSave?.(post.slug, true)
    gatedAction(
      { type: "save", postId: post.id, postSlug: post.slug },
      async () => {
        try {

          const result = isSP ? await spfeedService.toggleSave(post.slug) : await feedService.toggleSave(post.slug)

          showNotifToast(post.is_saved ? "Removed from your profile" : "Saved to your profile", "success")
        } catch (error) {
        }
      }
    )
  }, [post.id, post.slug, gatedAction, onSave])
  const [activeMedia, setActiveMedia] = useState<{ type: "image" | "video"; url: string } | null>(
    post.videos?.[0]
      ? { type: "video", url: post.videos[0].video }
      : post.images?.[0]
        ? { type: "image", url: post.images[0].image }
        : null
  )
  // local visibility state + ref
  const carouselRef = useRef<View>(null)
  const [isVisible, setIsVisible] = useState(false)
  const durationRef = useRef<number | undefined>(undefined)
useWatchTime(post.id, isVisible, !!user && !isSP, () => durationRef.current)
  const { handleRepost } = usePostRepost(post.slug)
  const [activeIndex, setActiveIndex] = useState(0)
  const navigation = useNavigation()
  const handleRepostPost = useCallback(() => {
    setShareModalVisible(false)
    if (!user) {
      showToast({
        title: "Post Repost",
        message: "Create an account or login to your existing account to repost.",
        onConfirm: () => { router.push(`/(auth)/login`) },
      })

    }
    handleRepost()
  }, [post.id, post.slug, handleRepost])

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (shareModalVisible) {
          setShareModalVisible(false)
          return true // consume the event, don't navigate back
        }
        return false // let default back behavior happen
      }

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress)
      return () => subscription.remove()
    }, [shareModalVisible])
  )
  const handleCopy = async () => {
    if (!post.description) return
    setShareModalVisible(false)
    await Clipboard.setStringAsync(post.description)
  }

  const DOWNLOAD_TIMEOUT_MS = 60000 // 60s
  const { showNotifToast } = useNotificationToast()
  const handleDownload = async () => {
    if (post.post_type === "text" || !activeMedia) return

    setDownloadStatus("downloading")
    setDownloadProgress(0)

    try {
      const ext = activeMedia.type === "video" ? "mp4" : "png"
      const downloadPromise = saveMediaToDevice(
        activeMedia.url,
        `${post.owner.username.replace(/[^a-zA-Z0-9-_]/g, "_")}-${post.name.replace(/[^a-zA-Z0-9-_]/g, "_")}-${activeIndex}.${ext}`,
        (p) => setDownloadProgress(p),
        () => showNotifToast("Cannot download. Permission to access media denied", "error")
      )

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Download timed out")), DOWNLOAD_TIMEOUT_MS)
      })

      await Promise.race([downloadPromise, timeoutPromise])
      setDownloadStatus("success")
      showNotifToast("Downloaded to gallery", "success")
    } catch (err) {
      setDownloadStatus("error")
      showNotifToast("Download failed", "error")
    } finally {
      setTimeout(() => {
        setDownloadStatus("idle")
        setDownloadProgress(0)
      }, 1400)
    }
  }
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !shareModalVisible })
  }, [shareModalVisible, navigation])
  useEffect(() => {
    const interval = setInterval(() => {
      carouselRef.current?.measure((_x, _y, _w, height, _pageX, pageY) => {
        const screenHeight = Dimensions.get("window").height
        const carouselBottom = pageY + height
        const carouselTop = pageY
        const visible = carouselTop < screenHeight * 0.5 && carouselBottom > screenHeight * 0.3
        setIsVisible(visible)
      })
    }, 200)
    return () => clearInterval(interval)
  }, [])
  useEffect(() => {
    if (isVisible) {
      isSP ? spfeedService.viewsEndpoint(post.slug) : feedService.viewsEndpoint(post.slug)
    }
  }, [isVisible, post.slug])
  //  view comments ─
  // comments are public — no auth gate
  const handleComments = useCallback(() => {
    router.push({
      pathname: `/post/${post.slug}` as any,
      params: {
        action: "comments"
      }
    })
  }, [post.slug])

  const handleRefetchViewsCount = useCallback(async () => {
    try {

      const data = isSP ? await spfeedService.fetchViewsCount(post.slug) : await feedService.fetchViewsCount(post.slug)

      queryClient.setQueryData(
        isSP ? ["sp-feed"] : ["feed"],
        (old: any) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              data: {
                ...page.data,
                posts: page.data.posts.map((p: Post) =>
                  p.slug === post.slug
                    ? {
                      ...p,

                      views_count: data?.views_count,
                    }
                    : p
                ),
              },
            })),
          };
        }
      );
    } catch { }



  }, [post.slug])




  //  share 
  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Check out this ${isSP ? "property:" : "post"} ${post?.name ?? ""}   on SmartPipla\n${isSP ? `https://smartpipla.com/sp/post/${post.slug}` : `https://smartpipla.com/post/${post.slug}`}`,
      })
    } catch (error) {
    }
  }, [post, post.slug])
  const handleCopyinapplink = async () => {
    if (!post) return
    setShareModalVisible(false)
    try {
      await Clipboard.setStringAsync(isSP ? `https://smartpipla.com/sp/post/${post.slug}` : `https://smartpipla.com/post/${post.slug}`)
    } catch {
      showNotifToast("Error copying. Try again", "error")
    }
  }
  return (
    <View style={[styles.container, { backgroundColor: theme.background, borderColor: theme.textMuted }]}>
      {shareModalVisible && <TouchableOpacity
        style={[{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor:"rgb(0,0,0,0.1)",
          zIndex: 800

        }]}
        onPress={() => setShareModalVisible(false)}
      />

      }
      {shareModalVisible && <View
        style={[{
          position: "absolute", backgroundColor: theme.backgroundMuted, borderWidth: 2, borderColor: theme.textPlaceholder,
          right: 3, bottom: 30, zIndex: 1000, width: 150, gap: 10, borderRadius: Radius.md, paddingVertical: 6,
        }]}
      >
        <TouchableOpacity
          style={[styles.interactionItem, { backgroundColor: theme.backgroundMuted, borderColor: theme.textPlaceholder, borderWidth: 0, justifyContent: "space-between" }]}
          onPress={() => setShareModalVisible(false)}
          activeOpacity={0.7}
        >
          <Text style={[{ color: theme.textPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold }]}>
            Select share action
          </Text>
          <View
            style={[{ backgroundColor: theme.primary, borderRadius: Radius.md, paddingHorizontal: 3 }]}
          >
            <Text style={[{ color: theme.textPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.bold }]}>
              Close
            </Text>
          </View>
        </TouchableOpacity>
        {!isSP && <TouchableOpacity
          style={[styles.interactionItem, { backgroundColor: theme.backgroundMuted, borderColor: theme.textPlaceholder }]}
          onPress={handleRepostPost}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="repeat-variant" color={theme.primary} />

          <Text style={[styles.interactionIcon, { color: theme.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold }]}>
            Repost
          </Text>
        </TouchableOpacity>}
        {post.post_type != "text" && post.allow_download &&
          <TouchableOpacity
            style={[styles.interactionItem, { backgroundColor: theme.backgroundMuted, borderColor: theme.textPlaceholder }]}
            onPress={handleDownload}
            activeOpacity={0.7}
            disabled={downloadStatus === "downloading"}
          >
            {downloadStatus === "idle" ? (
              <>
                <MaterialCommunityIcons name="download" color={theme.primary} />
                <Text style={[styles.interactionIcon, { color: theme.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold }]}>
                  Download
                </Text>
              </>
            ) : (
              <>
                <DownloadProgressRing progress={downloadProgress} status={downloadStatus} size={16} />
                <Text style={[styles.interactionIcon, { color: theme.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold }]}>
                  {downloadStatus === "downloading" ? `${Math.round(downloadProgress * 100)}%` : downloadStatus === "success" ? "Saved" : "Failed"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        }
        <TouchableOpacity
          style={[styles.interactionItem, { backgroundColor: theme.backgroundMuted, borderColor: theme.textPlaceholder }]}
          onPress={handleCopyinapplink}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="link" color={theme.primary} />
          <Text style={[styles.interactionIcon, { color: theme.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold }]}>
            Copy inapp link
          </Text>
        </TouchableOpacity>
        {post.description &&
          <TouchableOpacity
            style={[styles.interactionItem, { backgroundColor: theme.backgroundMuted, borderColor: theme.textPlaceholder }]}
            onPress={handleCopy}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="content-copy" color={theme.primary} />
            <Text style={[styles.interactionIcon, { color: theme.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold }]}>
              Copy text body
            </Text>
          </TouchableOpacity>}

        <TouchableOpacity
          style={[styles.interactionItem, { backgroundColor: theme.backgroundMuted, borderColor: theme.textPlaceholder }]}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="message-text" color={theme.primary} />
          <Text style={[{ color: theme.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold }]}>
            Via another app
          </Text>
        </TouchableOpacity>
      </View>}
      {/*  media carousel  */}
      <View ref={carouselRef}>
        <View
          style={[styles.userRow, { justifyContent: "space-between" }]}
        >
          <View
            style={styles.userRow}
          >
            <TouchableOpacity
              style={styles.userRow}
              onPress={() => router.push({
                pathname: (user && post.owner.username === user?.username && !isSP) ? `/profile` : (user && post.owner.username !== user?.username && !isSP || !user && !isSP) ? `/profile/${post.owner.username}` : (isSP && user && post.owner.username == user?.username) ? `/sp/profile` : (isSP && user && post.owner.username != user.username || !user && isSP) ? `/sp/profile/${post.owner.username}` : `/` as any,


              })
              }
              activeOpacity={0.7}
            >
              {post.owner.avatar === null ? (
                <View style={[styles.usernamePlcaholder, { backgroundColor: `${getAvatarColor(post.owner.username)}` }]}>
                  <Text style={[{ color: "#fff", fontSize: FontSize.xl, fontWeight: FontWeight.bold }]} >  {post.owner.username.charAt(0)}</Text>
                </View>
              ) : (
                <Image
                  source={{ uri: post.owner.avatar }}
                  style={[styles.avatar, { borderColor: theme.textPlaceholder, borderWidth: 1 }]}
                  transition={200}
                />
              )}


              <View
                style={[{ flexDirection: "row" }]}
              >
                <Text style={[styles.userName, { color: theme.primary }]}>{isSP ? "sp/" : "@/"}</Text>
                <Text style={[styles.userName, { color: theme.textPrimary }]}>{post.owner?.username}</Text>
              </View>
              {/* <VerifiedBadge badge={post.owner?.verification_badge} size="sm" /> */}

            </TouchableOpacity>
            {isSP && <TouchableOpacity
              style={[{ backgroundColor: theme.backgroundMuted, borderRadius: Radius.md, paddingHorizontal: 4, borderWidth: 1, borderColor: theme.textPlaceholder }]}
              onPress={() => router.push(user && post.owner.username === user?.username ? `/sp/profile` : `/sp/profile/${post.owner.username}`)}
              activeOpacity={0.7}
            >
              <Text style={[styles.userName, { color: theme.primary }]}>{`${post.property_profile?.name ?? post.property_profile?.org_name ?? "Smartproperty"}`}</Text>
            </TouchableOpacity>}
          </View>
          <View
            style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginRight: 10 }]}
          >
            <Text style={[styles.timeAgo, { color: theme.textPrimarylight }]}>
              {formatTimeAgo(post.created_at)}
            </Text>
            <TouchableOpacity
              onPress={() => setMoreOptionsVisisble(true)}
            >
              <MaterialCommunityIcons name="dots-vertical" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>

        </View>
        <View >
          {post.post_type === "text" ? (
            <View style={[styles.textConatiner]}>
              <View>
                <Text style={[styles.textTitle, { color: theme.textPrimary }]}>{post.name}</Text>
              </View>

              <View>
                <TouchableOpacity onPress={() =>
                  post.description.length > 100 ?
                    setExpanded((v) => !v) :
                    null
                } activeOpacity={0.8}>
                  <Text style={[styles.textBody, { color: theme.textPrimarylight }]}>{expanded ? parseText(post.description) : parseText(truncate(post.description, 300))}</Text>
                </TouchableOpacity>
              </View>
              {post.description.length > 100 && (
                <TouchableOpacity
                  style={[styles.readMore]}
                  onPress={() => setExpanded((v) => !v)}
                >
                  <Text
                    style={[{ color: theme.primary, fontSize: FontSize.xs, fontWeight: FontWeight.regular, }]}
                  >{expanded ? "Show less" : "Read more"}</Text>
                </TouchableOpacity>
              )}
            </View>

          ) : (
            <>
              <View style={[styles.textConatiner]}>
                <View
                  style={[{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}
                >
                  <Text style={[styles.textTitle, { color: theme.textPrimary }]}>{post.name.slice(0,30)}{post.name.length>30?"...":null}</Text>
                  {post.sound && (
                    <View
                    style={[{flexDirection:"row",alignItems:"center",borderWidth:1,borderRadius:Radius.md,borderColor:theme.textPlaceholder,paddingHorizontal:3}]}
                    >
                      <MaterialCommunityIcons name="music-note" size={14} color={theme.primary} />

                      <Text style={[, { color: theme.textPrimary, fontSize: FontSize.sm }]}>{post.sound?.title.slice(0, 11) ?? "sound"}{post.sound?.title?.length > 11 ? "..." : null}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={() =>
                  post.description.length > 100 ?
                    setExpanded((v) => !v) :
                    null
                } activeOpacity={0.8}>
                  <View>
                    <Text style={[styles.textBody, { color: theme.textPrimarylight }]}>{expanded ? parseText(post.description) : parseText(truncate(post.description))}</Text>

                  </View>
                </TouchableOpacity>
                {post.description.length > 100 && (
                  <TouchableOpacity
                    style={[styles.readMore]}
                    onPress={() => setExpanded((v) => !v)}
                  >
                    <Text
                      style={[{ color: theme.primary, fontSize: FontSize.xs, fontWeight: FontWeight.regular, }]}
                    >{expanded ? "Show less" : "Read more"}</Text>
                  </TouchableOpacity>
                )}

              </View>
              <ImageCarousel
                images={post.images}
                video={post.videos}
                slug={post.slug}
                isVisible={isVisible}
                isSP={isSP}
                price={post.price}
                deposit={post.deposit}
                installments={post.monthly_installment}
                listing_type={post.listing_type}
                location={post.location_display}
                onActiveMediaChange={(item, index) => {
                  setActiveMedia(item)
                  setActiveIndex(index)
                }}
                sound_url={post.sound?.preview_url}
                onVideoDuration={(s) => { durationRef.current = s }}

              />
            </>
          )}
        </View>
      </View>

      {/*  post info section ─ */}
      <View style={styles.infoSection}>
        {/* interactions row */}
        <View style={[styles.interactionsRow, { borderBottomColor: theme.textMuted, borderTopColor: theme.textMuted }]}>
          <View style={{ flexDirection: "row", gap: 15 }}>
            {/* upvote */}
            <TouchableOpacity
              style={[styles.interactionItem, { backgroundColor: theme.backgroundMuted, borderColor: theme.textPlaceholder }]}
              onPress={handleUpvote}
              activeOpacity={0.7}
            >
              <Text style={[styles.interactionIcon]}>
                {post.is_upvoted ? <MaterialCommunityIcons name="chevron-up-circle-outline" size={20} color={`${theme.primary}`} /> : <MaterialCommunityIcons name="chevron-up-circle-outline" size={20} color={"white"} />}
              </Text>
              <Text style={[styles.interactionCount, { color: theme.textPrimary }]}>
                {formatCount(post.upvotes_count)}
              </Text>
            </TouchableOpacity>

            {/* comments — public, no auth gate */}
            {!isSP && <TouchableOpacity
              style={[styles.interactionItem, { backgroundColor: theme.backgroundMuted, borderColor: theme.textPlaceholder }]}
              onPress={handleComments}
              activeOpacity={0.7}
            >
              <Text style={[styles.interactionIcon]}>
                <MaterialCommunityIcons name="comment-outline" color={`${theme.primary}`} size={20} />
              </Text>
              <Text style={[styles.interactionCount, { color: theme.textPrimary }]}>
                {formatCount(post.comments_count)}
              </Text>
            </TouchableOpacity>}

            <TouchableOpacity
              style={[styles.interactionItem, { backgroundColor: theme.backgroundMuted, borderColor: theme.textPlaceholder }]}
              onPress={handleRefetchViewsCount}
              activeOpacity={0.7}
            >
              <Text style={[styles.interactionIcon]}>

                <MaterialCommunityIcons name="eye-outline" color={theme.primary} size={20} />
              </Text>
              <Text style={[styles.interactionCount, { color: theme.textPrimary }]}>
                {formatCount(post.views_count)}
              </Text>
            </TouchableOpacity>

          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {/* save */}
            <TouchableOpacity
              style={[styles.interactionItem, { backgroundColor: theme.backgroundMuted, borderColor: post.is_saved ? theme.primary : theme.textPlaceholder }]}
              onPress={handleSave}
              activeOpacity={0.7}
            >
              <Text style={[styles.interactionIcon, { color: theme.textPrimary }]}>
                <MaterialCommunityIcons name="bookmark" size={20} color={post.is_saved ? theme.primary : theme.textMuted} />

              </Text>
              <Text style={styles.interactionCount}>{post.saves_count}</Text>
            </TouchableOpacity>

            {/* share — no auth required */}
            <TouchableOpacity
              style={[styles.interactionItem, { backgroundColor: theme.backgroundMuted, borderColor: theme.textPlaceholder }]}
              onPress={() => setShareModalVisible((v) => !v)}
              activeOpacity={0.7}
            >

              <Text style={[styles.interactionIcon, { color: theme.textPrimary, borderColor: theme.borderMuted }]}>Share</Text>
              <Text style={styles.interactionCount}></Text>
            </TouchableOpacity>
          </View>
        </View>

        <ReportPostModal
          isVisible={moreOptionsVisible}
          id={post.id}
          name={post.name}
          onClose={() => setMoreOptionsVisisble(false)}

        />
      </View>
    </View>
  )
}

//  helpers ─

const formatCount = (count: number): string => {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
  return String(count)
}

const formatTimeAgo = (dateString: string): string => {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(dateString).toLocaleDateString()
}


const formatPrice = (price: string) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "Ksh",
    minimumFractionDigits: 0,
  }).format(Number(price))
const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    borderRadius: Radius.md,
    borderTopWidth: 2,
    borderBottomWidth: 3,
    backgroundColor: Colors.surface,
    marginBottom: 8,
  },
  infoSection: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    borderRadius: 10,

    paddingBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.gray[200],
    overflow: "hidden",
  },
  usernamePlcaholder: {
    width: 28,

    height: 28,
    borderRadius: 14,
  },
  userInfo: {
    flex: 1,
    flexDirection: "row",
    gap: 10
  },
  userName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  timeAgo: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  postName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  ViewMoredetails: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    lineHeight: 20,
    borderRadius: Radius.md,
    borderWidth: 2,
    overflow: "hidden"
  },

  textConatiner: {
    paddingHorizontal: Spacing.sm,
  },
  textTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm
  },
  textBody: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },


  interactionsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderBottomWidth: 0.5,

    borderTopColor: Colors.gray[100],
  },
  interactionItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 2,
    paddingHorizontal: Spacing.xs,
    gap: 4,
  },
  shareItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 2,
    paddingHorizontal: Spacing.xs,
    gap: 4,
  },
  interactionIcon: {
    fontSize: 15,

  },
  interactionCount: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  ctaRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  ctaButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPrimary: {
    backgroundColor: Colors.primary,
  },
  ctaSecondary: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  ctaPrimaryText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  ctaSecondaryText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  readMore: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    right: 5,
    bottom: 5,

  },
})