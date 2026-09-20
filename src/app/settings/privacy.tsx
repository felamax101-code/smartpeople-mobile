
import React, { useState } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTheme } from "@/hooks/useTheme"
import api from "@/services/api"
import { SettingsSectionHeader, SettingsSectionCard } from "@/components/settings/SettingsRow"
import { Spacing, FontSize, FontWeight } from "@/constants/colors"

interface PrivacySettings {
  show_phone: boolean
  show_email: boolean
  show_location: boolean
  show_followers: boolean
  show_following: boolean
  who_can_message: "everyone" | "followers" | "nobody"
  who_can_follow: "everyone" | "followers"
  show_online_status: boolean
}

const fetchPrivacy = async (): Promise<PrivacySettings> => {
  const { data } = await api.get("/users/me/privacy/")
  return data.data ?? data
}

const updatePrivacy = async (settings: Partial<PrivacySettings>) => {
  const { data } = await api.patch("/users/me/privacy/", settings)
  return data
}

export default function PrivacySettingsScreen() {
  const theme = useTheme()
  const queryClient = useQueryClient()

  const { data: privacy, isLoading } = useQuery({
    queryKey: ["privacy"],
    queryFn: fetchPrivacy,
  })

  const mutation = useMutation({
    mutationFn: updatePrivacy,
    onSuccess: (_, variables) => {
      queryClient.setQueryData(["privacy"], (old: PrivacySettings | undefined) =>
        old ? { ...old, ...variables } : old
      )
    },
    onError: () => Alert.alert("Error", "Failed to update privacy settings"),
  })

  const update = (field: keyof PrivacySettings, value: any) => {
    mutation.mutate({ [field]: value })
  }

  if (isLoading || !privacy) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    )
  }

  const ToggleRow = ({
    label,
    sublabel,
    field,
    value,
  }: {
    label: string
    sublabel?: string
    field: keyof PrivacySettings
    value: boolean
  }) => (
    <View style={[styles.toggleRow, { borderBottomColor: theme.border }]}>
      <View style={styles.toggleLabels}>
        <Text style={[styles.toggleLabel, { color: theme.textPrimary }]}>{label}</Text>
        {sublabel && (
          <Text style={[styles.toggleSublabel, { color: theme.textMuted }]}>{sublabel}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => update(field, v)}
        trackColor={{ true: theme.primary, false: theme.border }}
        thumbColor="#fff"
      />
    </View>
  )

  const SegmentRow = ({
    label,
    sublabel,
    field,
    value,
    options,
  }: {
    label: string
    sublabel?: string
    field: keyof PrivacySettings
    value: string
    options: { value: string; label: string }[]
  }) => (
    <View style={[styles.segmentRow, { borderBottomColor: theme.border }]}>
      <View style={styles.toggleLabels}>
        <Text style={[styles.toggleLabel, { color: theme.textPrimary }]}>{label}</Text>
        {sublabel && (
          <Text style={[styles.toggleSublabel, { color: theme.textMuted }]}>{sublabel}</Text>
        )}
      </View>
      <View style={styles.segmentOptions}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.segmentOption,
              {
                backgroundColor:
                  value === opt.value ? theme.primary : theme.surfaceSecondary,
                borderColor:
                  value === opt.value ? theme.primary : theme.border,
              },
            ]}
            onPress={() => update(field, opt.value)}
          >
            <Text style={[
              styles.segmentOptionText,
              { color: value === opt.value ? "#fff" : theme.textSecondary }
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backIcon, { color: theme.textPrimary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Privacy Settings
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        <SettingsSectionHeader title="Profile Visibility" />
        <SettingsSectionCard>
          <ToggleRow
            label="Show Phone Number"
            sublabel="Visible on your public profile"
            field="show_phone"
            value={privacy.show_phone}
          />
          <ToggleRow
            label="Show Email"
            sublabel="Visible on your public profile"
            field="show_email"
            value={privacy.show_email}
          />
          <ToggleRow
            label="Show Location"
            field="show_location"
            value={privacy.show_location}
          />
          <ToggleRow
            label="Show Followers Count"
            field="show_followers"
            value={privacy.show_followers}
          />
          <ToggleRow
            label="Show Following Count"
            field="show_following"
            value={privacy.show_following}
          />
          <ToggleRow
            label="Show Online Status"
            sublabel="Others can see when you're active"
            field="show_online_status"
            value={privacy.show_online_status}
          />
        </SettingsSectionCard>

        <SettingsSectionHeader title="Interactions" />
        <SettingsSectionCard>
          <SegmentRow
            label="Who Can Message Me"
            field="who_can_message"
            value={privacy.who_can_message}
            options={[
              { value: "everyone", label: "Everyone" },
              { value: "followers", label: "Followers" },
              { value: "nobody", label: "Nobody" },
            ]}
          />
          <SegmentRow
            label="Who Can Follow Me"
            field="who_can_follow"
            value={privacy.who_can_follow}
            options={[
              { value: "everyone", label: "Everyone" },
              { value: "followers", label: "Approval" },
            ]}
          />
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
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  segmentRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  toggleLabels: { flex: 1 },
  toggleLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  toggleSublabel: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  segmentOptions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  segmentOption: {
    flex: 1,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    alignItems: "center",
  },
  segmentOptionText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
})

import { Radius } from "@/constants/colors"







