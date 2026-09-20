import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useMutation } from "@tanstack/react-query";
import axios from "axios"; // swap this for your configured axios instance, e.g. `import api from "../lib/axios"`
import api from "@/services/api";
type HelpCenterModalProps = {
  visible: boolean;
  onClose: () => void;
};

async function submitHelpRequest(message: string) {
  const response = await api.post("/help/", {
    description: message,
  });
  return response.data;
}

export default function HelpCenterModal({ visible, onClose }: HelpCenterModalProps) {
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: submitHelpRequest,
    onSuccess: () => {
      setMessage("");
      onClose();
    },
  });

  const handleSubmit = () => {
    if (!message.trim()) return;
    mutation.mutate(message.trim());
  };

  const handleClose = () => {
    setMessage("");
    mutation.reset();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Help Center</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={10}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Tell us what you need help with and we&apos;ll get back to you.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Describe your issue..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={5}
            value={message}
            onChangeText={setMessage}
            editable={!mutation.isPending}
          />

          {mutation.isError && (
            <Text style={styles.errorText}>
              Something went wrong. Please try again.
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!message.trim() || mutation.isPending) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!message.trim() || mutation.isPending}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  card: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  closeText: {
    fontSize: 18,
    color: "#6b7280",
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 16,
    fontSize: 14,
    color: "#6b7280",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 12,
    minHeight: 120,
    textAlignVertical: "top",
    fontSize: 15,
    color: "#111827",
  },
  errorText: {
    marginTop: 8,
    color: "#dc2626",
    fontSize: 13,
  },
  submitButton: {
    marginTop: 16,
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  submitText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});