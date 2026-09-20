

import React, { useEffect, useRef, useCallback, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  BackHandler,
  Animated,
  Dimensions,
  Keyboard,
  KeyboardEvent
} from "react-native"
import {
  useQueryClient,
} from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import { useCommunityComments } from "@/hooks/useCommunityComments"
import { Comment } from "@/types"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { CommunityCommentItem } from "../coments/CommunityCommentItem"
const { height: SCREEN_HEIGHT } = Dimensions.get("window")
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85  // sheet covers 85% of screen

interface Props {
  slug: string
  visible: boolean
  onClose: () => void
  totalCount: number
}

export const CommunityCommentsSheet = ({ slug, visible, onClose, totalCount }: Props) => {
  const inputRef = useRef<TextInput>(null)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  const theme = useTheme()
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current
  const queryClient = useQueryClient()
  const {
    comments,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    commentText,
    isError,
    refetch,
    setCommentText,
    handlePost,
    isPosting,
    replyingTo,
    setReplyingTo,
    optimisticReplies,
    ProcessError
  } = useCommunityComments(slug)


const[processError,setProcessError]=useState<boolean>(false)
  const handleEditSuccess = useCallback((commentId: string, newBody: string) => {
    queryClient.setQueryData(["com-comments", slug], (old: any) => ({
      ...old,
      pages: old.pages.map((page: any) => ({
        ...page,
        data: {
          ...page.data,
          comments: page.data.comments.map((c: Comment) =>
            c.id === commentId
              ? { ...c, body: newBody, is_edited: true }
              : c
          ),
        },
      })),
    }))
  }, [slug])
  const handleDeleteSuccess = useCallback((commentId: string) => {
    queryClient.setQueryData(["com-comments", slug], (old: any) => ({
      ...old,
      pages: old.pages.map((page: any) => ({
        ...page,
        data: {
          ...page.data,
          comments: page.data.comments.map((c: Comment) =>
            c.id === commentId
              ? { ...c, is_deleted: true }
              : c
          ),
        },
      })),
    }))
  }, [slug])
  // ── slide animation ───────────────────────────────────────
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start()
    } else {
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start()
    }
  }, [visible])
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e: KeyboardEvent) => setKeyboardHeight(e.endCoordinates.height)
    )
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0)
    )

    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])





  // ── android back button ───────────────────────────────────
  // when sheet is open, back button closes sheet instead of navigating back
  useEffect(() => {
    if (!visible) return

    const handler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onClose()
        return true  // true = consumed, don't propagate to navigator
      }
    )

    return () => handler.remove()
  }, [visible, onClose])

  const handleProcessError=()=>{
    setProcessError(true);
    setTimeout(()=>{
      setProcessError(false);

    },2000)
  }
  // ── render comment ────────────────────────────────────────
  const renderComment = useCallback(
    ({ item }: { item: Comment }) => (
      <CommunityCommentItem
        comment={item}
        productSlug={slug}
        depth={0}
        onReplyPress={(comment) => {
          setReplyingTo(comment)
          inputRef.current?.focus()
        }}
        queryKey={["com-comments", slug]}
        optimisticReplies={optimisticReplies}
        onEditSuccess={handleEditSuccess}
        onDeleteSuccess={handleDeleteSuccess}
        onProcessError={handleProcessError}
      />
    ),
    [slug, optimisticReplies, handleEditSuccess, handleDeleteSuccess]
  )



  // ── footer ────────────────────────────────────────────────
  const renderFooter = () => {
    if (!isFetchingNextPage) return null
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color={theme.primary} size="small" />
      </View>
    )
  }

  // ── empty state ───────────────────────────────────────────
  const renderEmpty = () => {
    if (isLoading) return (
      <View style={styles.emptyState}>
        <ActivityIndicator color={theme.primary} />
      </View>
    )
    if (isError) {
return(
      <View style={styles.loading}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={[styles.errorText, { color: theme.textMuted }]}>Failed to load </Text>
        <TouchableOpacity style={[styles.retryBtn, { borderColor: theme.primary }]} onPress={() => refetch}>
          <Text style={[styles.retryText, { color: theme.primary }]}>Try again</Text>
        </TouchableOpacity>
      </View>)

    }
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>💬</Text>
        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
          No comments yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
          Be the first to comment
        </Text>
      </View>
    )
  }
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"  // we handle animation manually
      onRequestClose={onClose}  // called on Android back press — but we handle it above
      statusBarTranslucent
    >
      {/* ── backdrop ─────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* ── sheet ────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.surface,
            transform: [{ translateY: slideAnim }],
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + 12 : 0,
          },
        ]}
      >

        {/* ── sheet header ───────────────────────────── */}
        <View style={[styles.sheetHeader, { borderBottomColor: theme.border }]}>
          {/* drag handle */}
          <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />

          <View style={styles.sheetTitleRow}>
            <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>
              Comments{totalCount > 0 ? ` (${totalCount})` : ""}
            </Text>
            {/* close button */}
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: theme.surfaceSecondary }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.closeIcon, { color: theme.textSecondary }]}>✕</Text>
            </TouchableOpacity>
           
          </View>
           {(ProcessError || processError) && (<Text style={[styles.errorText, { color: theme.ALLwarning }]}>
              An error has occured ,please try again
            </Text>)}
        </View>

        {/* ── comments list ──────────────────────────── */}
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={renderComment}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage()
          }}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.commentsList}
          showsVerticalScrollIndicator={false}
        />


        {/* ── replying-to banner ─────────────────────────────── */}
        {replyingTo && (
          <View style={[styles.replyingToBanner, { backgroundColor: theme.surfaceSecondary }]}>
            <Text style={[styles.replyingToText, { color: theme.textSecondary }]}>
              Replying to{" "}
              <Text style={{ color: theme.primary }}>@{replyingTo.author.username}</Text>
            </Text>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Text style={[styles.cancelReply, { color: theme.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── comment input ───────────────────────────── */}
        <View style={[
          styles.inputBar,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
          }
        ]}>
          <TextInput
            style={[
              styles.commentInput,
              {
                backgroundColor: theme.inputBackground,
                color: theme.textPrimary,
              }
            ]}
            placeholder={replyingTo ? `Reply to @${replyingTo.author.username}…` : "Add a comment…"}
            placeholderTextColor={theme.textPlaceholder}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => {
              handlePost()
            }}


          />
          <TouchableOpacity
            onPress={() => {
              handlePost()
            }}
            disabled={!commentText.trim() || isPosting}
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  commentText.trim() ? theme.primary : theme.border,
              },
            ]}
          >
            {isPosting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendIcon}>↑</Text>
            )}
          </TouchableOpacity>
        </View>


      </Animated.View>

    </Modal>
  )
}

// ── helpers ───────────────────────────────────────────────────
const formatTimeAgo = (dateString: string): string => {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    overflow: "hidden",
  },
  sheetHeader: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    alignItems: "center",
    gap: Spacing.sm,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
  },
  sheetTitleRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: {
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
  commentsList: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  commentItem: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray[200],
    flexShrink: 0,
  },
  commentBody: {
    flex: 1,
    gap: 4,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  commentAuthor: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  verifyDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyDotText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "900",
  },
  commentTime: {
    fontSize: FontSize.xs,
  },
  commentText: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: 2,
  },
  commentAction: {
    paddingVertical: 2,
  },
  commentActionText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  loadingFooter: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderTopWidth: 1,
  },
  commentInput: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    fontSize: FontSize.md,
    maxHeight: 100,
    minHeight: 44,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendIcon: {
    color: "#fff",
    fontSize: 18,
    fontWeight: FontWeight.bold,
  },

  replyingToBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  replyingToText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  cancelReply: {
    fontSize: 16,
    fontWeight: FontWeight.bold,
    padding: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },

  errorIcon: { fontSize: 32, marginBottom: Spacing.sm, textAlign: "center" },
  errorText: { fontSize: FontSize.sm, textAlign: "center", marginBottom: Spacing.md },
  retryBtn: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  retryText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  loading: {
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
})












