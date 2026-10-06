
import React from "react"
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,

} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { router } from "expo-router"
import { useTheme } from "@/hooks/useTheme"

import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { getAvatarColor } from "@/hooks/useUserGenerateAvatarColor"
import { PropertyProfile } from "@/services/SPProfile.service"
const { width: SCREEN_WIDTH } = Dimensions.get("window")
const BANNER_HEIGHT = 140
const AVATAR_SIZE = 80

interface Props {
    profile: PropertyProfile
    isOwn: boolean
    onFollow: () => void
    isFollowLoading: boolean
    onMessage: () => void
    onEditProfile: () => void
    isMessageButtonDisabled?: boolean
    isSP?:boolean

}

export const SPProfileHeader = ({
    profile,
    isOwn,
    isSP=false,
    onMessage
    
}: Props) => {
    const theme = useTheme()

    // format large numbers — 1200 → 1.2k
    const formatCount = (n: number | null): string => {
        if (n === null) return "—"   // hidden by privacy
        if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
        return String(n)
    }
    const memberSince = new Date(profile.created_at !== undefined ? profile.created_at : profile.created_at).toLocaleDateString()


    return (

        <View style={styles.container}>

            {/*  banner  */}
            <View style={[styles.banner, { borderColor: theme.textMuted }]}>
                <LinearGradient
                    colors={[theme.primary, theme.success]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.bannerGradient}
                />
            </View>
            { isOwn  && <TouchableOpacity style={styles.addButton}
            onPress={()=>router.push("/sp/createpost")}
            >

                <View
                    style={[styles.AddB, { backgroundColor: getAvatarColor(profile.username) }]}
                >
                    <Text
                        style={[{ color: "white", fontSize: FontSize.lg, fontWeight: 700, fontFamily: "Poppins" }]}
                    > + Add post </Text>
                </View>
            </TouchableOpacity>}
            { !isOwn  && <TouchableOpacity style={styles.addButton}
            onPress={onMessage}
            >

                <View
                    style={[styles.AddB, { backgroundColor: getAvatarColor(profile.username) }]}
                >
                    <Text
                        style={[{ color: "white", fontSize: FontSize.lg, fontWeight: 700, fontFamily: "Poppins" }]}
                    > Message this user </Text>
                </View>
            </TouchableOpacity>}
            {/*  avatar  */}
            <View style={styles.avatarWrapper}>

                {/* {profile.avatar != null ? (
          <Image
            source={{ uri: profile.avatar ?? undefined }}
            style={[styles.avatar, { borderColor: theme.surface }]}
            contentFit="cover"
          />
        ) : ( */}
                <View
                    style={[styles.usernamePlacaholder, { backgroundColor: getAvatarColor(profile.name?? profile.org_name??"smartproperty") }]}
                >
                    <Text
                        style={[{ color: "white", fontSize: FontSize.lg, fontWeight: 700, fontFamily: "Poppins" }]}
                    >{profile.name? profile.name.charAt(0):profile.org_name? profile.org_name?.charAt(0):"S"}</Text>
                </View>
                {/* )} */}

                {/* online indicator — only if privacy allows */}
                {/* <View style={[
          styles.onlineIndicator,
          { backgroundColor: Colors.success, borderColor: theme.surface }
        ]} /> */}
            </View>

            {/*  info section  */}
            <View style={styles.infoSection}>

                {/* name + badge */}
                <View style={styles.nameRow}>
                    <View></View>
                    <Text style={[styles.username, { color: theme.primary }]}>
                        {profile.name ? "SmartProperty Account personal name:" : "SmartPropert Account organization name:"}
                    </Text>
                    <Text style={[styles.displayName, { color: theme.textPrimary }]}>
                        {profile.name ? profile.name : profile.org_name}
                    </Text>
                    {/* <VerifiedBadge badge={profile.verification_badge} size="sm" /> */}
                </View>

                {/* username */}
                <View>
                <Text style={[styles.username, { color: theme.primary }]}>
                   SmartPiplian username:
                </Text>
                <TouchableOpacity
                onPress={()=>router.push(isOwn?`/profile`:`/profile/${profile.username}`)}
                activeOpacity={0.5}
                >
                <Text style={[styles.username, { color: theme.textPrimary }]}>
                    @{profile.username}
                </Text>
                </TouchableOpacity>
                </View>

                {/* location + joined */}
                <View style={styles.metaRow}>
                    {/* {profile.location && (
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              🏳️ {profile.location}
            </Text>
          )} */}
          <View>
                    <Text style={[styles.username, { color: theme.primary }]}>
                        This SmartProperty account was created on:
                    </Text>
                    <Text style={[styles.meta, { color: theme.textPrimary, fontFamily: "Consolas" }]}>
                        {memberSince}
                    </Text>
                    </View>
                </View>

                {/* bio
        {profile.bio && (
          <Text style={[styles.bio, { color: theme.textSecondary }]}>
            {profile.bio}
          </Text>
        )} */}

                {/*  stats row ─ */}


                {/*  CTA buttons  */}





            </View>
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
        borderWidth: 2,
        borderRadius: Radius.md
    },
    bannerGradient: {
        flex: 1,

    },
    avatarWrapper: {
        position: "absolute",
        top: BANNER_HEIGHT - AVATAR_SIZE / 2,
        left: Spacing.lg,
    },
    addButton: {
        position: "absolute",
        bottom:150,
        right: Spacing.lg,
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
    AddB: {
        borderRadius:Radius.md,
        borderWidth: 3,
        backgroundColor: Colors.gray[200],
        display: "flex",
        alignItems: 'center',
        justifyContent: "center",

    },
})











