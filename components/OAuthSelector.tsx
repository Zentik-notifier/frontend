import { usePublicAppConfigQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Button, Menu, Text } from "react-native-paper";
import { Image } from "expo-image";

interface OAuthSelectorProps {
  onProviderSelect: (providerId: string) => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export function OAuthSelector({
  onProviderSelect,
  disabled: disabledParent,
  style,
}: OAuthSelectorProps) {
  const { data: providersData, loading: providersLoading } =
    usePublicAppConfigQuery({ fetchPolicy: "network-only" });
  const providers = providersData?.publicAppConfig.oauthProviders || [];
  const disabled = disabledParent || providersLoading;

  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const handleProviderSelect = (providerId: string) => {
    onProviderSelect(providerId);
    setIsOpen(false);
  };

  if (providers.length === 0) return null;

  return (
    <View style={[styles.container, style]}>
      <Menu
        visible={isOpen}
        onDismiss={() => setIsOpen(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setIsOpen(true)}
            disabled={disabled}
            style={styles.selectorButton}
            contentStyle={styles.buttonContent}
            icon={() => (
              <Ionicons name="chevron-down" size={20} color="currentColor" />
            )}
          >
            {t("login.orContinueWith")}
          </Button>
        }
        style={styles.menu}
      >
        {providers.map((provider) => (
          <Menu.Item
            key={provider.id}
            onPress={() => handleProviderSelect(provider.providerId)}
            title={
              <View style={styles.providerInfo}>
                <Image
                  source={{ uri: provider.iconUrl! }}
                  style={styles.providerIcon}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
                <Text variant="bodyMedium" style={styles.providerName}>
                  {provider.name}
                </Text>
              </View>
            }
          />
        ))}
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  selectorButton: {
    flex: 1,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menu: {
    marginTop: 8,
  },
  providerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  providerIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  providerName: {
    fontWeight: "500",
  },
});
