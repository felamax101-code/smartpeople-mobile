
import React, { useState } from "react"
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
import { User } from "@/types"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getAvatarColor } from "@/hooks/useUserGenerateAvatarColor"
import FollowModal from "./FollowModal"
import ProfileViewersModal from "@/components/profile/ProfileViewerModal"
import { CommentImageViewer } from "../coments/ImageViewer"
import { useNotificationToast } from "../activityIndicator/ToastNotification"
const { width: SCREEN_WIDTH } = Dimensions.get("window")
const BANNER_HEIGHT = 140
const AVATAR_SIZE = 80

interface Props {
  profile: User
  isOwn: boolean
  onFollow: () => void
  isFollowLoading: boolean
  onMessage: () => void
  onEditProfile: () => void
  isMessageButtonDisabled?: boolean

}

export const ProfileHeader = ({
  profile,
  isOwn,
  onFollow,
  isFollowLoading,
  onMessage,
  onEditProfile,
  isMessageButtonDisabled
}: Props) => {
  const theme = useTheme()
  const [folloWModalVisible, setfolloWModalVisible] = useState<boolean>(false)
  const [viewersModalVisible, setviewrsModalVisible] = useState<boolean>(false)
  const [imageViewerVisible, setimageViewerVisbble] = useState<boolean>(false)
  const { showNotifToast } = useNotificationToast()
  // format large numbers — 1200 → 1.2k
  const formatCount = (n: number | null): string => {
    if (n === null) return "—"   // hidden by privacy
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
    return String(n)
  }
  const memberSince = new Date(profile.member_since !== undefined ? profile.member_since : profile.created_at).toLocaleDateString()


  return (

    <View style={styles.container}>

      {/*  banner  */}
      <View style={[styles.banner, { backgroundColor: theme.primary + "30" }]}>
        {/* placeholder gradient banner — replace with actual banner image later */}
        <View style={[styles.bannerGradient, { backgroundColor: theme.primary }]} />
      </View>
      {isOwn && <TouchableOpacity
        onPress={() => setviewrsModalVisible(true)}
        style={[styles.profileViewers, { backgroundColor: theme.backgroundMuted, borderColor: theme.textPlaceholder }]}>

        <View
          style={[{
            position: "absolute", backgroundColor: "#fff", top: -14, width: 20, height: 20, right: -5, borderRadius: Radius.full,
            borderWidth: 1, borderColor: theme.ALLwarning, justifyContent: "center",
            alignItems: "center",
          }]}
        >
          <Text
            style={[{ color: theme.primary, fontWeight: FontWeight.bold }]}
          >
            {profile.profile_views_count > 99 ? "99+" : profile.profile_views_count}
          </Text>
        </View>
        <Text style={[{ color: theme.primary, fontWeight: FontWeight.bold }]}>
          Profile Viewers
        </Text>

      </TouchableOpacity>}
      {/*  avatar  */}
      <TouchableOpacity
        onPress={() => {
          if (!profile.avatar) {
            showNotifToast("No profile picture","success")
          } else {
            setimageViewerVisbble(true)
          }
        }

        }
        style={styles.avatarWrapper}>

        {profile.avatar != null ? (
          <Image
            source={{ uri: profile.avatar ?? undefined }}
            style={[styles.avatar, { borderColor: theme.surface }]}
            contentFit="cover"
          />
        ) : (
          <View
            style={[styles.usernamePlacaholder, { backgroundColor: getAvatarColor(profile.username) }]}
          >
            <Text
              style={[{ color: "white", fontSize: FontSize.xxxl + 20, fontWeight: 700, fontFamily: "Poppins" }]}
            >{profile.username.charAt(0)}</Text>
          </View>
        )}

        {/* online indicator — only if privacy allows */}
        {/* <View style={[
          styles.onlineIndicator,
          { backgroundColor: Colors.success, borderColor: theme.surface }
        ]} /> */}
      </TouchableOpacity>

      {/*  info section  */}
      <View style={styles.infoSection}>

        {/* name + badge */}
        <View style={styles.nameRow}>
          <Text style={[styles.displayName, { color: theme.textPrimary }]}>
            {profile.name}
          </Text>
          {/* <VerifiedBadge badge={profile.verification_badge} size="sm" /> */}
        </View>

        {/* username */}
        <Text style={[styles.username, { color: theme.textPrimary }]}>
          @{profile.username}
        </Text>

        {/* location + joined */}
        <View style={styles.metaRow}>
          {profile.location && (
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              🏳️ {profile.location}
            </Text>
          )}
          <Text style={[styles.meta, { color: theme.textPrimary, fontFamily: "Consolas" }]}>
            Joined: {memberSince}
          </Text>
        </View>

        {/* bio */}
        {profile.bio && (
          <Text style={[styles.bio, { color: theme.textSecondary }]}>
            {profile.bio}
          </Text>
        )}

        {/*  stats row ─ */}
        <View style={[styles.statsRow, { borderColor: theme.border }]}>
          {/* followers */}
          <TouchableOpacity style={styles.stat}
            onPress={() => setfolloWModalVisible(true)}
          >
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>
              {formatCount(profile.followers)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>
              Followers
            </Text>
          </TouchableOpacity>

          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

          {/* following */}
          <TouchableOpacity style={styles.stat} onPress={() => setfolloWModalVisible(true)}>
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>
              {formatCount(profile.following)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>
              Following
            </Text>
          </TouchableOpacity>

          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

          {/* rating */}
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>
              {profile.reviews_count > 0
                ? `${profile.rating.toFixed(1)} ⭐`
                : "—"}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>
              {profile.reviews_count > 0
                ? `${profile.reviews_count} reviews`
                : "No reviews"}
            </Text>
          </View>
        </View>

        {/*  CTA buttons  */}
        {isOwn ? (
          // own profile → edit + settings
          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={[styles.ctaButton, styles.ctaSecondary, { borderColor: theme.border }]}
              onPress={() => router.push("/settings/edit-profile")}
              activeOpacity={0.8}
            >
              <Text style={[styles.ctaSecondaryText, { color: theme.textPrimary }]}>
                <MaterialCommunityIcons size={20} name="account-edit" color={`${theme.textPrimary}`} /> Edit Profile
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ctaButton, styles.ctaSecondary, { borderColor: theme.border }]}
              onPress={() => router.push("/settings")}
              activeOpacity={0.8}
            >
              <Text style={[styles.ctaSecondaryText, { color: theme.textPrimary }]}>
                <MaterialCommunityIcons name="cog" size={20} color={`${theme.textPrimary}`} /> Settings
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // other user → follow + message
          <View style={styles.ctaRow}>
            {/* follow button — respects can_follow privacy */}
            {profile.can_follow !== false && (
              <TouchableOpacity
                style={[
                  styles.ctaButton,
                  // @ts-ignore — is_following comes from API
                  profile.is_following
                    ? [styles.ctaSecondary, { borderColor: theme.border }]
                    : [styles.ctaPrimary, { backgroundColor: theme.primary }],
                ]}
                onPress={onFollow}
                disabled={isFollowLoading}
                activeOpacity={0.85}
              >
                <Text style={[
                  // @ts-ignore
                  profile.is_following
                    ? [styles.ctaSecondaryText, { color: theme.textPrimary }]
                    : styles.ctaPrimaryText,
                ]}>
                  {/* @ts-ignore */}
                  {profile.is_following ? "Following ✓" : "Follow"}
                </Text>
              </TouchableOpacity>
            )}

            {/* message button — respects can_message privacy */}
            {profile.can_message !== false && (
              <TouchableOpacity
                style={[styles.ctaButton, styles.ctaSecondary, { borderColor: theme.primary, opacity: isMessageButtonDisabled ? 0.5 : 1 }]}
                onPress={onMessage}
                activeOpacity={0.8}
                disabled={isMessageButtonDisabled}
              >
                <Text style={[styles.ctaSecondaryText, { color: theme.primary }]}>
                  💬 Message
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

      </View>
      <FollowModal
        isVisible={folloWModalVisible}
        onClose={() => setfolloWModalVisible(false)}
        username={profile.username}
      />
      <ProfileViewersModal
        isVisible={viewersModalVisible}
        onClose={() => setviewrsModalVisible(false)}
        isOwn={isOwn}
      />
      <CommentImageViewer
        visible={imageViewerVisible}
        image_url={profile.avatar}
        onClose={() => setimageViewerVisbble(false)}
      />
    </View>

  )
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
  },
  banner: {
    width: "100%",
    height: BANNER_HEIGHT,
    overflow: "hidden",
  },
  bannerGradient: {
    flex: 1,
    opacity: 0.3,
    backgroundColor: "#020A30",
  },
  avatarWrapper: {
    position: "absolute",
    top: BANNER_HEIGHT - AVATAR_SIZE / 2,
    left: Spacing.lg,
  },
  profileViewers: {
    position: "absolute",
    top: 150,
    right: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,

  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    backgroundColor: Colors.gray[200],
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  infoSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: AVATAR_SIZE / 2 + Spacing.sm,
    gap: Spacing.sm,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  displayName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.3,
  },
  username: {
    fontSize: FontSize.md,
    marginTop: -Spacing.xs,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  meta: {
    fontSize: FontSize.sm,
  },
  bio: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: "hidden",
    marginTop: Spacing.xs,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: 2,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  statLabel: {
    fontSize: FontSize.xs,
  },
  statDivider: {
    width: 1,
    marginVertical: Spacing.sm,
  },
  ctaRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  ctaButton: {
    flex: 1,
    height: 44,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPrimary: {},
  ctaSecondary: {
    borderWidth: 1.5,
  },
  ctaPrimaryText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  ctaSecondaryText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  usernamePlacaholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: "50%",
    borderWidth: 3,
    backgroundColor: Colors.gray[200],
    display: "flex",
    alignItems: 'center',
    justifyContent: "center",

  },
})











