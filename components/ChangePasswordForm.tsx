import { Colors } from '@/constants/Colors';
import { useChangePasswordMutation, useSetPasswordMutation } from '@/generated/gql-operations-generated';
import { useI18n } from '@/hooks/useI18n';
import { useColorScheme } from '@/hooks/useTheme';
import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Button } from './ui/Button';

interface ChangePasswordFormProps {
  hasPassword: boolean;
  onSuccess?: () => void;
}

export function ChangePasswordForm({ hasPassword, onSuccess }: ChangePasswordFormProps) {
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [changePassword, { loading: changingPassword }] = useChangePasswordMutation({
    refetchQueries: ['GetMe', 'GetUserSessions'],
  });
  const [setPassword, { loading: settingPassword }] = useSetPasswordMutation({
    refetchQueries: ['GetMe', 'GetUserSessions'],
  });

  const loading = changingPassword || settingPassword;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validazione password attuale (solo se l'utente ha già una password)
    if (hasPassword && !currentPassword.trim()) {
      newErrors.currentPassword = t('changePassword.validation.currentPasswordRequired') as string;
    }

    // Validazione nuova password
    if (!newPassword.trim()) {
      newErrors.newPassword = (hasPassword 
        ? t('changePassword.validation.newPasswordRequired')
        : t('setPassword.validation.newPasswordRequired')) as string;
    } else if (newPassword.length < 8) {
      newErrors.newPassword = (hasPassword
        ? t('changePassword.validation.newPasswordMinLength')
        : t('setPassword.validation.newPasswordMinLength')) as string;
    }

    // Validazione conferma password
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = (hasPassword
        ? t('changePassword.validation.passwordsDoNotMatch')
        : t('setPassword.validation.passwordsDoNotMatch')) as string;
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = (hasPassword
        ? t('changePassword.validation.passwordsDoNotMatch')
        : t('setPassword.validation.passwordsDoNotMatch')) as string;
    }

    // Validazione password diversa (solo se entrambe le password sono valide e coincidono)
    if (newPassword.trim() && confirmPassword.trim() && newPassword === confirmPassword) {
      if (hasPassword && currentPassword === newPassword) {
        newErrors.newPassword = t('changePassword.validation.samePassword') as string;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (hasPassword) {
        await changePassword({
          variables: {
            input: {
              currentPassword,
              newPassword,
            },
          },
        });
        Alert.alert(
          t('changePassword.success.title'),
          t('changePassword.success.message'),
          [{ text: t('common.ok'), onPress: onSuccess }]
        );
      } else {
        await setPassword({
          variables: {
            input: {
              currentPassword: '', // Richiesto dal tipo attuale ma non utilizzato dal backend
              newPassword,
            },
          },
        });
        Alert.alert(
          t('setPassword.success.title'),
          t('setPassword.success.message'),
          [{ text: t('common.ok'), onPress: onSuccess }]
        );
      }

      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
    } catch (error) {
      console.error('Password operation failed:', error);
      Alert.alert(
        hasPassword ? t('changePassword.errors.title') : t('setPassword.errors.title'),
        hasPassword ? t('changePassword.errors.unknown') : t('setPassword.errors.unknown')
      );
    }
  };

  return (
    <ThemedView style={styles.container}>
      {hasPassword && (
        <View style={styles.inputContainer}>
          <ThemedText style={[styles.label, { color: Colors[colorScheme ?? 'light'].text }]}>
            {t('changePassword.currentPassword')}
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: Colors[colorScheme ?? 'light'].inputBackground || Colors[colorScheme ?? 'light'].background,
                borderColor: errors.currentPassword ? '#FF3B30' : Colors[colorScheme ?? 'light'].border,
                color: Colors[colorScheme ?? 'light'].text,
              },
            ]}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder={t('changePassword.currentPasswordPlaceholder')}
            placeholderTextColor={Colors[colorScheme ?? 'light'].textSecondary}
            secureTextEntry
          />
          {errors.currentPassword && (
            <ThemedText style={styles.errorText}>{errors.currentPassword}</ThemedText>
          )}
        </View>
      )}

      <View style={styles.inputContainer}>
        <ThemedText style={[styles.label, { color: Colors[colorScheme ?? 'light'].text }]}>
          {t('changePassword.newPassword')}
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: Colors[colorScheme ?? 'light'].inputBackground || Colors[colorScheme ?? 'light'].background,
              borderColor: errors.newPassword ? '#FF3B30' : Colors[colorScheme ?? 'light'].border,
              color: Colors[colorScheme ?? 'light'].text,
            },
          ]}
          placeholder={hasPassword 
            ? t('changePassword.newPasswordPlaceholder')
            : t('setPassword.newPasswordPlaceholder')
          }
          placeholderTextColor={Colors[colorScheme ?? 'light'].textSecondary}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          returnKeyType="next"
          onSubmitEditing={() => {
            // confirmPasswordRef.current?.focus(); // This line was removed as per the edit hint
          }}
        />
        {errors.newPassword && (
          <ThemedText style={styles.errorText}>{errors.newPassword}</ThemedText>
        )}
        <ThemedText style={styles.helperText}>
          {hasPassword ? t('changePassword.validation.newPasswordMinLength') : t('setPassword.validation.newPasswordMinLength')}
        </ThemedText>
      </View>

      <View style={styles.inputContainer}>
        <ThemedText style={[styles.label, { color: Colors[colorScheme ?? 'light'].text }]}>
          {t('changePassword.confirmPassword')}
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: Colors[colorScheme ?? 'light'].inputBackground || Colors[colorScheme ?? 'light'].background,
              borderColor: errors.confirmPassword ? '#FF3B30' : Colors[colorScheme ?? 'light'].border,
              color: Colors[colorScheme ?? 'light'].text,
            },
          ]}
          placeholder={hasPassword
            ? t('changePassword.confirmPasswordPlaceholder')
            : t('setPassword.confirmPasswordPlaceholder')
          }
          placeholderTextColor={Colors[colorScheme ?? 'light'].textSecondary}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        {errors.confirmPassword && (
          <ThemedText style={styles.errorText}>{errors.confirmPassword}</ThemedText>
        )}
      </View>

      <Button
        title={hasPassword 
          ? (loading ? t('changePassword.changing') : t('changePassword.changeButton'))
          : (loading ? t('setPassword.setting') : t('setPassword.setButton'))
        }
        onPress={handleSubmit}
        disabled={loading}
        style={styles.button}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
  },
  helperText: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.7,
  },
  button: {
    marginTop: 8,
  },
});
