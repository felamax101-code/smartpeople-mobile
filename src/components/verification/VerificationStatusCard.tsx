

import React from "react"
import { View, Text, StyleSheet } from "react-native"
import { useTheme } from "@/hooks/useTheme"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"

type Status =
  | "not_submitted"
  | "pending"
  | "approved"
  | "rejected"
  | "exhausted"
  | "expired"

interface Props {
  status: Status
  rejectionReason?: string | null
  attemptsRemaining?: number
  reviewedAt?: string | null
}

const STATUS_CONFIG: Record<Status, {
  icon: string
  color: string
  bgColor: string
  title: string
  subtitle: (props: Props) => string
}> = {
  not_submitted: {
    icon: "🦧",
    color: "#6B7280",
    bgColor: "#F3F4F6",
    title: "No identity document submitted",
    subtitle: () => "Submit your documents to unlock higher trust levels",
  },
  pending: {
    icon: "🦧³",
    color: Colors.warning,
    bgColor: "#FEF3C7",
    title: "Under Review",
    subtitle: ({ attemptsRemaining }) =>
      `Our team is reviewing your documents. Usually within 24 hours. (${attemptsRemaining} attempts remaining)`,
  },
  approved: {
    icon: "🦧",
    color: Colors.success,
    bgColor: "#D1FAE5",
    title: "Verified",
    subtitle: ({ reviewedAt }) =>
      `Approved on ${reviewedAt
        ? new Date(reviewedAt).toLocaleDateString("en-KE", {
            day: "numeric", month: "short", year: "numeric"
          })
        : "📘"}`,
  },
  rejected: {
    icon: "👺",
    color: Colors.error,
    bgColor: "#FEE2E2",
    title: "Rejected",
    subtitle: ({ rejectionReason }) =>
      rejectionReason ?? "Please resubmit with valid documents",
  },
  exhausted: {
    icon: "💀",
    color: Colors.error,
    bgColor: "#FEE2E2",
    title: "Max Attempts Reached",
    subtitle: () => "You have used all 5 attempts. Contact support to unlock.",
  },
  expired: {
    icon: "👹",
    color: Colors.warning,
    bgColor: "#FEF3C7",
    title: "Document Expired",
    subtitle: () => "Your verified document has expired. Please resubmit with a valid document.",
  },
}

export const VerificationStatusCard = ({
  status,
  rejectionReason,
  attemptsRemaining,
  reviewedAt,
}: Props) => {
  const theme = useTheme()
  const config = STATUS_CONFIG[status]

  const props = { status, rejectionReason, attemptsRemaining, reviewedAt }

  return (
    <View style={[
      styles.card,
      {
        backgroundColor: config.bgColor,
        borderColor: config.color,
      }
    ]}>
      <Text style={styles.cardIcon}>{config.icon}</Text>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: config.color }]}>
          {config.title}
        </Text>
        <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
          {config.subtitle(props)}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  cardIcon: { fontSize: 28 },
  cardContent: { flex: 1, gap: 4 },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  cardSub: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
})









