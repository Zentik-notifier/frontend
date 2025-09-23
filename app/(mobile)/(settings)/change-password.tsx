import { ChangePasswordForm } from '@/components/ChangePasswordForm';
import { useI18n } from '@/hooks/useI18n';
import { useGetMeQuery } from '@/generated/gql-operations-generated';
import React from 'react';
import { Stack } from 'expo-router';

export default function ChangePasswordPage() {
  const { t } = useI18n();
  const { data: userData, refetch } = useGetMeQuery();

  const hasPassword = userData?.me?.hasPassword ?? false; // Default to false to show set password when unknown

  const handleSuccess = async () => {
    await refetch();
    router.back();
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: hasPassword ? t('changePassword.title') : t('setPassword.title'),
        }} 
      />
      <ChangePasswordForm hasPassword={hasPassword} onSuccess={handleSuccess} />
    </>
  );
}