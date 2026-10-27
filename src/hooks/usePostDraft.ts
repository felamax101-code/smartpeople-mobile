import { useCallback, useEffect, useRef } from "react"
import { Alert, AppState } from "react-native"
import * as Crypto from "expo-crypto"
import { useFocusEffect, useNavigation } from "expo-router"
import { useDraftStore } from "@/hooks/drafts.store"
import type { SelectedSound } from "@/components/createpost/SoundModal"

type Args<F> = {
  screen: "feed"|"sp"|"community"
  mediaType: "image" | "video" | "text"
  uris: string[]
  form: F
  sound: SelectedSound | null | undefined
  hasContent: boolean
  /** reset ALL screen state (step, form, uris, sound, errors...) */
  onReset: () => void
}

export function usePostDraft<F extends object>({
  screen, mediaType, uris, form, sound, hasContent, onReset,
}: Args<F>) {
  const navigation = useNavigation()
  const { saveDraft, removeDraft } = useDraftStore()

  const draftIdRef = useRef(Crypto.randomUUID())
  const allowLeaveRef = useRef(false)
  const skipAutosaveRef = useRef(false)

  // always the latest values, so callbacks never read stale closures
  const latestRef = useRef({ mediaType, uris, form, sound, hasContent })
  latestRef.current = { mediaType, uris, form, sound, hasContent }
  const onResetRef = useRef(onReset)
  onResetRef.current = onReset

  const buildDraft = useCallback(
    (reason: "manual" | "autosave" | "upload_failed") => {
      const s = latestRef.current
      return {
        id: draftIdRef.current,
        mediaType: s.mediaType,
        uris: [...s.uris],
        form: { ...s.form },
        sound: s.sound ?? null,
        reason,
        screen,
      }
    },
    [screen]
  )

  const saveCurrentDraft = useCallback(
    (reason: "manual" | "autosave") => saveDraft(buildDraft(reason) as any),
    [saveDraft, buildDraft]
  )

  /** reset the screen and start a fresh draft id */
  const resetAll = useCallback(() => {
    draftIdRef.current = Crypto.randomUUID()
    onResetRef.current()
  }, [])

  const askToSaveDraft = useCallback(
    (proceed: () => void) => {
      Alert.alert("Save as draft?", "You can finish this post later.", [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: async () => {
            skipAutosaveRef.current = true
            await removeDraft(draftIdRef.current)
            resetAll()
            skipAutosaveRef.current = false
            proceed()
          },
        },
        {
          text: "Save draft",
          onPress: async () => {
            skipAutosaveRef.current = true
            await saveCurrentDraft("manual")
            resetAll()
            skipAutosaveRef.current = false
            proceed()
          },
        },
      ], { cancelable: true })
    },
    [removeDraft, saveCurrentDraft, resetAll]
  )

  // prompt before leaving the screen (header back, swipe, router.back)
  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", (e: any) => {
      if (allowLeaveRef.current || !latestRef.current.hasContent) return
      e.preventDefault()
      Alert.alert("Save as draft?", "You can finish this post later.", [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: async () => {
            await removeDraft(draftIdRef.current)
            allowLeaveRef.current = true
            navigation.dispatch(e.data.action)
          },
        },
        {
          text: "Save draft",
          onPress: async () => {
            await saveCurrentDraft("manual")
            allowLeaveRef.current = true
            navigation.dispatch(e.data.action)
          },
        },
      ])
    })
    return unsub
  }, [navigation, saveCurrentDraft, removeDraft])

  // autosave when the screen loses focus
  useFocusEffect(
    useCallback(() => {
      skipAutosaveRef.current = false
      return () => {
        if (latestRef.current.hasContent && !skipAutosaveRef.current && !allowLeaveRef.current) {
          saveCurrentDraft("autosave")
        }
      }
    }, [saveCurrentDraft])
  )

  // autosave when the app goes to background
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active" && latestRef.current.hasContent && !skipAutosaveRef.current && !allowLeaveRef.current) {
        saveCurrentDraft("autosave")
      }
    })
    return () => sub.remove()
  }, [saveCurrentDraft])

  return {
    draftIdRef,
    allowLeaveRef,
    skipAutosaveRef,
    buildDraft,
    saveDraft,
    removeDraft,
    saveCurrentDraft,
    askToSaveDraft,
    resetAll,
  }
}