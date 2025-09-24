import { Button } from "@/components/ui";
import { Colors } from '@/constants/Colors';
import { useValidateResetTokenMutation } from '@/generated/gql-operations-generated';
import { useI18n } from '@/hooks/useI18n';
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

interface ResetCodeStepProps {
  email: string;
  onCodeVerified: (code: string) => void;
  onBack: () => void;
}

export function ResetCodeStep({ email, onCodeVerified, onBack }: ResetCodeStepProps) {
  const colorScheme = useColorScheme();
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
        {/* Email Display */}
        <View style={styles.emailContainer}>
          <ThemedText style={[styles.emailLabel, { color: Colors[colorScheme].textSecondary }]}>
            {t('auth.forgotPassword.emailLabel')}
          </ThemedText>
          <ThemedText style={[styles.emailText, { color: Colors[colorScheme].text }]}>
            {email}
          </ThemedText>
        </View>

        {/* Code Input */}
        <View style={styles.inputContainer}>
          <ThemedText style={[styles.inputLabel, { color: Colors[colorScheme].text }]}>
            {t('auth.forgotPassword.codeLabel')}
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
            placeholder={t('auth.forgotPassword.codePlaceholder')}
            placeholderTextColor={Colors[colorScheme].textSecondary}
            value={code}
            onChangeText={setCode}
            keyboardType="default"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            editable={!isVerifying}
            returnKeyType="done"
            onSubmitEditing={handleVerifyCode}
          />
        </View>

        {/* Verify Button */}
        <Button
          title={isVerifying ? t('auth.forgotPassword.verifying') : t('auth.forgotPassword.verifyCode')}
          onPress={handleVerifyCode}
          loading={isVerifying}
          disabled={isVerifying}
          size="large"
          style={styles.verifyButton}
        />

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          disabled={isVerifying}
          activeOpacity={0.7}
        >
          <ThemedText style={[styles.backButtonText, { color: Colors[colorScheme].tint }]}>
            {t('common.back')}
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
  emailContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  emailLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 2,
    fontWeight: '600',
  },
  verifyButton: {
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
    marginBottom: 24,
  },
  backButton: {
    alignItems: 'center',
    padding: 16,
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
