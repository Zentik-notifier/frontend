import { Button } from "@/components/ui";
import { Colors } from '@/constants/Colors';
import { useResetPasswordMutation } from '@/generated/gql-operations-generated';
import { useI18n } from '@/hooks/useI18n';
import { useColorScheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
    Alert,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { ThemedText } from './ThemedText';

interface NewPasswordStepProps {
  resetToken: string;
  onPasswordReset: () => void;
  onBack: () => void;
}

export function NewPasswordStep({ resetToken, onPasswordReset, onBack }: NewPasswordStepProps) {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const confirmPasswordRef = useRef<TextInput>(null);

  const [resetPassword] = useResetPasswordMutation();

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert(t('common.error'), t('auth.forgotPassword.passwordRequired'));
      return;
    }

    if (!confirmPassword.trim()) {
      Alert.alert(t('common.error'), t('auth.forgotPassword.confirmPasswordRequired'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.forgotPassword.passwordsMismatch'));
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert(t('common.error'), t('auth.forgotPassword.passwordTooShort'));
      return;
    }

    setIsResetting(true);
    try {
      const result = await resetPassword({
        variables: {
          input: {
            resetToken,
            newPassword: newPassword.trim(),
          },
        },
      });

      if (result.data?.resetPassword.success) {
        Alert.alert(
          t('auth.forgotPassword.passwordResetSuccess'),
          t('auth.forgotPassword.passwordResetSuccessMessage'),
          [
            {
              text: t('common.ok'),
              onPress: onPasswordReset,
            },
          ]
        );
      } else {
        Alert.alert(
          t('common.error'),
          result.data?.resetPassword.message || t('auth.forgotPassword.passwordResetFailed')
        );
      }
    } catch (error) {
      console.error('Password reset failed:', error);
      Alert.alert(
        t('common.error'),
        t('auth.forgotPassword.passwordResetFailed')
      );
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        {/* New Password Input */}
        <View style={styles.inputContainer}>
          <ThemedText style={[styles.inputLabel, { color: Colors[colorScheme].text }]}>
            {t('auth.forgotPassword.newPasswordLabel')}
          </ThemedText>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={[
                styles.passwordInput,
                {
                  color: Colors[colorScheme].text,
                  backgroundColor: Colors[colorScheme].backgroundCard,
                  borderColor: Colors[colorScheme].border,
                },
              ]}
              placeholder={t('auth.forgotPassword.newPasswordPlaceholder')}
              placeholderTextColor={Colors[colorScheme].textSecondary}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isResetting}
              returnKeyType="next"
              onSubmitEditing={() => {
                confirmPasswordRef.current?.focus();
              }}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
              disabled={isResetting}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color={Colors[colorScheme].textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirm Password Input */}
        <View style={styles.inputContainer}>
          <ThemedText style={[styles.inputLabel, { color: Colors[colorScheme].text }]}>
            {t('auth.forgotPassword.confirmPasswordLabel')}
          </ThemedText>
          <View style={styles.passwordInputContainer}>
            <TextInput
              ref={confirmPasswordRef}
              style={[
                styles.passwordInput,
                {
                  color: Colors[colorScheme].text,
                  backgroundColor: Colors[colorScheme].backgroundCard,
                  borderColor: Colors[colorScheme].border,
                },
              ]}
              placeholder={t('auth.forgotPassword.confirmPasswordPlaceholder')}
              placeholderTextColor={Colors[colorScheme].textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isResetting}
              returnKeyType="done"
              onSubmitEditing={handleResetPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isResetting}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off' : 'eye'}
                size={20}
                color={Colors[colorScheme].textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Reset Button */}
        <Button
          title={isResetting ? t('auth.forgotPassword.resetting') : t('auth.forgotPassword.resetPassword')}
          onPress={handleResetPassword}
          loading={isResetting}
          disabled={isResetting}
          size="large"
          style={styles.resetButton}
        />

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          disabled={isResetting}
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
  passwordInputContainer: {
    position: 'relative',
  },
  passwordInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingRight: 50,
    fontSize: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 15,
    padding: 5,
  },
  resetButton: {
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
