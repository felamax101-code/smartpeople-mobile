import { useState, useEffect, useRef } from "react"
import api from "@/services/api"

type Status = "idle" | "checking" | "available" | "taken" | "invalid"

export const useUsernameCheck = (username: string) => {
  const [status, setStatus] = useState<Status>("idle")
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    const trimmedUsername=username?.trim() || "";
    // clear previous timer
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!trimmedUsername || trimmedUsername.length < 3) {
      setStatus("idle")
      return
    }

    // validate format — alphanumeric + underscore only
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      setStatus("invalid")
      return
    }

    // debounce — wait 500ms after user stops typing before checking
    setStatus("checking")
    debounceRef.current = setTimeout(async () => {
      try {
        // check if username exists by fetching public profile
        // 404 = available, 200 = taken
        await api.get(`/users/${trimmedUsername}/`)
        setStatus("taken")
      } catch (error: any) {
        if (error?.response?.status === 404) {
          setStatus("available")
        } else {
          setStatus("idle")
        }
      }
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [username])

  // human readable hint for FormInput
  const hint = {
    idle: undefined,
    checking: undefined,
    available: "✓ Username available",
    taken: undefined,
    invalid: undefined,
  }[status]

  const error = {
    idle: undefined,
    checking: undefined,
    available: undefined,
    taken: "Username is already taken",
    invalid: "Only letters, numbers and underscores allowed",
  }[status]

  return { status, hint, error }
}