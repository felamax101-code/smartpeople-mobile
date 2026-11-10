
import { useState ,useRef} from "react"
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet } from "react-native"
import { useLocalSearchParams } from "expo-router"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { useTheme } from "@/hooks/useTheme"
import { useSound, useSoundPosts } from "@/hooks/useSound"
import { SoundSort } from "@/services/sounds"
import { Spacing, FontSize, FontWeight } from "@/constants/colors"
import { SoundHeader } from "@/components/Sound/SoundSoundHeader"
import { SoundPostCard } from "@/components/Sound/SoundPostCard"
import BouncingBarsIndicator from "@/components/activityIndicator/BouncingBarsIndicator"
export default function SoundScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const theme = useTheme()
const [sort, setSort] = useState<SoundSort>("newest")

const soundQuery = useSound(id)
const postsQuery = useSoundPosts(id, sort)
const listRef = useRef<FlatList>(null)

const handleSortChange = (next: SoundSort) => {
  setSort(next)
  listRef.current?.scrollToOffset({ offset: 0, animated: true })
}
  const posts = postsQuery.data?.pages.flatMap((p) => p.posts) ?? []

  if (soundQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <BouncingBarsIndicator color={theme.primary} />
      </View>
    )
  }

  if (soundQuery.isError || !soundQuery.data) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="alert-outline" size={30} color={theme.ALLwarning} />
        <Text style={[styles.message, { color: theme.textMuted }]}>
          This sound could not be loaded.
        </Text>
        <TouchableOpacity onPress={() => soundQuery.refetch()}>
          <Text style={[styles.retry, { color: theme.primary }]}>Try again</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
    
    <FlatList
    ref={listRef}
      style={{ backgroundColor: theme.background }}
      data={posts}
      keyExtractor={(item) => String(item.id)}
      numColumns={2}
      columnWrapperStyle={{ gap: Spacing.sm }}
      contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.sm }}
      renderItem={({ item }) => <SoundPostCard post={item} />}
      ListHeaderComponent={
          <SoundHeader sound={soundQuery.data} sort={sort} onSortChange={handleSortChange} />

      }
      onEndReached={() => {
        if (postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
          postsQuery.fetchNextPage()
        }
      }}
      onEndReachedThreshold={0.5}
      refreshing={postsQuery.isRefetching && !postsQuery.isFetchingNextPage}
      onRefresh={() => {
        soundQuery.refetch()
        postsQuery.refetch()
      }}
      ListEmptyComponent={
        postsQuery.isLoading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing.xl }} />
        ) : postsQuery.isError ? (
          <View style={styles.centered}>
            <Text style={[styles.message, { color: theme.textMuted }]}>Error loading posts.</Text>
            <TouchableOpacity onPress={() => postsQuery.refetch()}>
              <Text style={[styles.retry, { color: theme.primary }]}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.centered}>
            <MaterialCommunityIcons name="music-note-off" size={36} color={theme.textMuted} />
            <Text style={[styles.message, { color: theme.textMuted }]}>No posts use this sound yet</Text>
          </View>
        )
      }
      ListFooterComponent={
        postsQuery.isFetchingNextPage ? (
          <ActivityIndicator color={theme.primary} style={{ marginVertical: Spacing.lg }} />
        ) : null
      }
    />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:{flex:1},
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.sm, paddingVertical: Spacing.xl },
  message: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, textAlign: "center" },
  retry: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
})