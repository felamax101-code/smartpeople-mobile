




import React from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  
} from "react-native"
import { useTheme } from "@/hooks/useTheme"
import { Spacing, FontSize, FontWeight } from "@/constants/colors"

interface Props {
  icon: React.ReactNode
  label: string
  sublabel?: string
  onPress?: () => void
  showArrow?: boolean
  rightElement?: React.ReactNode
  isDestructive?: boolean
  disabled?: boolean
}

export const SettingsRow = ({
  icon,
  label,
  sublabel,
  onPress,
  showArrow = true,
  rightElement,
  isDestructive = false,
  disabled = false,
}: Props) => {
  const theme = useTheme()

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: theme.border }]}
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
    >
      {/* icon */}
      <View style={[styles.iconBox, { backgroundColor: theme.surfaceSecondary }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      {/* label */}
      <View style={styles.labelBox}>
        <Text style={[
          styles.label,
          {
            color: isDestructive ? theme.error : theme.textPrimary,
          },
        ]}>
          {label}
        </Text>
        {sublabel && (
          <Text style={[styles.sublabel, { color: theme.textPrimarylight }]}>
            {sublabel}
          </Text>
        )}
      </View>

      {/* right */}
      {rightElement ?? (
        showArrow && onPress && (
          <Text style={[styles.arrow, { color: theme.textMuted }]}>›</Text>
        )
      )}
    </TouchableOpacity>
  )
}

export const SettingsSectionHeader = ({ title }: { title: string }) => {
  const theme = useTheme()
  return (
    <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>
      {title}
    </Text>
  )
}

export const SettingsSectionCard = ({ children }: { children: React.ReactNode }) => {
  const theme = useTheme()
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  icon: { fontSize: 18 },
  labelBox: { flex: 1, gap: 2 },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  sublabel: {
    fontSize: FontSize.xs,
  },
  arrow: {
    fontSize: 22,
    fontWeight: FontWeight.bold,
  },
  sectionHeader: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    textTransform: "uppercase",
  },
  card: {
    marginHorizontal: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
})







