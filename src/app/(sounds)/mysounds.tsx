import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    useColorScheme, KeyboardAvoidingView, Modal, Platform, TextInput,
} from "react-native";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient, type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useAuthStore } from "@/stores/auth.store";
import api from "@/services/api";
import { useTheme } from "@/hooks/useTheme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import BouncingBarsIndicator from "@/components/activityIndicator/BouncingBarsIndicator";
import { useNotificationToast } from "@/components/activityIndicator/ToastNotification";
import { useToast } from "@/components/activityIndicator/ToastProvider";
/* Types and data fetching                                                    */
type Sound = {
    id: string;
    title: string;
    owner: string;
    duration: number | null;
    price: string;
    preview_url: string;
    created_at: string;
    usage_count:number
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

// Same endpoint as the sound picker, filtered with ?owner=<username>
async function fetchSounds(owner: string, page: number): Promise<SoundsPage> {
    const res = await api.get("/sounds/list/", { params: { owner, page } });
    return res.data.data;
}
async function deleteSound(id: string): Promise<void> {
    const res = await api.delete(`/sounds/upload/${id}/`);
    return res.data.data;
}
/* Utilities                                                                  */

const fmtTime = (sec: number) => {
    const t = Math.max(0, Math.floor(sec || 0));
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
function EditTitleModal({
    sound, onClose, onSave, c, s,
}: {
    sound: Sound | null;
    onClose: () => void;
    onSave: (id: string, title: string) => Promise<boolean>;
    c: Palette;
    s: ReturnType<typeof makeStyles>;
}) {
    const [value, setValue] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => setValue(sound?.title ?? ""), [sound?.id]);

    const submit = async () => {
        if (!sound || saving) return;
        if (value.trim() === sound.title) return onClose(); // nothing changed, skip the request
        setSaving(true);
        const ok = await onSave(sound.id, value);
        setSaving(false);
        if (ok) onClose();
    };

    return (
        <Modal visible={!!sound} transparent animationType="fade" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.backdrop}>
                <View style={s.dialog}>
                    <Text style={s.dialogTitle}>Edit title</Text>
                    <TextInput
                        autoFocus selectTextOnFocus
                        style={s.input}
                        value={value}
                        onChangeText={setValue}
                        maxLength={100}
                        editable={!saving}
                        returnKeyType="done"
                        onSubmitEditing={submit}
                        placeholderTextColor={c.muted}
                    />
                    <View style={s.dialogActions}>
                        <Pressable onPress={onClose} disabled={saving}><Text style={s.link}>Cancel</Text></Pressable>
                        <Pressable onPress={submit} disabled={saving}><Text style={s.link}>{saving ? "Saving" : "Save"}</Text></Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

/* Row                                                                        */

type RowProps = {
    item: Sound;
    isActive: boolean;
    isPlaying: boolean;
    isLoading: boolean;
    progress: number; // 0..100, only non-zero for the active row
    onToggle: (item: Sound) => void;
    c: Palette;
    s: ReturnType<typeof makeStyles>;
    moreoptionsvisible: () => void;
    visible: boolean;
    onDelete: (id: string) => void;
    onEdit: (item: Sound) => void
};

// memo: while a sound plays, only the active row re-renders as progress changes
const SoundRow = memo(function SoundRow({
    item,
    isActive,
    isPlaying,
    isLoading,
    progress,
    onToggle,
    c,
    onEdit,
    onDelete,
    s,
   
}: RowProps) {
    const meta = [item.duration ? fmtTime(item.duration) : "", fmtDate(item.created_at)]
        .filter(Boolean)
        .join(", ");
    const [modalVisible, setModalVisible] = useState<boolean>(false)
    const { showToast } = useToast()
    return (
        <View style={s.row}>
            <Pressable
                onPress={() => onToggle(item)}
                style={[s.playBtn, isActive && s.playBtnActive]}
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? `Pause ${item.title}` : `Play ${item.title}`}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color={"#0c0cf0"} />
                ) : (
                    <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={22}
                        color={isActive ? c.onAccent : c.accent}
                    />
                )}
            </Pressable>

            <View style={s.rowBody}>
                <Text style={s.title} numberOfLines={1}>
                    {item.title}
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
            {modalVisible && <View
                style={[{ position: "absolute", backgroundColor: "#2d3639", right: 4, width: 100, borderWidth: 2, borderColor: "#3e3939", borderRadius: 5, bottom: 30, zIndex: 1000, paddingHorizontal: 4 }]}
            >
                <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={[{ justifyContent: "flex-end", alignItems: "flex-end" }]}
                    activeOpacity={0.5}
                >
                    <Text style={[{ color: "#fff", fontSize: 20, fontWeight: "700" }]} >x</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() =>
                        showToast({
                            title: "Delete this sound?",
                            message: "You won't see it again. It will still be available to users who have attached it to their posts",
                            onCancel: () => setModalVisible(false),
                            onConfirm: () => {
                                setModalVisible(false)
                                onDelete(item.id)
                            }
                        })
                    }
                    activeOpacity={0.5}
                >
                    <Text style={[{ color: "#fff" }]} >Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() =>{setModalVisible(false); onEdit(item)}}
                    style={[{marginTop:6}]}
                    activeOpacity={0.5}
                >
                    <Text style={[{ color: "#fff" }]} >Edit title</Text>
                </TouchableOpacity>
            </View>}

            < Pressable
                onPress={() => setModalVisible(true)}

            >

                <MaterialCommunityIcons name="dots-vertical" color="#ebdae8" size={20} />
            </Pressable >
        </View >
    );
});

/* Screen                                                                     */

export default function MySoundsScreen() {
    const scheme = useColorScheme();
    const c = scheme === "dark" ? DARK : LIGHT;
    const s = useMemo(() => makeStyles(c), [c]);
    const insets = useSafeAreaInsets();
    const [moreoptionsVisisble, setmoreoptionsVisisble] = useState<boolean>(false)
    const theme = useTheme()
    const { user } = useAuthStore()
    const [editing, setEditing] = useState<Sound | null>(null);
    const onEdit = useCallback((item: Sound) => setEditing(item), []);
    /*  infinite query  */

    const query = useInfiniteQuery({
        queryKey: ["sounds", "owner", user?.username],
        queryFn: ({ pageParam }) => fetchSounds(user?.username as string, pageParam),
        initialPageParam: 1,
        getNextPageParam: (last) => (last.pagination.has_next ? last.pagination.page + 1 : undefined),
        // an empty owner makes the API return EVERYONE's sounds, so never fetch without it
        enabled: !!user?.username,
        staleTime:600000
    });

    // Flatten pages and drop duplicates: if a sound is uploaded while the user is
    // scrolling, newest-first pagination can repeat an item across two pages.
    const sounds = useMemo(() => {
        const seen = new Map<string, Sound>();
        query.data?.pages.forEach((p) => p.sounds.forEach((x) => seen.has(x.id) || seen.set(x.id, x)));
        return [...seen.values()];
    }, [query.data]);

    /* ----------------------------- one shared player ----------------------------- */

    const [activeId, setActiveId] = useState<string | null>(null);
    const activeUri = useMemo(
        () => sounds.find((x) => x.id === activeId)?.preview_url ?? null,
        [sounds, activeId]
    );
    const source = useMemo(() => (activeUri ? { uri: activeUri } : null), [activeUri]);
    const player = useAudioPlayer(source);
    const status = useAudioPlayerStatus(player);

    const autoplayRef = useRef(false);
    const playerRef = useRef(player);
    const statusRef = useRef(status);
    const activeIdRef = useRef(activeId);
    const { showNotifToast } = useNotificationToast()
    const { showToast } = useToast()
    playerRef.current = player;
    statusRef.current = status;
    activeIdRef.current = activeId;

    const queryClient = useQueryClient();


    // Applies a change to every cached "sounds" list (My sounds AND the picker)
    const updateSoundsCache = useCallback(
        (fn: (sounds: Sound[]) => Sound[]) => {
            queryClient.setQueriesData<InfiniteData<SoundsPage>>(
                { queryKey: ["sounds"] },
                (old) =>
                    old?.pages
                        ? { ...old, pages: old.pages.map((p) => ({ ...p, sounds: fn(p.sounds) })) }
                        : old // a query with a different shape is left alone
            );
        },
        [queryClient]
    );

    const handleEditTitle = useCallback(
        async (id: string, newTitle: string): Promise<boolean> => {
            const title = newTitle.trim();
            if (!title) {
                showNotifToast("Title can't be empty", "error");
                return false;
            }
            try {
                const res = await api.patch(`/sounds/${id}/`, { title });
                const saved: string = res.data.data;
                // use the server's version of the title, in case it trimmed or changed it
                updateSoundsCache((list) =>
                    list.map((x) => (x.id === id ? { ...x, title: saved } : x))
                );
                showNotifToast("Title updated", "success");
                return true;
            } catch (e: any) {
                showNotifToast(
                    e?.response?.data?.title?.[0] ?? "Couldn't update the title. Try again",
                    "error"
                );
                return false;
            }
        },
        [updateSoundsCache, showNotifToast]
    );
    const handleDelete = useCallback(
        async (id: string) => {
            if (!id) return;

            try {
                await api.delete(`/sounds/${id}/`);

                updateSoundsCache((list) => list.filter((x) => x.id !== id));


                showNotifToast("Sound deleted", "success");
            } catch (e: any) {
                showNotifToast(

                    "Failed to delete. Try again",
                    "error"
                );
            }

        },
        [updateSoundsCache, showToast, showNotifToast]);
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

    // stop when leaving the screen
    useFocusEffect(
        useCallback(() => {
            return () => {
                try {
                    playerRef.current.pause();
                } catch {
                    // already released
                }
            };
        }, [])
    );

    // stable identity, so memoized rows don't re-render on every status tick
    const onToggle = useCallback(async (item: Sound) => {
        if (item.id !== activeIdRef.current) {
            try {
                playerRef.current.pause();
            } catch {
                // already released
            }
            autoplayRef.current = true;
            setActiveId(item.id);
            return;
        }

        const p = playerRef.current;
        const st = statusRef.current;
        if (st.playing) {
            p.pause();
            return;
        }
        // finished: start again from the beginning
        if (st.duration > 0 && st.currentTime >= st.duration - 0.2) {
            await p.seekTo(0);
        }
        p.play();
    }, []);

    const playPct =
        status.duration > 0 ? Math.min(100, Math.round((status.currentTime / status.duration) * 100)) : 0;

    const renderItem = useCallback(
        ({ item }: { item: Sound }) => {
            const isActive = item.id === activeId;
            return (
                <SoundRow
                    item={item}
                    isActive={isActive}
                    isPlaying={isActive && status.playing}
                    isLoading={isActive && !status.isLoaded}
                    progress={isActive ? playPct : 0}
                    onToggle={onToggle}
                    moreoptionsvisible={() => setmoreoptionsVisisble((v) => !v)}
                    c={c}
                    s={s}
                    onEdit={setEditing}
                    onDelete={handleDelete}
                    visible={moreoptionsVisisble}
                />
            );
        },
        [activeId, status.playing, status.isLoaded, playPct, onToggle, c, s]
    );

    /* ---------------------------------- view ---------------------------------- */

    const header = (
        <View
            style={[{ justifyContent: "flex-end", alignItems: "flex-end", paddingRight: 20 }]}
        >

            <Pressable
                onPress={() => router.push("/upload")}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Upload a sound"
            >
                <Ionicons name="add" size={28} color={c.accent} style={[{ fontWeight: "900" }]} />
            </Pressable>


        </View>
    );

    if (!user) {
        return (
            <>
                {header}
                <View style={[s.screen, s.center]}>
                    <Text style={s.message}>Not allowed to view this screen.</Text>
                </View>
            </>
        );
    }

    if (query.isPending) {
        return (
            <>
                {header}
                <View style={[s.screen, s.center]}>
                    <BouncingBarsIndicator color={c.accent} />
                </View>
            </>
        );
    }

    if (query.isError && !query.data) {
        return (
            <>
                {header}
                <View style={[s.screen, s.center]}>
                    <Text style={s.message}>Couldn't load your sounds. Check your connection and try again.</Text>
                    <Pressable style={s.retryBtn} onPress={() => query.refetch()}>
                        <Text style={s.retryText}>Try again</Text>
                    </Pressable>
                </View>
            </>
        );
    }

    return (
        <>
            <SafeAreaView
                style={[s.screen, { backgroundColor: theme.background }]}
                edges={["top"]}
            >


                {header}
                <FlatList
                    data={sounds}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    extraData={`${activeId}|${status.playing}|${status.isLoaded}|${playPct}`}
                    ItemSeparatorComponent={() => <View style={s.separator} />}
                    contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 24 }]}
                    onEndReached={() => {
                        if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
                    }}
                    onEndReachedThreshold={0.4}
                    refreshControl={
                        <RefreshControl
                            refreshing={query.isRefetching && !query.isFetchingNextPage}
                            onRefresh={() => query.refetch()}
                            tintColor={c.accent}
                        />
                    }
                    ListEmptyComponent={
                        <View style={s.center}>
                            <Text style={s.message}>No sounds yet. Tap + to upload your first one.</Text>
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
                <EditTitleModal sound={editing} onClose={() => setEditing(null)} onSave={handleEditTitle} c={c} s={s} />
            </SafeAreaView>
        </>
    );
}

/* Styles (same palette as the upload screen; move it to a shared file)       */

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
        screen: { flex: 1, backgroundColor: c.bg },
        center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 },
        message: { color: c.muted, fontSize: 15, textAlign: "center" },

        listContent: { padding: 16, flexGrow: 1 },
        separator: { height: 10 },
        footer: { paddingVertical: 20, alignItems: "center" },

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
        rowBody: { flex: 1, gap: 3 },
        title: { color: c.text, fontSize: 16, fontWeight: "600" },
        meta: { color: c.muted, fontSize: 13 },

        track: { height: 4, borderRadius: 2, backgroundColor: c.track, overflow: "hidden", marginTop: 4 },
        fill: { height: 4, backgroundColor: c.accent },

        retryBtn: {
            borderWidth: 1.5,
            borderColor: c.accent,
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 22,
        },
        retryText: { color: c.accent, fontSize: 15, fontWeight: "600" },
        backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
        dialog: { backgroundColor: c.card, borderRadius: 16, padding: 20, gap: 14 },
        dialogTitle: { color: c.text, fontSize: 17, fontWeight: "700" },
        input: {
            backgroundColor: c.bg, color: c.text, borderRadius: 12,
            borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
            paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
        },
        dialogActions: { flexDirection: "row", justifyContent: "flex-end", gap: 24 },
        link: { color: c.accent, fontSize: 15, fontWeight: "600" },
    });