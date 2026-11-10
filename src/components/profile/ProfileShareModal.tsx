// components/ShareModal.tsx
import React, { useState } from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useShareStore } from "@/hooks/usePostlinkDraftStore";
type ShareModalProps = {
  isVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  postLink: string;
};

export default function ShareModal({ isVisible, setModalVisible, postLink }: ShareModalProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const close = () => {
    setModalVisible(false);
    setCopied(false);
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(postLink);
    setCopied(true);
    setTimeout(close, 800); // brief "Copied!" feedback, then close
  };

  const handleSendToFriend = () => {
    useShareStore.getState().startShare(postLink);
    close();
    router.navigate("/messages");
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={close} // Android back button
    >
      {/* Tapping the dark area closes the modal */}
      <Pressable style={styles.backdrop} onPress={close}>
        {/* Inner Pressable stops taps on the sheet from closing it */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            onPress={handleCopy}
          >
            <Text style={styles.buttonText}>{copied ? "Copied!" : "Copy link"}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.button, styles.primary, pressed && styles.pressed]}
            onPress={handleSendToFriend}
          >
            <Text style={[styles.buttonText, styles.primaryText]}>Send to a friend</Text>
          </Pressable>

          <Pressable style={styles.cancel} onPress={close}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ddd",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#f1f1f1",
    alignItems: "center",
    marginBottom: 12,
  },
  primary: {
    backgroundColor: "#2563eb",
  },
  pressed: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111",
  },
  primaryText: {
    color: "#fff",
  },
  cancel: {
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    color: "#666",
  },
});