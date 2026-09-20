

import React, { useRef, useState } from "react"
import {
  View,
  TextInput,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from "react-native"
import { useTheme } from "@/hooks/useTheme"
import { Radius, FontSize, Spacing } from "@/constants/colors"

const OTP_LENGTH = 6

interface Props {
  value: string
  onChange: (value: string) => void
  hasError?: boolean
}

export const OTPInput = ({ value, onChange, hasError }: Props) => {
  const theme = useTheme()
  // array of refs — one per box
  const inputRefs = useRef<Array<TextInput | null>>([])

  const digits = value.split("").concat(Array(OTP_LENGTH).fill("")).slice(0, OTP_LENGTH)

  const handleChange = (text: string, index: number) => {
    // only accept single digit
    const digit = text.replace(/[^a-zA-Z0-9]/g, "").slice(-1)

    const newDigits = [...digits]
    newDigits[index] = digit

    const newValue = newDigits.join("")
    onChange(newValue)

    // auto-advance to next box on input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    // backspace on empty box → go back to previous
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
      const newDigits = [...digits]
      newDigits[index - 1] = ""
      onChange(newDigits.join(""))
    }
  }

  const handlePaste = (text: string) => {
    // handle paste — fill all boxes at once
    const pastedDigits = text.replace(/[^A-Za-z0-9]/g, "").slice(0, OTP_LENGTH)
    onChange(pastedDigits)
    // focus last filled box
    const lastIndex = Math.min(pastedDigits.length, OTP_LENGTH - 1)
    inputRefs.current[lastIndex]?.focus()
  }

  return (
    <View style={styles.container}>
      {Array.from({ length: OTP_LENGTH }).map((_, index) => {
        const isFilled = !!digits[index]
        const borderColor = hasError
          ? theme.error
          : isFilled
          ? theme.primary
          : theme.border

        return (
          <TextInput
            key={index}
            ref={(ref) => { inputRefs.current[index] = ref }}
            style={[
              styles.box,
              {
                backgroundColor: isFilled
                  ? theme.primaryLight
                  : theme.inputBackground,
                borderColor,
                color: theme.textPrimary,
              },
            ]}
            value={digits[index]}
            onChangeText={(text) => {
              // handle paste in first box
              if (text.length > 1 && index === 0) {
                handlePaste(text)
                return
              }
              handleChange(text, index)
            }}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="default"
            maxLength={index === 0 ? OTP_LENGTH : 1} // first box accepts paste
            textAlign="center"
            selectTextOnFocus
          />
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
  },
  box: {
    width: 48,
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    fontSize: FontSize.xxl,
    fontWeight: "700",
  },
})










