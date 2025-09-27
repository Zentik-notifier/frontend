import { usePublicAppConfigQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { Image } from "expo-image";
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from "react-native-popup-menu";

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

  const menuItems = useMemo(() => {
    return providers.map((provider) => ({
      id: provider.id,
      label: provider.name,
      imageUrl: provider.iconUrl || undefined,
      onPress: () => onProviderSelect(provider.providerId),
    }));
  }, [providers, onProviderSelect]);

  if (providers.length === 0) return null;

  return (
    <View style={[styles.container]}>
      <Menu>
        <MenuTrigger>
          <Button
            mode="outlined"
            disabled={disabled}
            style={styles.selectorButton}
            contentStyle={styles.buttonContent}
            icon={() => (
              <Ionicons name="chevron-down" size={20} color="currentColor" />
            )}
          >
            {t("login.orContinueWith")}
          </Button>
        </MenuTrigger>
        <MenuOptions
          optionsContainerStyle={{
            marginTop: 50,
            backgroundColor: theme.colors.surface,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
          }}
        >
          {menuItems.map((item) => (
            <MenuOption key={item.id} onSelect={() => item.onPress()}>
              <View style={styles.menuItem}>
                {item.imageUrl && (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.providerIcon}
                  />
                )}
                <Text style={styles.providerName}>{item.label}</Text>
              </View>
            </MenuOption>
          ))}
        </MenuOptions>
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
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
