import { useCallback, useEffect, useRef } from "react"
import { AppState } from "react-native"
import { useFocusEffect } from "expo-router"
import { feedService } from "@/services/feed.service"

const MIN_SECONDS = 0.8        // ignore flicks shorter than this (they stay buffered and add up)
const HEARTBEAT_MS = 10_000    // report every 10s while a post stays on screen

/**
 * Measures how long a post is really being looked at and reports it to the recommender.
 * Counts time only while: the post is visible AND the screen is focused AND the app is in the foreground.
 *
 * @param postId       post.id
 * @param isVisible    your existing visibility flag
 * @param enabled      false for guests and for non-recommended feeds (e.g. isSP)
 * @param getDuration  optional: video length in seconds, if the player knows it
 */
export function useWatchTime(
  postId: string,
  isVisible: boolean,
  enabled: boolean,
  getDuration?: () => number | undefined,
) {
  const visible = useRef(isVisible)
  const focused = useRef(true)
  const appActive = useRef(AppState.currentState === "active")
  const startedAt = useRef<number | null>(null)   // when the current visible stretch began
  const pending = useRef(0)                       // measured seconds not yet sent
  const enabledRef = useRef(enabled)
  const durationRef = useRef(getDuration)
  enabledRef.current = enabled
  durationRef.current = getDuration

  const flush = useCallback(() => {
    const running = startedAt.current !== null ? (Date.now() - startedAt.current) / 1000 : 0
    const seconds = pending.current + running
    if (seconds < MIN_SECONDS) return
    pending.current = 0
    if (startedAt.current !== null) startedAt.current = Date.now()
    if (!enabledRef.current) return
    try {
      Promise.resolve(feedService.recordWatch(postId, seconds, durationRef.current?.())).catch(() => { })
    } catch { /* never let analytics break the feed */ }
  }, [postId])

  const sync = useCallback(() => {
    const active = enabledRef.current && visible.current && focused.current && appActive.current
    if (active && startedAt.current === null) {
      startedAt.current = Date.now()
    } else if (!active && startedAt.current !== null) {
      pending.current += (Date.now() - startedAt.current) / 1000
      startedAt.current = null
      flush()
    }
  }, [flush])

  // visibility (or enabled) changed
  useEffect(() => {
    visible.current = isVisible
    sync()
  }, [isVisible, enabled, sync])

  // screen focus: pause while another screen (post detail, profile...) is on top of the feed
  useFocusEffect(
    useCallback(() => {
      focused.current = true
      sync()
      return () => {
        focused.current = false
        sync()
      }
    }, [sync]),
  )

  // app foreground/background + heartbeat + final flush on unmount
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      appActive.current = state === "active"
      sync()
    })
    const timer = setInterval(() => {
      if (startedAt.current !== null) flush()
    }, HEARTBEAT_MS)
    return () => {
      sub.remove()
      clearInterval(timer)
      visible.current = false
      sync()
      flush()
    }
  }, [sync, flush])
}