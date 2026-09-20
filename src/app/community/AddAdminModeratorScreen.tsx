import React, { useCallback, useMemo, useState } from 'react';
import {

  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { UserRow } from '@/components/community/UserRow';
import { ActionButton } from '@/components/community/ActionButton';
import { AnimatedBanner, BannerType } from '@/components/activityIndicator/AnimatedBanner';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

import { useInviteUser, useRoleAssignmentSearchQuery, useAssignRole } from '@/hooks/useCommunityMembers';
import type { AdminRole, SearchableUser } from '@/types';

interface BannerState {
  id: number; // changing id forces AnimatedBanner to remount and re-animate
  type: BannerType;
  message: string;
}

export default function AddAdminModeratorScreen() {
  // groupId identifies the group. `role` tells us whether this screen
  // instance is promoting admins or moderators — same UI and endpoint,
  // just a different label and payload value.
  const { communityslug, role } = useLocalSearchParams<{ communityslug: string; role: AdminRole }>();

  const [searchText, setSearchText] = useState('');
  const search = useDebouncedValue(searchText);
  const [banner, setBanner] = useState<BannerState | null>(null);

  const searchQuery = useRoleAssignmentSearchQuery(communityslug, role, search);
  const inviteUser = useInviteUser(communityslug);
  const assignRole = useAssignRole(communityslug, role);

  const roleLabel = role === 'admin' ? 'Admin' : 'Moderator';

  const data = useMemo(
    () => searchQuery.data?.pages.flatMap((p) => p.data.users) ?? [],
    [searchQuery.data]
  );

  const showBanner = useCallback((type: BannerType, message: string) => {
    setBanner({ id: Date.now(), type, message });
  }, []);

  const onEndReached = useCallback(() => {
    if (searchQuery.hasNextPage && !searchQuery.isFetchingNextPage) {
      searchQuery.fetchNextPage();
    }
  }, [searchQuery]);

  const renderItem = useCallback(
    ({ item }: { item: SearchableUser }) => {
      if (!item.is_member) {
        return (
          <UserRow avatarUrl={item.avatar} info={"Not a member"} username={item.username}>
            <ActionButton
              label="Invite"
              loading={inviteUser.isPending && inviteUser.variables === item.id}
              onPress={() =>
                inviteUser.mutate(item.id, {
                  onSuccess: () => showBanner('success', `Invited ${item.username}.`),
                  onError: () => showBanner('error', 'Something went wrong. Please try again.'),
                })
              }
            />
          </UserRow>
        );
      }

      return (
        <UserRow avatarUrl={item.avatar} username={item.username}>
          <ActionButton
            label={`Add as ${roleLabel}`}
            variant="primary"
            loading={assignRole.isPending && assignRole.variables === item.id}
            onPress={() =>
              assignRole.mutate(item.id, {
                onSuccess: () => showBanner('success', 'Added — go back to assign roles.'),
                onError: () => showBanner('error', 'Something went wrong. Please try again.'),
              })
            }
          />
        </UserRow>
      );
    },
    [inviteUser, assignRole, roleLabel, showBanner]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Banner is mounted only while there's something to show; the
          changing `banner.id` key makes it re-animate on every new event,
          even if the same message fires twice in a row. */}
      {banner && (
        <AnimatedBanner
          key={banner.id}
          type={banner.type}
          message={banner.message}
          onHide={() => setBanner(null)}
        />
      )}

      <View style={styles.header}>
        <Text style={styles.title}>Add {roleLabel}s</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users"
          value={searchText}
          onChangeText={setSearchText}
          autoCorrect={false}
        />
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          search.trim().length === 0 ? (
            <View style={styles.empty}>
              <Text>Search for a user to get started</Text>
            </View>
          ) : !searchQuery.isLoading ? (
            <View style={styles.empty}>
              <Text>No users found</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          searchQuery.isFetchingNextPage ? (
            <ActivityIndicator style={{ marginVertical: 16 }} />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 16, paddingTop: 8 },
  title: { fontSize: 20, fontWeight: '700' },
  searchRow: { paddingHorizontal: 16, marginVertical: 10 },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  empty: { alignItems: 'center', paddingVertical: 40 },
});
