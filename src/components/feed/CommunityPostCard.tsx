

import { useCallback, useRef, useState, useEffect } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Share,
  ActivityIndicator,
  BackHandler
} from "react-native"
import { Image } from "expo-image"  // expo-image has better caching than RN Image
import { useRouter, useNavigation ,useFocusEffect} from "expo-router"
import { Post } from "@/types"
import * as Clipboard from "expo-clipboard"

import { Colors, Spacing, FontSize, FontWeight, Radius } from "@/constants/colors"
import { ImageCarousel } from "./ImageCarousel"
// import { VerifiedBadge } from "@/components/ui/VerifiedBadge"
import { useAuthGate } from "@/hooks/useAuthGate"
import { useQueryClient, useQuery } from "@tanstack/react-query"
import { useAuthStore } from "@/stores/auth.store"
import { useTheme } from "@/hooks/useTheme"
import { communityservice } from "@/services/community.sevice"
import { TextInput } from "react-native-gesture-handler"
import { AnimatedBanner, BannerType } from "../activityIndicator/AnimatedBanner"
import truncate from "@/hooks/useTruncateBody"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getAvatarColor } from "@/hooks/useUserGenerateAvatarColor"
import { saveMediaToDevice } from "@/hooks/useSaveMediaToDevice"
import { useNotificationToast } from "../activityIndicator/ToastNotification"
import { DownloadProgressRing } from "../ui/DownloadProgress"
import { parseText } from "@/hooks/useTextParser"

const { width: SCREEN_WIDTH } = Dimensions.get("window")

interface Props {
  post: Post
  communityname: string
  communityslug: string
  onSave?: (post_slug: string, saved: boolean) => void
  onUpvote?: (slug: string, upvoted: boolean) => void
  index: number
  scrollOffset: any
  isAdimnOrModerator?: boolean
  isApprovingOrRejectingPost?: boolean
  showBanner?: (type: BannerType, message: string) => void
  isDetail?: boolean
}

export const CommunityPostCard = ({ post, onSave, showBanner, onUpvote, communityname, communityslug, isAdimnOrModerator, isApprovingOrRejectingPost, isDetail }: Props) => {
  const navigation = useNavigation()
  const { gatedAction } = useAuthGate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const theme = useTheme()
  const router = useRouter()
  const [downloadStatus, setDownloadStatus] = useState<"idle" | "downloading" | "success" | "error">("idle")
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [shareModalVisible, setShareModalVisible] = useState<boolean>(false)

  //  upvote 
  const handleUpvote = useCallback(() => {
    onUpvote?.(post.slug, !post.is_upvoted)
    gatedAction(
      { type: "upvote", postSlug: post.slug },
      async () => {
        try {
          const result = await communityservice.toggleUpvote(post.slug)
          
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
          const result = await communityservice.toggleSave(post.id)
          onSave?.(post.slug, result.saved)
        } catch (error) {
        }
      }
    )
  }, [post.id, post.slug, gatedAction, onSave])

  const [isApproving, setIsApproving] = useState<boolean>(false)
  const [isrejecting, setIsRejecting] = useState<boolean>(false)
  const [rejetionReason, setRejectionReason] = useState<string>("")
  const [reasonInputVisible, setReasonInputVisble] = useState<boolean>(false)
  const [inputHeight, setInputHeight] = useState<number>(58)
  const [expanded, setExpanded] = useState<boolean>(false)
  const [activeMedia, setActiveMedia] = useState<{ type: "image" | "video"; url: string } | null>(
    post.videos?.[0]
      ? { type: "video", url: post.videos[0].video }
      : post.images?.[0]
        ? { type: "image", url: post.images[0].image }
        : null
  )
  const handleApprovePost = async (cslug: string, pslug: string) => {
    setIsApproving(true)
    try {
      const res = await communityservice.approvePost(cslug, pslug)
      if (res.message === "success") {

        showBanner ? showBanner("success", "Post approved") : null;
        queryClient.invalidateQueries({ queryKey: ["com-feed-approved"] });
      }
    }
    catch (e) {
      showBanner ? showBanner("error", "Something went wrong. Try again") : null

    } finally {
      setIsApproving(false)
    }

  }

  const handleRejectPost = async (cslug: string, pslug: string) => {
    setIsRejecting(true)
    try {
      const res = await communityservice.rejectPost(cslug, pslug, rejetionReason)
      if (res.message === "success") {
        showBanner ? showBanner("success", "Post rejected") : null;
        queryClient.invalidateQueries({ queryKey: ["com-feed-rejected"] });
      }
    }
    catch (e) {
      showBanner ? showBanner("error", "Something went wrong. Try again") : null;
    } finally {
      setIsRejecting(false)
    }

  }
  // local visibility state + ref
  const carouselRef = useRef<View>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

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
      communityservice.viewsEndpoint(post.slug)
    }
  }, [isVisible, post.slug])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["views-com-feed", post.slug],
    queryFn: () => communityservice.fetchViewsCount(post.slug),
  })


  useEffect(() => {
    queryClient.setQueryData(
      ["com-feed", communityslug],
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

  }, [data]
  )
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
  const handleCopy = async () => {
    if (!post.description) return
    setShareModalVisible(false)
    await Clipboard.setStringAsync(post.description)
  }
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !shareModalVisible })
  }, [shareModalVisible, navigation])
  //  view comments 
  // comments are public — no auth gate
  const handleComments = useCallback(() => {
    router.push({
      pathname: `/community/post/${post.slug}` as any,
      params: {
        communityname: communityname,
        communityslug: communityslug,
        action: "comments",
      }
    })
  }, [post.slug])
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

  //  share 
  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Check out this post:${post?.name}  on SmartPipla\nhttps://smartpipla.com/community/post/${post.slug}`,
      })
    } catch (error) {
    }
  }, [post, post.slug])

  return (
    <View style={[styles.container, { backgroundColor: theme.background, borderColor: theme.textMuted }]}>

      {/*  media carousel  */}
      <View ref={carouselRef}>
        <TouchableOpacity
          style={styles.userRow}
          onPress={() => router.push(`/profile/${post.owner?.username}`)}
          activeOpacity={0.7}
        >
          {post.owner.avatar === null ? (
            <View style={[styles.usernamePlcaholder, { backgroundColor: `${getAvatarColor(post.owner.username)}` }]}>
              <Text>{post.owner.username.charAt(0)}</Text>
            </View>
          ) : (
            <Image
              source={{ uri: post.owner.avatar }}
              style={styles.avatar}
              transition={200}
            />
          )}

          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.primary }]}>sc/</Text>

            <Text style={[styles.userName, { color: theme.textPrimary }]}>{post.owner?.username}</Text>
            {/* <VerifiedBadge badge={post.owner?.verification_badge} size="sm" /> */}
          </View>
          <Text style={styles.timeAgo}>
            {formatTimeAgo(post.created_at)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity  activeOpacity={0.97}>
          {post.post_type === "text" ? (


            <View style={[styles.textConatiner]}>
              <View>
                <Text style={[styles.textTitle, { color: theme.textPrimary }]}>{post.name}</Text>
              </View>

              <View>
                <Text style={[styles.textBody, { color: theme.textMuted }]}>{expanded ?parseText(post.description) : truncate(parseText(post.description) as unknown as string)}</Text>
              </View>
              {post.description.length > 150 && (
                <TouchableOpacity
                  style={[styles.readMore]}
                  onPress={() => setExpanded((v) => !v)}
                >
                  <Text
                    style={[{ color: theme.primary }]}
                  >{expanded ? "Show less" : "Read more"}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              <View style={[styles.textConatiner]}>
                <View>
                  <Text style={[styles.textTitle, { color: theme.textPrimary }]}>{post.name}</Text>
                </View>

                <View>
                  <Text style={[styles.textBody, { color: theme.textMuted }]}>{expanded ? parseText(post.description) : truncate(parseText(post.description) as unknown as string)}</Text>
                </View>
                {post.description.length > 150 && (
                  <TouchableOpacity
                    style={[styles.readMore]}
                    onPress={() => setExpanded((v) => !v)}
                  >
                    <Text
                      style={[{ color: theme.primary }]}
                    >{expanded ? "Show less" : "Read more"}</Text>
                  </TouchableOpacity>
                )}

              </View>
              <ImageCarousel
                images={post.images}
                video={post.videos}
                slug={post.slug}
                isGroup={true}
                isVisible={isVisible}
                onActiveMediaChange={(item, index) => {
                  setActiveMedia(item)
                  setActiveIndex(index)
                }}
              />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/*  post info section  */}
      <View style={styles.infoSection}>
        {/* interactions row */}
        {!isApprovingOrRejectingPost && (
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
              <TouchableOpacity
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
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.interactionItem, { backgroundColor: theme.backgroundMuted, borderColor: theme.textPlaceholder }]}
                onPress={() => (refetch())}
                activeOpacity={0.7}
              >
                <Text style={[styles.interactionIcon]}>

                  <MaterialCommunityIcons name="eye-outline" color={isLoading ? theme.textMuted : theme.primary} size={20} />
                </Text>
                <Text style={[styles.interactionCount, { color: theme.textPrimary }]}>
                  {formatCount(post.views_count)}
                </Text>
              </TouchableOpacity>

            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {/* save */}
              <TouchableOpacity
                style={[styles.interactionItem, { backgroundColor: theme.backgroundMuted, borderColor: theme.textPlaceholder }]}
                onPress={handleSave}
                activeOpacity={0.7}
              >
                <Text style={[styles.interactionIcon, { color: theme.textPrimary }]}>
                  {post.is_saved ? "Saved" : "Save"}
                </Text>
                <Text style={styles.interactionCount}>{post.saves_count}</Text>
              </TouchableOpacity>

              {/* share — no auth required */}
              <TouchableOpacity
                style={[styles.interactionItem, { backgroundColor: theme.backgroundMuted, borderColor: theme.textPlaceholder }]}
                onPress={()=>setShareModalVisible((v)=>!v)}
                activeOpacity={0.7}
              >
                {shareModalVisible && <View
                  style={[{
                    position: "absolute", backgroundColor: theme.backgroundMuted, borderWidth: 2, borderColor: theme.textPlaceholder,
                    right: 3, bottom: 30, zIndex: 1000, width: 150, gap: 10, borderRadius: Radius.md, paddingVertical: 6
                  }]}
                >
                  <TouchableOpacity
                    style={[styles.interactionItem, { backgroundColor: theme.backgroundMuted, borderColor: theme.textPlaceholder, borderWidth: 0,justifyContent:"space-around" }]}
                    onPress={() => setShareModalVisible((false))}
                    activeOpacity={0.7}
                  >
                    <Text style={[{ color: theme.textPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold }]}>
                      Select share action
                       </Text>
                      <View
                      style={[{backgroundColor:theme.primary,borderRadius:Radius.md,paddingHorizontal:3}]}
                      >
                    <Text style={[{ color: theme.textPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.bold }]}>
                      Cancel
                    </Text>
                    </View>
                  </TouchableOpacity>
                  {/* {!isSP && <TouchableOpacity
                                  style={[styles.interactionItem, { backgroundColor: theme.backgroundMuted, borderColor: theme.textPlaceholder }]}
                                  onPress={handleRepostPost}
                                  activeOpacity={0.7}
                                >
                                  <MaterialCommunityIcons name="repeat-variant" color={theme.primary} />
                
                                  <Text style={[styles.interactionIcon, { color: theme.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold }]}>
                                    Repost
                                  </Text>
                                </TouchableOpacity> */}

                  {post.post_type != "text" &&
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
                  {post.description &&
                    <TouchableOpacity
                      style={[styles.interactionItem, { backgroundColor: theme.backgroundMuted, borderColor: theme.textPlaceholder }]}
                      onPress={handleCopy}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="content-copy" color={theme.primary} />
                      <Text style={[styles.interactionIcon, { color: theme.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold }]}>
                        Copy text
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
                <Text style={[styles.interactionIcon, { color: theme.textPrimary }]}>Share</Text>
                <Text style={styles.interactionCount}></Text>
              </TouchableOpacity>
            </View>
          </View>)}


        {isApprovingOrRejectingPost && (
          <View style={styles.ctaRow}>
            {reasonInputVisible && (
              <View style={[styles.reasonInput]}>
                <TextInput
                  placeholder="Reason"
                  style={[styles.reasonBarInput, { height: Math.min(Math.max(50, inputHeight), 120) }]}
                  onChangeText={setRejectionReason}
                  multiline
                  textAlignVertical="top"
                  onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
                />
                <View style={[{ flexDirection: "row", gap: 40 }]}>
                  <TouchableOpacity
                    onPress={() => {

                      setReasonInputVisble(false)
                    }}>
                    <View style={[styles.submitButton, { backgroundColor: theme.primary, borderColor: theme.success }]}>
                      <Text style={[styles.ctaSecondaryText, { color: theme.textPrimary }]}>Cancel</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={isrejecting || isApproving}
                    onPress={() => {
                      handleRejectPost(communityslug, post.slug),
                        setReasonInputVisble(false)
                    }}>
                    <View style={[styles.submitButton, { backgroundColor: theme.primary, borderColor: theme.success }]}>
                      <Text style={[styles.ctaSecondaryText, { color: theme.textPrimary }]}>
                        {isrejecting ?
                          <ActivityIndicator size="small" color={'#333'} />
                          : "Submit"}


                      </Text>
                    </View>

                  </TouchableOpacity>
                </View>



              </View>
            )}

            <TouchableOpacity
              disabled={isrejecting || isApproving}
              style={[styles.ctaButton, styles.ctaSecondary]}
              onPress={() => handleApprovePost(communityslug, post.slug)}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaSecondaryText}>
                {isApproving ?
                  <ActivityIndicator size="small" color={'#333'} />
                  : "Approve"

                }
              </Text>


            </TouchableOpacity>

            <TouchableOpacity
              disabled={isrejecting || isApproving}
              style={[styles.ctaButton, styles.ctaPrimary]}
              onPress={() => setReasonInputVisble(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaPrimaryText}>
                {isrejecting ?
                  <ActivityIndicator size="small" color={'#333'} />
                  : "Reject"

                }
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}

//  helpers 

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
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.gray[200],
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  usernamePlcaholder: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    height: 28,
    borderRadius: 14,
  },

  timeAgo: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  userInfo: {
    flex: 1,
    flexDirection: "row",
  },
  userName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  postName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    lineHeight: 20,
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
  submitButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginTop: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
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

  reasonInput: {
    position: "absolute",
    top: -400,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    right: 0,
    left: 0,

  },
  reasonBarInput: {
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: "#8484cb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 100,
    minWidth: 300,
  },
  textConatiner: {
    paddingHorizontal: Spacing.sm
  },
  textTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm
  },
  textBody: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  readMore: {
    position: "absolute",
    right: 5,
    bottom: 5,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
})
