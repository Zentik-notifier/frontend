import { Button } from "@/components/ui";
import { Colors } from '@/constants/Colors';
import { useRequestPasswordResetMutation } from '@/generated/gql-operations-generated';
import { useI18n } from '@/hooks/useI18n';
import { useLanguageSync } from '@/hooks/useLanguageSync';
import { useColorScheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { ThemedText } from './ThemedText';

interface ForgotPasswordFormProps {
  onResetRequested: (email: string) => void;
  onBackToLogin: () => void;
}

export function ForgotPasswordForm({ onResetRequested, onBackToLogin }: ForgotPasswordFormProps) {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { currentLocale } = useLanguageSync();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [requestPasswordReset] = useRequestPasswordResetMutation();

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert(t('common.error'), t('auth.forgotPassword.emailRequired'));
      return;
    }

    if (!email.includes('@')) {
      Alert.alert(t('common.error'), t('auth.forgotPassword.invalidEmail'));
      return;
    }

    // Avanza subito allo step successivo senza attendere la risposta del backend
    onResetRequested(email.trim());

    // Esegui la richiesta in background (fire-and-forget)
    setIsSubmitting(true);
    requestPasswordReset({
      variables: {
        input: {
          email: email.trim(),
          locale: currentLocale,
        },
      },
    })
      .catch((error) => {
        console.error('Password reset request failed:', error);
        // Non bloccare il flow; opzionalmente si potrebbe mostrare un toast non bloccante
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <ThemedText style={[styles.inputLabel, { color: Colors[colorScheme].text }]}>
            {t('auth.forgotPassword.emailLabel')}
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                color: Colors[colorScheme].text,
                backgroundColor: Colors[colorScheme].backgroundCard,
                borderColor: Colors[colorScheme].border,
              },
            ]}
            placeholder={t('auth.forgotPassword.emailPlaceholder')}
            placeholderTextColor={Colors[colorScheme].textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!isSubmitting}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </View>

        {/* Submit Button */}
        <Button
          title={isSubmitting ? t('auth.forgotPassword.sending') : t('auth.forgotPassword.sendResetEmail')}
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
          size="large"
          style={styles.submitButton}
        />

        {/* Back to Login Button */}
        <TouchableOpacity
          style={styles.backToLoginButton}
          onPress={onBackToLogin}
          disabled={isSubmitting}
          activeOpacity={0.7}
        >
          <ThemedText style={[styles.backToLoginText, { color: Colors[colorScheme].tint }]}>
            {t('auth.forgotPassword.backToLogin')}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  formContainer: {
    width: "100%",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  inputContainer: {
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  submitButton: {
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
    marginBottom: 24,
  },
  backToLoginButton: {
    alignItems: 'center',
    padding: 16,
    marginTop: 8,
  },
  backToLoginText: {
    fontSize: 16,
    fontWeight: '500',
  },
});