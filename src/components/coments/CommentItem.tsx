





import React, { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput
} from "react-native"
import { Image } from "expo-image"
import { router } from "expo-router"
import { useMutation } from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import { useAuthGate } from "@/hooks/useAuthGate"
import { useAuthStore } from "@/stores/auth.store"
import { feedService } from "@/services/feed.service"
import { Comment } from "@/types"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { RepliesThread } from "./RepliesThread"
import { useToast } from "../activityIndicator/ToastProvider"
import { getAvatarColor } from "@/hooks/useUserGenerateAvatarColor"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { useNotificationToast } from "../activityIndicator/ToastNotification"
import truncate from "@/hooks/useTruncateBody"
import { parseText } from "@/hooks/useTextParser"
import { CommentImageViewer } from "./ImageViewer"
import { useStickerActions } from "@/hooks/useStickerActions"
interface Props {
  comment: Comment
  postSlug: string
  depth?: number
  onReplyPress?: (comment: Comment, effectRootId: string) => void
  queryKey: string[]
  optimisticReplies?: Record<string, Comment[]>
  onEditSuccess?: (commentId: string, newBody: string) => void
  onDeleteSuccess?: (commentId: string) => void
  onProcessError: any
  replyToCommentBody?: string
  rootCommentId?: string
}

export const CommentItem = React.memo(({
  comment,
  rootCommentId,
  postSlug,
  depth = 0,
  onReplyPress,
  queryKey,
  optimisticReplies = {},
  onDeleteSuccess,
  onEditSuccess,
  onProcessError,
  replyToCommentBody,
}: Props) => {
  const theme = useTheme()
  const { gatedAction } = useAuthGate()
  const { showToast } = useToast()
  const [showReplies, setShowReplies] = useState(false)
  const [localUpvoted, setLocalUpvoted] = useState(comment.has_upvoted)
  const [localDownvoted, setLocalDownvoted] = useState(comment.has_downvoted)
  const [localUpvotes, setLocalUpvotes] = useState(comment.upvotes_count)
  const [localDownvotes, setLocalDownvotes] = useState(comment.downvotes_count)
  const effectRootId = rootCommentId ?? comment.id
  const [mediaviewerVisisble, setmediaviewerVisisble] = useState<boolean>(false)
  const { showNotifToast } = useNotificationToast()
  const { user } = useAuthStore()
  const { save } = useStickerActions()
  const isAuthor = user?.id === comment.author.id

  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(comment.body)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [otherReason, setOtherReason] = useState("")
  const [expanded, setExpanded] = useState(false)

  const REPORT_REASONS = [
    "Spam",
    "Harassment",
    "Hate speech",
    "Misinformation",
    "Inappropriate content",
    "Other",
  ]

  // ── vote mutation 
  const voteMutation = useMutation({
    mutationFn: (vote: "up" | "down") =>
      feedService.voteComment(comment.id, vote),
    onMutate: (vote) => {
      // optimistic update
      if (vote === "up") {
        if (localUpvoted) {
          setLocalUpvoted(false)
          setLocalUpvotes((v) => v - 1)
        } else {
          setLocalUpvoted(true)
          setLocalUpvotes((v) => v + 1)
          if (localDownvoted) {
            setLocalDownvoted(false)
            setLocalDownvotes((v) => v - 1)
          }
        }
      } else {
        if (localDownvoted) {
          setLocalDownvoted(false)
          setLocalDownvotes((v) => v - 1)
        } else {
          setLocalDownvoted(true)
          setLocalDownvotes((v) => v + 1)
          if (localUpvoted) {
            setLocalUpvoted(false)
            setLocalUpvotes((v) => v - 1)
          }
        }
      }
    }, onError: () => {
      onProcessError(true)
    }
  })




  const deleteMutation = useMutation({
    mutationFn: () => feedService.deleteComment(comment.id),
    onSuccess: () => {
      onDeleteSuccess?.(comment.id)
    },
    onError: (e) => {
      onProcessError(true)
    }
  }

  )

  const editMutation = useMutation({
    mutationFn: (body: string) => feedService.editComment(comment.id, body),
    onSuccess: () => {
      onEditSuccess?.(comment.id, editText)
      setIsEditing(false)
    },
    onError: () => {
      onProcessError(true)
    }
  })
  const reportMutation = useMutation({
    mutationFn: (reason: string) => feedService.reportComment(comment.id, reason),
    onSuccess: () => {
      setShowReportModal(false)
      setReportReason("")
      setOtherReason("")
      showNotifToast("Reported. Thank you for your report.", "success")
    },
    onError: () => {
      onProcessError(true)
    }
  })

  const handleDelete = () => {

    showToast({
      title: "Delete Comment",
      message: "Are you sure you want to delete this comment?",
      onConfirm: () => deleteMutation.mutate()
    })

  }

  const handleEdit = () => setIsEditing(true)

  const handleEditSubmit = () => {
    if (!editText.trim() || editText === comment.body) {
      setIsEditing(false)
      return
    }
    editMutation.mutate(editText.trim())
  }

  const handleReport = () => setShowReportModal(true)

  const handleReportSubmit = () => {
    const reason = reportReason === "Other" ? otherReason : reportReason
    if (!reason.trim()) return
    reportMutation.mutate(reason.trim())
  }
  // Auto-open replies thread when an optimistic reply arrives for this comment
  useEffect(() => {
    if ((optimisticReplies[comment.id]?.length ?? 0) > 0) {
      setShowReplies(true)
    }
  }, [optimisticReplies, comment.id])
  // Show toggle even if replies_count is 0 but there's an optimistic reply

  const handleUpvote = useCallback(() => {
    gatedAction(
      { type: "upvote", postSlug },
      () => voteMutation.mutate("up")
    )
  }, [gatedAction, postSlug, voteMutation])

  const handleDownvote = useCallback(() => {
    gatedAction(
      { type: "upvote", postSlug },
      () => voteMutation.mutate("down")
    )
  }, [gatedAction, postSlug, voteMutation])

  const handleReply = useCallback(() => {
    gatedAction(
      { type: "comment", postSlug },
      () => onReplyPress?.(comment, effectRootId)
    )
  }, [gatedAction, postSlug, comment, onReplyPress])
  const handleProfilePress = useCallback(() => {
    router.push((user != null && user.username === comment.author.username) ? `/profile` : `/profile/${comment.author.username}`)

  }, [comment.author.username])
  // ── deleted comment 
  if (comment.is_deleted) {
    return (
      <View style={[
        styles.container,
        depth > 0 && styles.replyIndent,
        { borderLeftColor: depth > 0 ? theme.textPrimary : "transparent" }
      ]}>
        <Text style={[styles.deletedText, { color: theme.textMuted }]}>
          🚫 This comment was deleted
        </Text>
        {/* still show replies if any existed */}
        {/* {comment.replies_count > 0 && depth === 0 && (
          <RepliesThread
            commentId={comment.id}
            postSlug={postSlug}
            optimisticReplies={optimisticReplies[comment.id] ?? []}
            renderItem={(reply, onEditSuccess, onDeleteSuccess) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                postSlug={postSlug}
                depth={1}
                onReplyPress={onReplyPress}
                queryKey={queryKey}
                optimisticReplies={optimisticReplies}
                onEditSuccess={onEditSuccess}      // ← reply-specific handler
                onDeleteSuccess={onDeleteSuccess}  // ← reply-specific handler
                onProcessError={onProcessError}
              />
            )}
          />
        )} */}
      </View>
    )
  }

  const timeAgo = formatTimeAgo(comment.created_at)

  return (
    <View style={[
      styles.container,
      // indent replies with a left border line
      depth > 0 && styles.replyIndent,
      depth > 0 && { borderLeftColor: theme.textPlaceholder }, { borderColor: theme.textMuted }
    ]}>

      {/* ── author row  */}
      <TouchableOpacity
        style={styles.authorRow}
        onPress={handleProfilePress}
        activeOpacity={0.7}
      >

        {comment.author.avatar === null ? (
          <View style={[styles.usernamePlcaholder, { backgroundColor: `${getAvatarColor(comment.author.username)}` }]}>
            <Text>{comment.author.username.charAt(0)}</Text>
          </View>) : (
          <Image
            source={{ uri: comment.author.avatar ?? undefined }}
            style={[
              styles.avatar,
              // smaller avatar for replies
              depth > 0 && styles.avatarSmall,
              , { borderColor: theme.textPlaceholder, borderWidth: 1 }]}
            contentFit="cover"
          />)}
        <View style={styles.authorInfo}>
          <View style={styles.authorNameRow}>
            <Text style={[styles.authorName, { color: theme.textPrimary }]}>
              @{comment.author.username}
            </Text>
            {/* verified dot */}
            {comment.author.verification_badge.label && (
              <View style={[
                styles.verifyDot,
                { backgroundColor: comment.author.verification_badge.color ?? Colors.success }
              ]}>
                <Text style={styles.verifyDotText}>✓</Text>
              </View>
            )}
            <Text style={[styles.timeAgo, { color: theme.textMuted }]}>
              · {timeAgo}
            </Text>
          </View>

          {/* @mention of who they're replying to */}
          {comment.reply_to && (
            <View

              style={[{ display: "flex", flexDirection: "row", gap: 1, alignItems: "center" }]}
            >
              <Text style={[styles.replyingTo, { color: theme.textMuted }]}>
                Replying to
              </Text>
              <TouchableOpacity
                onPress={() => router.push((user != null && user.username === comment.reply_to?.username) ? `/profile` : `/profile/${comment.reply_to!.username}`)}
              >
                <Text style={[styles.replyingTo, { color: theme.primary }]}>
                  @{comment.reply_to?.username}
                </Text>
              </TouchableOpacity>
              <MaterialCommunityIcons
                name="arrow-right"
                style={[{ color: theme.textPrimary, paddingTop: 1 }]}
                size={9}
              />

              <Text style={[styles.replyingTo, { color: theme.textMuted }]}>
                [{truncate(replyToCommentBody ?? "", 9)}]
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>




      {/* body */}
      {
        comment.body &&
        <View>
          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={[styles.editInput, {
                  color: theme.textPrimary,
                  backgroundColor: theme.inputBackground,
                  borderColor: theme.border,
                }]}
                value={editText}
                onChangeText={setEditText}
                multiline
                autoFocus
                maxLength={2000}
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  onPress={() => setIsEditing(false)}
                  style={styles.editButton}
                >
                  <Text style={{ color: theme.textMuted, fontSize: FontSize.sm }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleEditSubmit}
                  disabled={editMutation.isPending}
                  style={[styles.editButton, { backgroundColor: theme.primary, borderRadius: Radius.sm }]}
                >
                  {editMutation.isPending
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={{ color: "#fff", fontSize: FontSize.sm }}>Save</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setExpanded((v) => !v)}
            >
              <Text style={[styles.body, { color: theme.textPrimary ,fontWeight:FontWeight.semibold}]}>
                {expanded ? parseText(comment.body) : parseText(truncate(comment.body))}
                {comment.is_edited && (
                  <Text style={{ color: theme.textMuted, fontSize: FontSize.xs }}> (edited)</Text>
                )}
              </Text>
              {comment.body.length > 100 && (
                <TouchableOpacity
                  style={[styles.readMore]}
                  onPress={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
                >
                  <Text
                    style={[{ color: theme.primary, fontSize: FontSize.xs, fontWeight: FontWeight.regular, }]}
                  >{expanded ? "Show less" : "Read more"}</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )}
        </View>}
      {comment.image && (
        <TouchableOpacity
          style={[{ height: 100, backgroundColor: theme.backgroundMuted, borderRadius: Radius.md, borderWidth: 0.5, borderColor: theme.textPlaceholder, width: 70, marginLeft: 50, overflow: "hidden" }]}
          onPress={() => setmediaviewerVisisble(true)}>
          <Image
            source={{ uri: comment.image }}
            style={{ width: "100%", maxWidth: 240, height: "100%" }}
            contentFit="cover"
          />
        </TouchableOpacity>
      )}
      {comment.sticker && (
        <TouchableOpacity
        delayLongPress={350}
        onLongPress={() => {
      const sticker = comment.sticker!
      showToast({
        title:"Save sticker",
        message:"So that you easily find them",
        onConfirm:()=>{
          save.mutate(sticker, {
            })
        }
      })
     
    }}
        >
  <Image
    source={{ uri: comment.sticker.url }}
    style={{
      width: 120,
      height: 120 * ((comment.sticker.height || 1) / (comment.sticker.width || 1)),
    }}
    contentFit="contain"
  />
  </TouchableOpacity>
)}


      {/* ── actions  */}
      <View style={styles.actions}>

        {/* upvote */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleUpvote}
          disabled={voteMutation.isPending}
        >
          <Text style={[
            styles.actionIcon,
            localUpvoted && { color: Colors.success }
          ]}>
            ▲
          </Text>
          {localUpvotes > 0 && (
            <Text style={[
              styles.actionCount,
              { color: localUpvoted ? Colors.success : theme.textMuted }
            ]}>
              {localUpvotes}
            </Text>
          )}
        </TouchableOpacity>

        {/* downvote */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleDownvote}
          disabled={voteMutation.isPending}
        >
          <Text style={[
            styles.actionIcon,
            localDownvoted && { color: Colors.error }
          ]}>
            ▼
          </Text>
          {localDownvotes > 0 && (
            <Text style={[
              styles.actionCount,
              { color: localDownvoted ? Colors.error : theme.textMuted }
            ]}>
              {localDownvotes}
            </Text>
          )}
        </TouchableOpacity>

        {/* reply button — only show if not too deeply nested */}
        {depth < 5 && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleReply}
          >
            <Text style={[styles.replyText, { color: theme.textPrimarylight }]}>
              Reply
            </Text>
          </TouchableOpacity>
        )}

        {/* show replies toggle — top level only */}
        {depth === 0 && (comment.replies_count > 0 || (optimisticReplies[comment.id]?.length ?? 0) > 0) && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowReplies(v => !v)}
          >
            <Text style={[styles.repliesToggle, { color: theme.primary }]}>
              {showReplies
                ? "Hide replies"
                : ` View ${comment.replies_count + (optimisticReplies[comment.id]?.length ?? 0)} repl${comment.replies_count + (optimisticReplies[comment.id]?.length ?? 0) === 1 ? "y" : "ies"
                }`
              }
            </Text>
          </TouchableOpacity>
        )}

        {/* report — always visible */}
        {!isAuthor && (
          <TouchableOpacity style={styles.actionButton} onPress={handleReport}>
            <Text style={[styles.actionText, { color: theme.textMuted }]}>Report</Text>
          </TouchableOpacity>
        )}

        {/* edit / delete — author only */}
        {isAuthor && (
          <>
            <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
              <Text style={[styles.actionText, { color: theme.textMuted }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
              <Text style={[styles.actionText, { color: Colors.error }]}>
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Text>
            </TouchableOpacity>
          </>
        )}
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
            <Text style={[styles.reportTitle, { color: theme.textPrimary }]}>
              Report Comment
            </Text>
            <Text style={[styles.reportSubtitle, { color: theme.textSecondary }]}>
              Why are you reporting this comment?
            </Text>

            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reportOption,
                  {
                    borderColor: reportReason === reason ? theme.primary : theme.border,
                    backgroundColor: reportReason === reason
                      ? theme.primary + "15"
                      : "transparent",
                  },
                ]}
                onPress={() => setReportReason(reason)}
              >
                <Text style={[
                  styles.reportOptionText,
                  { color: reportReason === reason ? theme.primary : theme.textPrimary }
                ]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}

            {reportReason === "Other" && (
              <TextInput
                style={[styles.otherInput, {
                  color: theme.textPrimary,
                  backgroundColor: theme.inputBackground,
                  borderColor: theme.border,
                }]}
                placeholder="Describe the issue..."
                placeholderTextColor={theme.textPlaceholder}
                value={otherReason}
                onChangeText={setOtherReason}
                multiline
                maxLength={200}
              />
            )}

            <TouchableOpacity
              style={[
                styles.reportSubmit,
                {
                  backgroundColor: reportReason ? theme.primary : theme.border,
                },
              ]}
              onPress={handleReportSubmit}
              disabled={!reportReason || reportMutation.isPending}
            >
              {reportMutation.isPending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.reportSubmitText}>Submit Report</Text>
              }
            </TouchableOpacity>
          </View>
        </Modal>
      </View>

      {/* ── replies thread  */}
      {showReplies && depth === 0 && (
        <RepliesThread
          commentId={comment.id}
          postSlug={postSlug}
          replyToCommentBody={comment.body.trim()?comment.body:comment.image?"Photo":comment.sticker?"Sticker":"..."}
          optimisticReplies={optimisticReplies[comment.id] ?? []}
          renderItem={(reply, onEditSuccess, onDeleteSuccess, replyToCommentBody) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postSlug={postSlug}
              depth={1}
              onReplyPress={onReplyPress}
              replyToCommentBody={reply.replied_to?.body.trim()?reply.replied_to.body:(!reply.replied_to?.body.trim()&& reply.replied_to?.image && !reply.replied_to.sticker)?"Photo":(!reply.replied_to?.body.trim()&& !reply.replied_to?.image && reply.replied_to?.sticker)?"Sticker":"TL"}
              queryKey={queryKey}
              rootCommentId={effectRootId}
              optimisticReplies={optimisticReplies}
              onEditSuccess={onEditSuccess}      //  reply-specific handler
              onDeleteSuccess={onDeleteSuccess}//  reply-specific handler
              onProcessError={onProcessError}
            />
          )}
        />
      )}
      <CommentImageViewer
        visible={mediaviewerVisisble}
        image_url={comment.image}
        onClose={() => setmediaviewerVisisble(false)}

      />
    </View>
  )
})

const formatTimeAgo = (dateString: string): string => {
  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000
  )
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
  return new Date(dateString).toLocaleDateString("en-NG", {
    month: "short",
    day: "numeric",
  })
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    borderWidth: 0.5,
    borderRadius: Radius.md,
    marginBottom: 3
  },
  // indent replies with left border
  replyIndent: {
    marginLeft: Spacing.sm,
    paddingLeft: Spacing.sm,
    borderLeftWidth: 4,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
    paddingHorizontal: 1
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 18,
    backgroundColor: Colors.gray[200],
    flexShrink: 0,
    overflow: "hidden",
  },
  avatarSmall: {
    width: 25,
    height: 25,
    borderRadius: 14,
  },
  authorInfo: { flex: 1, gap: 2 },
  authorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  authorName: {
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
  readMore: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    right: 5,
    bottom: 5,

  },
  verifyDotText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "900",
  },
  timeAgo: { fontSize: FontSize.xs },
  replyingTo: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  body: {
    fontSize: FontSize.md,
    lineHeight: 22,
    marginLeft: 44,   // align with author name
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginLeft: 20,
    paddingTop: 2,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  actionIcon: {
    fontSize: 13,
    color: Colors.gray[500],
  },
  usernamePlcaholder: {
    width: 25,
    alignItems: "center",
    justifyContent: "center",
    height: 25,
    borderRadius: 14,
  },
  actionCount: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  replyText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.regular,
  },
  repliesToggle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.regular,
  },
  deletedText: {
    fontSize: FontSize.xs,
    fontStyle: "italic",
    paddingVertical: Spacing.sm,
  },



  editContainer: {
    marginLeft: 44,
    gap: Spacing.xs,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: FontSize.md,
    lineHeight: 22,
    minHeight: 60,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
  },
  editButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  actionText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },



  reportBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  reportSheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  reportTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  reportSubtitle: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
  },
  reportOption: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  reportOptionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  otherInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    minHeight: 80,
    marginTop: Spacing.xs,
  },
  reportSubmit: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  reportSubmitText: {
    color: "#252525",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },


})













