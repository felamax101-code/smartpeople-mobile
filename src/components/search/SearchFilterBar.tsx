


import React, { useState } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
  Switch,
} from "react-native"
import { useTheme } from "@/hooks/useTheme"
import { FeedFilters, SortOption,  } from "@/types"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"

interface Props {
  filters: Omit<FeedFilters, "search" | "page">
  onFiltersChange: (filters: Omit<FeedFilters, "search" | "page">) => void
  resultCount: number
}

const SORT_OPTIONS: { value: SortOption; label: string; icon: string }[] = [
  { value: "newest", label: "Newest", icon: "" },
  { value: "most_upvoted", label: "Popular", icon: "" },
  { value: "most_viewed", label: "Most Viewed", icon: "" },

]

const CONDITION_OPTIONS: { value: any; label: string }[] = [
  { value: "new", label: "New" },
  { value: "used", label: "Used" },
  { value: "refurbished", label: "Refurbished" },
]

export const SearchFilterBar = ({ filters, onFiltersChange, resultCount }: Props) => {
  const theme = useTheme()
  const [sheetVisible, setSheetVisible] = useState(false)
  const [localFilters, setLocalFilters] = useState(filters)

  const activeFilterCount = [
    filters.condition,
    filters.min_price,
    filters.max_price,
    filters.negotiable,
  ].filter(Boolean).length

  const applyFilters = () => {
    onFiltersChange(localFilters)
    setSheetVisible(false)
  }

  const resetFilters = () => {
    const reset = { sort: filters.sort }
    setLocalFilters(reset)
    onFiltersChange(reset)
    setSheetVisible(false)
  }

  return (
    <>
      {/* ── inline filter bar  */}
      <View style={[styles.bar, { borderBottomColor: theme.border }]}>
        {/* result count */}
        <Text style={[styles.resultCount, { color: theme.textSecondary }]}>
          {resultCount.toLocaleString()} results
        </Text>
    <View
    style={[{flexDirection:"row"}]}
    >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {/* sort chips */}
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    filters.sort === opt.value
                      ? theme.primary
                      : theme.surfaceSecondary,
                  borderColor:
                    filters.sort === opt.value
                      ? theme.primary
                      : theme.border,
                },
              ]}
              onPress={() =>
                onFiltersChange({ ...filters, sort: opt.value })
              }
            >
              <Text style={styles.chipIcon}>{opt.icon}</Text>
              <Text style={[
                styles.chipText,
                {
                  color:
                    filters.sort === opt.value
                      ? "#fff"
                      : theme.textSecondary,
                }
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
          </ScrollView>

          {/* filter button
          <TouchableOpacity
            style={[
              styles.chip,
              styles.filterChip,
              {
                backgroundColor:
                  activeFilterCount > 0
                    ? theme.primary
                    : theme.surfaceSecondary,
                borderColor:
                  activeFilterCount > 0
                    ? theme.primary
                    : theme.border,
              },
            ]}
            onPress={() => {
              setLocalFilters(filters)
              setSheetVisible(true)
            }}
          >
            <Text style={styles.chipIcon}>⚙️</Text>
            <Text style={[
              styles.chipText,
              {
                color:
                  activeFilterCount > 0 ? "#fff" : theme.textSecondary,
              },
            ]}>
              Filters
              {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Text>
          </TouchableOpacity> */}
          </View>
        
      </View>

      {/* ── filter bottom sheet  */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetVisible(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setSheetVisible(false)}
        />
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />

          {/* header */}
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>
              Filter Results
            </Text>
            <TouchableOpacity onPress={resetFilters}>
              <Text style={[styles.resetText, { color: theme.error }]}>
                Reset
              </Text>
            </TouchableOpacity>
          </View>

          {/* condition */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>
              Condition
            </Text>
            <View style={styles.conditionRow}>
              <TouchableOpacity
                style={[
                  styles.conditionPill,
                  {
                    backgroundColor:
                      !localFilters.condition
                        ? theme.primary
                        : theme.surfaceSecondary,
                    borderColor:
                      !localFilters.condition
                        ? theme.primary
                        : theme.border,
                  },
                ]}
                onPress={() =>
                  setLocalFilters((f) => ({ ...f, condition: undefined }))
                }
              >
                <Text style={[
                  styles.conditionPillText,
                  { color: !localFilters.condition ? "#fff" : theme.textSecondary }
                ]}>
                  All
                </Text>
              </TouchableOpacity>

              {CONDITION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.conditionPill,
                    {
                      backgroundColor:
                        localFilters.condition === opt.value
                          ? theme.primary
                          : theme.surfaceSecondary,
                      borderColor:
                        localFilters.condition === opt.value
                          ? theme.primary
                          : theme.border,
                    },
                  ]}
                  onPress={() =>
                    setLocalFilters((f) => ({ ...f, condition: opt.value }))
                  }
                >
                  <Text style={[
                    styles.conditionPillText,
                    {
                      color:
                        localFilters.condition === opt.value
                          ? "#fff"
                          : theme.textSecondary,
                    },
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* negotiable */}
          <View style={styles.filterSection}>
            <View style={styles.toggleRow}>
              <View>
                <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>
                  Negotiable only
                </Text>
                <Text style={[styles.filterSub, { color: theme.textMuted }]}>
                  Show only negotiable listings
                </Text>
              </View>
              <Switch
                value={!!localFilters.negotiable}
                onValueChange={(v) =>
                  setLocalFilters((f) => ({ ...f, negotiable: v || undefined }))
                }
                trackColor={{ true: theme.primary, false: theme.border }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* apply button */}
          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: theme.primary }]}
            onPress={applyFilters}
          >
            <Text style={styles.applyButtonText}>
              Apply Filters
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  bar: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.xs,
    // flexDirection:"r"
  },
  resultCount: {
    fontSize: FontSize.xs,
    paddingHorizontal: Spacing.md,
  },
  chips: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    flexDirection: "row",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  filterChip: {
    // position:"absolute",
    // left:300,
    // bottom:0,
    // zIndex:10

  },
  chipIcon: { fontSize: 7 },
  chipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.regular,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.sm,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sheetTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  resetText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  filterSection: {
    gap: Spacing.sm,
  },
  filterLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.3,
  },
  filterSub: {
    fontSize: FontSize.xs,
  },
  conditionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  conditionPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  conditionPillText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  applyButton: {
    height: 52,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  applyButtonText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
})











