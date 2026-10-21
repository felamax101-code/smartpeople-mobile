import { createContext, useContext, useRef, useState, useCallback } from "react"
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export type ToastType = "default" | "success" | "error"

export interface ToastState {
  message: string
  type: ToastType
}

interface ToastContextValue {
  showNotifToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const { width: SCREEN_WIDTH } = Dimensions.get("window")
const DISPLAY_DURATION = 2000 // how long the toast stays fully visible

export const ToastNotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const insets = useSafeAreaInsets()
  const [toast, setToast] = useState<ToastState | null>(null)
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(20)).current
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showNotifToast = useCallback((message: string, type: ToastType = "default") => {
    if (hideTimer.current) clearTimeout(hideTimer.current)

    setToast({ message, type })

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start()

    hideTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 20, duration: 600, useNativeDriver: true }),
      ]).start(() => setToast(null))
    }, DISPLAY_DURATION)
  }, [opacity, translateY])

  return (
    <ToastContext.Provider value={{ showNotifToast }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wrapper,
            {
              bottom: insets.bottom + 24,
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View
            style={[
              styles.toast,
              toast.type === "success" && styles.success,
              toast.type === "error" && styles.error,
            ]}
          >
            <Text style={styles.text} numberOfLines={2}>
              {toast.message}
            </Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  )
}

export const useNotificationToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within a ToastProvider")
  return ctx
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  toast: {
    maxWidth: SCREEN_WIDTH * 0.85,
    backgroundColor: "rgba(30, 30, 30, 0.92)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  success: {
    backgroundColor: "rgba(34, 197, 94, 0.95)",
  },
  error: {
    backgroundColor: "rgba(239, 68, 68, 0.95)",
  },
  text: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
  },
})