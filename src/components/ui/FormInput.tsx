

import React, { useState } from "react"
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from "react-native"
import { useTheme } from "@/hooks/useTheme"
import { Radius, Spacing, FontSize } from "@/constants/colors"
import { MaterialIcons } from "@expo/vector-icons"
interface Props extends TextInputProps {
  label: string
  info?:string 
  error?: string
  hint?: string          // success hint e.g. "✓ Username available"
  hintColor?: string
  isPassword?: boolean
  rightElement?: React.ReactNode,
  
}

export const FormInput = ({
  label,
  info,
  error,
  hint,
  hintColor,
  isPassword = false,
  rightElement,
  textContentType,
  ...props
}: Props) => {
  const theme = useTheme()
  const [isFocused, setIsFocused] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  const borderColor = error
    ? theme.error
    : isFocused
      ? theme.borderFocus
      : theme.border

  return (
    <View style={styles.container}>

      {/* label */}
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        {label} 
      </Text>
      
      {info &&(
      <Text style={[styles.infoText,{color:theme.textMuted}]}>{info}</Text>)}

      {/* input container */}
      <View style={[
        styles.inputContainer,
        {
          backgroundColor: isFocused
            ? theme.inputBackgroundFocus
            : theme.inputBackground,
          borderColor,
          borderWidth: isFocused || error ? 1.5 : 1,
        }
      ]}>
        <TextInput
          style={[styles.input, { color: theme.textPrimary }]}
          placeholderTextColor={theme.textPlaceholder}
          secureTextEntry={isPassword && !isVisible}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize={isPassword ? "none" : props.autoCapitalize}
          autoCorrect={false}
          {...props}
        />

        {/* password visibility toggle */}
        {isPassword && (
          <TouchableOpacity
            onPress={() => setIsVisible((v) => !v)}
            style={styles.eyeButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.eyeIcon}>{isVisible ? <MaterialIcons name="visibility" size={22}/> :<MaterialIcons name="visibility-off" size={22}/>}</Text>
          </TouchableOpacity>
        )}

        {/* optional right element (e.g. loading spinner for username check) */}
        {rightElement && !isPassword && (
          <View style={styles.rightElement}>{rightElement}</View>
        )}
      </View>

      {/* error message */}
      {error ? (
        <Text style={[styles.helperText, { color: theme.error }]}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.helperText, { color: hintColor ?? theme.success }]}>
          {hint}
        </Text>
      ) : null}

    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    height: "100%",
  },
  eyeButton: {
    padding: 4,
  },
  eyeIcon: {
    fontSize: 18,
  },
  rightElement: {
    marginLeft: Spacing.sm,
  },
  helperText: {
    fontSize: 18,

  },
   infoText:{
    fontFamily:"sans-serif",
    fontSize:10,
    
  }
})









