
import React from "react"
import { View, Text, StyleSheet } from "react-native"
import { PasswordStrength } from "@/hooks/usePasswordStrength"
import { useTheme } from "@/hooks/useTheme"
import { Radius, FontSize, Spacing } from "@/constants/colors"

interface Props {
  strength: PasswordStrength
}

export const PasswordStrengthBar = ({ strength }: Props) => {
  const theme = useTheme()

  if (strength.level === "empty") return null

  // 4 segments — filled based on score
  const segments = [1, 2, 3, 4]

  return (
    
    <View style={styles.container}>
      {/* bar segments */}
      <View style={styles.barRow}>
        {segments.map((segment) => (
          <View
            key={segment}
            style={[
              styles.segment,
              {
                backgroundColor:
                  strength.score >= segment
                    ? strength.color
                    : theme.border,
              },
            ]}
          />
        ))}
      </View>

      {/* label */}
      <Text style={[styles.label, { color: strength.color }]}>
        {strength.label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  barRow: {
    flex: 1,
    flexDirection: "row",
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: Radius.full,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    minWidth: 70,
  },
})







