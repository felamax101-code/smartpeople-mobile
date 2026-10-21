import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Image } from "expo-image"

import { router } from 'expo-router';
import { FontSize, FontWeight, Radius } from '@/constants/colors';
import { getAvatarColor } from '@/hooks/useUserGenerateAvatarColor';
import { useAuthStore } from '@/stores/auth.store';
import { FontSlant } from '@shopify/react-native-skia';
interface UserRowProps {
  avatarUrl?: string;
  username: string;
  info?: string
  children?: React.ReactNode; // action button(s), passed in per-context
}

export function UserRow({ avatarUrl, username, info, children }: UserRowProps) {
  const theme = useTheme()
  const { user } = useAuthStore()
  return (
    <View style={[styles.row, { backgroundColor: theme.textMuted, borderColor: theme.border }]}>
      <View style={[{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 3 }]}>
        <TouchableOpacity
          onPress={() => router.push(`/profile/${username}`)}>

          {!avatarUrl || avatarUrl == undefined || avatarUrl == null || !avatarUrl.trim() ? (
            <View
              style={[styles.usernamePlacaholder, { backgroundColor: getAvatarColor(username) }]}
            >
              <Text
                style={[{ color: "white", fontWeight: FontWeight.extrabold, fontSize: FontSize.lg }]}
              >{username.charAt(0)}</Text>
            </View>
          ) : (
            <Image
              source={avatarUrl as any}
              style={[styles.avatar, { backgroundColor: theme.backgroundMuted }]}
              contentFit="cover"
            />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push(user && user.username === username ? `/profile` : `/profile/${username}`)}>
          <Text style={[styles.username, { color: theme.textPrimary }]} numberOfLines={1}>
            @{username}
          </Text>
        </TouchableOpacity>
      </View>
      {info === undefined && (

        <Text style={[styles.info, { color: theme.textPrimary }]} numberOfLines={1}>
          {info}
        </Text>
      )}
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderRadius: Radius.full,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 22,

  },
  username: {
    paddingLeft: 0,
    fontSize: 15,
    fontWeight: '500',

  },
  usernamePlacaholder: {
    display: "flex",
    alignItems: 'center',
    justifyContent: "center",
    width: 30,
    height: 30,
    borderRadius: "50%"

  },
  info: {
    position: "absolute",
    paddingLeft: 20,
    top: 0,
    right: 30,
    fontSize: 10,
    fontWeight: '400',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
});
