
//individual post

import { useState, useRef, useCallback, useEffect } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Share,
  ScrollView,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  BackHandler
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Image } from "expo-image"
import { router, useLocalSearchParams, useFocusEffect } from "expo-router"
import { useTheme } from "@/hooks/useTheme"
import { useSPPostDetail } from "@/hooks/useSPPostDetail"
import { ImageCarousel, CARD_HEIGHT } from "@/components/feed/ImageCarousel"
import { AuthPrompt } from "@/components/auth/AuthPrompt"
import { Spacing, Radius, FontSize, FontWeight, Colors } from "@/constants/colors"
import { spfeedService } from "@/services/realestate.service"
import { useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/stores/auth.store"
import { useWebSocket } from "@/hooks/useWebSocket"
import { AnimatedBanner, BannerType } from "@/components/activityIndicator/AnimatedBanner"
import { BouncingBarsIndicator } from "../../../components/activityIndicator/BouncingBarsIndicator"
import { useToast } from "@/components/activityIndicator/ToastProvider"
import truncate from "@/hooks/useTruncateBody"
import { getAvatarColor } from "@/hooks/useUserGenerateAvatarColor"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { parseText } from "@/hooks/useTextParser"
import * as Clipboard from "expo-clipboard"
import { useNotificationToast } from "@/components/activityIndicator/ToastNotification"
import ReportPostModal from "@/components/reportpost/ReportPostModal"
// scroll offset at which header becomes solid
const HEADER_SOLID_THRESHOLD = CARD_HEIGHT - 80
interface BannerState {
  id: number; // changing id forces AnimatedBanner to remount and re-animate
  type: BannerType;
  message: string;
}
export default function PostDetailScreen() {
  const theme = useTheme()
  const { user } = useAuthStore()

  const { slug, action } = useLocalSearchParams<{ slug: string; action?: string }>()
  const queryClient = useQueryClient()
  const {
    post,
    isLoading,
    isError,
    handleUpvote,
    handleSave,
    isOwner,
    refetch,
  } = useSPPostDetail(slug)

  //  state ─
  const [commentsVisible, setCommentsVisible] = useState(false)
  const scrollY = useRef(new Animated.Value(0)).current
  const [showReportModal, setShowReportModal] = useState(false)
  const [menuVisible, setMenuVisible] = useState(false)
  const [banner, setBanner] = useState<BannerState | null>(null);
  const { showToast } = useToast()
  const [expanded, setExpanded] = useState<boolean>(false)
  const { showNotifToast } = useNotificationToast()
  const [shareModalVisible, setShareModalVisible] = useState<boolean>(false)

  //  header opacity 
  // header transitions from transparent to solid as user scrolls past the image
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [HEADER_SOLID_THRESHOLD - 60, HEADER_SOLID_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  })

  // header icon color flips from white (over image) to theme color (over content)
  const headerIconOpacity = scrollY.interpolate({
    inputRange: [HEADER_SOLID_THRESHOLD - 60, HEADER_SOLID_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  })

  const postQueryKey = ["post"]
  const showBanner = useCallback((type: BannerType, message: string) => {
    setBanner({ id: Date.now(), type, message });
  }, []);
  const formatTimeAgo = (dateString: string): string => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
    if (seconds < 60) return "just now"
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return new Date(dateString).toLocaleDateString()
  }
  const handleWSEventRef = useRef<(event: any) => void>(null)
  handleWSEventRef.current = useCallback((event: any) => {
    switch (event.type) {


      case "change_upvotes_count_post": {
        queryClient.setQueryData(["post", event.data.slug], (old: any) => ({
          ...old,
          upvotes_count: event.data.upvotes_count


        }))
        break
      }

      case "change_comments_count_post": {
        queryClient.setQueryData(["post", event.data.slug], (old: any) => ({
          ...old,

          comments_count: event.data.comments_count


        }))
        break
      }



    }
  }, [postQueryKey])

  const stableHandler = useCallback((event: any) => {
    handleWSEventRef.current?.(event)
  }, [])

  const { status } = useWebSocket({
    userId: user?.id ?? "",
    onEvent: stableHandler,
  })



  const handleCopy = async () => {
    if (!post?.description) return
    setShareModalVisible(false)
    await Clipboard.setStringAsync(post.description)
  }

  //  share 
  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Check out this property: ${post?.name ?? ""}  on SmartPipla\nhttps://smartpipla.com/sp/post/${slug}`,
      })
    } catch (error) {
    }
  }, [post, slug])
  const handleCopyinapplink = async () => {
    if (!post) return
    setShareModalVisible(false)
    try {
      await Clipboard.setStringAsync(`https://smartpipla.com/sp/post/${slug}`)
    } catch {
      showNotifToast("Error copying. Try again", "error")
    }
  }
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (shareModalVisible || menuVisible) {
          setShareModalVisible(false);
          setMenuVisible(false);
          return true // consume the event, don't navigate back
        }
        return false // let default back behavior happen
      }

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress)
      return () => subscription.remove()
    }, [shareModalVisible])
  )
  useEffect(() => {
    if (action === 'comments') {
      setCommentsVisible(true)
    }

  }, [action])

  const handleDelete = async () => {
    try {
      await spfeedService.deleteListing(slug)
      await queryClient.invalidateQueries({ queryKey: ["post", slug] })
      showBanner("success", "Deleted successfully")

      router.back()

    } catch (error: any) {
      showBanner("error", error?.response?.data?.detail ?? "Failed to delete listing.Try again")
    }
  }




  //  loading state ─
  if (isLoading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: theme.background }]}>
        <BouncingBarsIndicator />
      </View>
    )
  }
  if (isError) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={[styles.errorText, { color: theme.textMuted }]}>Failed to load</Text>
        <TouchableOpacity style={[styles.retryBtn, { borderColor: theme.primary }]} onPress={() => refetch()}>
          <Text style={[styles.retryText, { color: theme.primary }]}>Try again</Text>
        </TouchableOpacity>
      </View>)

  }
  if (!post) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.textPrimary }]}>
          Post not found
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: theme.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }


  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["bottom"]}
    >
      {shareModalVisible && <View
        style={[{
          position: "absolute", backgroundColor: theme.backgroundMuted, borderWidth: 2, borderColor: theme.textPlaceholder,
          right: 3, bottom: 170, zIndex: 999, width: 150, gap: 10, borderRadius: Radius.md, paddingVertical: 6
        }]}
      >
        <TouchableOpacity
          style={[styles.interactionItem, { backgroundColor: theme.backgroundMuted, borderColor: theme.textPlaceholder, justifyContent: "space-between", borderWidth: 0 }]}
          onPress={() => setShareModalVisible(false)}
          activeOpacity={0.7}
        >
          <Text style={[{ color: theme.textPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold }]}>
            Select share action
          </Text>
          <View
            style={[{ backgroundColor: theme.primary, borderRadius: Radius.md, paddingHorizontal: 3 }]}
          >
            <Text style={[{ color: theme.textPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.regular }]}>
              Close
            </Text>
          </View>
        </TouchableOpacity>

        {/* <TouchableOpacity
                style={[styles.interactionItem, { backgroundColor: theme.backgroundMuted, borderColor: theme.textPlaceholder }]}
                onPress={handleRepostPost}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="repeat-variant" color={theme.primary} />
      
                <Text style={[styles.interactionIcon, { color: theme.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold }]}>
                  Repost
                </Text>
              </TouchableOpacity> */}
        {/* <TouchableOpacity
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
              </TouchableOpacity> */}
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

      {(menuVisible || shareModalVisible) && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => { setMenuVisible(false); setShareModalVisible(false) }}
        />
      )}
      {banner && (
        <AnimatedBanner
          key={banner.id}
          type={banner.type}
          message={banner.message}
          onHide={() => setBanner(null)}
        />
      )}

      {/*  floating header  */}
      <View style={styles.floatingHeader}>
        {/* animated background */}
        <Animated.View
          style={[
            styles.headerBackground,
            {
              backgroundColor: theme.surface,
              opacity: headerBgOpacity,
              borderBottomColor: theme.border,
            }
          ]}
        />

        {/* back button */}
        <TouchableOpacity
          style={[styles.headerButton,]}
          onPress={() => router.back()}
        >
          {/* white icon over image */}
          <Animated.Text style={[
            styles.headerIconWhite,
            { opacity: Animated.subtract(1, headerIconOpacity) }
          ]}>
            <MaterialCommunityIcons name="arrow-left-thick" color={theme.primary} size={30} />
          </Animated.Text>
          {/* theme icon over content */}
          <Animated.Text style={[
            styles.headerIconTheme,
            { color: theme.textPrimary, opacity: headerIconOpacity }
          ]}>
            <MaterialCommunityIcons name="arrow-left-thick" color={theme.primary} size={30} />
          </Animated.Text>
        </TouchableOpacity>

        {/* right actions */}
        <View style={styles.headerRight}>

          <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
          </TouchableOpacity>
          {/* more — report/block */}
          <TouchableWithoutFeedback onPress={() => setMenuVisible(v => !v)}>
            <View
              style={styles.headerButton}

            >
              <Animated.Text style={[
                styles.headerIconWhite,
                { opacity: Animated.subtract(1, headerIconOpacity) }
              ]}>
                <MaterialCommunityIcons name="dots-vertical" color={theme.primary} size={30} />

              </Animated.Text>
            </View>
          </TouchableWithoutFeedback>
          {menuVisible && (
            <>
              <View style={[styles.dropdown, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {!isOwner && (
                  <>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => {
                      setMenuVisible(false)
                      setShowReportModal(true)
                    }}>
                      <Text style={[styles.dropdownItemText, { color: theme.textPrimary }]}>
                        Report this post
                      </Text>
                    </TouchableOpacity>

                    <View style={[styles.dropdownDivider, { backgroundColor: theme.border }]} />
                  </>
                )}
                {isOwner && (
                  <>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => {
                      setMenuVisible(false)
                      router.push(`/sp/edit-post/${post.slug}` as any)
                    }}>
                      <Text style={[styles.dropdownItemText, { color: theme.textPrimary }]}>
                        Edit
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => {
                      setMenuVisible(false)
                      showToast({
                        title: "Delete post?",
                        message: "This can't be undone.",
                        onConfirm: () => { handleDelete() },
                        onCancel: () => { },
                      })
                    }}>
                      <Text style={[styles.dropdownItemText, { color: theme.textPrimary }]}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          )}
        </View>
      </View>


      <ImageCarousel
        images={post.images}
        video={post.videos}
        isDetail={true}
        slug={post.slug}
        isVisible={true}
        price={post.price}
        isSP={true}
        listing_type={post.listing_type}
        deposit={post.deposit}
        installments={post.monthly_installment}
        location={post.location_display}
        sound_url={post?.sound?.preview_url}
      />


      {/*  interactions row  */}
      <View style={styles.interactionsRow}>
        <View style={{ flexDirection: "column", gap: 4 }}>
          <TouchableOpacity
            style={[styles.interaction, { borderColor: "#383434", flexDirection: "column" }]}
            onPress={handleUpvote}
          >
            <Text style={styles.interactionIcon}>
              {post.is_upvoted ? <MaterialCommunityIcons name="chevron-up-circle-outline" size={30} color={`${theme.primary}`} /> : <MaterialCommunityIcons name="chevron-up-circle-outline" size={20} color={"white"} />}
            </Text>
            <Text style={[styles.interactionCount, { color: "#fff", fontWeight: "900" }]}>
              {post.upvotes_count}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.interaction, { borderColor: "#383434", flexDirection: "column" }]}
            onPress={() => setCommentsVisible(true)}
          >
            <Text style={styles.interactionIcon}>
              <MaterialCommunityIcons name="comment" color={`${theme.primary}`} size={30} />

            </Text>
            <Text style={[styles.interactionCount, { color: "#fff", fontWeight: "900" }]}>
              {post.comments_count}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: "column", gap: 4 }}>
          <TouchableOpacity
            style={[styles.interaction, { borderColor: "#383434", flexDirection: "column" }]}
            onPress={handleSave}
          >
            <Text style={[styles.interactionIcon, { color: theme.textPrimary, fontSize: 20 }]}>
                    <MaterialCommunityIcons name="bookmark" size={post.is_saved ? 30 : 20} color={post.is_saved ? theme.primary : theme.textMuted} />
            </Text>
            <Text style={[styles.interactionCount, { color: "#fff", fontWeight: "900" }]}>
              {post.saves_count}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.interaction, { borderColor: "#383434", }]}
            onPress={() => setShareModalVisible(true)}
          >
            <Text style={[styles.interactionIcon, { color: theme.textPrimary, fontSize: 20 }]}>Share</Text>
            <Text style={[styles.interactionCount, { color: theme.textSecondary }]}>

            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View

        style={[styles.commentsPreview, { backgroundColor: expanded ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.1)", maxHeight: expanded ? undefined : 80 }]}
      >

        {post.owner.avatar === null ? (
          <View
            style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}
          >
            <View
              style={[{ flexDirection: "row", alignItems: "center", gap: 20 }]}
            >
              <TouchableOpacity
                onPress={() => router.push(user && user.username === post.owner.username ? `/sp/profile` : `/sp/profile/${post.owner.username}`)}
                style={[{ flexDirection: "row", alignItems: "center", gap: 2, }]}
              >
                <View style={[styles.usernamePlcaholder, { backgroundColor: `${getAvatarColor(post.owner.username)}` }]}>
                  <Text style={[{ color: "#fff" }]} >{post.owner.username.charAt(0)}</Text>
                </View>
                <Text
                  style={[{ color: theme.primary }]}
                >sp/</Text>
                <Text
                  style={[{ color: "#fff", fontWeight: FontWeight.extrabold }]}
                  numberOfLines={1}
                >{post.owner.username}</Text>

              </TouchableOpacity>
              <TouchableOpacity
                style={[{ backgroundColor: theme.backgroundMuted, borderRadius: Radius.md, paddingHorizontal: 4, borderWidth: 1, borderColor: theme.textPlaceholder }]}

                onPress={() => router.push(user && post.owner.username === user?.username ? `/sp/profile` : `/sp/profile/${post.owner.username}`)}
                activeOpacity={0.7}
              >
                <Text style={[{ color: theme.primary }]}>{`${post.property_profile?.name ?? post.property_profile?.org_name ?? "Smartproperty"}`}</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.timeAgo, { color: theme.textPrimarylight }]}>
              {formatTimeAgo(post.created_at)}
            </Text>
          </View>
        ) : (
          <View
            style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}
          >
            <View
              style={[{ flexDirection: "row", alignItems: "center", gap: 20 }]}
            >
              <TouchableOpacity
                onPress={() => router.push(user?.username == post.owner.username ? `/sp/profile` as any : `/profile`)}
                style={[{ flexDirection: "row", alignItems: "center", gap: 2 }]}
              >
                <Image
                  source={{ uri: post.owner.avatar }}
                  style={[styles.avatar, { borderColor: theme.textPlaceholder }]}
                  transition={200}
                />
                <Text
                  style={[{ color: theme.primary }]}
                >sp/</Text>
                <Text
                  style={[{ color: "#fff", fontWeight: FontWeight.extrabold }]}
                >{post.owner.username}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[{ backgroundColor: theme.backgroundMuted, borderRadius: Radius.md, paddingHorizontal: 4, borderWidth: 1, borderColor: theme.textPlaceholder }]}

                onPress={() => router.push(user && post.owner.username === user?.username ? `/sp/profile` : `/sp/profile/${post.owner.username}`)}
                activeOpacity={0.7}
              >
                <Text style={[{ color: theme.primary }]}>{`${post.property_profile?.name ?? post.property_profile?.org_name ?? "Smartproperty"}`}</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.timeAgo, { color: theme.textPrimarylight }]}>
              {formatTimeAgo(post.created_at)}
            </Text>
          </View>
        )}
        <TouchableOpacity activeOpacity={0.7} onPress={() => setExpanded((v) => !v)}
        >
          <View
            style={[{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}
          >
            <Text
              style={[styles.postTitle, { color: "white" }]}
            >
              {post.name.slice(0, 30)}{post.name.length > 30 ? "..." : null}

            </Text>
            {post.sound && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation;
                }}
                hitSlop={{ top: 3, left: 3, bottom: 3, right: 3 }}
                style={[{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: Radius.md, borderColor: theme.textPlaceholder, paddingHorizontal: 3 }]}
              >
                <MaterialCommunityIcons name="music-note" size={14} color={theme.primary} />

                <Text style={[, { color: theme.textPrimary, fontSize: FontSize.sm }]}>{post.sound?.title.slice(0, 11) ?? "sound"}{post.sound?.title?.length > 11 ? "..." : null}</Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView
            style={[{ maxHeight: 500 }]}
          >

            <Text
              style={[styles.commentsPreviewText, { color: "white" }]}
            >{expanded ?
              parseText(post.description)
              : parseText(truncate(post.description, 50))}
            </Text>

          </ScrollView>
        </TouchableOpacity>
        {post.description.length > 50 && (
          <TouchableOpacity
            style={[styles.readMore]}
            onPress={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
          >
            <Text
              style={[{ color: theme.primary, fontSize: FontSize.xs, fontWeight: FontWeight.regular, }]}
            >{expanded ? "Show less" : "Read more"}</Text>
          </TouchableOpacity>
        )}

      </View>


      {/*  comments bottom sheet  */}
      {/* <CommentsSheet
        slug={slug}
        visible={commentsVisible}
        onClose={() => setCommentsVisible(false)}
        totalCount={post.comments_count}
      /> */}
      {/* Report modal */}

      <ReportPostModal
        isVisible={showReportModal}
        onClose={() => setShowReportModal(false)}
        id={post.id}
        name={post.name}
        isSp={true}
      />

      {/*  auth prompt  */}
      <AuthPrompt />


    </SafeAreaView>
  )
}

//  helpers ─

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(220, 189, 189, 0.4)",
    zIndex: 9,
  },
  errorText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  backLink: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 52,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  headerBackground: {
    ...StyleSheet.absoluteFill,
    borderBottomWidth: 1,
  },
  headerButton: {

    alignItems: "center",
    justifyContent: "center",
  },
  headerIconWhite: {
    position: "absolute",
    fontSize: FontSize.xl,
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    elevation: 10,
    fontWeight: FontWeight.extrabold
  },
  headerIconTheme: {
    position: "absolute",
    fontSize: 30,
    fontWeight: FontWeight.extrabold
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  scrollContent: {


  },
  contentCard: {
    position: "absolute",
    right: 3,
    flexDirection: "column",
    bottom: 4,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.md,

  },





  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  interactionsRow: {
    position: "absolute",
    flexDirection: "column",
    alignItems: "center",
    right: 3,
    bottom: 150,
    justifyContent: "space-between",
    gap: Spacing.lg,
  },
  interaction: {
    alignItems: "center",
    borderWidth: 2,
    flexDirection: "row",
    borderRadius: Radius.md,
    paddingHorizontal: 2,
    elevation: 8,
    gap: 0,
  },
  textConatiner: {
    paddingHorizontal: Spacing.sm,

    maxHeight: CARD_HEIGHT + 200,
  },
  content: {
    paddingHorizontal: Spacing.sm,
    paddingTop: 80,
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
  interactionIcon: {
    fontSize: 20,
    fontWeight: FontWeight.medium,
  },
  interactionCount: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  commentsPreview: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md


  },
  commentsPreviewText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.regular,
  },
  postTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  commentsChevron: {
    fontSize: FontSize.xl,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1
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
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
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
  errorIcon: { fontSize: 32, marginBottom: Spacing.sm, textAlign: "center" },
  retryBtn: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  retryText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  reportBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  reportSheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  interactionItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 2,
    paddingHorizontal: Spacing.xs,
    gap: 4,
  },
  reportTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  reportSubtitle: { fontSize: FontSize.sm, marginBottom: Spacing.xs },
  reportOption: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  reportOptionText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  otherInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    minHeight: 80,
    marginTop: Spacing.xs,
  },
  reportSubmit: { borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: "center", marginTop: Spacing.sm },
  reportSubmitText: { color: "#fff", fontSize: FontSize.md, fontWeight: FontWeight.bold },
  reportClose: { fontSize: 18, fontWeight: FontWeight.bold, padding: 4 },
  dropdown: {
    position: "absolute",
    top: 36,
    right: 0,
    minWidth: 210,
    borderWidth: 1,
    borderRadius: Radius.md,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    //android "raised screen"
    elevation: 8,
  },
  dropdownItem: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2 },
  dropdownItemText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  dropdownDivider: { height: 1, marginHorizontal: Spacing.md },
  readMore: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    right: 5,
    bottom: 5,
  },

})
