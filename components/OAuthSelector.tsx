import { usePublicAppConfigQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { Image } from "expo-image";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";

interface OAuthSelectorProps {
  onProviderSelect: (providerId: string) => void;
  disabled?: boolean;
}

export function OAuthSelector({
  onProviderSelect,
  disabled: disabledParent,
}: OAuthSelectorProps) {
  const { data: providersData, loading: providersLoading } =
    usePublicAppConfigQuery({ fetchPolicy: "network-only" });
  const providers = providersData?.publicAppConfig.oauthProviders || [];
  const disabled = disabledParent || providersLoading;
  const theme = useTheme();

  const { t } = useI18n();

  if (providers.length === 0) return null;

  return (
    <View style={[styles.container]}>
      <Text style={[styles.orText, { color: theme.colors.onSurfaceVariant }]}>
        {t("login.orContinueWith")}
      </Text>
      <View style={styles.providersContainer}>
        {providers.map((provider) => (
          <Button
            key={provider.id}
            mode="contained"
            disabled={disabled}
            onPress={() => onProviderSelect(provider.providerId)}
            style={[
              styles.providerButton,
              {
                backgroundColor: provider.color || theme.colors.primary,
              }
            ]}
            labelStyle={[
              styles.providerLabel,
              {
                color: provider.textColor || theme.colors.onPrimary,
              }
            ]}
            icon={() => 
              provider.iconUrl ? (
                <Image
                  source={{ uri: provider.iconUrl }}
                  style={styles.providerIcon}
                />
              ) : null
            }
          >
            {provider.name}
          </Button>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 16,
  },
  orText: {
    textAlign: "center",
    marginBottom: 16,
    fontSize: 14,
    opacity: 0.7,
  },
  providersContainer: {
    flexDirection: "column",
    gap: 12,
  },
  providerButton: {
    width: "100%",
  },
  providerLabel: {
    fontWeight: "500",
  },
  providerIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
});
