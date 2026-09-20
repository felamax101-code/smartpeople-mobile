

/**
 
 * Modal form for submitting/editing a seller review.
 * Shows star rating selector + optional comment.
 * Handles:
 * - New review creation
 * - Editing existing review
 * - Deleting review
 */

import React, { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import api from "@/services/api"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"

interface Props {
  visible: boolean
  onClose: () => void
  targetUsername: string
  existingReview?: {
    rating: number
    comment: string
  } | null
}

export const ReviewForm = ({
  visible,
  onClose,
  targetUsername,
  existingReview,
}: Props) => {
  const theme = useTheme()
  const queryClient = useQueryClient()

  const [rating, setRating] = useState(existingReview?.rating ?? 0)
  const [comment, setComment] = useState(existingReview?.comment ?? "")

  const isEditing = !!existingReview

  // ── submit mutation ───────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/users/${targetUsername}/reviews/`, {
        rating,
        comment: comment.trim(),
      })
    },
    onSuccess: () => {
      // refresh profile reviews cache
      queryClient.invalidateQueries({
        queryKey: ["user-reviews", targetUsername]
      })
      queryClient.invalidateQueries({
        queryKey: ["profile", targetUsername]
      })
      Alert.alert(
        "Review Submitted",
        isEditing
          ? "Your review has been updated."
          : "Your review has been submitted.",
        [{ text: "OK", onPress: onClose }]
      )
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.error ?? "Failed to submit review"
      Alert.alert("Error", detail)
    },
  })

  // ── delete mutation ───────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/users/${targetUsername}/reviews/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-reviews", targetUsername] })
      queryClient.invalidateQueries({ queryKey: ["profile", targetUsername] })
      onClose()
    },
    onError: () => Alert.alert("Error", "Failed to delete review"),
  })

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert("Rating Required", "Please select a star rating")
      return
    }
    submitMutation.mutate()
  }

  const handleDelete = () => {
    Alert.alert(
      "Delete Review",
      "Are you sure you want to delete your review?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(),
        },
      ]
    )
  }

  // ── star selector ─────────────────────────────────────────
  const StarSelector = () => (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => setRating(star)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[
            styles.star,
            { color: star <= rating ? "#F59E0B" : theme.border }
          ]}>
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  const ratingLabels = ["", "Poor", "Fair", "Good", "Great", "Excellent"]

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
        {/* handle */}
        <View style={[styles.handle, { backgroundColor: theme.border }]} />

        {/* title */}
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {isEditing ? "Edit Review" : "Write a Review"}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Reviewing @{targetUsername}
        </Text>

        {/* stars */}
        <StarSelector />

        {/* rating label */}
        {rating > 0 && (
          <Text style={[styles.ratingLabel, { color: "#F59E0B" }]}>
            {ratingLabels[rating]}
          </Text>
        )}

        {/* comment */}
        <TextInput
          style={[
            styles.commentInput,
            {
              backgroundColor: theme.inputBackground,
              color: theme.textPrimary,
              borderColor: theme.border,
            }
          ]}
          placeholder="Share your experience with this seller... (optional)"
          placeholderTextColor={theme.textPlaceholder}
          value={comment}
          onChangeText={setComment}
          multiline
          maxLength={500}
          textAlignVertical="top"
        />
        <Text style={[styles.charCount, { color: theme.textMuted }]}>
          {comment.length} / 500
        </Text>

        {/* submit */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: rating > 0 ? theme.primary : theme.border,
            }
          ]}
          onPress={handleSubmit}
          disabled={submitMutation.isPending || rating === 0}
        >
          {submitMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitText}>
              {isEditing ? "Update Review" : "Submit Review"}
            </Text>
          )}
        </TouchableOpacity>

        {/* delete — only if editing */}
        {isEditing && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <ActivityIndicator color={theme.error} size="small" />
            ) : (
              <Text style={[styles.deleteText, { color: theme.error }]}>
                Delete my review
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
  },
  subtitle: {
    fontSize: FontSize.md,
    marginTop: -Spacing.sm,
  },
  starRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  star: {
    fontSize: 44,
  },
  ratingLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginTop: -Spacing.sm,
  },
  commentInput: {
    width: "100%",
    minHeight: 100,
    maxHeight: 160,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: FontSize.md,
  },
  charCount: {
    fontSize: FontSize.xs,
    alignSelf: "flex-end",
    marginTop: -Spacing.sm,
  },
  submitButton: {
    width: "100%",
    height: 54,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xs,
  },
  submitText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  deleteButton: {
    paddingVertical: Spacing.sm,
  },
  deleteText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
})as any;




























