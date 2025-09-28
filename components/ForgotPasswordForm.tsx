import { useRequestPasswordResetMutation } from '@/generated/gql-operations-generated';
import { useI18n } from '@/hooks/useI18n';
import { useLanguageSync } from '@/hooks/useLanguageSync';
import React, { useState } from 'react';
import {
    Alert,
    StyleSheet,
    View,
} from 'react-native';
import { TextInput, Button, HelperText } from 'react-native-paper';

interface ForgotPasswordFormProps {
  onResetRequested: (email: string) => void;
  onBackToLogin: () => void;
}

export function ForgotPasswordForm({ onResetRequested, onBackToLogin }: ForgotPasswordFormProps) {
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
        <TextInput
          label={t('auth.forgotPassword.emailLabel')}
          placeholder={t('auth.forgotPassword.emailPlaceholder')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          editable={!isSubmitting}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          mode="outlined"
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
          style={styles.submitButton}
        >
          {isSubmitting ? t('auth.forgotPassword.sending') : t('auth.forgotPassword.sendResetEmail')}
        </Button>

        <Button
          mode="text"
          onPress={onBackToLogin}
          disabled={isSubmitting}
          style={styles.backToLoginButton}
        >
          {t('auth.forgotPassword.backToLogin')}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
  },
  formContainer: {
    width: "100%",
    maxWidth: 500,
    alignItems: "center",
  },
  input: {
    width: "100%",
    marginBottom: 24,
  },
  submitButton: {
    width: "100%",
    marginBottom: 16,
  },
  backToLoginButton: {
    marginTop: 8,
  },
});