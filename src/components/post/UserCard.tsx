

import React from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native"
import { Image } from "expo-image"
import { router } from "expo-router"
import { useTheme } from "@/hooks/useTheme"
import { useAuthGate } from "@/hooks/useAuthGate"
import { VerifiedBadge } from "@/components/ui/VerifiedBadge"
import { Post } from "@/types"
import { Spacing, Radius, FontSize, FontWeight, Colors } from "@/constants/colors"

interface Props {
  owner: Post["owner"]
  isOwner: boolean  
}

export const UserCard = ({ owner, isOwner }: Props) => {
  const theme = useTheme()
  const { gatedAction } = useAuthGate()

  

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.surfaceSecondary }]}
      onPress={() => router.push(`/profile/${owner.username}`)}
      activeOpacity={0.8}
    >
      {/* avatar */}
      <Image
        source={{ uri: owner.avatar ?? undefined }}
        style={styles.avatar}
        contentFit="cover"
      />

      {/* seller info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.username, { color: theme.textPrimary }]}>
            @{owner.username}
          </Text>
          <VerifiedBadge badge={owner.verification_badge} size="sm" />
        </View>

        <View style={styles.statsRow}>
          {/* rating */}
          {owner.reviews_count > 0 && (
            <Text style={[styles.stat, { color: theme.textSecondary }]}>
              ⭐ {owner.rating?.toFixed(1)} | {owner.reviews_count} reviews
            </Text>
          )}
          {/* posts */}
          <Text style={[styles.stat, { color: theme.textSecondary }]}>
            {owner.total_posts} listings
          </Text>
        </View>
      </View>

      {/* follow / view button */}
      {isOwner ? (
        <TouchableOpacity
          style={[styles.actionButton, { borderColor: theme.border }]}
          onPress={() => router.push("/profile")}
        >
          <Text style={[styles.actionButtonText, { color: theme.textPrimary }]}>
            My Profile
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.actionButton, { borderColor: theme.primary }]}
          onPress={() => router.push(`/profile/${owner.username}`)}
        >
          <Text style={[styles.actionButtonText, { color: theme.primary }]}>
            View Profile
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: Radius.lg,
    gap: Spacing.xs,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gray[200],
  },
  info: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  username: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  stat: {
    fontSize: FontSize.xs,
  },
  actionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  actionButtonText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
})








