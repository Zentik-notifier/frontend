import {
  OAuthProviderFragment,
  OAuthProviderType,
  useToggleOAuthProviderMutation,
  useDeleteOAuthProviderMutation,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/contexts/AppContext";
import React, { useMemo } from "react";
import { Alert, StyleSheet, Pressable, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import SwipeableItem, { MenuItem } from "./SwipeableItem";
import { Image } from "expo-image";
import { useNavigationUtils } from "@/utils/navigation";

interface SwipeableOauthProviderItemProps {
  provider: OAuthProviderFragment;
  onDelete: (provider: OAuthProviderFragment) => void;
}

const SwipeableOauthProviderItem: React.FC<SwipeableOauthProviderItemProps> = ({
  provider,
  onDelete,
}) => {
  const { t } = useI18n();
  const theme = useTheme();
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const { navigateToEditOAuthProvider } = useNavigationUtils();

  const [toggleOAuthProvider] = useToggleOAuthProviderMutation({
    onError: (error) => {
      console.error("Error toggling OAuth provider:", error);
      Alert.alert(
        t("common.error"),
        t("administration.oauthProviderForm.errorTogglingOAuthProvider")
      );
    },
    update: (cache, { data }) => {
      if (data?.toggleOAuthProvider) {
        cache.modify({
          id: cache.identify({ __typename: "OAuthProvider", id: provider.id }),
          fields: {
            isEnabled: () => data.toggleOAuthProvider.isEnabled,
          },
        });
      }
    },
  });

  const [deleteOAuthProvider] = useDeleteOAuthProviderMutation({
    onError: (error) => {
      console.error("Error deleting OAuth provider:", error);
      Alert.alert(
        t("common.error"),
        t("administration.oauthProviderForm.errorDeletingOAuthProvider")
      );
    },
  });

  const handleTogglePress = async () => {
    await toggleOAuthProvider({
      variables: {
        id: provider.id,
      },
    });
  };

  const handleDeletePress = async () => {
    await deleteOAuthProvider({
      variables: {
        id: provider.id,
      },
    });
    onDelete(provider);
  };

  const menuItems = useMemo((): MenuItem[] => {
    const items: MenuItem[] = [];

    items.push({
      id: "edit",
      label: t("administration.oauthProviderForm.editProvider"),
      icon: "pencil",
      onPress: () => navigateToEditOAuthProvider(provider.id),
    });

    return items;
  }, [t, provider, navigateToEditOAuthProvider]);

  const leftAction = {
    icon: provider.isEnabled ? "pause-circle" : "play-circle",
    label: provider.isEnabled
      ? t("administration.oauthProviderForm.disable")
      : t("administration.oauthProviderForm.enable"),
    backgroundColor: provider.isEnabled
      ? theme.colors.error
      : theme.colors.primary,
    onPress: handleTogglePress,
  };

  // Only show delete action for custom providers (not built-in like GITHUB, GOOGLE)
  const rightAction =
    provider.type === OAuthProviderType.CUSTOM
      ? {
          icon: "delete",
          label: t("administration.oauthProviderForm.deleteProvider"),
          destructive: true,
          onPress: handleDeletePress,
          showAlert: {
            title: t("administration.oauthProviderForm.confirmDeleteProviderTitle"),
            message: t(
              "administration.oauthProviderForm.confirmDeleteProviderMessage",
              {
                providerName: provider.name,
              }
            ),
            confirmText: t("common.delete"),
            cancelText: t("common.cancel"),
          },
        }
      : undefined;

  return (
    <SwipeableItem
      menuItems={menuItems}
      showMenu={true}
      leftAction={
        !(isOfflineAuth || isBackendUnreachable) ? leftAction : undefined
      }
      rightAction={
        !(isOfflineAuth || isBackendUnreachable) ? rightAction : undefined
      }
      cardStyle={[
        {
          backgroundColor: provider.isEnabled
            ? theme.colors.surface
            : theme.colors.outlineVariant, // Colore outline più scuro quando disabilitato
        },
      ]}
    >
      <Pressable onPress={() => navigateToEditOAuthProvider(provider.id)}>
        <View
          style={[
            styles.providerCard,
            {
              opacity: provider.isEnabled ? 1 : 0.7,
            },
          ]}
        >
          <View style={styles.providerInfo}>
            <View
              style={[
                styles.providerIcon,
                {
                  backgroundColor: `${provider.color}15`,
                },
              ]}
            >
              {provider.iconUrl && (
                <Image
                  source={{ uri: provider.iconUrl }}
                  style={{ width: 24, height: 24 }}
                  resizeMode="contain"
                />
              )}
            </View>
            <View style={styles.providerDetails}>
              <Text variant="titleMedium" style={styles.providerName}>
                {provider.name}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </SwipeableItem>
  );
};

const styles = StyleSheet.create({
  providerCard: {
    padding: 16,
  },
  providerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  providerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    marginBottom: 4,
  },
});

export default SwipeableOauthProviderItem;
