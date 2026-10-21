import React from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { router } from "expo-router";
const APP_NAME = "SmartPipla";
const SUPPORT_EMAIL = "helpcenter@smartpipla.com";
const LAST_UPDATED = "14th October 2026";

const SECTIONS = [
  {
    title: "1. Overview",
    body: [
      `This page explains who owns the sounds and music you upload to ${APP_NAME}, how others may use them, and how you can earn from that use. By uploading content, you agree to these terms.`,
    ],
  },
  {
    title: "2. Ownership",
    body: [
      "You keep ownership of any sound or music you upload (\"Your Content\"). Uploading does not transfer ownership of your content to us or to other users.",
      "You may only upload content that you created yourself or that you have full permission to share and license. Do not upload content that belongs to someone else.",
    ],
  },
  {
    title: "3. License you give when you upload",
    body: [
      `When you upload Your Content, you automatically grant ${APP_NAME} and its users a worldwide, non-exclusive, royalty-free license to use, play, copy, adapt, and reuse Your Content within ${APP_NAME}, including in videos, posts, and other creations made by other users.`,
      "This permission applies automatically from the moment of upload. Because it is non-exclusive, you are free to use or license Your Content elsewhere.",
      `We may also host, store, process, and display Your Content as needed to run and promote ${APP_NAME}.`,
    ],
  },
  {
    title: "4. Reuse by other users",
    body: [
      "Other users may include Your Content in what they create, as long as they use it through the features we provide.",
      "Other users do not receive ownership of Your Content. They may not resell it on its own or claim it as theirs.",
    ],
  },
  {
    title: "5. Earnings",
    body: [
      "You may earn money based on how Your Content is used on the platform. How earnings are calculated, the minimum payout, and the payment schedule will be set out in our payout terms and may change over time.",
      "We may withhold or reverse earnings in cases of fraud, artificial usage, or a copyright claim against Your Content.",
    ],
  },
  {
    title: "6. Copyright and your promises to us",
    body: [
      "By uploading, you confirm that:",
      "- You own Your Content or have all rights needed to license it as described above.",
      "- Your Content does not infringe any copyright, trademark, or other right of any person.",
      "- Your Content does not contain samples, loops, or recordings from others unless you have clear permission.",
      "You are responsible for any claim that arises from content you upload.",
    ],
  },
  {
    title: "7. Copyright complaints and takedowns",
    body: [
      `If you believe content on ${APP_NAME} infringes your copyright, contact us at ${SUPPORT_EMAIL} with details of the work, where it appears, and proof that you own it.`,
      "We may remove or disable content that is reported or that we believe breaks these terms, and we may suspend accounts that repeatedly infringe.",
    ],
  },
  {
    title: "8. Removing your content",
    body: [
      "You can delete Your Content at any time. After deletion, it will no longer be available for new use.",
      "Content already included in other users' creations before deletion may remain in those creations. [To be confirmed at review.]",
    ],
  },
  {
    title: "9. Changes to these terms",
    body: [
      "We may update this page from time to time. If changes are significant, we will let you know in the app. Continued use after an update means you accept the new terms.",
    ],
  },
  {
    title: "10. Contact",
    body: [`Questions about ownership, licensing, or copyright: ${SUPPORT_EMAIL}`],
  },
];

export default function CreatorRightsScreen() {
    const theme=useTheme()
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator
      >
        <TouchableOpacity
        onPress={()=>router.back()}
        >
                        <MaterialCommunityIcons name="arrow-left-thick" color={theme.primary} size={30} />
            
        </TouchableOpacity>
        {/* <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Placeholder text. This page is a draft and will be reviewed before
            release.
          </Text>
        </View> */}

        <Text style={styles.title}>Ownership, Licensing and Copyright</Text>
        <Text style={styles.meta}>Last updated: {LAST_UPDATED}</Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.heading}>{section.title}</Text>
            {section.body.map((paragraph, i) => (
              <Text key={i} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  notice: {
    backgroundColor: "#FFF4D6",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  noticeText: {
    color: "#5C4600",
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: "#6B6B6B",
    marginBottom: 24,
  },
  section: {
    marginBottom: 22,
  },
  heading: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111111",
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333333",
    marginBottom: 8,
  },
});