// components/property/FilterModal.tsx

import { useState } from "react"
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native"
import { useTheme } from "@/hooks/useTheme"
import { Radius, Spacing, FontSize, FontWeight } from "@/constants/colors"

export interface ListingFilterValues {
  location?: string
  house_type?: string
  min_price?: string
  max_price?: string
}

interface FilterModalProps {
  visible: boolean
  initialValues: ListingFilterValues
  onClose: () => void
  onReset: () => void

  onApply: (values: ListingFilterValues) => void
}
type RoomType = "single" | "bed_sitter" | "one_bedroom" | "two_bedroom" | "three_plus"


export function FilterModal({ visible, initialValues, onClose, onApply, onReset }: FilterModalProps) {
  const theme = useTheme()

  // local draft state — doesn't touch the real filters until "Apply" is pressed
  const [draft, setDraft] = useState<ListingFilterValues>(initialValues)

  const updateDraft = (field: keyof ListingFilterValues, value: string) => {
    setDraft((d) => ({ ...d, [field]: value }))
  }

  const handleApply = () => {
    onApply(draft)
    onClose()
  }

  const handleReset = () => {
    const cleared: ListingFilterValues = {}
    setDraft(cleared)
    onReset()
    onClose()
  }
  const ROOM_TYPE_OPTIONS: { id: RoomType; label: string }[] = [
    { id: "single", label: "Single Room" },
    { id: "bed_sitter", label: "BedSitter" },
    { id: "one_bedroom", label: "One Bedroom" },
    { id: "two_bedroom", label: "Two Bedroom" },
    { id: "three_plus", label: "Three+ Bedroom" },
  ]
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.textPlaceholder }]}>

          {/* header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Filters</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.closeText, { color: theme.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>

            {/* location */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Location</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.backgroundMuted }]}
              placeholder="e.g. Eldoret, Pipeline, Kapsoya"
              placeholderTextColor={theme.textPrimarylight}
              value={draft.location}
              onChangeText={(t) => updateDraft("location", t)}
            />

            {/* house type */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>House Type</Text>
            <View style={styles.chipRow}>
              {ROOM_TYPE_OPTIONS.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() =>
                    updateDraft("house_type", draft.house_type === type.id ? "" : type.id)
                  }
                  style={[
                    styles.chip,
                    {
                      borderColor: theme.border,
                      backgroundColor:
                        draft.house_type === type.id ? theme.primary : theme.backgroundMuted,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: draft.house_type === type.id ? "#fff" : theme.textPrimary,
                      fontSize: FontSize.sm,
                    }}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* price range */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Price Range (KES)</Text>
            <View style={styles.priceRow}>
              <TextInput
                style={[styles.input, styles.priceInput, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.backgroundMuted }]}
                placeholder="Min"
                placeholderTextColor={theme.textPrimarylight}
                keyboardType="numeric"
                value={draft.min_price}
                onChangeText={(t) => updateDraft("min_price", t)}
              />
              <Text style={{ color: theme.textMuted }}>—</Text>
              <TextInput
                style={[styles.input, styles.priceInput, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.backgroundMuted }]}
                placeholder="Max"
                placeholderTextColor={theme.textPrimarylight}
                keyboardType="numeric"
                value={draft.max_price}
                onChangeText={(t) => updateDraft("max_price", t)}
              />
            </View>

          </ScrollView>

          {/* footer actions */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
              <Text style={{ color: theme.textPrimarylight, fontWeight: "600", fontSize: FontSize.lg }}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApply}
              style={[styles.applyBtn, { backgroundColor: theme.primary }]}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Apply Filters</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "80%",
    borderWidth: 2,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: { fontSize: FontSize.lg, fontWeight: "700" },
  closeText: { fontSize: 30, fontWeight: FontWeight.extrabold },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    fontSize: FontSize.md,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  priceInput: { flex: 1 },
  footer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  resetBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 48,
  },
  applyBtn: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: Radius.md,
  },
})