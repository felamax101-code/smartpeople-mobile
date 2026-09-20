
import { useCallback, useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useTheme } from "@/hooks/useTheme"
import { useRouter } from "expo-router"
import { useSearch, } from "@/hooks/useSearch"
import { SearchResultCard } from "@/components/search/SearchResultCard"
import { SearchFilterBar } from "@/components/search/SearchFilterBar"
import { AuthPrompt } from "@/components/auth/AuthPrompt"
import { Post, SearchableUser } from "@/types"
import { Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { useQueryClient } from "@tanstack/react-query"

import { UserRow } from "@/components/community/UserRow"
import { ActionButton } from "@/components/community/ActionButton"

type TABS = "posts" | "users" | "communities"


// hardcoded trending — replace with API call later
const TRENDING = [
  "Async",
  "Pytorch",
  "Games",
  "GTA",
  "App Dev",
  "AI and ML",
]

export default function SearchScreen() {
  const theme = useTheme()
  const router = useRouter()
  const inputRef = useRef<TextInput>(null)
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TABS>("posts")

  const {
    query,
    setQuery,
    debouncedQuery,
    submitSearch,
    recentSearches,
    removeRecent,
    clearRecent,
    results,
    totalCount,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isSearching,
    viewMode,
    setViewMode,
    filters,
    setFilters,
    setRootSearch,
    userResults,
    isLooadingUsers,
    isFetchingNextPageUsers,
    fetchNextPageUsers,
    hasNextPageUsers,
  } = useSearch()
  useEffect(() => {
    setRootSearch(activeTab)
  }, [activeTab])
  //  optimistic upvote/save in results 
  const handleUpvote = useCallback((slug: string, upvoted: boolean) => {
    queryClient.setQueryData(
      ["search", debouncedQuery, filters],
      (old: any) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: {
              ...page.data,
              posts: page.data.posts.map((p: Post) =>   // ← data not results
                p.slug === slug


                  ? { ...p, is_upvoted: upvoted, upvotes_count: p.upvotes_count + (upvoted ? 1 : -1), }
                  : p
              ),
            }
          })),
        }
      }
    )
  }, [queryClient, debouncedQuery, filters])

  const handleSave = useCallback((postId: string, saved: boolean) => {
    queryClient.setQueryData(
      ["search", debouncedQuery, filters],
      (old: any) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: {
              ...page.data,
              posts: page.data.posts.map((p: Post) =>   // ← data not results
                p.id === postId ? { ...p, is_saved: saved } : p
              ),
            }
          })),
        }
      }
    )
  }, [queryClient, debouncedQuery, filters])
  const tabs: { key: Partial<TABS>; label: string; count?: number }[] = [
    { key: "posts", label: "Posts", },
    { key: "users", label: "Users", },
    // { key: "Communities", label: "Communities" },
  ]
  //  render result item ─
  const renderUserResult = useCallback(
    ({ item }: { item: SearchableUser }) => (
      <UserRow
        avatarUrl={item.avatar}
        username={item.username}
        children={
          <ActionButton
            label="View Profile"
            onPress={() => router.push(`/profile/${item.username}`)}
          />
        }
      />
    ),
    []
  )

  const renderResult = useCallback(
    ({ item }: { item: Post }) => (
      <SearchResultCard
        post={item}
        viewMode={viewMode}
        onUpvote={handleUpvote}
        onSave={handleSave}
      />
    ),
    [viewMode, handleUpvote, handleSave]
  )

  //  empty / idle states 
  const renderIdle = () => (
    <FlatList
      data={[]}
      renderItem={null}
      keyExtractor={() => ""}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={() => (
        <View style={styles.idleContent}>

          {/* recent searches */}
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                  Recent Searches
                </Text>
                <TouchableOpacity onPress={clearRecent}>
                  <Text style={[styles.clearAll, { color: theme.error }]}>
                    Clear all
                  </Text>
                </TouchableOpacity>
              </View>

              {recentSearches.map((term) => (
                <TouchableOpacity
                  key={term}
                  style={[styles.recentRow, { borderBottomColor: theme.border }]}
                  onPress={() => {
                    setQuery(term)
                    submitSearch(term)
                    Keyboard.dismiss()
                  }}
                >
                  <Text style={styles.recentIcon}></Text>
                  <Text style={[styles.recentText, { color: theme.textPrimary }]}>
                    {term}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeRecent(term)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[styles.removeIcon, { color: theme.textMuted }]}>
                      ✕
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* trending searches */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Trending Searches
            </Text>
            <View style={styles.trendingGrid}>
              {TRENDING.map((term) => (
                <TouchableOpacity
                  key={term}
                  style={[
                    styles.trendingChip,
                    {
                      backgroundColor: theme.surfaceSecondary,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => {
                    setQuery(term)
                    submitSearch(term)
                    Keyboard.dismiss()
                  }}
                >
                  <Text style={[styles.trendingText, { color: theme.textPrimary }]}>
                    {term}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}
    />
  )

  const renderEmpty = () => {
    if ((isLoading && activeTab === "posts") || (isLooadingUsers && activeTab === "users")) return null
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
          No results for "{debouncedQuery}"
        </Text>
        <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
          Try different keywords or remove filters
        </Text>
        <TouchableOpacity
          onPress={() => setFilters({ sort: "newest" })}
          style={[styles.clearFiltersButton, { borderColor: theme.primary }]}
        >
          <Text style={[styles.clearFiltersText, { color: theme.primary }]}>
            Clear filters
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >

      {/*  search bar ─ */}
      <View style={[styles.searchBar, { borderBottomColor: theme.border }]}>
        <View style={[styles.inputWrapper, { backgroundColor: theme.inputBackground }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: theme.textPrimary }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search posts, brands, sellers..."
            placeholderTextColor={theme.textPlaceholder}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => {
              if (query.trim()) {
                submitSearch(query)
                Keyboard.dismiss()
              }
            }}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.clearIcon, { color: theme.textMuted }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* view mode toggle — only shown in results */}
        {isSearching && activeTab === "posts" && (
          <View style={[styles.viewToggle, { backgroundColor: theme.surfaceSecondary }]}>
            <TouchableOpacity
              style={[
                styles.viewToggleButton,
                viewMode === "list" && { backgroundColor: theme.primary },
              ]}
              onPress={() => setViewMode("list")}
            >
              <Text style={[
                styles.viewToggleIcon,
                { color: viewMode === "list" ? "#fff" : theme.textMuted }
              ]}>
                ☰
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.viewToggleButton,
                viewMode === "grid" && { backgroundColor: theme.primary },
              ]}
              onPress={() => setViewMode("grid")}
            >
              <Text style={[
                styles.viewToggleIcon,
                { color: viewMode === "grid" ? "#fff" : theme.textMuted }
              ]}>
                ⊞
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/*  filter bar — only in results  */}
      {isSearching && (
        <>
          <View
            style={[{
              display: "flex", height: 30, flexDirection: "row", justifyContent: "center", borderWidth: 1, gap: 0.5, position: "static",

              top: 50
            }]}
          >
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[{
                  flex: 1, justifyContent: "center", alignItems: "center",borderWidth:1, borderRadius: Radius.lg, borderColor: activeTab === tab.key ? theme.primary : theme.textPlaceholder,
                  backgroundColor: activeTab === tab.key ? theme.primary : theme.inputBackgroundFocus,
                }]}
              >
                <Text
                  style={[{ color: activeTab===tab.key? "white":theme.textPrimary }]}
                >{tab.label}</Text>

              </TouchableOpacity>

            ))}


          </View>
          {activeTab === "posts" && (
            <SearchFilterBar
              filters={filters}
              onFiltersChange={setFilters}
              resultCount={totalCount}
            />
          )}

        </>
      )}

      {/*  loading indicator ─ */}
      {isLoading || isLooadingUsers && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={theme.primary} size="small" />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Searching...
          </Text>
        </View>
      )}

      {/*  content  */}
      {!isSearching ? (
        renderIdle()
      ) : (
        <>
          {activeTab === "posts" ? (

            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={renderResult}
              numColumns={viewMode === "grid" ? 2 : 1}
              key={viewMode}  // force re-render on view mode change
              columnWrapperStyle={
                viewMode === "grid"
                  ? { gap: Spacing.sm, paddingHorizontal: Spacing.md }
                  : undefined
              }
              contentContainerStyle={[
                styles.resultsList,
                viewMode === "grid" && { gap: Spacing.sm, paddingTop: Spacing.md },
              ]}
              ListEmptyComponent={renderEmpty}
              onEndReached={() => {
                if (hasNextPage && !isFetchingNextPage && activeTab === "posts") { fetchNextPage() }
              }}
              onEndReachedThreshold={0.4}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={
                isFetchingNextPage ? (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator color={theme.primary} size="small" />
                  </View>
                ) : null
              }
              keyboardShouldPersistTaps="handled"
            />
          ) : (

            <FlatList
              data={userResults}
              keyExtractor={(item) => item.id}
              renderItem={renderUserResult}
              // key={activeTab==="posts"? viewMode:undefined}  // force re-render on view mode change
              // columnWrapperStyle={
              //    activeTab==="posts" && viewMode === "grid"
              //     ? { gap: Spacing.sm, paddingHorizontal: Spacing.md }
              //     : undefined
              // }
              contentContainerStyle={[
                styles.resultsList,
              ]}
              ListEmptyComponent={renderEmpty}
              onEndReached={() => {
                if (hasNextPageUsers && !isFetchingNextPageUsers && activeTab === "users") { fetchNextPageUsers() }
              }}
              onEndReachedThreshold={0.4}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={
                isFetchingNextPageUsers ? (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator color={theme.primary} size="small" />
                  </View>
                ) : null
              }
              keyboardShouldPersistTaps="handled"
            />
          )}
        </>

      )}




      <AuthPrompt />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.sm,
  },
  searchIcon: { fontSize: 16 },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    height: "100%",
  },
  clearIcon: {
    fontSize: 14,
    padding: 4,
  },
  viewToggle: {
    flexDirection: "row",
    borderRadius: Radius.md,
    overflow: "hidden",
    padding: 2,
    gap: 2,
  },
  viewToggleButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.sm,
  },
  viewToggleIcon: {
    fontSize: 16,
    fontWeight: FontWeight.bold,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: FontSize.sm,
  },
  resultsList: {
    paddingBottom: Spacing.xxl,
  },
  footerLoader: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  idleContent: {
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  section: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  clearAll: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
  },
  recentIcon: { fontSize: 16 },
  recentText: {
    flex: 1,
    fontSize: FontSize.md,
  },
  removeIcon: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },
  trendingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  trendingChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  trendingText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIcon: { fontSize: 56 },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    textAlign: "center",
  },
  emptySub: {
    fontSize: FontSize.md,
    textAlign: "center",
  },
  clearFiltersButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    marginTop: Spacing.sm,
  },
  clearFiltersText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
})











