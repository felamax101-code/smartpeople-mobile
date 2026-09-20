import  { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton } from '@/components/community/ActionButton';
import { UserRow } from '@/components/community/UserRow';
import { InviteMembersModal } from '@/components/community/InviteModal';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useTheme } from '@/hooks/useTheme';
import {
  useMembersQuery,
  usePendingRequestsQuery,
  usePendingInvitesQuery,
  useRemoveMember,
  useApproveRequest,
  useRejectRequest,
  useCancelInvite,
} from '@/hooks/useCommunityMembers';
import type { GroupPrivacy, Member, PendingRequest, PendingInvite } from '@/types';
import { AnimatedBanner, BannerType } from '@/components/activityIndicator/AnimatedBanner';

type TabKey = 'members' | 'pending'
interface BannerState {
  id: number; // changing id forces AnimatedBanner to remount and re-animate
  type: BannerType;
  message: string;
}
export default function GroupMembersScreen() {
  // Route params — groupId identifies the group, privacy drives which
  // tabs/actions are shown (public | private | invite_only).
  const { communityslug: cslug, privacy } = useLocalSearchParams<{
    communityslug: string;
    privacy: GroupPrivacy;
  }>();
  const theme = useTheme()
  const [activeTab, setActiveTab] = useState<TabKey>('members');
  const [searchText, setSearchText] = useState('');
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const search = useDebouncedValue(searchText);

  const showPendingTab = privacy !== 'public';
  const pendingLabel = privacy === 'private' ? 'Pending Requests' : 'Pending Invites';
  // Only the active list's search should actually be "live" — the other
  // queries stay idle so we don't fire requests for hidden tabs.
  const membersQuery = useMembersQuery(cslug, activeTab === 'members' ? search : '');
  const requestsQuery = usePendingRequestsQuery(
    cslug,
    privacy === 'private' && activeTab === 'pending' ? search : ''
  );

  const invitesQuery = usePendingInvitesQuery(
    cslug,
    privacy === 'invite_only' && activeTab === 'pending' ? search : ''
  );
  const removeMember = useRemoveMember(cslug);
  const approveRequest = useApproveRequest(cslug);
  const rejectRequest = useRejectRequest(cslug);
  const cancelInvite = useCancelInvite(cslug);

  const activeQuery =
    activeTab === 'members' ? membersQuery : privacy === 'private' ? requestsQuery : invitesQuery;

  const showBanner = useCallback((type: BannerType, message: string) => {
    setBanner({ id: Date.now(), type, message });
  }, []);

  const isError = rejectRequest.isError || approveRequest.isError || cancelInvite.isError || removeMember.isError || membersQuery.isError || requestsQuery.isError || invitesQuery.isError
  const issError = rejectRequest.isError || approveRequest.isError || cancelInvite.isError || removeMember.isError || membersQuery.isError || requestsQuery.isError || invitesQuery.isError
  const isSuccess = rejectRequest.isSuccess || approveRequest.isSuccess || cancelInvite.isSuccess || removeMember.isSuccess

  useEffect(() => {
    if (isError) {
      showBanner("error", "Something went wrong.Try again")
    }
  }, [isError])

  useEffect(() => {
    if (isSuccess) {
      showBanner("success", activeTab === "members" ? "Removed successfully" : " Invite cancelled")
    }
  }, [isSuccess])


  const handleRefetch = () => {

    membersQuery.isError ?
      membersQuery.refetch()
      : invitesQuery.isError ?
        invitesQuery.refetch()
        : requestsQuery.refetch()


  }

  const data = useMemo(

    () =>
      activeTab === "members" ?
        membersQuery.data?.pages.flatMap((p) => p.data.users) ?? []
        : privacy === "private" ?
          requestsQuery.data?.pages.flatMap((p) => p.data.join_requests) ?? []
          : invitesQuery.data?.pages.flatMap((p) => p.data.pending_invites) ?? [],

    [activeQuery.data]
  );

  const onEndReached = useCallback(() => {
    if (activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) {
      activeQuery.fetchNextPage();
    }
  }, [activeQuery]);

  const keyExtractor = useCallback((item: Member | PendingRequest | PendingInvite) => {
    if ('requester' in item) return item.id;
    if ('invited' in item) return item.id;
    return item.id;
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Member | PendingRequest | PendingInvite }) => {
      if (activeTab === 'members') {
        const member = item as Member;
        return (
          <UserRow avatarUrl={member.avatar} username={member.username}>
            <ActionButton
              label="Remove"
              variant="danger"
              loading={removeMember.isPending && removeMember.variables === member.id}
              onPress={() => removeMember.mutate(member.id)}
            />
          </UserRow>
        );
      }


      if (privacy === 'private') {
        const request = item as PendingRequest;
        return (
          <UserRow avatarUrl={request.avatar} username={request.username}>
            <ActionButton
              label="Reject"
              variant="danger"
              loading={rejectRequest.isPending && rejectRequest.variables === request.id}
              onPress={() => rejectRequest.mutate(request.id)}
            />
            <ActionButton
              label="Approve"
              variant="primary"
              loading={approveRequest.isPending && approveRequest.variables === request.id}
              onPress={() => approveRequest.mutate(request.id)}
            />
          </UserRow>
        );
      }

      // invite_only
      const invite = item as PendingInvite;
      return (
        <UserRow avatarUrl={invite.invited.avatar} username={invite.invited.username}>
          <ActionButton
            label="Cancel"
            variant="danger"
            loading={cancelInvite.isPending && cancelInvite.variables === invite.id}
            onPress={() => cancelInvite.mutate(invite.id)}
          />
        </UserRow>
      );
    },
    [activeTab, privacy, removeMember, approveRequest, rejectRequest, cancelInvite]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {banner && (
        <AnimatedBanner
          key={banner.id}
          type={banner.type}
          message={banner.message}
          onHide={() => setBanner(null)}
        />
      )}
      {/* Tabs — Pending tab only exists for private / invite_only groups */}
      <View style={styles.tabRow}>
        <Pressable
          onPress={() => setActiveTab('members')}
          style={[styles.tab, activeTab === 'members' && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
            Members
          </Text>
        </Pressable>

        {showPendingTab && (
          <Pressable
            onPress={() => setActiveTab('pending')}
            style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
              {pendingLabel}
            </Text>
          </Pressable>
        )}



      </View>

      {/* Search WITHIN the active list (existing members / requests / invites) */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder={activeTab === 'members' ? 'Search members' : `Search ${pendingLabel.toLowerCase()}`}
          value={searchText}
          onChangeText={setSearchText}
          autoCorrect={false}
        />
      </View>

      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        refreshing={activeQuery.isRefetching}
        onRefresh={() => activeQuery.refetch()}
        ListEmptyComponent={
          !activeQuery.isLoading ? (
            <View style={styles.empty}>
              {issError ? (
                membersQuery.isError && activeTab === "members" ?
                  <>
                    <Text>Failed to load members</Text>
                    <Text>Pull to </Text>
                    <Pressable onPress={() => handleRefetch()}>
                      <Text style={[styles.ErrorText]}>Try again</Text>
                    </Pressable>
                  </>
                  : requestsQuery.isError && activeTab === "pending" ?
                    <>
                      <Text>Failed to load pending requests</Text>
                      <Pressable onPress={() => handleRefetch()}>
                        <Text style={[styles.ErrorText]}>Try again</Text>
                      </Pressable>
                    </>
                    : null
              ) : (
                <Text style={[{ color: theme.ALLwarning }]}> No results</Text>)}
            </View>
          ) : null
        }
        ListFooterComponent={
          activeQuery.isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null
        }
      />

      {/* Entry point to the SEPARATE "search new users to invite" flow */}
      <Pressable style={[styles.inviteFab, { backgroundColor: theme.primary }]} onPress={() => setInviteModalVisible(true)}>
        <Text style={[styles.inviteFabText, { color: theme.textPrimary }]}>Invite Members</Text>
      </Pressable>

      <InviteMembersModal
        visible={inviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
        cslug={cslug}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, },
  tabRow: { flexDirection: 'row', alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, gap: 2, marginTop: 8 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#b1b1f6',
  },
  tabActive: { backgroundColor: '#8bc3f8aa' },
  tabText: { fontSize: 10, color: '#333', fontWeight: '500' },
  tabTextActive: { color: '#fff' },
  searchRow: { paddingHorizontal: 16, marginVertical: 10 },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: "#8484cb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  empty: { alignItems: 'center', paddingVertical: 40, color: "#fff" },
  inviteFab: {
    margin: 16,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  inviteFabText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  ErrorBanner: {
    position: "absolute",
    marginLeft: 47,
    height: 20,
    bottom: -68,
    zIndex: 10,
    borderWidth: 1,
    borderColor: "#1a0404",
    borderRadius: 5,


  },
  errorText: {
    fontSize: 13,
    color: "#ff0909",
    backgroundColor: "#f3ebeb",


  },
  ErrorText: {
    fontSize: 13,
    color: "#ff0909",
    backgroundColor: "#f9fbfb",
    borderWidth: 2,
    borderColor: "#1a0fec"


  }
});
