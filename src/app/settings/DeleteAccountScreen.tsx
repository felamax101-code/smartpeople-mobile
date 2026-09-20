import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'expo-router';
const CONFIRM_PHRASE = 'delete account';


export default function DeleteAccountScreen() {
  const theme=useTheme()
  const queryClient = useQueryClient()
  const { clearUser } = useAuthStore()
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isCodeValid = code.trim().length === 6;
  const isPasswordValid = password.trim().length > 0;
  const isConfirmValid =
    confirmText.trim().toLowerCase() === CONFIRM_PHRASE;

  const isFormValid = isCodeValid && isPasswordValid && isConfirmValid;
  const [perrors,setPErrors]=useState<string | null>(null)
  const handleSubmit = async () => {
    if (!isFormValid) {
      Alert.alert(
        'Check your details',
        'Please make sure the code, password, and confirmation text are all correct.'
      );
      return;
    }

    setSubmitting(true);
    try {

      const response=await authService.deleteAccountConfirm(code, password);
      if (response?.message==="success"){
      queryClient.clear()
      clearUser()
      // On success, move to the "deleting" progress screen
      router.push("/settings/DeletingAccountScreen");}
      else{      setPErrors('Something went wrong,This means the code entered is incorrect or expired ,or the password entered is incorrect, Please try again.');
}
    } catch (err) {
      setPErrors('Something went wrong,This means the code entered is incorrect or expired ,or the password entered is incorrect ,Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Delete your account</Text>
        <Text style={styles.subtitle}>
          This action is permanent and cannot be undone. To continue, please
          confirm your identity below.
        </Text>
        {perrors &&(
          <Text style={styles.error}>
          {perrors}
        </Text>
        ) }

        {/* 6-digit code */}
        <Text style={styles.label}>Verification code</Text>
        <TextInput
          style={styles.input}
          placeholder="123456"
          placeholderTextColor="#9CA3AF"
          value={code}
          onChangeText={(text) => {
            // Allow pasting, but strip non-digits and cap at 6 chars
            const cleaned = text.slice(0, 6);
            setCode(cleaned);
          }}
          keyboardType="default"
          maxLength={6}
          textContentType="oneTimeCode" // helps autofill from SMS/email on iOS
          autoComplete="one-time-code"
          autoCorrect={false}
        />
        <Text style={styles.helperText}>
          Enter the 6-digit code we sent to your email.

        </Text>

        {/* Password */}
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Your password"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
        />

        {/* Confirmation phrase */}
        <Text style={styles.label}>
          Type "{CONFIRM_PHRASE}" to confirm
        </Text>
        <TextInput
          style={styles.input}
          placeholder={CONFIRM_PHRASE}
          placeholderTextColor="#9CA3AF"
          value={confirmText}
          onChangeText={setConfirmText}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!isFormValid || submitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid || submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Verifying…' : 'Delete my account'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 32,
    lineHeight: 20,
  },
  error: {
    fontSize: 14,
    color: '#e21b1b',
    marginBottom: 32,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  helperText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
  },
  submitButton: {
    marginTop: 32,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#FCA5A5',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
});
