






import  { useMemo, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MyRolesModal } from '@/components/community/MyRolesModal';
import { getVisiblePanelItems } from '@/components/community/PanelItems';
import type { PanelType, PanelItem } from '@/types';
import { useMyModeratorRoles } from '@/hooks/useCommunityMembers';
import { PanelButton } from '@/components/community/PanelButton';
import { AnimatedBanner,BannerType } from '@/components/activityIndicator/AnimatedBanner';
export default function AdminPanelScreen() {
  // `role` decides which panel this is:
  //  - 'admin'      -> every button in PANEL_ITEMS shows, always
  //  - 'moderator'  -> only buttons unlocked by this user's assigned roles



  
  const { slug, role ,privacy} = useLocalSearchParams<{ slug: string; role: PanelType;privacy:string }>();
  const router = useRouter();

  const [rolesModalVisible, setRolesModalVisible] = useState(false);

  const isModerator = role === 'moderator';

  // Only fetch assigned roles when this is actually the moderator panel.
  const rolesQuery = useMyModeratorRoles(slug, isModerator);
  const assignedRoles = rolesQuery.data?.roles ?? [];

  const visibleItems = useMemo(
    () => getVisiblePanelItems(role,slug, assignedRoles),
    [role, assignedRoles]
  );

  const handleNavigate = (item: PanelItem) => {
    // `item.route` is a plain string path — cast is just to satisfy
    // expo-router's typed routes until these routes exist in your app.
    router.push({
      pathname:item.route({slug}) as any,
      params:{
        communityslug:slug,
        privacy:privacy,
        role:item.key==="add-admin"? "admin":item.key==="add-moderator"? "moderator" :""

      }
  
  });
  };

  const renderItem = ({ item }: { item: PanelItem }) => (
    <PanelButton label={item.label} info={item.info} onPress={() => handleNavigate(item)} />
  );

  const showLoadingState = isModerator && rolesQuery.isLoading;

  return (
    <SafeAreaView style={[styles.container]}>
      <View style={[styles.header]}>
        <Text style={[styles.title]}>{isModerator ? 'Moderator Panel' : 'Admin Panel'}</Text>
      </View>

      {isModerator && (
        <View style={[styles.myRolesRow]}>
          <PanelButton label="View My Roles" onPress={() => setRolesModalVisible(true)} />
        </View>
      )}

      {showLoadingState ? (
        <ActivityIndicator style={[styles.loading]} />
      ) : (
        <FlatList
          data={visibleItems}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent]}
          ListEmptyComponent={
            <View style={[styles.empty]}>
              <Text>No actions available yet</Text>
            </View>
          }
        />
      )}

      <MyRolesModal
        visible={rolesModalVisible}
        onClose={() => setRolesModalVisible(false)}
        roles={assignedRoles}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 22, fontWeight: '700' },
  myRolesRow: { paddingHorizontal: 16, marginTop: 12 },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  loading: { marginTop: 40 },
  empty: { alignItems: 'center', paddingVertical: 40 },
});
