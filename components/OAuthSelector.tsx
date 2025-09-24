import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { usePublicAppConfigQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

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
  const colorScheme = useColorScheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleProviderSelect = (providerId: string) => {
    onProviderSelect(providerId);
    setIsOpen(false);
  };

  if (providers.length === 0) return null;

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[
          styles.selectorButton,
          {
            backgroundColor: Colors[colorScheme].background,
            borderColor: Colors[colorScheme].border,
          },
          disabled && styles.disabledButton,
        ]}
        onPress={() => setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <ThemedText
          style={[styles.selectorText, { color: Colors[colorScheme].text }]}
        >
          {t("login.orContinueWith")}
        </ThemedText>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={20}
          color={Colors[colorScheme].textSecondary}
        />
      </TouchableOpacity>

      {isOpen && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: Colors[colorScheme].background,
              borderColor: Colors[colorScheme].border,
            },
          ]}
        >
          {providers.map((provider, index) => (
            <TouchableOpacity
              key={provider.id}
              style={[
                styles.providerOption,
                index !== providers.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: Colors[colorScheme].border,
                },
              ]}
              onPress={() => handleProviderSelect(provider.providerId)}
            >
              <View style={styles.providerInfo}>
                <Image
                  source={{ uri: provider.iconUrl! }}
                  style={styles.providerIcon}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.providerName,
                    { color: Colors[colorScheme].text },
                  ]}
                >
                  {provider.name}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 40,
    width: "100%",
  },
  disabledButton: {
    opacity: 0.5,
  },
  selectorText: {
    fontSize: 16,
    fontWeight: "500",
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  providerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    fontSize: 14,
    fontWeight: "500",
  },
});
