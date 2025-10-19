import { useAppContext } from "@/contexts/AppContext";
import {
  GetPayloadMappersDocument,
  GetPayloadMappersQuery,
  PayloadMapperFragment,
  useDeletePayloadMapperMutation,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useMemo } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Chip, Text, useTheme } from "react-native-paper";
import SwipeableItem, { MenuItem, SwipeAction } from "./SwipeableItem";

interface SwipeablePayloadMapperItemProps {
  payloadMapper: PayloadMapperFragment;
}

const SwipeablePayloadMapperItem: React.FC<SwipeablePayloadMapperItemProps> = ({
  payloadMapper,
}) => {
  const { t } = useI18n();
  const theme = useTheme();
  const { navigateToEditPayloadMapper } = useNavigationUtils();
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();

  const isBuiltIn = !!payloadMapper.builtInName;
  const isDisabled = isOfflineAuth || isBackendUnreachable || isBuiltIn;

  const [deletePayloadMapperMutation] = useDeletePayloadMapperMutation({
    update: (cache, { data }) => {
      if (data?.deletePayloadMapper) {
        const existingPayloadMappers = cache.readQuery<GetPayloadMappersQuery>({
          query: GetPayloadMappersDocument,
        });
        if (existingPayloadMappers?.payloadMappers) {
          cache.writeQuery({
            query: GetPayloadMappersDocument,
            data: {
              payloadMappers: existingPayloadMappers.payloadMappers.filter(
                (mapper: PayloadMapperFragment) =>
                  mapper.id !== payloadMapper.id
              ),
            },
          });
        }
      }
    },
    onError: (error) => {
      console.error("Error deleting payload mapper:", error);
      Alert.alert(
        t("common.error"),
        error.message || t("payloadMappers.deleteErrorMessage")
      );
    },
  });

  const handleEditPress = () => {
    navigateToEditPayloadMapper(payloadMapper.id);
  };

  const handleDeletePress = async () => {
    if (isBuiltIn) {
      return;
    }

    Alert.alert(
      t("payloadMappers.deleteConfirmTitle"),
      t("payloadMappers.deleteConfirmMessage"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("payloadMappers.delete"),
          style: "destructive",
          onPress: async () => {
            await deletePayloadMapperMutation({
              variables: { id: payloadMapper.id },
            });
          },
        },
      ]
    );
  };

  // Define left and right swipe actions
  const leftAction: SwipeAction | undefined = {
    icon: "pencil",
    label: t("payloadMappers.edit"),
    backgroundColor: theme.colors.primary,
    onPress: handleEditPress,
  };

  const rightAction: SwipeAction | undefined = !isDisabled
    ? {
        icon: "delete",
        label: t("payloadMappers.delete"),
        destructive: true,
        onPress: handleDeletePress,
      }
    : undefined;

  return (
    <SwipeableItem
      showMenu={!isDisabled}
      leftAction={leftAction}
      rightAction={rightAction}
      cardStyle={[
        {
          backgroundColor: isBuiltIn
            ? theme.colors.surfaceVariant
            : theme.colors.surface,
          opacity: isBuiltIn ? 0.8 : 1,
        },
      ]}
    >
      <Pressable onPress={handleEditPress}>
        <View style={styles.mapperContent}>
          <View style={styles.mapperHeader}>
            <View style={styles.mapperInfo}>
              <View style={styles.titleRow}>
                <Text
                  variant="titleMedium"
                  style={[
                    styles.mapperName,
                    isBuiltIn && { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {payloadMapper.name}
                </Text>
                {isBuiltIn && (
                  <Chip
                    icon="lock"
                    compact
                    style={[
                      styles.builtInChip,
                      { backgroundColor: theme.colors.surfaceVariant },
                    ]}
                    textStyle={[
                      styles.builtInChipText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t("payloadMappers.builtIn")}
                  </Chip>
                )}
              </View>
              {!isBuiltIn && (
                <Text
                  variant="bodySmall"
                  style={[
                    styles.mapperSubtitle,
                    { color: theme.colors.outline },
                  ]}
                >
                  {t("common.created")}:{" "}
                  {new Date(payloadMapper.createdAt).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    </SwipeableItem>
  );
};

const styles = StyleSheet.create({
  mapperContent: {
    padding: 16,
  },
  mapperHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  mapperIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    // backgroundColor will be set dynamically
  },
  iconText: {
    fontSize: 24,
  },
  mapperInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  mapperName: {
    flex: 1,
    marginBottom: 0,
  },
  mapperSubtitle: {
    // color will be set dynamically
  },
  codePreview: {
    padding: 12,
    borderRadius: 8,
    // backgroundColor will be set dynamically
  },
  codeLabel: {
    fontWeight: "600",
    marginBottom: 4,
    // color will be set dynamically
  },
  codeText: {
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 16,
    // color will be set dynamically
  },
  builtInChip: {
    marginLeft: 8,
    // backgroundColor will be set dynamically
  },
  builtInChipText: {
    fontSize: 12,
    // color will be set dynamically
  },
  builtInText: {
    fontWeight: "500",
    marginTop: 4,
    // color will be set dynamically
  },
});

export default SwipeablePayloadMapperItem;
