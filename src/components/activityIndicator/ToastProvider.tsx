import  { createContext, useContext, useState, ReactNode } from "react"
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native"

//  Types 

interface ToastOptions {
  title: string
  message: string
  onConfirm?: () => void
  onCancel?: () => void
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void
  hideToast: () => void
}

//  Context ─

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within a ToastProvider")
  return ctx
}

//  Provider 

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false)
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [onConfirm, setOnConfirm] = useState<(() => void) | undefined>(undefined)
  const [onCancel, setOnCancel] = useState<(() => void) | undefined>(undefined)

  const showToast = ({ title, message, onConfirm, onCancel }: ToastOptions) => {
    setTitle(title)
    setMessage(message)
    // wrap in functions so React doesn't treat them as state updaters
    setOnConfirm(() => onConfirm)
    setOnCancel(() => onCancel)
    setVisible(true)
  }

  const hideToast = () => setVisible(false)

  const handleConfirm = () => {
    onConfirm?.()
    hideToast()
  }

  const handleCancel = () => {
    onCancel?.()
    hideToast()
  }

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <CustomAlert
        visible={visible}
        title={title}
        message={message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ToastContext.Provider>
  )
}

//  CustomAlert (presentational) 

interface CustomAlertProps {
  visible: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

function CustomAlert({ visible, title, message, onConfirm, onCancel }: CustomAlertProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
              <Text style={styles.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

//  Styles ──

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "85%",
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 24,
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  message: { color: "#ccc", fontSize: 14, marginBottom: 20 },
  buttonRow: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  cancelText: { color: "#888", fontWeight: "600" },
  confirmBtn: {
    backgroundColor: "#6C5CE7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  confirmText: { color: "#fff", fontWeight: "600" },
})

//  Usage 
//
// 1. Wrap your app (alongside your other providers):
//
//   <ToastProvider>
//     <App />
//   </ToastProvider>
//
// 2. Trigger from anywhere:
//
//   const { showToast } = useToast()
//
//   showToast({
//     title: "Delete post?",
//     message: "This can't be undone.",
//     onConfirm: () => { /* delete logic */ },
//     onCancel: () => {},
//   })
