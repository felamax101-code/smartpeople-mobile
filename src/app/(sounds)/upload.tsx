// app/sounds/upload.tsx  (any route path works, this is an Expo Router page)
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    useColorScheme,
} from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system"; // SDK 54+ API
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import api from "@/services/api";
import { useNotificationToast } from "@/components/activityIndicator/ToastNotification";
import { useToast } from "@/components/activityIndicator/ToastProvider";
import { useTheme } from "@/hooks/useTheme";
import { FontSize, Radius, FontWeight } from "@/constants/colors";
import { NativeEventEmitter, NativeModules } from "react-native";
import { showEditor } from "react-native-video-trim";
import { Background } from "expo-router/build/react-navigation";

/* Constants (kept in sync with the Django SoundUploadSerializer)             */
const TRIM_OUTPUT_EXT = "m4a"; // output format after trimming
const DRAFTS_KEY = "sound_upload_drafts_v1";
const ALLOWED_EXT = [".mp3", ".m4a", ".wav", ".ogg", ".flac", ".aac"];
const MAX_BYTES = 20 * 1024 * 1024;
const MIN_SECONDS = 1000;
const MAX_SECONDS = 240000;

const MIME_BY_EXT: Record<string, string> = {
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
    ".aac": "audio/aac",
};

/* Types                                                                      */
type PickedFile = {
    uri: string;
    name: string;
    mimeType: string;
    size?: number;
    /** Set once the file has been copied into the drafts folder. */
    storedName?: string;
};

type Draft = {
    id: string;
    title: string;
    fileName: string; // original name, shown in the UI and sent to the server
    storedName: string; // name inside the drafts folder (never store absolute URIs)
    mimeType: string;
    size?: number;
    updatedAt: number;
};

/* Draft storage helpers                                                      */

// Only the file NAME is saved in AsyncStorage. On iOS the app container path can
// change after an update, so the full URI is rebuilt from this folder each time.
const draftsDir = new Directory(Paths.document, "sound-drafts");
const storedFile = (storedName: string) => new File(draftsDir, storedName);

function copyIntoDrafts(srcUri: string, storedName: string) {
    if (!draftsDir.exists) draftsDir.create({ intermediates: true });
    const dest = storedFile(storedName);
    if (dest.exists) dest.delete();
    new File(srcUri).copy(dest);
}

function removeStored(storedName: string) {
    try {
        const f = storedFile(storedName);
        if (f.exists) f.delete();
    } catch {
        // nothing to clean up
    }
}

async function readDrafts(): Promise<Draft[]> {
    try {
        const raw = await AsyncStorage.getItem(DRAFTS_KEY);
        return raw ? (JSON.parse(raw) as Draft[]) : [];
    } catch {
        return [];
    }
}

/* Small utilities                                                            */

const extOf = (name: string) => {
    const i = name.lastIndexOf(".");
    return i >= 0 ? name.slice(i).toLowerCase() : "";
};

const makeId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;



const fmtTime = (sec: number) => {
    const t = Math.max(0, Math.floor(sec || 0));
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

const fmtSize = (bytes?: number) => {
    if (!bytes) return "";
    return bytes < 1024 * 1024
        ? `${Math.round(bytes / 1024)} KB`
        : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fmtDate = (ts: number) =>
    new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function extractError(e: any): string {
    const code = e?.response?.status;
    if (code === 429) return "You've reached the upload limit. Try again later.";
    if (code === 413) return "The server rejected this file as too large. Choose a smaller one.";
    //   if (code === 401) return "Your session expired. Sign in again to upload.";
    if (!e?.response) return "Couldn't reach the server. Check your connection and try again.";

    const d = e.response.data;
    const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);
    const msg = first(d?.file) ?? first(d?.title) ?? first(d?.detail) ?? first(d?.message);
    return typeof msg === "string" ? msg : "The upload failed. Try again.";
}

/* Screen                                                                     */

export default function UploadSoundScreen() {
    const { showNotifToast } = useNotificationToast()
    const { showToast } = useToast()
    const theme = useTheme()
    const insets = useSafeAreaInsets();
    const queryclient = useQueryClient()
    const scrollRef = useRef<ScrollView>(null);
    const autoplayRef = useRef(false);
    const abortRef = useRef<AbortController | null>(null);

    const [file, setFile] = useState<PickedFile | null>(null);
    const [title, setTitle] = useState("");
    const [draftId, setDraftId] = useState<string | null>(null);
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [draftsLoaded, setDraftsLoaded] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0); // 0..1
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    /* ----------------------------- audio preview ----------------------------- */

    const source = useMemo(() => (file ? { uri: file.uri } : null), [file?.uri]);
    const player = useAudioPlayer(source);
    const status = useAudioPlayerStatus(player);

    const playerRef = useRef(player);
    playerRef.current = player;

    useEffect(() => {
        setAudioModeAsync({ playsInSilentMode: true }).catch(() => { });
    }, []);

    // Start playing as soon as a freshly picked file has loaded.
    useEffect(() => {
        if (status.isLoaded && autoplayRef.current) {
            autoplayRef.current = false;
            player.play();
        }
    }, [status.isLoaded, player]);

    // Stop the preview when the user leaves this screen.
    useFocusEffect(
        useCallback(() => {
            return () => {
                try {
                    playerRef.current.pause();
                } catch {
                    // player already released
                }
            };
        }, [])
    );

    const togglePlay = async () => {
        if (status.playing) {
            player.pause();
            return;
        }
        // after reaching the end, restart from the beginning
        if (status.duration > 0 && status.currentTime >= status.duration - 0.2) {
            await player.seekTo(0);
        }
        player.play();
    };

    /*  drafts  */

    useEffect(() => {
        readDrafts().then((list) => {
            setDrafts(list);
            setDraftsLoaded(true);
        });
    }, []);

    const commitDrafts = async (next: Draft[]) => {
        setDrafts(next);
        await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(next));
    };
    const trimmedRef = useRef<string | null>(null);

    const discardTrimmed = useCallback(() => {
        const path = trimmedRef.current;
        trimmedRef.current = null;
        if (!path) return;
        try {
            const f = new File(path);
            if (f.exists) f.delete();
        } catch {
            // already gone
        }
    }, []);

    const resetForm = () => {
        setFile(null);
        setTitle("");
          discardTrimmed();
        setDraftId(null);
        setProgress(0);
    };

    const saveDraft = async () => {
        if (!file || uploading) return;
        setError(null);
        setNotice(null);
        try {
            const id = draftId ?? makeId();
            let storedName = file.storedName;

            if (!storedName) {
                storedName = `${id}${extOf(file.name)}`;
                copyIntoDrafts(file.uri, storedName);
            }

            // the user swapped the file of an existing draft: drop the old copy
            const previous = drafts.find((d) => d.id === id);
            if (previous && previous.storedName !== storedName) removeStored(previous.storedName);

            const draft: Draft = {
                id,
                title: title.trim(),
                fileName: file.name,
                storedName,
                mimeType: file.mimeType,
                size: file.size,
                updatedAt: Date.now(),
            };

            await commitDrafts([draft, ...drafts.filter((d) => d.id !== id)]);
            setDraftId(id);
            // keep file.uri as is, changing it would restart the preview
            setFile({ ...file, storedName });
            setNotice("Draft saved.");
        } catch {
            setError("Couldn't save the draft. Check that your device has free storage and try again.");
        }
    };
    /* ------------------------------ audio editing ------------------------------ */

    const applyTrimmed = useCallback((outputPath: string) => {
        const uri = outputPath.startsWith("file://") ? outputPath : `file://${outputPath}`;
        let size: number | undefined;
        try {
            size = new File(uri).size;
        } catch {
            size = undefined;
        }
if (trimmedRef.current && trimmedRef.current !== uri) discardTrimmed();
trimmedRef.current = uri;
        setFile((prev) => {
            if (!prev) return prev;
            const base = prev.name.replace(/\.[^.]+$/, "");
            return {
                uri,
                name: `${base}.${TRIM_OUTPUT_EXT}`,
                mimeType: MIME_BY_EXT[`.${TRIM_OUTPUT_EXT}`] ?? "audio/mp4",
                size,
                storedName: undefined, // forces a fresh copy if the user saves a draft
            };
        });
        autoplayRef.current = true; // preview the trimmed result
        setError(null);
        setNotice("Audio trimmed. Preview it, then upload or save a draft.");
    }, [discardTrimmed]);

    useEffect(() => {
        const emitter = new NativeEventEmitter(NativeModules.VideoTrim);
        const subs = [
            emitter.addListener("onFinishTrimming", (e: any) => {
                if (e?.outputPath) applyTrimmed(e.outputPath);
            }),
            emitter.addListener("onError", () => {
                setError("Couldn't edit this audio. Try a different file.");
            }),
        ];
        return () => subs.forEach((sub) => sub.remove());
    }, [applyTrimmed]);

    const editAudio = () => {
        if (!file || uploading) return;
        player.pause();
        setError(null);
        setNotice(null);
        showEditor(file.uri, {
            type: "audio",
            outputExt: TRIM_OUTPUT_EXT,
            minDuration: MIN_SECONDS,
            maxDuration: MAX_SECONDS,
            saveToPhoto: false,
            enableSaveDialog: false,
            saveButtonText:"Done",
            cancelDialogTitle:"Cancel editing?",
            cancelDialogMessage:"Your changes wil notbe applied",
            trimmingText: 'Applying audio edits...',

        });
    };
    const openDraft = (d: Draft) => {
        if (uploading) return;
        const f = storedFile(d.storedName);
        if (!f.exists) {
            setError("The audio file for this draft is missing. Delete the draft and choose the file again.");
            return;
        }
        autoplayRef.current = false; // drafts open paused
        setError(null);
        setNotice(null);
        setDraftId(d.id);
        discardTrimmed();
        // setTitle(d.title);
        setFile({
            uri: f.uri,
            name: d.fileName.slice(0, 80),
            mimeType: d.mimeType,
            size: d.size,
            storedName: d.storedName,
        });
        scrollRef.current?.scrollTo({ y: 0, animated: true });
    };

    const deleteDraft = async (d: Draft) => {
        if (d.id === draftId) resetForm();
        removeStored(d.storedName);
        await commitDrafts(drafts.filter((x) => x.id !== d.id));
    };

    const confirmDelete = (d: Draft) => {
        if (uploading) return;
        showToast({
            title: "Delete this draft?",
            message: "The saved audio file is removed from your device too.",
            onConfirm: () => deleteDraft(d)
        })

    };

    /* --------------------------------- pick --------------------------------- */

    const pickFile = async () => {
        if (uploading) return;
        setError(null);
        setNotice(null);

        const res = await DocumentPicker.getDocumentAsync({
            type: "audio/*",
            copyToCacheDirectory: true,
        });
        if (res.canceled) return;

        const a = res.assets[0];
        const ext = extOf(a.name);
        if (!ALLOWED_EXT.includes(ext)) {
            setError("Unsupported format. Choose an mp3, m4a, wav, ogg, flac or aac file.");
            return;
        }
        if (a.size && a.size > MAX_BYTES) {
            setError("This file is over 20 MB. Choose a smaller one.");
            return;
        }
discardTrimmed();
        autoplayRef.current = true;
        setFile({
            uri: a.uri,
            name: a.name,
            mimeType: a.mimeType ?? MIME_BY_EXT[ext] ?? "audio/mpeg",
            size: a.size,
        });
        // setTitle((prev) => (prev.trim() ? prev : prettyTitle(a.name)));
    };

    /*  upload  */

    const validate = (): string | null => {
        if (!file) return "Choose an audio file first.";
        if (!title.trim()) return "Add a title so people can find this sound.";
        if (file.size && file.size > MAX_BYTES) return "This file is over 20 MB. Choose a smaller one.";
        if (status.isLoaded && status.duration > 0) {
            if ((status.duration * 1000) < MIN_SECONDS) return "Sounds must be at least 1 second long.";
            if ((status.duration * 1000)> MAX_SECONDS) return "Sounds can be at most 10 minutes long.";
        }
        return null;
    };

    const upload = async () => {
        if (!file || uploading) return;
        const problem = validate();
        if (problem) {
            setError(problem);
            return;
        }

        player.pause();
        setError(null);
        setNotice(null);
        setProgress(0);
        setUploading(true);

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const form = new FormData();
            const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp3";
            form.append("title", title.trim());
            form.append("file", {
                uri: file.storedName ? storedFile(file.storedName).uri : file.uri,
                name: `sounmd_${Date.now()}.${ext}`,
                type: file.mimeType,
            } as any);

            await api.post("/sounds/upload/", form, {
                headers: { "Content-Type": "multipart/form-data" },
                signal: controller.signal,
                onUploadProgress: (e) => {
                    if (e.total) setProgress(e.loaded / e.total);
                },
            });

            // success: the draft (if any) is no longer needed
            if (draftId) {
                const d = drafts.find((x) => x.id === draftId);
                if (d) removeStored(d.storedName);
                await commitDrafts(drafts.filter((x) => x.id !== draftId));
            }
            resetForm();
            showNotifToast("Sound uploaded. It's now available in the sound picker.", "success");
            queryclient.invalidateQueries({ queryKey: ["sounds", "owner"] })
        } catch (e: any) {

            if (e?.code === "ERR_CANCELED") {
                setNotice("Upload canceled. Your file and title are still here.");
            } else {
                setError(extractError(e));
            }
        } finally {
            abortRef.current = null;
            setUploading(false);
        }
    };

    /* --------------------------------- view --------------------------------- */

    const playPct =
        status.duration > 0 ? Math.min(100, Math.round((status.currentTime / status.duration) * 100)) : 0;
    const uploadPct = Math.round(progress * 100);

    const fileMeta = file
        ? [fmtSize(file.size), status.isLoaded ? fmtTime(status.duration) : ""].filter(Boolean).join(", ")
        : "";

    return (
        <>
            <Stack.Screen options={{ title: "Upload sound" }} />
            <SafeAreaView
                style={[s.screen, { backgroundColor: theme.background }]}
                edges={["top"]}
            >
                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32, backgroundColor: theme.background }]}
                    keyboardShouldPersistTaps="handled"
                    automaticallyAdjustKeyboardInsets
                >
                    {/* File and preview */}
                    {!file ? (
                        <Pressable style={[s.pickArea, { backgroundColor: theme.backgroundMuted, borderColor: theme.textPlaceholder }]} onPress={pickFile}>
                            <Ionicons name="musical-notes-outline" size={30} color={theme.success} />
                            <View
                                style={[{ backgroundColor: theme.primary, paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.md }]}
                            ><Text style={[s.pickTitle, { color: theme.textPrimary }]}>Choose an audio file</Text></View>
                            <Text style={[s.muted, { color: theme.textPrimarylight }]}>mp3, m4a, wav, ogg, flac or aac. Up to 20 MB and 10 minutes.</Text>
                        </Pressable>
                    ) : (
                        <View style={[s.card, { backgroundColor: theme.backgroundMuted, borderColor: theme.textPlaceholder }]}>
                            <Text style={[s.fileName, { color: theme.primary }]} numberOfLines={1}>
                                {file.name}
                            </Text>
                            {!!fileMeta && <Text style={[s.muted, { color: theme.success }]}>{fileMeta}</Text>}

                            <View style={[s.playerRow]}>
                                <Pressable
                                    onPress={togglePlay}
                                    style={[s.playBtn, { backgroundColor: "#0bb6f5" }]}
                                    accessibilityRole="button"
                                    accessibilityLabel={status.playing ? "Pause preview" : "Play preview"}
                                >
                                    <Ionicons name={status.playing ? "pause" : "play"} size={26} color={theme.textMuted} />
                                </Pressable>
                                <View style={[s.playerBody, { backgroundColor: theme.inputBackground, borderColor: "#0bb6f5" }]}>
                                    <View style={[s.track, { backgroundColor: "#fff" }]}>
                                        <View style={[s.fill, { width: `${playPct}%` }, { backgroundColor: "#0bb6f5" }]} />
                                    </View>
                                    <View style={s.rowBetween}>
                                        <Text style={[s.time, { color: theme.primary }]}>{fmtTime(status.currentTime)}</Text>
                                        <Text style={[s.time, { color: theme.primary }]}>{status.isLoaded ? fmtTime(status.duration) : "Loading"}</Text>
                                    </View>
                                </View>
                            </View>

                            <Pressable onPress={pickFile} disabled={uploading} hitSlop={8}>
                                <Text style={[s.link, uploading && s.disabled, { color: theme.primary }]}>Choose a different file</Text>
                            </Pressable>
                        </View>
                    )}
                    {/* Optional audio editing */}
                    <Pressable
                        onPress={editAudio}
                        disabled={!file || uploading}
                        style={[
                            s.editBtn,
                            (!file || uploading) && s.disabled,
                            { borderColor: theme.borderFocus },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Trim or edit audio"
                    >
                        {/* <Ionicons name="cut-outline" size={18} color={theme.primary} /> */}
                        <Text style={[s.link, { color: theme.primary }]}>Trim/edit audio to the most catchy part</Text>
                        <Text style={[s.muted, { color: theme.textPrimarylight }]}>(optional)</Text>
                    </Pressable>
                    {/* Title */}
                    <Text style={[s.label, { color: theme.textPrimary }]}>Title<Text style={[{ color: theme.textPrimarylight, fontSize: FontSize.sm, marginLeft: 4 }]}>(Use a relevant name)</Text></Text>
                    <TextInput
                        style={[s.input, { borderColor: theme.textPlaceholder, backgroundColor: theme.inputBackgroundFocus, color: theme.textPrimary }]}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Name this sound"
                        placeholderTextColor={theme.textPrimarylight}
                        maxLength={100}
                        editable={!uploading}
                        returnKeyType="done"
                    />

                    {/* Upload progress */}
                    {uploading && (
                        <View style={[s.card, { backgroundColor: theme.backgroundMuted, borderColor: theme.borderMuted }]}>
                            <View style={s.rowBetween}>
                                <Text style={[s.body, { color: theme.textPrimarylight }]}>{progress < 1 ? "Uploading" : "Processing on the server"}</Text>
                                <Text style={[s.body, { color: theme.textPrimarylight }]}>{uploadPct}%</Text>
                            </View>
                            <View style={[s.track, { backgroundColor: "#fff" }]}>
                                <View style={[s.fill, { width: `${uploadPct}%`, backgroundColor: theme.primary }]} />
                            </View>
                            <Pressable onPress={() => abortRef.current?.abort()} hitSlop={8}>
                                <Text style={[s.link, { color: theme.primary }]}>Cancel upload</Text>
                            </Pressable>
                        </View>
                    )}

                    {!!error && <Text style={[s.error, { color: theme.ALLwarning }]}>{error}</Text>}
                    {!!notice && <Text style={[s.notice, { color: theme.ALLwarning }]}>{notice}</Text>}
                    <Text style={[s.notice, { color: theme.textPrimary }]}>By uploading your sound ,you agree to our<Text onPress={() => router.push(`/agreement`)} style={[s.notice, { color: theme.primary }]}>[Sounds and music upload terms and copyright policy]</Text></Text>
                    {/* Actions */}
                    <View style={s.actions}>
                        <Pressable
                            style={[s.btn, s.btnSecondary, (!file || uploading) && s.disabled, { borderColor: theme.borderFocus }]}
                            onPress={saveDraft}
                            disabled={!file || uploading}
                        >
                            <Text style={[s.btnSecondaryText, { color: theme.textPrimary }]}>{draftId ? "Update draft" : " Save as  draft"}</Text>
                        </Pressable>
                        <Pressable
                            style={[s.btn, s.btnPrimary, (!file || uploading) && s.disabled, { backgroundColor: theme.primary }]}
                            onPress={upload}
                            disabled={!file || uploading}
                        >
                            <Text style={[s.btnPrimaryText, { color: theme.textPrimary }]}>Upload</Text>
                        </Pressable>
                    </View>
                    <Pressable
                        style={[s.btn, s.btnPrimary, { backgroundColor: theme.primary }]}
                        onPress={() => router.push(`/mysounds`)}
                    >
                        <Text style={[s.btnPrimaryText, { color: theme.textPrimary }]}>See your uploaded sounds</Text>
                    </Pressable>
                    {/* Drafts */}
                    <Text style={[s.sectionTitle, { color: theme.primary }]}>Drafts</Text>
                    {draftsLoaded && drafts.length === 0 && (
                        <Text style={[s.muted, { color: theme.textPrimarylight }]}>
                            No drafts yet. Choose a file and tap Save draft to finish it later.
                        </Text>
                    )}
                    {drafts.map((d) => (
                        <Pressable
                            key={d.id}
                            style={[s.draftRow, d.id === draftId && s.draftRowActive, { backgroundColor: theme.backgroundMuted, borderColor: theme.textMuted }]}
                            onPress={() => openDraft(d)}
                        >
                            <View style={s.draftText}>
                                <Text style={[s.draftTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                                    {d.title || "No title"}
                                </Text>
                                <Text style={[s.muted, { color: theme.textPrimarylight }]} numberOfLines={1}>
                                    {d.fileName}
                                </Text>
                                <Text style={[s.muted, { color: theme.primary }]}>Saved {fmtDate(d.updatedAt)}</Text>
                            </View>
                            <Pressable
                                onPress={() => confirmDelete(d)}
                                hitSlop={12}
                                accessibilityRole="button"
                                accessibilityLabel="Delete draft"
                            >
                                <Ionicons name="trash-outline" size={20} color={theme.ALLwarning} />
                            </Pressable>
                        </Pressable>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </>
    );
}





const s =
    StyleSheet.create({
        screen: { flex: 1 },
        content: { padding: 16, gap: 12 },

        pickArea: {
            alignItems: "center",
            gap: 6,
            paddingVertical: 32,
            paddingHorizontal: 20,
            borderRadius: 14,
            borderWidth: 1.5,
            borderStyle: "dashed",

        },
        pickTitle: { fontSize: 17, fontWeight: "600" },

        card: {
            borderRadius: 14,
            borderWidth: StyleSheet.hairlineWidth,
            padding: 16,
            gap: 10,
        },
        fileName: { fontSize: 16, fontWeight: "600" },

        playerRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 4 },
        playBtn: {
            width: 56,
            height: 56,
            borderRadius: 28,

            alignItems: "center",
            justifyContent: "center",
        },
        playerBody: { flex: 1, gap: 6, borderWidth: 2, borderRadius: Radius.md, padding: 5 },
        track: { height: 6, borderRadius: 3, overflow: "hidden" },
        fill: { height: 6, },
        time: { fontSize: 12, fontVariant: ["tabular-nums"] },

        label: { fontSize: 14, fontWeight: "600", marginTop: 4 },
        input: {

            borderRadius: 12,
            borderWidth: StyleSheet.hairlineWidth,

            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
        },

        rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
        body: { fontSize: 14 },
        muted: { fontSize: 13 },
        link: { fontSize: 14, fontWeight: "600" },
        error: { fontSize: 14 },
        notice: { fontSize: 14 },

        actions: { flexDirection: "row", gap: 12, marginTop: 4 },
        btn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
        btnPrimary: {},
        btnPrimaryText: { fontSize: 16, fontWeight: "700" },
        btnSecondary: { borderWidth: 1.5, },
        btnSecondaryText: { fontSize: 16, fontWeight: "700" },
        disabled: { opacity: 0.4 },

        sectionTitle: { fontSize: 18, fontWeight: "700", marginTop: 20 },
        draftRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            borderRadius: 12,
            borderWidth: StyleSheet.hairlineWidth,
            padding: 14,
        },
        draftRowActive: {},
        draftText: { flex: 1, gap: 2 },
        draftTitle: { fontSize: 15, fontWeight: "600" },
        editBtn: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderWidth: 1.5,
            borderRadius: 12,
            paddingVertical: 12,
        },
    });