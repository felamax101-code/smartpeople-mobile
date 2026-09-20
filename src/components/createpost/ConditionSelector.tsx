

import React from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { useTheme } from "@/hooks/useTheme"
import { ProductCondition } from "@/services/listing.service"
import { Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"

interface Props {
  selected: ProductCondition
  onChange: (condition: ProductCondition) => void
}

const OPTIONS: { value: ProductCondition; label: string; icon: string }[] = [
  { value: "new", label: "New", icon: "✨" },
  { value: "used", label: "Used", icon: "📦" },
  { value: "refurbished", label: "Refurbished", icon: "🔧" },
]

export const ConditionSelector = ({ selected, onChange }: Props) => {
  const theme = useTheme()

  return (
    <View style={styles.container}>
      {OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.pill,
            {
              backgroundColor:
                selected === opt.value ? theme.primary : theme.surfaceSecondary,
              borderColor:
                selected === opt.value ? theme.primary : theme.border,
            },
          ]}
          onPress={() => onChange(opt.value)}
          activeOpacity={0.8}
        >
          <Text style={styles.pillIcon}>{opt.icon}</Text>
          <Text style={[
            styles.pillText,
            { color: selected === opt.value ? "#fff" : theme.textSecondary }
          ]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  pillIcon: { fontSize: 16 },
  pillText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
})








