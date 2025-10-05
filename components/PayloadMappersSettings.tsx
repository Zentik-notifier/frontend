import {
  useGetPayloadMappersQuery
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Card,
  Icon,
  List,
  Text
} from "react-native-paper";
import SwipeablePayloadMapperItem from "./SwipeablePayloadMapperItem";
import PaperScrollView from "./ui/PaperScrollView";

export default function PayloadMappersSettings() {
  const { t } = useI18n();
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
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          {t("payloadMappers.title")}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {t("payloadMappers.description")}
        </Text>
      </View>

      {allPayloadMappers.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.centered}>
            <Icon source="function" size={48} color="#9ca3af" />
            <Text variant="titleMedium" style={styles.emptyTitle}>
              {t("payloadMappers.noPayloadMappersTitle")}
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtitle}>
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
              style={styles.builtInAccordion}
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
  loadingText: {
    marginTop: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    color: "#6b7280",
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
  builtInText: {
    color: "#059669",
    fontWeight: "500",
    marginTop: 4,
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  builtInAccordion: {
    backgroundColor: "#f3f4f6",
    marginVertical: 8,
  },
  emptyCard: {
    marginTop: 24,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
    color: "#6b7280",
  },
  emptySubtitle: {
    textAlign: "center",
    color: "#9ca3af",
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
