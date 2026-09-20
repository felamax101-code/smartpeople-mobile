

import React from "react"
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
} from "react-native"
import { useTheme } from "@/hooks/useTheme"
import { Radius, Spacing, FontSize, FontWeight } from "@/constants/colors"

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  sublabel?: string
}

export const Checkbox = ({ checked, onChange, label, sublabel }: Props) => {
  const theme = useTheme()

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onChange(!checked)}
      activeOpacity={0.7}
    >
      {/* box */}
      <View style={[
        styles.box,
        {
          backgroundColor: checked ? theme.primary : "transparent",
          borderColor: checked ? theme.primary : theme.border,
        }
      ]}>
        {checked && (
          <Text style={styles.checkmark}>✓</Text>
        )}
      </View>

      {/* labels */}
      <View style={styles.labelContainer}>
        <Text style={[styles.label, { color: theme.textPrimary }]}>
          {label}
        </Text>
        {sublabel && (
          <Text style={[styles.sublabel, { color: theme.textSecondary }]}>
            {sublabel}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: Radius.sm,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,  // optical alignment with text
  },
  checkmark: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
  labelContainer: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  sublabel: {
    fontSize: FontSize.sm,
  },
})









