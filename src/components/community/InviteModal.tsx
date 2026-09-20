import  {useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton } from './ActionButton';
import { useInviteSearchQuery, useInviteUser } from '@/hooks/useCommunityMembers';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { UserRow } from './UserRow';
import { AnimatedBanner, BannerType } from '../activityIndicator/AnimatedBanner';
interface InviteMembersModalProps {
  visible: boolean;
  onClose: () => void;
  cslug: string;
}

interface BannerState {
  id: number; // changing id forces AnimatedBanner to remount and re-animate
  type: BannerType;
  message: string;
}

// This search bar is intentionally separate from the members/pending list
// search — it queries the "new users to invite" endpoint, not the
// existing-members/requests/invites endpoints.
export function InviteMembersModal({ visible, onClose, cslug }: InviteMembersModalProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query);

  const inviteSearch = useInviteSearchQuery(cslug, debouncedQuery);
  const inviteUser = useInviteUser(cslug);
  const isSearchError = inviteSearch.isError
  const isInviteError = inviteUser.isError
  const [banner, setBanner] = useState<BannerState | null>(null);




  const data = useMemo(
    () => inviteSearch.data?.pages.flatMap((p) => p.data?.users) ?? [],
    [inviteSearch.data]
  );
  const showBanner = useCallback((type: BannerType, message: string) => {
    setBanner({ id: Date.now(), type, message });
  }, []);

  
  useEffect( ()=>{
      inviteUser.isError?
      showBanner("error","Something went.Try again")
      :null
  },[inviteUser.isError])
  useEffect( ()=>{
      inviteUser.isSuccess?
      showBanner("success","Invite sent")
      :null
  },[inviteUser.isSuccess])
  

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        {banner && (
          <AnimatedBanner
            key={banner.id}
            type={banner.type}
            message={banner.message}
            onHide={() => setBanner(null)}
          />
        )}
        <View style={styles.header}>
          <Text style={styles.title}>Invite Members</Text>
          <Pressable onPress={handleClose}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
          {isInviteError || isSearchError && (
            <View style={[styles.ErrorBanner]}><Text style={[styles.errorText]}>Error Fetching users.Try again</Text></View>

          )}
        </View>



        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search people to invite"
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCorrect={false}
          />
        </View>

        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <UserRow avatarUrl={item.avatar} username={item.username}>
              <ActionButton
                label="Invite"
                variant="primary"
                loading={inviteUser.isPending && inviteUser.variables === item.id}
                onPress={() => inviteUser.mutate(item.id)}
                disabled={inviteUser.isPending}
              />
            </UserRow>
          )}
          onEndReached={() => {
            if (inviteSearch.hasNextPage && !inviteSearch.isFetchingNextPage) {
              inviteSearch.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            debouncedQuery.trim().length > 0 && !inviteSearch.isLoading ? (
              <View style={styles.empty}>
                <Text>No users found</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            inviteSearch.isFetchingNextPage ? (
              <ActivityIndicator style={{ marginVertical: 16 }} />
            ) : null
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: { fontSize: 18, fontWeight: '700' },
  closeText: { color: '#2563eb', fontSize: 15 },
  searchRow: { paddingHorizontal: 16, marginBottom: 10 },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  empty: { alignItems: 'center', paddingVertical: 40 },
  ErrorBanner: {
    position: "absolute",
    width: "100%",
    marginLeft: 30,
    height: 20,
    top: 35,
    zIndex: 10,

  },
  errorText: {
    fontSize: 15,
    color: "red"

  }
});
