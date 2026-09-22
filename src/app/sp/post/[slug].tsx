
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
  TouchableWithoutFeedback
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Image } from "expo-image"
import { router, useLocalSearchParams } from "expo-router"
import { useTheme } from "@/hooks/useTheme"
import { useSPPostDetail } from "@/hooks/useSPPostDetail"
import { ImageCarousel, CARD_HEIGHT } from "@/components/feed/ImageCarousel"
import { AuthPrompt } from "@/components/auth/AuthPrompt"
import { Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { spfeedService } from "@/services/realestate.service"
import { useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/stores/auth.store"
import { useWebSocket } from "@/hooks/useWebSocket"
import { AnimatedBanner, BannerType } from "@/components/activityIndicator/AnimatedBanner"
import { BouncingBarsIndicator } from "../../../components/activityIndicator/BouncingBarsIndicator"
import { useToast } from "@/components/activityIndicator/ToastProvider"
import truncate from "@/hooks/useTruncateBody"
import { getAvatarColor } from "@/hooks/useUserGenerateAvatarColor"
import {MaterialCommunityIcons} from "@expo/vector-icons"
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
  const [reportReason, setReportReason] = useState("")
  const [isReporting, setIsReporting] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [otherReason, setOtherReason] = useState("")
  const [menuVisible, setMenuVisible] = useState(false)
  const [banner, setBanner] = useState<BannerState | null>(null);
  const { showToast } = useToast()
  const [expanded, setExpanded] = useState<boolean>(false)

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
  const REPORT_REASONS = [
    "Spam or scam", "Fake Account", "Harassment",
    "Inappropriate Content", "Inappropriate Behavior", "Impersonation", "Other",]
  const postQueryKey = ["post"]
  const showBanner = useCallback((type: BannerType, message: string) => {
    setBanner({ id: Date.now(), type, message });
  }, []);

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




  //  share 
  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Check out this property: ${post?.name ?? ""}  on smartPeople\nhttps://smartpipla.com/sp/post/${slug}`,
      })
    } catch (error) {
    }
  }, [post, slug])

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

  const handleReportSubmit = async () => {
    if (!reportReason.trim()) return
    try {
      setIsReporting(true)
      await spfeedService.reportPost(post?.id, reportReason, otherReason)
      setShowReportModal(false)
      setReportReason("")
      setOtherReason("")
      showBanner("success", "Thank you, we'll review this report.")
    } catch (e: any) {
      const msg = e.response?.data?.error ?? "Failed to submit report."
      showBanner("error", msg)
    } finally {
      setMenuVisible(false)
      setIsReporting(false)
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
      {menuVisible && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
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
            />


          {/*  interactions row  */}
          <View style={styles.interactionsRow}>
            <View style={{ flexDirection: "column", gap: 4 }}>
              <TouchableOpacity
                style={[styles.interaction, { borderColor: "#383434" ,flexDirection:"column"}]}
                onPress={handleUpvote}
              >
                <Text style={styles.interactionIcon}>
                  {post.is_upvoted ?  <MaterialCommunityIcons name="chevron-up-circle-outline" size={30} color={`${theme.primary}`}/> : <MaterialCommunityIcons name="chevron-up-circle-outline" size={20} color={"white"}/>}
                </Text>
                <Text style={[styles.interactionCount, { color: theme.textPrimary }]}>
                  {post.upvotes_count}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.interaction, { borderColor: "#383434",flexDirection:"column" }]}
                onPress={() => setCommentsVisible(true)}
              >
                <Text style={styles.interactionIcon}>
                <MaterialCommunityIcons name="comment" color={`${theme.primary}`}size={30}/>
                  
                </Text>
                <Text style={[styles.interactionCount, { color: theme.textPrimary }]}>
                  {post.comments_count}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: "column", gap: 4 }}>
                <TouchableOpacity
                style={[styles.interaction, { borderColor: "#383434",flexDirection:"column" }]}
                onPress={handleSave}
              >
                <Text style={[styles.interactionIcon, { color: theme.textPrimary, fontSize: 20 }]}>
                  {post.is_saved ? "Saved" : "Save"}
                </Text>
                <Text style={[styles.interactionCount, { color: theme.textSecondary }]}>
                  {post.saves_count}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.interaction, { borderColor: "#383434", }]}
                onPress={handleShare}
              >
                <Text style={[styles.interactionIcon, { color: theme.textPrimary, fontSize: 20 }]}>Share</Text>
                <Text style={[styles.interactionCount, { color: theme.textSecondary }]}>

                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View

            style={[styles.commentsPreview, { backgroundColor: expanded?"rgba(0,0,0,0.5)" :"rgba(0,0,0,0.1)" }]}
          >

            {post.owner.avatar === null ? (
              <TouchableOpacity
                onPress={() => router.push( user && user.username===post.owner.username?`/sp/profile`:`/sp/profile/${post.owner.username}`)}
                style={[{ flexDirection: "row", alignItems: "center", gap: 2,marginRight:100 }]}
                >
                <View style={[styles.usernamePlcaholder, { backgroundColor: `${getAvatarColor(post.owner.username)}` }]}>
                  <Text style= {[{color:"#fff"}]} >{post.owner.username.charAt(0)}</Text>
                </View>
                <Text
                  style={[{ color:theme.primary }]}
                >sp/</Text>
                <Text
                  style={[{ color:"#fff",fontWeight:FontWeight.extrabold }]}
                  numberOfLines={1}
                >{post.owner.username}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => router.push( user?.username==post.owner.username?  `/sp/profile` as any:`/profile`)}
                style={[{ flexDirection: "row", alignItems: "center", gap: 2 }]}
                >
                <Image
                  source={{ uri: post.owner.avatar }}
                  style={[styles.avatar,{borderColor:theme.textPlaceholder}]}
                  transition={200}
                />
                 <Text
                  style={[{ color:theme.primary }]}
                >sp</Text>
                <Text
                  style={[{ color:"#fff",fontWeight:FontWeight.extrabold }]}
                >{post.owner.username}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity activeOpacity={0.7} onPress={()=>setExpanded((v)=>!v)}
            >
            <Text
              style={[styles.postTitle, { color:"white" }]}
            >
              {post.name}
            </Text>
            <ScrollView
            style={[{maxHeight:500}]}
            >

            <Text
              style={[styles.commentsPreviewText, { color:"white" }]}
            >{expanded ?
              post.description
              : truncate(post.description, 50)}

            </Text>
            
            </ScrollView>
            </TouchableOpacity>
            {post.description.length > 50 && (
              <TouchableOpacity
                style={[styles.readMore]}
                onPress={(e) =>{e.stopPropagation(); setExpanded((v) => !v)}}
              >
                <Text
                   style={[{ color: theme.primary ,fontSize: FontSize.xs,fontWeight: FontWeight.regular,}]}
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
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <TouchableOpacity
          style={styles.reportBackdrop}
          activeOpacity={1}
          onPress={() => setShowReportModal(false)}
        />
        <View style={[styles.reportSheet, { backgroundColor: theme.surface }]}>
          <View style={styles.reportHeader}>
            <Text style={[styles.reportTitle, { color: theme.textPrimary }]}>
              Report ({post?.name})
            </Text>
            <TouchableOpacity onPress={() => setShowReportModal(false)}>
              <Text style={[styles.reportClose, { color: theme.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.reportSubtitle, { color: theme.textSecondary }]}>
            Why are you reporting this post?
          </Text>

          {REPORT_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={[
                styles.reportOption,
                {
                  borderColor: reportReason === reason ? theme.primary : theme.border,
                  backgroundColor: reportReason === reason ? theme.primary + "15" : "transparent",
                },
              ]}
              onPress={() => setReportReason(reason)}
            >
              <Text style={[styles.reportOptionText, { color: reportReason === reason ? theme.primary : theme.textPrimary }]}>
                {reason}
              </Text>
              {reportReason === reason && <Text style={{ color: theme.primary }}>✓</Text>}
            </TouchableOpacity>
          ))}

          {reportReason === "Other" && (
            <TextInput
              style={[styles.otherInput, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.border }]}
              placeholder="Describe the issue..."
              placeholderTextColor={theme.textPlaceholder}
              value={otherReason}
              onChangeText={setOtherReason}
              multiline
              maxLength={200}
            />
          )}

          <TouchableOpacity
            style={[styles.reportSubmit, { backgroundColor: reportReason ? theme.primary : theme.border }]}
            onPress={handleReportSubmit}
            disabled={!reportReason || isReporting}
          >
            {isReporting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.reportSubmitText}>Submit Report</Text>}
          </TouchableOpacity>
        </View>
      </Modal>
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
    elevation:10,
    fontWeight:FontWeight.extrabold
  },
  headerIconTheme: {
    position: "absolute",
    fontSize: 30,
    fontWeight:FontWeight.extrabold
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
    bottom: 100,
    justifyContent: "space-between",
    gap: Spacing.lg,
  },
  interaction: {
    alignItems: "center",
    borderWidth: 2,
    flexDirection:"row",
    borderRadius: Radius.md,
    paddingHorizontal:2,
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
    left:0,
    right:0,
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
    borderWidth:1
  },
  usernamePlcaholder: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    height: 28,
    borderRadius: 14,
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
     display:"flex",
    alignItems:"flex-end",
    justifyContent:"flex-end",
    right: 5,
    bottom: 5,
  },

})
