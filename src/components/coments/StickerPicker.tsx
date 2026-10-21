import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  useWindowDimensions,
} from "react-native"
import { Image } from "expo-image"
import { useTheme } from "@/hooks/useTheme"
import { useStickers,StickerScope } from "@/hooks/useSticker"
import { Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { Sticker } from "@/types"
import { useStickerActions } from "@/hooks/useStickerActions"

const COLUMNS = 4
const GAP = 8
const H_PADDING = 12

// remembered while the app is running, so reopening the picker lands on the same tab
let lastTab: StickerScope = "discover"

interface Props {
  height: number
  onSelect: (sticker: Sticker) => void
}

/**
 * Mount only while open: {showStickers && <StickerPicker ... />}
 * Tap = use the sticker. Long-press = save it (Discover) or remove it (My stickers).
 */
export const StickerPicker = ({ height, onSelect }: Props) => {
  const theme = useTheme()
  const { width } = useWindowDimensions()

  const [tab, setTab] = useState<StickerScope>(lastTab)
  const [query, setQuery] = useState("")
  const [notice, setNotice] = useState<string | null>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { save, unsave } = useStickerActions()
  const saveMutate = save.mutate
  const unsaveMutate = unsave.mutate

  const {
    stickers,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isDebouncing,
  } = useStickers(query, tab)

  const size = (width - H_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current)
    }
  }, [])

  const flash = useCallback((message: string) => {
    setNotice(message)
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(null), 1800)
  }, [])

  const changeTab = (next: StickerScope) => {
    lastTab = next
    setTab(next)
  }

  const handleLongPress = useCallback(
    (item: Sticker) => {
      if (tab === "discover") {
        saveMutate(item, {
          onSuccess: () => flash("Saved to My stickers"),
          onError: () => flash("Couldn't save, try again"),
        })
        return
      }
      Alert.alert("Remove sticker?", "It will be removed from My stickers.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () =>
            unsaveMutate(item, { onError: () => flash("Couldn't remove, try again") }),
        },
      ])
    },
    [tab, saveMutate, unsaveMutate, flash]
  )

  const renderItem = useCallback(
    ({ item }: { item: Sticker }) => (
      <TouchableOpacity
        activeOpacity={0.7}
        delayLongPress={350}
        onPress={() => onSelect(item)}
        onLongPress={() => handleLongPress(item)}
        style={{ width: size, height: size }}
      >
        <Image
          source={{ uri: item.preview_url }}
          style={styles.thumb}
          contentFit="contain"
          recyclingKey={item.id}
          transition={120}
        />
      </TouchableOpacity>
    ),
    [size, onSelect, handleLongPress]
  )

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} />
        </View>
      )
    }
    if (isError) {
      return (
        <View style={styles.centered}>
          <Text style={[styles.message, { color: theme.textMuted }]}>
            {tab === "mine" ? "Failed to load your stickers" : "Failed to load stickers"}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { borderColor: theme.primary }]}
            onPress={() => refetch()}
          >
            <Text style={[styles.retryText, { color: theme.primary }]}>Try again</Text>
          </TouchableOpacity>
        </View>
      )
    }
    if (tab === "mine") {
      return (
        <View style={styles.centered}>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
            No saved stickers yet
          </Text>
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            Long-press any sticker to save it here
          </Text>
          <TouchableOpacity onPress={() => changeTab("discover")}>
            <Text style={[styles.link, { color: theme.primary }]}>Browse stickers</Text>
          </TouchableOpacity>
        </View>
      )
    }
    return (
      <View style={styles.centered}>
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          No stickers found
        </Text>
      </View>
    )
  }

  const tabButton = (value: StickerScope, label: string) => {
    const active = tab === value
    return (
      <TouchableOpacity
        key={value}
        onPress={() => changeTab(value)}
        style={[
          styles.tab,
          { borderBottomColor: active ? theme.primary : "transparent" },
        ]}
      >
        <Text
          style={[
            styles.tabText,
            { color: active ? theme.textPrimary : theme.textMuted },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    )
  }

  return (
    <View
      style={[
        styles.container,
        { height, backgroundColor: theme.surface, borderTopColor: theme.border },
      ]}
    >
      <View style={styles.tabsRow}>
        {tabButton("discover", "Discover")}
        {tabButton("mine", "My stickers")}
      </View>

      {tab === "discover" && (
        <View style={styles.searchRow}>
          <TextInput
            style={[
              styles.search,
              { backgroundColor: theme.inputBackground, color: theme.textPrimary },
            ]}
            placeholder="Search stickers"
            placeholderTextColor={theme.textPlaceholder}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {isDebouncing && (
            <ActivityIndicator
              size="small"
              color={theme.textMuted}
              style={styles.searchSpinner}
            />
          )}
        </View>
      )}

      {notice && (
        <View style={[styles.notice, { backgroundColor: theme.surfaceSecondary }]}>
          <Text style={[styles.noticeText, { color: theme.textPrimary }]}>{notice}</Text>
        </View>
      )}

      <FlatList
        data={stickers}
        keyExtractor={(item) => `${item.source}:${item.id}`}
        renderItem={renderItem}
        numColumns={COLUMNS}
        columnWrapperStyle={{ gap: GAP }}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color={theme.primary} size="small" style={styles.footer} />
          ) : null
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage()
        }}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      {/* GIPHY requires attribution. Swap for the provider's official logo asset. */}
      <Text style={[styles.attribution, { color: theme.textMuted }]}>Powered by GIPHY</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
  },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: H_PADDING,
    gap: Spacing.lg,
  },
  tab: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  searchRow: {
    paddingHorizontal: H_PADDING,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
    justifyContent: "center",
  },
  search: {
    height: 40,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
  },
  searchSpinner: {
    position: "absolute",
    right: H_PADDING + Spacing.md,
  },
  notice: {
    alignSelf: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    marginTop: Spacing.xs,
  },
  noticeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  grid: {
    paddingHorizontal: H_PADDING,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    rowGap: GAP,
    flexGrow: 1,
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  message: {
    fontSize: FontSize.sm,
    textAlign: "center",
  },
  link: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  retryBtn: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  retryText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  footer: {
    paddingVertical: Spacing.md,
  },
  attribution: {
    fontSize: FontSize.xs,
    textAlign: "center",
    paddingVertical: Spacing.xs,
  },
})