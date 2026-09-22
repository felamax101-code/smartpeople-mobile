import { useState, useEffect } from "react"
import { Modal, View, TextInput, TouchableOpacity, Text, StyleSheet } from "react-native"

type Props = {
  visible: boolean
  initialValue?: string
  onSubmit: (text: string) => void
  onCancel: () => void
}

export function TextInputModal({ visible, initialValue = "", onSubmit, onCancel }: Props) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    if (visible) setValue(initialValue)
  }, [visible, initialValue])

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            placeholder="Add text"
            placeholderTextColor="#888"
            autoFocus
            multiline
          />
          <View style={styles.row}>
            <TouchableOpacity onPress={onCancel} style={styles.button}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onSubmit(value.trim())}
              style={[styles.button, styles.primaryButton]}
              disabled={!value.trim()}
            >
              <Text style={[styles.buttonText, styles.primaryButtonText]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#1c1c1e",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  input: {
    color: "#fff",
    fontSize: 18,
    minHeight: 60,
    maxHeight: 160,
  },
  row: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: "#0a84ff",
  },
  buttonText: {
    color: "#ccc",
    fontWeight: "600",
  },
  primaryButtonText: {
    color: "#fff",
  },
})