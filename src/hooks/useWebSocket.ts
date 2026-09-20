

import { useEffect, useRef, useCallback, useState } from "react"
import * as SecureStore from "expo-secure-store"
import { API } from "@/constants/api"
import { Platform } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
type WSStatus = "connecting" | "connected" | "disconnected" | "failed"

// ── Typed event union ─────────────────────────────────────────────────────────
// Add every event type the server can emit so TypeScript catches mismatches.

export type ReaderInfo = {
  user_id: string
  username: string
  avatar: string | null
  read_at: string
}

export type WSEvent =
  | { type: "connected"; data: { heartbeat_interval: number } }
  | { type: "message"; data: any }
  | { type: "typing"; data: { conversation_id: string; user_id: string; is_typing: boolean } }
  // DM read receipt (legacy shape, reader_id present)
  | { type: "read"; data: { message_id: string; reader_id: string; read_at: string } }
  // Group read receipt (readers array present)
  | { type: "read"; data: { message_id: string; readers: ReaderInfo[] } }
  | { type: "online"; data: { user_id: string } }
  | { type: "offline"; data: { user_id: string } }
  | { type: "offer_update"; data: { message_id: string; offer_data: any } }
  | { type: "new_conversation"; data: any }
  // NEW ↓
  | { type: "message_deleted"; data: { message_id: string; conversation_id: string; deleted_by: string } }
  | { type: "group_member_added"; data: { conversation_id: string; added_user_ids: string[]; added_usernames: string[]; added_by: string } }
  | { type: "group_member_removed"; data: { conversation_id: string; removed_user_id: string; removed_by: string } }
  | { type: "group_updated"; data: { conversation_id: string; group_name: string; group_avatar: string | null; updated_by: string } }
  | { type: "pong" }

interface Options {
  userId: string
  onEvent: (event: WSEvent) => void
}

const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 3000, 5000] // ms — exponential-ish back-off

export const useWebSocket = ({ userId, onEvent }: Options) => {
  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isUnmountedRef = useRef(false)
  // Keep a stable ref to onEvent so connect() doesn't recreate on every render
  const onEventRef = useRef(onEvent)
  useEffect(() => { onEventRef.current = onEvent }, [onEvent])

  const [status, setStatus] = useState<WSStatus>("connecting")

  const connect = useCallback(async () => {
    if (isUnmountedRef.current) return
    const platform = Platform.OS


    const getToken = async() => {
      if (platform === 'web') { return AsyncStorage.getItem("access_token") }
      return SecureStore.getItemAsync("access_token")
    }
    const token = await getToken()
    if (!token) return

    setStatus("connecting")

    const url = `${API.WS_BASE_URL}/ws/${userId}/?token=${token}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (isUnmountedRef.current) return
      setStatus("connected")
      retryCountRef.current = 0
    }

    ws.onmessage = (event) => {
      if (isUnmountedRef.current) return
      try {
        const parsed = JSON.parse(event.data) as WSEvent
        onEventRef.current(parsed)

        // configure heartbeat once the server tells us the interval
        if (parsed.type === "connected") {
          const interval = parsed.data.heartbeat_interval * 1000
          if (heartbeatRef.current !== null) clearInterval(heartbeatRef.current)
          heartbeatRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }))
            }
          }, interval)
        }
      } catch {
        // ignore malformed server messages
      }
    }

    ws.onclose = () => {
      if (isUnmountedRef.current) return
      if (heartbeatRef.current !== null) clearInterval(heartbeatRef.current)

      if (retryCountRef.current < MAX_RETRIES) {
        setStatus("disconnected")
        const delay = RETRY_DELAYS[retryCountRef.current]
        retryCountRef.current += 1
        retryTimeoutRef.current = setTimeout(connect, delay)
      } else {
        setStatus("failed")
      }
    }

    ws.onerror = () => ws.close()
  }, [userId]) // onEvent intentionally omitted — we use the ref above

  const retry = useCallback(() => {
    retryCountRef.current = 0
    connect()
  }, [connect])

  const sendTyping = useCallback((conversationId: string, isTyping: boolean) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "typing",
        data: { conversation_id: conversationId, is_typing: isTyping },
      }))
    }
  }, [])

  // Subscribe to a conversation whose channel wasn't open when WS connected
  // (newly created DM or group — server will start forwarding events)
  const subscribeToConversation = useCallback((conversationId: string) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "subscribe",
        data: { conversation_id: conversationId },
      }))
    }
  }, [])

  useEffect(() => {
    if (!userId) return
    isUnmountedRef.current = false
    connect()

    return () => {
      isUnmountedRef.current = true
      if (heartbeatRef.current !== null) clearInterval(heartbeatRef.current)
      if (retryTimeoutRef.current !== null) clearTimeout(retryTimeoutRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { status, retry, sendTyping, subscribeToConversation }
}


