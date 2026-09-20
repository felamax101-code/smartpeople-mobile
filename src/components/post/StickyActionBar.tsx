
import React from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native"
import { useTheme } from "@/hooks/useTheme"
import { Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"

interface Props {
  isOwner: boolean
  onMessage: () => void
  onBuyNow: () => void
  onEdit?: () => void
  onDelete?: () => void
  messageButtonDisabled:boolean
}

export const StickyActionBar = ({
  isOwner,
  onMessage,
  onBuyNow,
  onEdit,
  onDelete,
  messageButtonDisabled,
}: Props) => {
  const theme = useTheme()

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: theme.surface,
        borderTopColor: theme.border,
      }
    ]}>
      {isOwner ? (
        // seller sees edit + delete
        <>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { borderColor: theme.border }]}
            onPress={onDelete}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryText, { color: theme.error }]}>
              🗑️ Delete
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={onEdit}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryText}>✏️ Edit Listing</Text>
          </TouchableOpacity>
        </>
      ) : (
        // buyer sees message + buy now
        <>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { borderColor: theme.primary ,opacity:messageButtonDisabled? 0.5:1}]}
            onPress={onMessage}
            activeOpacity={0.8}
            disabled={messageButtonDisabled}
          >
            <Text style={[styles.secondaryText, { color: theme.primary }]}>
              💬 Message Seller
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={onBuyNow}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryText}>Buy Now</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {},
  secondaryButton: {
    borderWidth: 1.5,
  },
  primaryText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  secondaryText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
})









