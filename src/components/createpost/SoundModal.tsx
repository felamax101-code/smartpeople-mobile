// components/sounds/SoundSearchModal.tsx
//
// Usage:
//   const [pickerOpen, setPickerOpen] = useState(false);
//   const [sound, setSound] = useState<SelectedSound | null>(null);
//
//   <SoundSearchModal
//     isVisible={pickerOpen}
//     onClose={() => setPickerOpen(false)}
//     onSelect={(picked) => setSound(picked)}   // { id, url, title, owner, duration }
//   />
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import api from "@/services/api";
import BouncingBarsIndicator from "@/components/activityIndicator/BouncingBarsIndicator";

/* Types and data fetching                                                    */

type Sound = {
    id: string;
    title: string;
    owner: string;
    duration: number | null;
    price: string;
    preview_url: string;
    created_at: string;
    usage_count:number;
};

type SoundsPage = {
    sounds: Sound[];
    pagination: {
        page: number;
        page_size: number;
        total: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
    };
};

// What the post-upload screen receives when the user taps "Use this sound"
export type SelectedSound = {
    id: string;
    url: string;
    title: string;
    owner: string;
    duration: number | null;
};

type Filters = {
    q: string;
    owner: string;
    minDuration: number | null; // seconds
    maxDuration: number | null; // seconds
};

// Only send the params the user actually filled in. The backend reads
// q, owner, min_duration and max_duration (the last two in seconds).
async function fetchSounds(filters: Filters, page: number): Promise<SoundsPage> {
    const params: Record<string, string | number> = { page };
    if (filters.q) params.q = filters.q;
    if (filters.owner) params.owner = filters.owner;
    if (filters.minDuration !== null) params.min_duration = filters.minDuration;
    if (filters.maxDuration !== null) params.max_duration = filters.maxDuration;

    const res = await api.get("/sounds/list/", { params });
    return res.data.data;
}

/* Utilities                                                                  */

const fmtTime = (sec: number) => {
    const t = Math.max(0, Math.floor(sec || 0));
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

// "" or junk -> null, otherwise a whole number of seconds
const parseSeconds = (v: string): number | null => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
};

function useDebounced<T>(value: T, delay = 400): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

/* Row                                                                        */

type RowProps = {
    item: Sound;
    isActive: boolean;
    isPlaying: boolean;
    isLoading: boolean;
    progress: number; // 0..100, only non-zero for the active row
    onPress: (item: Sound) => void;
    c: Palette;
    s: ReturnType<typeof makeStyles>;
};

const SoundRow = memo(function SoundRow({ item, isActive, isPlaying, isLoading, progress, onPress, c, s }: RowProps) {
    const meta = [item.duration ? fmtTime(item.duration) : "", fmtDate(item.created_at)]
        .filter(Boolean)
        .join(", ");

    return (
        <Pressable
            onPress={() => onPress(item)}
            style={[s.row, isActive && s.rowActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${isPlaying ? "Pause" : "Play"} ${item.title} by ${item.owner}`}
        >
            <View style={[s.playBtn, isActive && s.playBtnActive]}>
                {isLoading ? (
                    <ActivityIndicator size="small" color={c.onAccent} />
                ) : (
                    <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={22}
                        color={isActive ? c.onAccent : c.accent}
                    />
                )}
            </View>

            <View style={s.rowBody}>
                <Text style={s.title} numberOfLines={1}>
                    {item.title}
                </Text>
                <Text style={s.owner} numberOfLines={1}>
                    @{item.owner}
                </Text>
                <View
                style={[{flexDirection:"row",gap:4}]}
                >
                <Text style={s.meta}>{meta}</Text>
                <Text style={[s.meta,{color:"#418bc0"}]}>{item.usage_count}{" "}posts</Text>
                </View>
                {isActive && (
                    <View style={s.track}>
                        <View style={[s.fill, { width: `${progress}%` }]} />
                    </View>
                )}
            </View>

            {isActive && <Ionicons name="checkmark-circle" size={22} color={c.accent} />}
        </Pressable>
    );
});

/* Sheet contents (mounted only while the modal is open, so the audio player   */
/* is created on open and released on close)                                   */

function SearchSheet({
    onClose,
    onSelect,
}: {
    onClose: () => void;
    onSelect?: (sound: SelectedSound) => void;
}) {
    const scheme = useColorScheme();
    const c = scheme === "dark" ? DARK : LIGHT;
    const s = useMemo(() => makeStyles(c), [c]);
    const insets = useSafeAreaInsets();

    /* filters */

    const [q, setQ] = useState("");
    const [owner, setOwner] = useState("");
    const [minText, setMinText] = useState("");
    const [maxText, setMaxText] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    const dq = useDebounced(q.trim());
    const dOwner = useDebounced(owner.trim());
    const dMin = useDebounced(minText);
    const dMax = useDebounced(maxText);

    const minDuration = parseSeconds(dMin);
    const maxDuration = parseSeconds(dMax);
    const rangeInvalid = minDuration !== null && maxDuration !== null && minDuration > maxDuration;

    const filters = useMemo<Filters>(
        () => ({ q: dq, owner: dOwner, minDuration, maxDuration }),
        [dq, dOwner, minDuration, maxDuration]
    );

    const activeFilterCount =
        (owner.trim() ? 1 : 0) + (minText.trim() ? 1 : 0) + (maxText.trim() ? 1 : 0);

    const clearFilters = () => {
        setOwner("");
        setMinText("");
        setMaxText("");
    };

    /* infinite query */

    const query = useInfiniteQuery({
        queryKey: ["sounds", "search", filters],
        queryFn: ({ pageParam }) => fetchSounds(filters, pageParam),
        initialPageParam: 1,
        getNextPageParam: (last) => (last.pagination.has_next ? last.pagination.page + 1 : undefined),
        enabled: !rangeInvalid,
        staleTime: 60_000,
        placeholderData: keepPreviousData, // keep old results on screen while a new search loads
    });

    // Flatten pages and drop duplicates (newest-first pagination can repeat an item)
    const sounds = useMemo(() => {
        const seen = new Map<string, Sound>();
        query.data?.pages.forEach((p) => p.sounds.forEach((x) => seen.has(x.id) || seen.set(x.id, x)));
        return [...seen.values()];
    }, [query.data]);

    /* one shared player. `selected` is both the sound being heard and the sound
       that "Use this sound" will return. It is stored as an object (not just an id)
       so it survives the user changing the search after picking it. */

    const [selected, setSelected] = useState<Sound | null>(null);
    const source = useMemo(() => (selected ? { uri: selected.preview_url } : null), [selected]);
    const player = useAudioPlayer(source);
    const status = useAudioPlayerStatus(player);

    const autoplayRef = useRef(false);
    const playerRef = useRef(player);
    const statusRef = useRef(status);
    const selectedIdRef = useRef<string | null>(null);
    playerRef.current = player;
    statusRef.current = status;
    selectedIdRef.current = selected?.id ?? null;

    useEffect(() => {
        setAudioModeAsync({ playsInSilentMode: true }).catch(() => { });
    }, []);

    // start playing once the tapped sound has loaded
    useEffect(() => {
        if (status.isLoaded && autoplayRef.current) {
            autoplayRef.current = false;
            player.play();
        }
    }, [status.isLoaded, player]);

    // make sure nothing keeps playing when the sheet closes
    useEffect(() => {
        return () => {
            try {
                playerRef.current.pause();
            } catch {
                // already released
            }
        };
    }, []);

    // stable identity, so memoized rows don't re-render on every status tick
    const onRowPress = useCallback(async (item: Sound) => {
        // a different sound: select it and let the effect above autoplay it
        if (item.id !== selectedIdRef.current) {
            try {
                playerRef.current.pause();
            } catch {
                // already released
            }
            autoplayRef.current = true;
            setSelected(item);
            return;
        }

        // same sound: toggle play / pause
        const p = playerRef.current;
        const st = statusRef.current;
        if (st.playing) {
            p.pause();
            return;
        }
        if (st.duration > 0 && st.currentTime >= st.duration - 0.2) {
            await p.seekTo(0); // finished: start again from the beginning
        }
        p.play();
    }, []);

    const playPct =
        status.duration > 0 ? Math.min(100, Math.round((status.currentTime / status.duration) * 100)) : 0;

    const handleUse = () => {
        if (!selected) return;
        try {
            playerRef.current.pause();
        } catch {
            // already released
        }
        onSelect?.({
            id: selected.id,
            url: selected.preview_url,
            title: selected.title,
            owner: selected.owner,
            duration: selected.duration,
        });
        onClose();
    };

    const renderItem = useCallback(
        ({ item }: { item: Sound }) => {
            const isActive = item.id === selected?.id;
            return (
                <SoundRow
                    item={item}
                    isActive={isActive}
                    isPlaying={isActive && status.playing}
                    isLoading={isActive && !status.isLoaded}
                    progress={isActive ? playPct : 0}
                    onPress={onRowPress}
                    c={c}
                    s={s}
                />
            );
        },
        [selected?.id, status.playing, status.isLoaded, playPct, onRowPress, c, s]
    );

    /* body: loading / error / list */

    const renderBody = () => {
        if (rangeInvalid) {
            return (
                <View style={s.center}>
                    <Text style={s.message}>Minimum duration can't be higher than the maximum.</Text>
                </View>
            );
        }
        if (query.isPending) {
            return (
                <View style={s.center}>
                    <BouncingBarsIndicator color={c.accent} />
                </View>
            );
        }
        if (query.isError && !query.data) {
            return (
                <View style={s.center}>
                    <Text style={s.message}>Couldn't load sounds. Check your connection and try again.</Text>
                    <Pressable style={s.retryBtn} onPress={() => query.refetch()}>
                        <Text style={s.retryText}>Try again</Text>
                    </Pressable>
                </View>
            );
        }
        return (
            <FlatList
                data={sounds}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                extraData={`${selected?.id}|${status.playing}|${status.isLoaded}|${playPct}`}
                ItemSeparatorComponent={() => <View style={s.separator} />}
                contentContainerStyle={s.listContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                onEndReached={() => {
                    if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
                }}
                onEndReachedThreshold={0.4}
                ListEmptyComponent={
                    <View style={s.center}>
                        <Text style={s.message}>
                            {dq || dOwner || minDuration !== null || maxDuration !== null
                                ? "No sounds match these filters. Try a different search."
                                : "No sounds yet."}
                        </Text>
                    </View>
                }
                ListFooterComponent={
                    query.isFetchingNextPage ? (
                        <ActivityIndicator style={s.footer} color={c.accent} />
                    ) : query.isError ? (
                        <Pressable style={s.footer} onPress={() => query.fetchNextPage()}>
                            <Text style={s.retryText}>Couldn't load more. Tap to retry.</Text>
                        </Pressable>
                    ) : null
                }
                initialNumToRender={10}
                windowSize={7}
            />
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={s.backdrop}
        >
            {/* tap the dimmed area above the sheet to close */}
            <Pressable style={s.backdropTap} onPress={onClose} accessibilityLabel="Close sound search" />

            <View style={s.sheet}>
                <View style={s.handle} />

                <View style={s.headerRow}>
                    <Text style={s.sheetTitle}>Find a sound</Text>
                    <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                        <Ionicons name="close" size={24} color={c.muted} />
                    </Pressable>
                </View>

                {/* search + filter toggle */}
                <View style={s.searchRow}>
                    <View style={s.searchBox}>
                        <Ionicons name="search" size={18} color={c.muted} />
                        <TextInput
                            style={s.searchInput}
                            value={q}
                            onChangeText={setQ}
                            placeholder="Search by title"
                            placeholderTextColor={c.muted}
                            returnKeyType="search"
                            autoCorrect={false}
                            maxLength={100}
                        />
                        {q.length > 0 && (
                            <Pressable onPress={() => setQ("")} hitSlop={10} accessibilityLabel="Clear search">
                                <Ionicons name="close-circle" size={18} color={c.muted} />
                            </Pressable>
                        )}
                    </View>
                    <Pressable
                        onPress={() => setShowFilters((v) => !v)}
                        style={[s.filterBtn, (showFilters || activeFilterCount > 0) && s.filterBtnOn]}
                        accessibilityRole="button"
                        accessibilityLabel="Filters"
                    >
                        <Ionicons
                            name="options-outline"
                            size={20}
                            color={showFilters || activeFilterCount > 0 ? c.onAccent : c.accent}
                        />
                        {activeFilterCount > 0 && (
                            <View style={s.badge}>
                                <Text style={s.badgeText}>{activeFilterCount}</Text>
                            </View>
                        )}
                    </Pressable>
                </View>

                {showFilters && (
                    <View style={s.filters}>
                        <View
                        style={[{flexDirection:"row",justifyContent:"space-between",alignItems:"center"}]}
                        >
                        <Text style={s.label}>Uploaded by</Text>
                         <Pressable onPress={()=>setShowFilters(false)} style={s.clearBtn}>
                                <Text style={s.retryText}>Close</Text>
                            </Pressable>
                            </View>
                        <TextInput
                            style={s.input}
                            value={owner}
                            onChangeText={setOwner}
                            placeholder="Username"
                            placeholderTextColor={c.muted}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                        <Text style={s.label}>Duration in seconds</Text>
                        <View style={s.durationRow}>
                            <TextInput
                                style={[s.input, s.durationInput, rangeInvalid && s.inputError]}
                                value={minText}
                                onChangeText={(t) => setMinText(t.replace(/[^0-9]/g, ""))}
                                placeholder="Min"
                                placeholderTextColor={c.muted}
                                keyboardType="number-pad"
                                maxLength={5}
                            />
                            <Text style={s.dash}>to</Text>
                            <TextInput
                                style={[s.input, s.durationInput, rangeInvalid && s.inputError]}
                                value={maxText}
                                onChangeText={(t) => setMaxText(t.replace(/[^0-9]/g, ""))}
                                placeholder="Max"
                                placeholderTextColor={c.muted}
                                keyboardType="number-pad"
                                maxLength={5}
                            />
                        </View>

                        {activeFilterCount > 0 && (
                            <Pressable onPress={clearFilters} style={s.clearBtn}>
                                <Text style={s.retryText}>Clear filters</Text>
                            </Pressable>
                        )}
                    </View>
                )}

                {/* thin activity line while a new search is loading over old results */}
                <View style={s.loadingLine}>
                    {query.isFetching && !query.isFetchingNextPage && !query.isPending && (
                        <ActivityIndicator size="small" color={c.accent} />
                    )}
                </View>

                <View style={s.listWrap}>{renderBody()}</View>

                {/* confirm bar */}
                <View style={[s.confirmBar, { paddingBottom: insets.bottom + 12 }]}>
                    <Pressable
                        onPress={handleUse}
                        disabled={!selected}
                        style={[s.useBtn, !selected && s.useBtnDisabled]}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !selected }}
                    >
                        <Text style={s.useText} numberOfLines={1}>
                            {selected ? `Use "${selected.title.slice(0,20)}${selected.title.length>20?"...":""}"` : "Tap a sound to listen and select it"}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

/* Modal wrapper                                                              */

type SoundSearchModalProps = {
    isVisible: boolean;
    onClose: () => void;
    onSelect?: (sound: SelectedSound) => void;
};

export default function SoundSearchModal({ isVisible, onClose, onSelect }: SoundSearchModalProps) {
    return (
        <Modal
            visible={isVisible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            {isVisible && <SearchSheet onClose={onClose} onSelect={onSelect} />}
        </Modal>
    );
}

/* Styles (same palette as the My sounds screen; move it to a shared file)    */

type Palette = typeof LIGHT;

const LIGHT = {
    bg: "#EEF1F4",
    card: "#FFFFFF",
    text: "#10151C",
    muted: "#5F6B7A",
    border: "#D9DFE6",
    accent: "#0B6E99",
    onAccent: "#FFFFFF",
    danger: "#C62828",
    track: "#DCE3EA",
    active: "#E3F1F7",
};

const DARK: Palette = {
    bg: "#0E1217",
    card: "#161C23",
    text: "#EDF1F5",
    muted: "#93A0AF",
    border: "#242D37",
    accent: "#4DB6E3",
    onAccent: "#06151D",
    danger: "#EF7B7B",
    track: "#27313C",
    active: "#12303D",
};

const makeStyles = (c: Palette) =>
    StyleSheet.create({
        backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
        backdropTap: { flex: 1 },
        sheet: {
            height: "85%",
            backgroundColor: c.bg,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: "hidden",
        },
        handle: {
            alignSelf: "center",
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: c.border,
            marginTop: 8,
        },
        headerRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 10,
        },
        sheetTitle: { color: c.text, fontSize: 18, fontWeight: "700" },

        searchRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16 },
        searchBox: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: c.card,
            borderRadius: 12,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: c.border,
            paddingHorizontal: 12,
        },
        searchInput: { flex: 1, color: c.text, fontSize: 16, paddingVertical: 11 },
        filterBtn: {
            width: 46,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: c.accent,
            alignItems: "center",
            justifyContent: "center",
        },
        filterBtnOn: { backgroundColor: c.accent },
        badge: {
            position: "absolute",
            top: -6,
            right: -6,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: c.danger,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 4,
        },
        badgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },

        filters: {
            marginHorizontal: 16,
            marginTop: 12,
            padding: 14,
            gap: 8,
            backgroundColor: c.card,
            borderRadius: 12,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: c.border,
        },
        label: { color: c.muted, fontSize: 13, fontWeight: "600" },
        input: {
            backgroundColor: c.bg,
            color: c.text,
            borderRadius: 10,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: c.border,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 15,
        },
        inputError: { borderColor: c.danger, borderWidth: 1 },
        durationRow: { flexDirection: "row", alignItems: "center", gap: 10 },
        durationInput: { flex: 1 },
        dash: { color: c.muted, fontSize: 14 },
        clearBtn: { alignSelf: "flex-start", paddingVertical: 4 },

        loadingLine: { height: 22, alignItems: "center", justifyContent: "center" },
        listWrap: { flex: 1 },
        listContent: { paddingHorizontal: 16, paddingBottom: 12, flexGrow: 1 },
        separator: { height: 10 },
        footer: { paddingVertical: 20, alignItems: "center" },
        center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 },
        message: { color: c.muted, fontSize: 15, textAlign: "center" },

        row: {
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            backgroundColor: c.card,
            borderRadius: 12,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: c.border,
            padding: 12,
        },
        rowActive: { backgroundColor: c.active, borderColor: c.accent, borderWidth: 1 },
        playBtn: {
            width: 44,
            height: 44,
            borderRadius: 22,
            borderWidth: 1.5,
            borderColor: c.accent,
            alignItems: "center",
            justifyContent: "center",
        },
        playBtnActive: { backgroundColor: c.accent },
        rowBody: { flex: 1, gap: 2 },
        title: { color: c.text, fontSize: 16, fontWeight: "600" },
        owner: { color: c.accent, fontSize: 13, fontWeight: "500" },
        meta: { color: c.muted, fontSize: 13 },
        track: { height: 4, borderRadius: 2, backgroundColor: "#fff", overflow: "hidden", marginTop: 6 },
        fill: { height: 4, backgroundColor: c.accent },

        retryBtn: {
            borderWidth: 1.5,
            borderColor: c.accent,
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 22,
        },
        retryText: { color: c.accent, fontSize: 15, fontWeight: "600" },

        confirmBar: {
            paddingHorizontal: 16,
            paddingTop: 12,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: c.border,
            backgroundColor: c.card,
        },
        useBtn: {
            backgroundColor: c.accent,
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 16,
            alignItems: "center",
        },
        useBtnDisabled: { backgroundColor: c.track },
        useText: { color: c.onAccent, fontSize: 16, fontWeight: "700" },
    });