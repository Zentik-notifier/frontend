import { useValidateResetTokenMutation } from '@/generated/gql-operations-generated';
import { useI18n } from '@/hooks/useI18n';
import React, { useState } from 'react';
import {
    Alert,
    StyleSheet,
    View,
} from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';

interface ResetCodeStepProps {
  email: string;
  onCodeVerified: (code: string) => void;
  onBack: () => void;
}

export function ResetCodeStep({ email, onCodeVerified, onBack }: ResetCodeStepProps) {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const [validateResetToken] = useValidateResetTokenMutation();

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      Alert.alert(t('common.error'), t('auth.forgotPassword.codeRequired'));
      return;
    }

    if (code.trim().length !== 6) {
      Alert.alert(t('common.error'), t('auth.forgotPassword.invalidCode'));
      return;
    }

    setIsVerifying(true);
    try {
      const result = await validateResetToken({
        variables: {
          resetToken: code.trim(),
        },
      });

      if (result.data?.validateResetToken) {
        // Token is valid, proceed to next step
        onCodeVerified(code.trim());
      } else {
        Alert.alert(
          t('common.error'),
          t('auth.forgotPassword.codeVerificationFailed')
        );
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      Alert.alert(
        t('common.error'),
        t('auth.forgotPassword.codeVerificationFailed')
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <View style={styles.emailContainer}>
          <Text variant="bodyMedium" style={styles.emailLabel}>
            {t('auth.forgotPassword.emailLabel')}
          </Text>
          <Text variant="titleMedium" style={styles.emailText}>
            {email}
          </Text>
        </View>

        <TextInput
          label={t('auth.forgotPassword.codeLabel')}
          placeholder={t('auth.forgotPassword.codePlaceholder')}
          value={code}
          onChangeText={setCode}
          keyboardType="default"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          editable={!isVerifying}
          returnKeyType="done"
          onSubmitEditing={handleVerifyCode}
          mode="outlined"
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleVerifyCode}
          loading={isVerifying}
          disabled={isVerifying}
          style={styles.verifyButton}
        >
          {isVerifying ? t('auth.forgotPassword.verifying') : t('auth.forgotPassword.verifyCode')}
        </Button>

        <Button
          mode="text"
          onPress={onBack}
          disabled={isVerifying}
          style={styles.backButton}
        >
          {t('common.back')}
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
  emailContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  emailLabel: {
    marginBottom: 4,
  },
  emailText: {
    fontWeight: '600',
  },
  input: {
    width: "100%",
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 2,
    fontWeight: '600',
  },
  verifyButton: {
    width: "100%",
    marginBottom: 16,
  },
  backButton: {
    marginTop: 8,
  },
});
