
import { useState, useCallback } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Image } from "expo-image"
import { useTheme } from "@/hooks/useTheme"
import { useThemeStore, ThemePreference } from "@/stores/theme.store"
import { useAuthStore } from "@/stores/auth.store"
import { authService } from "@/services/auth.service"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getAvatarColor } from "@/hooks/useUserGenerateAvatarColor"
import {
  SettingsRow,
  SettingsSectionHeader,
  SettingsSectionCard,
} from "@/components/settings/SettingsRow"
import * as WebBrowser from 'expo-web-browser';

import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import Constants from "expo-constants"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/components/activityIndicator/ToastProvider"
import { AnimatedBanner, BannerState, BannerType } from "@/components/activityIndicator/AnimatedBanner"
import HelpCenterModal from "@/components/help/HlpModal"
const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0"

export default function SettingsScreen() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const theme = useTheme()
  const { user, clearUser } = useAuthStore()
  const { preference, setPreference } = useThemeStore()
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [helpModalVisisble, setHelpModalVisible] = useState<boolean>(false);

  const handleLogout = () => {
    showToast({
      title: "Log Out?",
      message: "You will be logged out of this device.",
      onConfirm: async () => {
        queryClient.clear()
        await authService.logout()
        clearUser()
        router.replace("/")
      },

    })

  }
  const showBanner = useCallback((type: BannerType, message: string) => {
    setBanner({ id: Date.now(), type, message });
  }, []);
  const handleDeleteAccount = () => {
    showToast({
      title: "Delete Account?",
      message: "This permanently deletes your account, posts and data. This cannot be undone.",
      onConfirm: () => {
        try {
          authService.deleteAccountRequest()
          router.push("/settings/DeleteAccountScreen")
        } catch (e) {
          showBanner("error", 'Something went wrong. Please try again.');
        }
      },

    })

  }
  const handleDeactivateAccount = () => {

    showToast({
      title: "Deactivate Account?",
      message: "This temporarily deactivate and hides your account, posts and data. Activate them by logging back in.",
      onConfirm: async () => {
        try {
          const response = await authService.deactivateAccount()
          if (response?.message === "success") {
            queryClient.clear()
            clearUser()
            // navigate to confirmation screen
            router.push("/(tabs)")
          }
          else {

            showBanner("error",
              "Decativation failed.Please try again",


            )
          }
        } catch (error) {
          showBanner("error",
            "Decativation failed.Please try again",)
        }
      },
      onCancel: () => { },
    })

  }




  const ThemeSelector = () => (
    <View style={styles.themeSelector}>
      {(["light", "dark", "system"] as ThemePreference[]).map((option) => (
        <TouchableOpacity
          key={option}
          style={[
            styles.themeOption,
            {
              backgroundColor:
                preference === option
                  ? theme.primary
                  : theme.surfaceSecondary,
              borderColor:
                preference === option ? theme.primary : theme.border,
            },
          ]}
          onPress={() => setPreference(option)}
        >
          <Text style={styles.themeOptionIcon}>
            {option === "light" ? "☀️" : option === "dark" ? "🌙" : "📱"}
          </Text>
          <Text style={[
            styles.themeOptionText,
            {
              color:
                preference === option ? "#fff" : theme.textSecondary,
            },
          ]}>
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      {banner && (
        <AnimatedBanner
          key={banner.id}
          type={banner.type}
          message={banner.message}
          onHide={() => setBanner(null)}
        />
      )}
      {/* header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backIcon, { color: theme.textPrimary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Settings
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── profile card ─────────────────────────────── */}
        {user && (
          <TouchableOpacity
            style={[styles.profileCard, {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            }]}

            activeOpacity={0.8}
          >
            {user.avatar != null ? (
              <Image
                source={{ uri: user.avatar ?? undefined }}
                style={styles.profileAvatar}
                contentFit="cover"
              />
            ) : (
              <View
                style={[styles.usernamePlacaholder, { backgroundColor: getAvatarColor(user.username) }]}
              >
                <Text
                  style={[{ color: "white" }]}
                >{user.username.charAt(0)}</Text>
              </View>
            )}

            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.textPrimary }]}>
                {user.name}
              </Text>
              <Text style={[styles.profileUsername, { color: theme.textSecondary }]}>
                @{user.username} 
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── appearance  */}
        <SettingsSectionHeader title="Appearance" />
        <SettingsSectionCard>
          <SettingsRow
            icon="🎨"
            label="Theme"
            sublabel={`${preference.charAt(0).toUpperCase() + preference.slice(1)} mode`}
            showArrow={false}
          />
          <View style={styles.themeSelectorWrapper}>
            <ThemeSelector />
          </View>
        </SettingsSectionCard>

        {/* ── account  */}
        <SettingsSectionHeader title="Account" />
        <SettingsSectionCard>
          <SettingsRow
            icon={<MaterialCommunityIcons name="account-edit" size={20} color={`${theme.textPrimary}`} />}
            label="Edit Profile"
            sublabel="Name, bio, avatar, location"
            onPress={() => router.push("/settings/edit-profile")}
          />
          <SettingsRow
            icon="🔔"
            label="Notification Preferences"
            sublabel="Control what you get notified about"
            onPress={() => router.push("/settings/notifications")}
          />
          <SettingsRow
            icon="🔒"
            label="Privacy Settings"
            sublabel="Who can message and follow you"
            onPress={() => router.push("/settings/privacy")}
          />
        </SettingsSectionCard>

        {/* ── security  */}
        <SettingsSectionHeader title="Security" />
        <SettingsSectionCard>
          <SettingsRow
            icon="🔐"
            label="Two-Factor Authentication"
            sublabel={user ? "Manage 2FA method" : "Log in to manage"}
            onPress={() => router.push("/settings/two-factor")}
          />
          <SettingsRow
            icon={<MaterialCommunityIcons name="devices" size={20} color={`${theme.textPrimary}`} />}
            label="Active Sessions"
            sublabel="Devices logged into your account"
            onPress={() => router.push("/settings/sessions")}
          />
          <SettingsRow
            icon="🔑"
            label="Change Password"
            onPress={() => router.push("/settings/change-password")}
          />
        </SettingsSectionCard>

        {/* ── verification  */}
        {/* <SettingsSectionHeader title="Verification" />
        <SettingsSectionCard>
          <SettingsRow
            icon={<MaterialCommunityIcons name="id-card" size={20} color={`${theme.textPrimary}`} />}
            label="Identity Verification"
            sublabel={
              (user?.verification_level ?? 0) >= 3
                ? "✓ Verified"
                : "Verify your identity"
            }
            onPress={() => router.push("/settings/verification/identity")}
          />
          <SettingsRow
            icon={<MaterialCommunityIcons name="bank" size={20} color={`${theme.textPrimary}`} />}
            label="Business Verification"
            sublabel={
              (user?.verification_level ?? 0) >= 4
                ? "✓ Verified"
                : "Verify your business"
            }
            onPress={() => router.push("/settings/verification/business")}
          />
        </SettingsSectionCard> */}

        {/* ── support  */}
        <SettingsSectionHeader title="Support" />
        <SettingsSectionCard>
          <SettingsRow
            icon={<MaterialCommunityIcons name="help" size={20} color={`${theme.textPrimary}`} />}
            label="Help Center"
            onPress={() => {setHelpModalVisible(true) }}
          />
          <SettingsRow
            icon="📋"
            label="About Us"
            onPress={async() => { await WebBrowser.openBrowserAsync("https://smartpeople.vercel.app/about", {
                    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
                    toolbarColor: '#6366F1',
                  }) }}
          />
          <SettingsRow
            icon="📋"
            label="Terms of Service"
            onPress={async() => { await WebBrowser.openBrowserAsync("https://smartpeople.vercel.app/terms", {
                    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
                    toolbarColor: '#6366F1',
                  }) }}
          />
          <SettingsRow
            icon="🔏"
            label="Privacy Policy"
            onPress={async() => {

               await WebBrowser.openBrowserAsync("https://smartpeople.vercel.app/privacy", {
                    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
                    toolbarColor: '#6366F1',
                  })
             }}
          />
          <SettingsRow
            icon="⭐"
            label="Rate the App"
            onPress={async() => {
             

             }}
          />
        </SettingsSectionCard>

        {user && (
          <>
            <SettingsSectionHeader title="Account Actions" />
            <SettingsSectionCard>
              <SettingsRow
                icon={<MaterialCommunityIcons name="logout" size={20} color={`${theme.textPrimary}`} />}
                label="Log Out"
                isDestructive
                showArrow={false}
                onPress={handleLogout}
              />
              <SettingsRow
                icon={<MaterialCommunityIcons name="eye" size={20} color={`${theme.textPrimary}`} />}
                label="Deactivate Account"
                sublabel="Temporarily hide your account and all your data . They will be activated once you log back in"
                isDestructive
                showArrow={false}
                onPress={handleDeactivateAccount}
              />
              <SettingsRow
                icon={<MaterialCommunityIcons name="delete" size={20} color={`${theme.warning}`} />}
                label="Delete Account"
                sublabel="Permanently delete your data"
                isDestructive
                showArrow={false}
                onPress={handleDeleteAccount}
              />

            </SettingsSectionCard>
          </>
        )}

        {/* version */}
        <Text style={[styles.version, { color: theme.textMuted }]}>
          Version {APP_VERSION}
        </Text>

        <View style={{ height: 40 }} />
        <HelpCenterModal
        visible={helpModalVisisble}
        onClose={()=>setHelpModalVisible(false)}
        />
      </ScrollView>

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backIcon: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
    width: 32,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.gray[200],
  },
  usernamePlacaholder: {
    display: "flex",
    alignItems: 'center',
    justifyContent: "center",
    width: 52,
    height: 52,
    borderRadius: 26
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  profileUsername: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  profileArrow: {
    fontSize: 22,
    fontWeight: FontWeight.bold,
  },
  themeSelectorWrapper: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  themeSelector: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  themeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  themeOptionIcon: { fontSize: 14 },
  themeOptionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  version: {
    fontSize: FontSize.sm,
    textAlign: "center",
    paddingVertical: Spacing.xl,
  },
})











