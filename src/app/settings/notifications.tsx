

import { useState,useCallback } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useTheme } from "@/hooks/useTheme"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/services/api"
import { SettingsSectionHeader, SettingsSectionCard } from "@/components/settings/SettingsRow"
import { Spacing, FontSize, FontWeight } from "@/constants/colors"
import { AnimatedBanner ,BannerType} from "@/components/activityIndicator/AnimatedBanner"


const NOTIFICATION_PREFS_ENDPOINT = "/preference/notifications/"

interface BannerState {
  id: number; // changing id forces AnimatedBanner to remount and re-animate
  type: BannerType;
  message: string;
}
interface NotificationPrefs {
  new_message: boolean
  product_approved: boolean
  product_rejected: boolean
  new_follower: boolean
  product_upvote: boolean
  new_comment: boolean
  new_review: boolean
  account_alerts: boolean
  promotions: boolean
}

const DEFAULT_PREFS: NotificationPrefs = {
  new_message: true,
  product_approved: true,
  product_rejected: true,
  new_follower: true,
  product_upvote: true,
  new_comment: true,
  new_review: true,
  account_alerts: true,
  promotions: false,
}
const QUERY_KEY = ["notification-prefs"]

export default function NotificationPrefsScreen() {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const [banner, setBanner] = useState<BannerState | null>(null);

  const { data: prefs, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<NotificationPrefs> => {
      const { data } = await api.get(NOTIFICATION_PREFS_ENDPOINT)
      return { ...DEFAULT_PREFS, ...data }
    },
  })

  const showBanner = useCallback((type: BannerType, message: string) => {
    setBanner({ id: Date.now(), type, message });
  }, []);
  const mutation = useMutation({
    mutationFn: async (updated: Partial<NotificationPrefs>): Promise<NotificationPrefs> => {
      const { data } = await api.patch(NOTIFICATION_PREFS_ENDPOINT, updated)
      return data
    },
    // optimistic update: flip the switch immediately, roll back on failure
    onMutate: async (updated) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY })
      const previous = queryClient.getQueryData<NotificationPrefs>(QUERY_KEY)
      if (previous) {
        queryClient.setQueryData<NotificationPrefs>(QUERY_KEY, { ...previous, ...updated })
      }
      return { previous }
    },
    onError: (_err, _updated, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous)
      }
      showBanner("error", "Your change wasn't saved. Please try again.")
    },
    onSuccess: (newPrefs) => {
      queryClient.setQueryData(QUERY_KEY, newPrefs)
    },
  })

  const toggle = (key: keyof NotificationPrefs, value: boolean) => {
    mutation.mutate({ [key]: value })
  }

  if (isLoading || !prefs) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    )
  }

  const Row = ({
    label,
    sublabel,
    field,
  }: {
    label: string
    sublabel?: string
    field: keyof NotificationPrefs
  }) => (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <View style={styles.rowLabels}>
        <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{label}</Text>
        {sublabel && (
          <Text style={[styles.rowSublabel, { color: theme.textMuted }]}>{sublabel}</Text>
        )}
      </View>
      <Switch
        value={prefs[field]}
        onValueChange={(v) => toggle(field, v)}
        trackColor={{ true: theme.primary, false: theme.border }}
        thumbColor="#fff"
      />
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
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backIcon, { color: theme.textPrimary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Notification Preferences
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        <SettingsSectionHeader title="Messages & Activity" />
        <SettingsSectionCard>
          <Row label="New Messages" sublabel="When someone messages you" field="new_message" />
          <Row label="New Followers" sublabel="When someone follows you" field="new_follower" />
          <Row label="Likes" sublabel="When someone likes your listing" field="product_upvote" />
          <Row label="Comments" sublabel="When someone comments" field="new_comment" />
          <Row label="New Reviews" sublabel="When you receive a review" field="new_review" />
        </SettingsSectionCard>

        <SettingsSectionHeader title="Listings" />
        <SettingsSectionCard>
          <Row label="Listing Approved" sublabel="When your listing goes live" field="product_approved" />
          <Row label="Listing Rejected" sublabel="When your listing is declined" field="product_rejected" />
        </SettingsSectionCard>

        <SettingsSectionHeader title="System" />
        <SettingsSectionCard>
          <Row label="Account Alerts" sublabel="Security and verification updates" field="account_alerts" />
          <Row label="Promotions" sublabel="Tips, features, and updates" field="promotions" />
        </SettingsSectionCard>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
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
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  rowLabels: { flex: 1 },
  rowLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  rowSublabel: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
})























