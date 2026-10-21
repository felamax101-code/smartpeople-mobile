import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native"
import type { EditState, EditTool, FilterId } from "@/types/ImageEditor"
import { FILTER_OPTIONS } from "./ColorMatrices"
type Props = {
  edits: EditState
  activeTool: EditTool
  onToolChange: (tool: EditTool) => void
  onChange: (edits: EditState) => void
  onCancel: () => void
  onDone: () => void
  doneLabel?: string
  onPrevious?: () => void
  drawColor: string
  onDrawColorChange: (color: string) => void
  textColor: string
  onTextColorChange: (color: string) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  isMessageScreen?:boolean
}

const TOOLS: { id: Exclude<EditTool, null>; label: string }[] = [
  { id: "crop", label: "Crop" },
  { id: "rotate", label: "Rotate" },
  { id: "filter", label: "Filter" },
  { id: "contrast", label: "Contrast" },
  { id: "draw", label: "Draw" },
  { id: "text", label: "Text" },
]

const DRAW_COLORS = ["#ffffff", "#ff3b30", "#ffcc00", "#34c759", "#0a84ff", "#000000"]

export function EditorToolbar({
  edits,
  activeTool,
  onToolChange,
  onChange,
  onCancel,
  onDone,
  doneLabel = "Done",
  onPrevious,
  drawColor,
  onDrawColorChange,
  textColor,
  onTextColorChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isMessageScreen
}: Props) {
  return (
    <View style={styles.container}>
      {/* tool-specific controls */}
      {activeTool === "rotate" && (
        <View style={styles.subRow}>
          <TouchableOpacity
            style={styles.pill}
            onPress={() => onChange({ ...edits, rotation: (edits.rotation + 90) % 360 })}
          >
            <Text style={styles.pillText}>Rotate 90°</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTool === "filter" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subRow}>
          {FILTER_OPTIONS.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.pill, edits.filter === f.id && styles.pillActive,{paddingHorizontal:5,paddingVertical:4}]}
              onPress={() => onChange({ ...edits, filter: f.id as FilterId })}
            >
              <Text style={styles.pillText}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {activeTool === "contrast" && (
        <View style={[styles.subRow, styles.centerRow]}>
          <TouchableOpacity
            style={styles.stepButton}
            onPress={() => onChange({ ...edits, contrast: clamp(edits.contrast - 0.1) })}
          >
            <Text style={styles.stepButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.contrastValue}>{Math.round(edits.contrast * 100)}</Text>
          <TouchableOpacity
            style={styles.stepButton}
            onPress={() => onChange({ ...edits, contrast: clamp(edits.contrast + 0.1) })}
          >
            <Text style={styles.stepButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTool === "draw" && (
        <View style={[styles.subRow, styles.centerRow]}>
          {DRAW_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => onDrawColorChange(c)}
              style={[
                styles.colorSwatch,
                { backgroundColor: c },
                drawColor === c && styles.colorSwatchActive,
              ]}
            />
          ))}
        </View>
      )}

      {activeTool === "text" && (
        <View>
          <View style={[styles.subRow, styles.centerRow]}>
            {DRAW_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => onTextColorChange(c)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  textColor === c && styles.colorSwatchActive,
                ]}
              />
            ))}
          </View>
          <Text style={[styles.hint, { textAlign: "center", marginBottom: 8 }]}>
            Tap anywhere on the photo to add text
          </Text>
        </View>
      )}

      {/* undo/redo — always visible, not tied to which tool is open */}
      <View style={styles.undoRow}>
        <TouchableOpacity onPress={onUndo} disabled={!canUndo} style={styles.undoButton}>
          <Text style={[styles.undoText, !canUndo && styles.undoTextDisabled]}>‹ Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRedo} disabled={!canRedo} style={styles.undoButton}>
          <Text style={[styles.undoText, !canRedo && styles.undoTextDisabled]}>Redo ›</Text>
        </TouchableOpacity>
      </View>

      {/* main tool switcher */}
      <View style={styles.toolRow}>
        {TOOLS.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={styles.toolButton}
            onPress={() => onToolChange(activeTool === t.id ? null : t.id)}
          >
            <Text style={[styles.toolLabel, activeTool === t.id && styles.toolLabelActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity onPress={onCancel} style={styles.actionButton}>
          <Text style={styles.actionText}>Cancel</Text>
        </TouchableOpacity>
        <View style={styles.actionsRight}>
          {onPrevious && (
            <TouchableOpacity onPress={onPrevious} style={styles.actionButton}>
              <Text style={styles.actionText}>Previous</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onDone} style={[styles.actionButton, styles.doneButton]}>
            <Text style={[styles.actionText, styles.doneText]}>{doneLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

function clamp(v: number) {
  return Math.max(-1, Math.min(1, v))
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#111", paddingBottom: 20, paddingTop: 8 },
  subRow: { paddingHorizontal: 12, paddingVertical: 10 },
  centerRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 16 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#2c2c2e",
    marginRight: 8,
  },
  pillActive: { backgroundColor: "#0a84ff" },
  pillText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2c2c2e",
    alignItems: "center",
    justifyContent: "center",
  },
  stepButtonText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  contrastValue: { color: "#fff", fontSize: 15, fontWeight: "600", minWidth: 36, textAlign: "center" },
  colorSwatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: "transparent" },
  colorSwatchActive: { borderColor: "#fff" },
  hint: { color: "#aaa", fontSize: 13 },
  undoRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 32,
    paddingVertical: 1,
  },
  undoButton: { paddingHorizontal: 12, paddingVertical: 0 },
  undoText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  undoTextDisabled: { color: "#4a4a4a" },
  toolRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#333",
  },
  toolButton: { paddingVertical: 4, paddingHorizontal: 8 },
  toolLabel: { color: "#888", fontSize: 12, fontWeight: "600" },
  toolLabelActive: { color: "#0a84ff" },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  actionButton: { paddingHorizontal: 16, paddingVertical: 8 },
  actionsRight: { flexDirection: "row", alignItems: "center" },
  actionText: { color: "#ccc", fontSize: 15, fontWeight: "600" },
  doneButton: { backgroundColor: "#0a84ff", borderRadius: 8 },
  doneText: { color: "#fff" },
})