import { useResetPasswordMutation } from '@/generated/gql-operations-generated';
import { useI18n } from '@/hooks/useI18n';
import React, { Ref, useRef, useState } from 'react';
import {
    Alert,
    StyleSheet,
    View,
} from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';

interface NewPasswordStepProps {
  resetToken: string;
  onPasswordReset: () => void;
  onBack: () => void;
}

export function NewPasswordStep({ resetToken, onPasswordReset, onBack }: NewPasswordStepProps) {
  const { t } = useI18n();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errors, setErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const confirmPasswordRef = useRef<any>(null);

  const [resetPassword] = useResetPasswordMutation();

  const validateForm = () => {
    const newErrors: { newPassword?: string; confirmPassword?: string } = {};
    
    if (!newPassword.trim()) {
      newErrors.newPassword = t('auth.forgotPassword.passwordRequired');
    } else if (newPassword.length < 6) {
      newErrors.newPassword = "La password deve essere di almeno 6 caratteri";
    } else if (newPassword.length > 100) {
      newErrors.newPassword = "La password non può superare 100 caratteri";
    }
    
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = t('auth.forgotPassword.confirmPasswordRequired');
    } else if (newPassword && newPassword !== confirmPassword) {
      newErrors.confirmPassword = t('auth.forgotPassword.passwordsMismatch');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;
    
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
        <TextInput
          label={t('auth.forgotPassword.newPasswordLabel')}
          placeholder={t('auth.forgotPassword.newPasswordPlaceholder')}
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
          mode="outlined"
          error={!!errors.newPassword}
          style={styles.input}
          right={
            <TextInput.Icon
              icon={showPassword ? "eye-off" : "eye"}
              onPress={() => setShowPassword(!showPassword)}
            />
          }
        />
        <HelperText type="error" visible={!!errors.newPassword}>
          {errors.newPassword}
        </HelperText>

        <TextInput
          ref={confirmPasswordRef}
          label={t('auth.forgotPassword.confirmPasswordLabel')}
          placeholder={t('auth.forgotPassword.confirmPasswordPlaceholder')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isResetting}
          returnKeyType="done"
          onSubmitEditing={handleResetPassword}
          mode="outlined"
          error={!!errors.confirmPassword}
          style={styles.input}
          right={
            <TextInput.Icon
              icon={showConfirmPassword ? "eye-off" : "eye"}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            />
          }
        />
        <HelperText type="error" visible={!!errors.confirmPassword}>
          {errors.confirmPassword}
        </HelperText>

        <Button
          mode="contained"
          onPress={handleResetPassword}
          loading={isResetting}
          disabled={isResetting}
          style={styles.resetButton}
        >
          {isResetting ? t('auth.forgotPassword.resetting') : t('auth.forgotPassword.resetPassword')}
        </Button>

        <Button
          mode="text"
          onPress={onBack}
          disabled={isResetting}
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
  input: {
    width: "100%",
  },
  resetButton: {
    width: "100%",
    marginTop: 16,
  },
  backButton: {
    marginTop: 8,
  },
});
