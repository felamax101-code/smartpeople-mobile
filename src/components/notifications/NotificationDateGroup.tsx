



import React from "react"
import { View, Text, StyleSheet } from "react-native"
import { useTheme } from "@/hooks/useTheme"
import { Spacing, FontSize, FontWeight } from "@/constants/colors"

interface Props {
  label: string  // "Today", "Yesterday", "May 20"
}

export const NotificationDateGroup = ({ label }: Props) => {
  const theme = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.label, { color: theme.textMuted }]}>
        ● {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.3,
  },
})









