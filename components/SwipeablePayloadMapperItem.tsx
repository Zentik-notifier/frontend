import { useAppContext } from "@/contexts/AppContext";
import {
  GetPayloadMappersDocument,
  GetPayloadMappersQuery,
  PayloadMapperFragment,
  useDeletePayloadMapperMutation,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Card, Chip, Text, useTheme } from "react-native-paper";
import SwipeableItem, { SwipeAction } from "./SwipeableItem";

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
  });

  const handleEditPress = () => {
    if (isBuiltIn) {
      Alert.alert(t("common.error"), t("payloadMappers.cannotEditBuiltIn"));
      return;
    }
    navigateToEditPayloadMapper(payloadMapper.id);
  };

  const handleDeletePress = async () => {
    if (isBuiltIn) {
      Alert.alert(t("common.error"), t("payloadMappers.cannotDeleteBuiltIn"));
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
            try {
              await deletePayloadMapperMutation({
                variables: { id: payloadMapper.id },
              });
            } catch (error: any) {
              Alert.alert(
                t("common.error"),
                t("payloadMappers.deleteErrorMessage")
              );
            }
          },
        },
      ]
    );
  };

  const swipeActions: SwipeAction[] = [];

  if (!isDisabled) {
    swipeActions.push({
      icon: "pencil",
      label: t("payloadMappers.edit"),
      backgroundColor: theme.colors.secondary,
      onPress: handleEditPress,
    });

    swipeActions.push({
      icon: "delete",
      label: t("payloadMappers.delete"),
      backgroundColor: theme.colors.error,
      onPress: handleDeletePress,
    });
  }

  return (
    <SwipeableItem rightAction={swipeActions[1]} leftAction={swipeActions[0]}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cardContent}>
            <View style={styles.titleRow}>
              <Text
                variant="titleMedium"
                style={[styles.title, isBuiltIn && styles.builtInTitle]}
              >
                {payloadMapper.name}
              </Text>
              {isBuiltIn && (
                <Chip
                  icon="lock"
                  compact
                  style={styles.builtInChip}
                  textStyle={styles.builtInChipText}
                >
                  {t("payloadMappers.builtIn")}
                </Chip>
              )}
            </View>
            <Text variant="bodySmall" style={styles.subtitle}>
              {t("common.created")}:{" "}
              {new Date(payloadMapper.createdAt).toLocaleDateString()}
            </Text>
            {payloadMapper.builtInName && (
              <Text variant="bodySmall" style={styles.builtInText}>
                Built-in: {payloadMapper.builtInName}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.codePreview}>
          <Text variant="bodySmall" style={styles.codeLabel}>
            {t("payloadMappers.form.jsEvalFn")}:
          </Text>
          <Text style={styles.codeText} numberOfLines={3}>
            {payloadMapper.jsEvalFn}
          </Text>
        </View>
      </Card.Content>
    </SwipeableItem>
  );
};

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    flex: 1,
  },
  subtitle: {
    color: "#6b7280",
  },
  actions: {
    flexDirection: "row",
  },
  codePreview: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  codeLabel: {
    fontWeight: "600",
    marginBottom: 4,
    color: "#374151",
  },
  codeText: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 16,
  },
  builtInCard: {
    opacity: 0.7,
    backgroundColor: "#f9fafb",
  },
  builtInTitle: {
    color: "#6b7280",
  },
  builtInChip: {
    backgroundColor: "#e5e7eb",
    marginLeft: 8,
  },
  builtInChipText: {
    color: "#374151",
    fontSize: 12,
  },
  builtInText: {
    color: "#059669",
    fontWeight: "500",
    marginTop: 4,
  },
});

export default SwipeablePayloadMapperItem;
