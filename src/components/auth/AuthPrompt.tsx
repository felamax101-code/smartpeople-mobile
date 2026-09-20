
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native"
import { router } from "expo-router"
import { Image } from "expo-image"
import { useAuthStore } from "@/stores/auth.store"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"


export const AuthPrompt = () => {
  const {
    isAuthPromptVisible,
    authPromptMessage,
    hideAuthPrompt,
  } = useAuthStore()

  const handleRegister = () => {
    hideAuthPrompt()
    router.push("/(auth)/register")
  }

  const handleLogin = () => {
    hideAuthPrompt()
    router.push("/(auth)/login")
  }

  return (
    <Modal
      visible={isAuthPromptVisible}
      transparent
      animationType="slide"
      onRequestClose={hideAuthPrompt}
    >
      {/* backdrop — tap to dismiss */}
      <Pressable style={styles.backdrop} onPress={hideAuthPrompt} />

      <View style={styles.sheet}>
        {/* drag handle */}
        <View style={styles.handle} />

       

          <Image
          source={require("../../assets/images/icon-192.png")}
          style={[{width:10}]}
          contentFit="cover"
          />
       

        {/* contextual message */}
        <Text style={styles.title}>{authPromptMessage}</Text>
        <Text style={styles.subtitle}>
          Create a free account to interact with listings, message sellers, and more.
        </Text>

        {/* register CTA — primary */}
        <TouchableOpacity
          style={styles.registerButton}
          onPress={handleRegister}
          activeOpacity={0.85}
        >
          <Text style={styles.registerButtonText}>Create Account</Text>
        </TouchableOpacity>

        {/* login link */}
        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          activeOpacity={0.7}
        >
          <Text style={styles.loginButtonText}>
            Already have an account?{" "}
            <Text style={styles.loginLink}>Log in</Text>
          </Text>
        </TouchableOpacity>

        {/* dismiss */}
        <TouchableOpacity onPress={hideAuthPrompt} style={styles.dismissButton}>
          <Text style={styles.dismissText}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
    alignItems: "center",
    gap: Spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray[300],
    marginBottom: Spacing.sm,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  registerButton: {
    width: "100%",
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: Radius.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  registerButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  loginButton: {
    paddingVertical: Spacing.sm,
  },
  loginButtonText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  loginLink: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  dismissButton: {
    paddingVertical: Spacing.sm,
  },
  dismissText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
})









