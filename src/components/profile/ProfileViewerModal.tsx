import { useCallback, useState } from "react";
import {
  Modal, FlatList, View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useInfiniteQuery } from "@tanstack/react-query";
import { UserRow } from "../community/UserRow";
import { ProfileViwersAPIResponse, ProfileViewer, ViewerPeriod } from "@/types";
import { useTheme } from "@/hooks/useTheme";
import { FontSize } from "@/constants/colors";
import { authService } from "@/services/auth.service";
import BouncingBarsIndicator from "../activityIndicator/BouncingBarsIndicator";
interface ModalProps {
  isVisible: boolean;
  onClose: () => void;
  isOwn:boolean;
}

const TABS: { key: ViewerPeriod; label: string }[] = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "all", label: "All time" },
];

const getNextPageParam = (
  lastPage: ProfileViwersAPIResponse,
  allPages: ProfileViwersAPIResponse[]
) => (lastPage.data?.pagination?.has_next ? allPages.length + 1 : undefined);

const timeAgo = (iso: string) => {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

export default function ProfileViewersModal({ isVisible, onClose,isOwn }: ModalProps) {
  const theme = useTheme();
  const [period, setPeriod] = useState<ViewerPeriod>("week");

  const query = useInfiniteQuery({
    queryKey: ["profile-viewers", period], // period in the key = separate cache per tab
    queryFn: async ({ pageParam }) =>
      await authService.getProfileViewers(pageParam, 20, period),
    getNextPageParam,
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
    enabled: isVisible && isOwn, // don't fetch until opened
  });

  const data: ProfileViewer[] =
    query.data?.pages.flatMap((page) => page.data?.viewers ?? []) ?? [];

  const renderItem = useCallback(
    ({ item }: { item: ProfileViewer }) => (
      <UserRow
        avatarUrl={item.avatar}
        username={item.username}
        info={`${item.view_count} ${item.view_count === 1 ? "view" : "views"} · ${timeAgo(item.last_viewed)}`}
      />
    ),
    []
  );

  const keyExtractor = useCallback((item: ProfileViewer) => item.id, []);

  const onEndReached = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
  };

  return (
    <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <View style={styles.tabs}>
            {TABS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.tab,
                  { backgroundColor: period === key ? theme.primary : theme.inputBackground },
                ]}
                onPress={() => setPeriod(key)}
              >
                <Text style={[styles.tabText, { color: theme.textPrimary }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: theme.primary, fontSize: FontSize.md }}>Close</Text>
          </TouchableOpacity>
        </View>

        {query.isLoading ? (
          <BouncingBarsIndicator style={styles.center} color={theme.primary} />
        ) : query.isError ? (
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <Text style={[styles.center, { color: theme.textPrimary }]}>Something went wrong</Text>
            <TouchableOpacity
              style={[
                styles.tab,
                { backgroundColor: theme.backgroundMuted, marginTop: 20, alignItems: "center" },
              ]}
              onPress={() => query.refetch()}
            >
              <Text style={{ color: theme.primary }}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <Text style={[styles.center, { color: theme.textPrimary }]}>
                No profile views {period === "all" ? "yet" : `this ${period}`}
              </Text>
            }
            ListFooterComponent={
              query.isFetchingNextPage ? <ActivityIndicator color={theme.primary} /> : null
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  tabs: { flexDirection: "row", gap: 8 },
  tab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  tabText: { fontSize: 13 },
  center: { textAlign: "center", marginTop: 24 },
});