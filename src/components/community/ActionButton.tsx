import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

type Variant = 'default' | 'danger' | 'primary';

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
}

export function ActionButton({
  label,
  onPress,
  variant = 'default',
  loading,
  disabled,
}: ActionButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.btn,
        variant === 'danger' && styles.btnDanger,
        variant === 'primary' && styles.btnPrimary,
        (disabled || loading) && styles.btnDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'default' ? '#333' : '#fff'} />
      ) : (
        <Text
          style={[
            styles.btnText,
            (variant === 'danger' || variant === 'primary') && styles.btnTextLight,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#eee',
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDanger: { backgroundColor: '#e53e3e' },
  btnPrimary: { backgroundColor: '#2563eb' },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 13, fontWeight: '600', color: '#333' },
  btnTextLight: { color: '#fff' },
});
