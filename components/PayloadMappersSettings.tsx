import { useGetPayloadMappersQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Card, Icon, List, Text, useTheme } from "react-native-paper";
import SwipeablePayloadMapperItem from "./SwipeablePayloadMapperItem";
import PaperScrollView from "./ui/PaperScrollView";

export default function PayloadMappersSettings() {
  const { t } = useI18n();
  const theme = useTheme();
  const { navigateToCreatePayloadMapper, navigateToEditPayloadMapper } =
    useNavigationUtils();

  const [builtInExpanded, setBuiltInExpanded] = useState(false);

  const {
    data: payloadMappersData,
    loading: loadingPayloadMappers,
    refetch,
    error: errorPayloadMappers,
  } = useGetPayloadMappersQuery();

  const handleCreate = () => {
    navigateToCreatePayloadMapper();
  };

  const allPayloadMappers = payloadMappersData?.payloadMappers || [];
  const customPayloadMappers = allPayloadMappers.filter(
    (mapper) => !mapper.builtInName
  );
  const builtInPayloadMappers = allPayloadMappers.filter(
    (mapper) => !!mapper.builtInName
  );

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <PaperScrollView
      onRefresh={handleRefresh}
      loading={loadingPayloadMappers}
      onAdd={handleCreate}
      error={!!errorPayloadMappers && !loadingPayloadMappers}
      onRetry={handleRefresh}
    >
      {allPayloadMappers.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.centered}>
            <Icon source="function" size={48} color={theme.colors.outline} />
            <Text
              variant="titleMedium"
              style={[styles.emptyTitle, { color: theme.colors.outline }]}
            >
              {t("payloadMappers.noPayloadMappersTitle")}
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.emptySubtitle,
                { color: theme.colors.outlineVariant },
              ]}
            >
              {t("payloadMappers.noPayloadMappersSubtext")}
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <View>
          {/* Custom Payload Mappers */}
          {customPayloadMappers.map((item) => (
            <SwipeablePayloadMapperItem key={item.id} payloadMapper={item} />
          ))}

          {/* Built-in Payload Mappers */}
          {builtInPayloadMappers.length > 0 && (
            <List.Accordion
              title={t("payloadMappers.builtIn")}
              description={`${builtInPayloadMappers.length} ${t(
                "payloadMappers.builtIn"
              )}`}
              expanded={builtInExpanded}
              onPress={() => setBuiltInExpanded(!builtInExpanded)}
              left={(props) => <List.Icon {...props} icon="cog" />}
              style={[
                styles.builtInAccordion,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              {builtInPayloadMappers.map((item) => (
                <SwipeablePayloadMapperItem
                  key={item.id}
                  payloadMapper={item}
                />
              ))}
            </List.Accordion>
          )}
        </View>
      )}
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  subtitle: {
    // color will be set dynamically with theme.colors.outline
  },
  card: {
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardContent: {
    flex: 1,
  },
  actions: {
    flexDirection: "row",
  },
  codePreview: {
    marginTop: 12,
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
  builtInText: {
    fontWeight: "500",
    marginTop: 4,
    // color will be set dynamically
  },
  builtInCard: {
    opacity: 0.7,
    // backgroundColor will be set dynamically
  },
  builtInTitle: {
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  builtInAccordion: {
    marginVertical: 8,
    // backgroundColor will be set dynamically
  },
  emptyCard: {
    marginTop: 24,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
    // color will be set dynamically with theme.colors.outline
  },
  emptySubtitle: {
    textAlign: "center",
    // color will be set dynamically with theme.colors.outlineVariant
  },
  separator: {
    height: 8,
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
