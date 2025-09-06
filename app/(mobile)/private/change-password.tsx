import { ChangePasswordForm } from '@/components/ChangePasswordForm';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useGetMeQuery } from '@/generated/gql-operations-generated';
import { useI18n } from '@/hooks/useI18n';
import { useColorScheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function ChangePasswordPage() {
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const { data: userData, refetch } = useGetMeQuery();

  const hasPassword = userData?.me?.hasPassword ?? false; // Default to false to show set password when unknown

  const handleSuccess = async () => {
    // Aggiorna i dati utente
    await refetch();
    // Torna alle impostazioni
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Ionicons 
          name="lock-closed" 
          size={24} 
          color={Colors[colorScheme ?? 'light'].tint} 
        />
        <ThemedText style={styles.title}>
          {hasPassword ? t('changePassword.title') : t('setPassword.title')}
        </ThemedText>
      </View>

      <ThemedText style={styles.description}>
        {hasPassword ? t('changePassword.description') : t('setPassword.description')}
      </ThemedText>

      <ChangePasswordForm hasPassword={hasPassword} onSuccess={handleSuccess} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 24,
    lineHeight: 20,
  },
});
