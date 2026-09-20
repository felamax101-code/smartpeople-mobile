

import React, { useState } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native"
import { useTheme } from "@/hooks/useTheme"
import { Post } from "@/types"
import { Spacing, Radius, FontSize, FontWeight, Colors } from "@/constants/colors"

const DESCRIPTION_LIMIT = 150  // chars before "read more"

interface Props {
  post: Post
}

export const PostDetails = ({ post }: Props) => {
  const theme = useTheme()
  const [expanded, setExpanded] = useState(false)

  const isLong = post.description.length > DESCRIPTION_LIMIT
  const displayedDescription =
    expanded || !isLong
      ? post.description
      : post.description.slice(0, DESCRIPTION_LIMIT) + "..."
  const formatTimeAgo = (dateString: string): string => {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(dateString).toLocaleDateString()
}
  // table rows for details section
  const details = [
    { label: "Category", value: post.category.name },
    { label: "Name", value: post.name },
    { label: "Price", value: post.price },
    { label: "Condition", value: post.condition },
    {
      label: "Posted",
      value: formatTimeAgo(post.created_at)
    },
    { label: "Views", value: post.views_count.toLocaleString() },
    ...(post.location_display
      ? [{ label: "Location", value: post.location_display }]
      : []),
  ]

  return (
    <View style={styles.container}>

      {/* ── description ──────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Description
        </Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {displayedDescription}
        </Text>
        {isLong && (
          <TouchableOpacity onPress={() => setExpanded((v) => !v)}>
            <Text style={[styles.readMore, { color: theme.primary }]}>
              {expanded ? "Show less" : "Read more"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── details table ─────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Details
        </Text>
        <View style={[styles.table, { borderColor: theme.border }]}>
          {details.map((row, index) => (
            <View
              key={row.label}
              style={[
                styles.tableRow,
                {
                  borderBottomColor: theme.border,
                  borderBottomWidth: index < details.length - 1 ? 1 : 0,
                  backgroundColor:
                    index % 2 === 0
                      ? theme.surfaceSecondary
                      : theme.surface,
                },
              ]}
            >
              <Text style={[styles.tableLabel, { color: theme.textSecondary }]}>
                {row.label}
              </Text>
              <Text style={[styles.tableValue, { color: theme.textPrimary }]}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      </View>

    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.2,
  },
  description: {
    fontSize: FontSize.md,
    lineHeight: 24,
  },
  readMore: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  table: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  tableLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  tableValue: {
    flex: 2,
    fontSize: FontSize.sm,
    textTransform: "capitalize",
  },
})











