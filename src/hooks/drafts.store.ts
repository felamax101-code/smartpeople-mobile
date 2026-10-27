import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import AsyncStorage from "@react-native-async-storage/async-storage"
// SDK 54+: the classic API lives at "expo-file-system/legacy".
// On SDK 53 or older, use "expo-file-system" instead.
import * as FileSystem from "expo-file-system/legacy"
import { SelectedSound } from "@/components/createpost/SoundModal"

export interface PostDraft {
  id: string
  mediaType: "image" | "video" | "text"
  files: string[] // file NAMES inside the draft folder, not full paths
  form: { name: string; description: string; category: string; location: string }
  sound: SelectedSound | null
  reason: "manual" | "autosave" | "upload_failed"
  updatedAt: number
  uris?:string[]
  screen:"feed"|"sp"|"community"
  community_slug?:string|null
}

// what callers pass in: real URIs; the store converts them to file names
export type DraftInput = Omit<PostDraft, "files" | "updatedAt"> & { uris: string[] }

const draftDir = (id: string) => `${FileSystem.documentDirectory}drafts/${id}/`

// turn stored file names back into usable URIs (call this when resuming)
export const resolveDraftUris = (d: PostDraft): string[] =>
  d.files.map((f) => draftDir(d.id) + f)

async function persistDraftMedia(id: string, uris: string[]): Promise<string[]> {
  const dir = draftDir(id)
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {})

  const names: string[] = []
  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i]

    // already inside the draft folder from an earlier save: keep as is
    if (uri.startsWith(dir)) {
      names.push(uri.slice(dir.length))
      continue
    }

    const ext = uri.split("?")[0].split(".").pop() || "jpg"
    const name = `media_${i}_${Date.now()}.${ext}`
    try {
      await FileSystem.copyAsync({ from: uri, to: dir + name })
      names.push(name)
    } catch (e) {
      console.warn("[drafts] could not copy", uri, e) // source gone or unreadable
    }
  }

  // delete files from older saves that are no longer part of this draft
  try {
    const existing = await FileSystem.readDirectoryAsync(dir)
    await Promise.all(
      existing
        .filter((f) => !names.includes(f))
        .map((f) => FileSystem.deleteAsync(dir + f, { idempotent: true }))
    )
  } catch {}

  return names
}

interface DraftState {
  drafts: PostDraft[]
  saveDraft: (d: DraftInput) => Promise<void>
  removeDraft: (id: string) => Promise<void>
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      drafts: [],

      saveDraft: async ({ uris, ...rest }) => {
        const files = await persistDraftMedia(rest.id, uris)
        const draft: PostDraft = { ...rest, files, updatedAt: Date.now() }
        set((s) => ({
          drafts: [draft, ...s.drafts.filter((x) => x.id !== draft.id)],
        }))
      },

      removeDraft: async (id) => {
        await FileSystem.deleteAsync(draftDir(id), { idempotent: true }).catch(() => {})
        set((s) => ({ drafts: s.drafts.filter((x) => x.id !== id) }))
      },
    }),
    {
      name: "post-drafts",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)