


import React, { useState } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from "react-native"
import { useTheme } from "@/hooks/useTheme"
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"

interface OfferData {
  amount: number
  currency: string
  status: "pending" | "accepted" | "declined" | "countered"
  counter_amount?: number
}

interface Props {
  messageId: string
  offerData: OfferData
  isOwn: boolean
  isRead: boolean       // did current user send this offer?
  onRespond: (
    messageId: string,
    action: "accepted" | "declined" | "countered",
    counterAmount?: number

  ) => void
}



const STATUS_CONFIG = {
  pending: { color: Colors.warning, icon: "💰", label: "Pending" },
  accepted: { color: Colors.success, icon: "✅", label: "Accepted" },
  declined: { color: Colors.error, icon: "❌", label: "Declined" },
  countered: { color: "#8B5CF6", icon: "↩️", label: "Counter Offer" },
}

export const OfferCard = ({ messageId, offerData, isOwn, onRespond, isRead }: Props) => {
  const theme = useTheme()
  const [showCounter, setShowCounter] = useState(false)
  const [counterAmount, setCounterAmount] = useState("")

  const config = STATUS_CONFIG[offerData.status]

  const formattedAmount = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "Ksh",
    minimumFractionDigits: 0,
  }).format(offerData.amount)

  const formattedCounter = offerData.counter_amount
    ? new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "Ksh",
      minimumFractionDigits: 0,
    }).format(offerData.counter_amount)
    : null

  const handleCounter = () => {
    const amount = Number(counterAmount.replace(/[^0-9]/g, ""))
    if (!amount || amount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid counter offer amount")
      return
    }
    onRespond(messageId, "countered", amount)
    setShowCounter(false)
    setCounterAmount("")
  }

  const tick = isOwn ? (isRead ? "✓✓" : "✓") : ""
  const tickColor ="#b50b0b"

  return (
    <View style={[styles.card, { borderColor: config.color, backgroundColor: theme.surface }]}>

      {/* header */}
      <View style={[styles.header, { backgroundColor: config.color + "15" }]}>
        <Text style={styles.headerIcon}>{config.icon}</Text>
        <Text style={[styles.headerLabel, { color: config.color }]}>
          Price Offer · {config.label}
        </Text>
      </View>

      {/* amount */}
      <View style={styles.body}>
        <Text style={[styles.amount, { color: theme.textPrimary }]}>
          {formattedAmount}
        </Text>

        {/* counter amount if present */}
        {offerData.status === "countered" && formattedCounter && (
          <Text style={[styles.counterAmount, { color: "#8B5CF6" }]}>
            Counter: {formattedCounter}
          </Text>
        )}
      </View>

      {/* action buttons — shown to receiver only when pending */}
      <View>
        {!isOwn && offerData.status === "pending" && !showCounter && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: Colors.success }]}
              onPress={() => onRespond(messageId, "accepted")}
            >
              <Text style={styles.actionButtonText}>✓ Accept</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#8B5CF6" }]}
              onPress={() => setShowCounter(true)}
            >
              <Text style={styles.actionButtonText}>↩ Counter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: Colors.error }]}
              onPress={() => onRespond(messageId, "declined")}
            >
              <Text style={styles.actionButtonText}>✕ Decline</Text>

            </TouchableOpacity>


          </View>

        )}
        <View style={[styles.tickBox]}>
          <Text style={[styles.tick, { color: tickColor }]}>{tick}</Text></View>
      </View>

      {/* counter input */}
      {showCounter && (
        <View style={styles.counterInput}>
          <TextInput
            style={[
              styles.counterField,
              {
                backgroundColor: theme.inputBackground,
                color: theme.textPrimary,
                borderColor: theme.border,
              },
            ]}
            value={counterAmount}
            onChangeText={(t) => setCounterAmount(t.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            placeholder="Your counter offer (₦)"
            placeholderTextColor={theme.textPlaceholder}
          />
          <View style={styles.counterActions}>
            <TouchableOpacity
              style={[styles.counterButton, { backgroundColor: "#8B5CF6" }]}
              onPress={handleCounter}
            >
              <Text style={styles.counterButtonText}>Send</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.counterButton, { backgroundColor: theme.border }]}
              onPress={() => setShowCounter(false)}
            >
              <Text style={[styles.counterButtonText, { color: theme.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    overflow: "hidden",
    marginVertical: Spacing.xs,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  headerIcon: { fontSize: 16 },
  headerLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  body: {
    padding: Spacing.md,
    gap: 4,
  },
  amount: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
  },
  counterAmount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
    paddingTop: 0,
  },
  tick: { fontSize: 11, fontWeight: "700" },
  actionButton: {
    flex: 1,
    height: 38,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  counterInput: {
    padding: Spacing.md,
    paddingTop: 0,
    gap: Spacing.sm,
  },
  counterField: {
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
  },
  counterActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  counterButton: {
    flex: 1,
    height: 38,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  counterButtonText: {
    color: "#fff",
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  tickBox: {
    alignItems: "center",
    backgroundColor: "#d9d1d111"
  }
})






