
import React from "react"
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from "react-native"
import { Category } from "@/types"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"

interface Props {
  categories: Category[]
  selected: string | null   // selected slug
  onSelect: (slug: string | null) => void
}

export const CategoryChips = ({ categories, selected, onSelect }: Props) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={true}
      contentContainerStyle={styles.container}
    >
      {/* All chip — clears filter */}
      <TouchableOpacity
        style={[styles.chip, selected === null && styles.chipActive]}
        onPress={() => onSelect(null)}
        activeOpacity={0.7}
      >
        <Text style={[styles.chipText, selected === null && styles.chipTextActive]}>
          All
        </Text>
      </TouchableOpacity>

      {categories.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          style={[styles.chip, selected === cat.slug && styles.chipActive]}
          onPress={() => onSelect(cat.slug)}
          activeOpacity={0.7}
        >
          {cat.icon && (
            <Text style={styles.chipIcon}>{cat.icon}</Text>
          )}
          <Text style={[
            styles.chipText,
            selected === cat.slug && styles.chipTextActive
          ]}>
            {cat.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    flexDirection: "row",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs ,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray[100],
    borderWidth: 0.1,
    borderColor: Colors.gray[200],
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipIcon: {
    fontSize: 14,
  },
  chipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.white,
    fontWeight: FontWeight.semibold,
  },
})








 