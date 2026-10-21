import { useCallback, useState } from "react";
import {
  Modal, FlatList, View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useInfiniteQuery } from "@tanstack/react-query";
import { UserRow } from "../community/UserRow";
import { UsersSearchResponse, SearchableUser } from "@/types";
import { userService } from "@/services/user.service";
import { useAuthStore } from "@/stores/auth.store";
import { useTheme } from "@/hooks/useTheme"
import { FontSize,Radius,FontWeight } from "@/constants/colors";
import BouncingBarsIndicator from "../activityIndicator/BouncingBarsIndicator";

type Tab = "followers" | "following";

interface ModalProps {
  isVisible: boolean;
  onClose: () => void;
  username: string;
}

const getNextPageParam = (
  lastPage: UsersSearchResponse,
  allPages: UsersSearchResponse[]
) => (lastPage.data?.pagination?.has_next ? allPages.length + 1 : undefined);

export default function FollowModal({ isVisible, onClose,username }: ModalProps) {
  const { user } = useAuthStore();
  const theme=useTheme()
  const [activeTab, setActiveTab] = useState<Tab>("followers");

  const followersQuery = useInfiniteQuery({
    queryKey: ["followers",username],        // distinct key
    queryFn: async ({ pageParam }) =>
      (await userService.getMyFollowers(pageParam, 20,username)) as UsersSearchResponse,
    getNextPageParam,
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
    enabled: isVisible,                              // don't fetch until opened
  });

  const followingQuery = useInfiniteQuery({
    queryKey: ["following", username],        // distinct key
    queryFn: async ({ pageParam }) =>
      (await userService.getMyFollowing(pageParam, 20,username)) as UsersSearchResponse,
    getNextPageParam,
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
    enabled: isVisible,
  });

  // Pick the active query, so the list code is written once
  const active = activeTab === "followers" ? followersQuery : followingQuery;
  const data: SearchableUser[] =
    active.data?.pages.flatMap((page) => page.data?.users ?? []) ?? [];

  const renderItem = useCallback(
    ({ item }: { item: SearchableUser }) => (
      <UserRow avatarUrl={item.avatar} username={item.username} />
    ),
    [] // nothing from component scope is used
  );

  const keyExtractor = useCallback((item: SearchableUser) => item.id, []);

  const onEndReached = () => {
    if (active.hasNextPage && !active.isFetchingNextPage) active.fetchNextPage();
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container,{backgroundColor:theme.background}]}>
        <View style={styles.header}>
          <View style={styles.tabs}>
            {(["followers", "following"] as Tab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, {backgroundColor:activeTab===tab?theme.primary:theme.inputBackground}]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText,{color:theme.textPrimary}]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={onClose}>
            <Text style={[{color:theme.primary,fontSize:FontSize.md}]}  >Close</Text>
          </TouchableOpacity>
        </View>

        {active.isLoading ? (
          <BouncingBarsIndicator style={styles.center} color={theme.primary}/>
        ) : active.isError ? (
            <View style={[{alignItems:"center",justifyContent:"center"}]}>
          <Text style={[styles.center,{color:theme.textPrimary}]}>Something went wrong</Text>
          <TouchableOpacity
          style={[styles.tab,{backgroundColor:theme.backgroundMuted,justifyContent:"center",alignItems:"center",marginTop:20}]}
          onPress={()=>active.refetch()}
          >
          <Text style={[{color:theme.primary}]}>Try again</Text>
          </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={<Text style={styles.center}>No users yet</Text>}
            ListFooterComponent={
              active.isFetchingNextPage ? <ActivityIndicator /> : null
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  tabs: { flexDirection: "row", gap: 8 },
  tab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  tabActive: { backgroundColor: "#e5e7eb" },
  tabText: { textTransform: "capitalize" },
  center: { textAlign: "center", marginTop: 24 },
});