import {
  EntityExecutionFragment,
  ExecutionType,
  ExecutionStatus,
  useGetEntityExecutionsQuery,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React, { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
  ScrollView,
} from "react-native";
import {
  ActivityIndicator,
  Card,
  Chip,
  Text,
  useTheme,
  IconButton,
  Divider,
} from "react-native-paper";
import { FlashList } from "@shopify/flash-list";
import CopyButton from "./ui/CopyButton";

interface EntityExecutionsSectionProps {
  entityId?: string;
  entityType: ExecutionType;
  entityName?: string;
}

export interface ExecutionItemProps {
  execution: EntityExecutionFragment;
  isExpanded: boolean;
  onToggle: () => void;
  showEntityName?: boolean;
}

export const ExecutionItem = React.memo(function ExecutionItem({ execution, isExpanded, onToggle, showEntityName }: ExecutionItemProps) {
  const theme = useTheme();
  const { t } = useI18n();

  const getStatusColor = (status: ExecutionStatus) => {
    switch (status) {
      case ExecutionStatus.Success:
        return theme.colors.primary;
      case ExecutionStatus.Error:
        return theme.colors.error;
      case ExecutionStatus.Timeout:
        return theme.colors.tertiary;
      case ExecutionStatus.Skipped:
        return theme.colors.outline;
      default:
        return theme.colors.onSurface;
    }
  };

  const formatDuration = (durationMs?: number | null) => {
    if (!durationMs) return "";
    return `${durationMs}ms`;
  };


  return (
    <Card style={styles.executionCard}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
        <Card.Content>
          <View style={styles.executionHeader}>
            <View style={styles.executionHeaderLeft}>
              <Chip
                mode="outlined"
                compact
                style={[{ borderColor: getStatusColor(execution.status) }]}
                textStyle={{ color: getStatusColor(execution.status) }}
              >
                {execution.status}
              </Chip>
              {showEntityName && execution.entityName && (
                <Text variant="bodySmall" style={styles.entityNameText}>
                  {execution.entityName}
                </Text>
              )}
              <Text variant="bodySmall" style={styles.executionDate}>
                {new Date(execution.createdAt).toLocaleString()}
              </Text>
              {execution.durationMs && (
                <Text variant="bodySmall" style={styles.durationText}>
                  • {formatDuration(execution.durationMs)}
                </Text>
              )}
            </View>
            <IconButton
              icon={isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              style={{ margin: 0 }}
            />
          </View>
        </Card.Content>
      </TouchableOpacity>

      {isExpanded && (
        <Card.Content style={styles.expandedContent}>
          <Divider style={{ marginBottom: 12 }} />
          <ExecutionExpandedContent execution={execution} />
        </Card.Content>
      )}
    </Card>
  );
});

export interface ExecutionExpandedContentProps {
  execution: EntityExecutionFragment;
}

export function ExecutionExpandedContent({ execution }: ExecutionExpandedContentProps) {
  const theme = useTheme();
  const { t } = useI18n();

  const formatJsonString = (jsonString?: string | null) => {
    if (!jsonString) return "";
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonString;
    }
  };

  return (
    <View>
      {/* Type and Details Grid */}
      <View style={styles.detailsGrid}>
        {/* <View style={styles.detailRow}>
          <Text variant="bodySmall" style={styles.detailLabel}>
            {t("entityExecutions.type")}:
          </Text>
          <Text variant="bodySmall" style={styles.detailValue}>
            {execution.type}
          </Text>
        </View> */}

        {/* <View style={styles.detailRow}>
          <Text variant="bodySmall" style={styles.detailLabel}>
            ID:
          </Text>
          <Text variant="bodySmall" style={styles.detailValue}>
            {execution.id}
          </Text>
        </View> */}

        {execution.entityName && (
          <View style={styles.detailRow}>
            <Text variant="bodySmall" style={styles.detailLabel}>
              {t("entityExecutions.entityName")}:
            </Text>
            <Text variant="bodySmall" style={styles.detailValue}>
              {execution.entityName}
            </Text>
          </View>
        )}

        {execution.entityId && (
          <View style={styles.detailRow}>
            <Text variant="bodySmall" style={styles.detailLabel}>
              {t("entityExecutions.entityId")}:
            </Text>
            <Text variant="bodySmall" style={styles.detailValue}>
              {execution.entityId}
            </Text>
          </View>
        )}

        {/* <View style={styles.detailRow}>
          <Text variant="bodySmall" style={styles.detailLabel}>
            {t("entityExecutions.userId")}:
          </Text>
          <Text variant="bodySmall" style={styles.detailValue}>
            {execution.userId}
          </Text>
        </View> */}
{/* 
        <View style={styles.detailRow}>
          <Text variant="bodySmall" style={styles.detailLabel}>
            {t("entityExecutions.updatedAt")}:
          </Text>
          <Text variant="bodySmall" style={styles.detailValue}>
            {new Date(execution.updatedAt).toLocaleString()}
          </Text>
        </View> */}
      </View>

      {/* Errors */}
      {execution.errors && (
        <View style={styles.codeSection}>
          <View style={styles.codeSectionHeader}>
            <Text variant="labelMedium" style={styles.codeLabel}>
              {t("entityExecutions.errors")}:
            </Text>
            <CopyButton text={execution.errors} size={20} />
          </View>
          <ScrollView style={styles.codeScrollView} nestedScrollEnabled>
            <TextInput
              value={execution.errors}
              multiline
              editable={false}
              scrollEnabled={false}
              style={[
                styles.codeInput,
                {
                  backgroundColor: theme.colors.errorContainer,
                  color: theme.colors.error,
                  borderLeftWidth: 4,
                  borderLeftColor: theme.colors.error,
                },
              ]}
            />
          </ScrollView>
        </View>
      )}

      {/* Input */}
      {execution.input && (
        <View style={styles.codeSection}>
          <View style={styles.codeSectionHeader}>
            <Text variant="labelMedium" style={styles.codeLabel}>
              {t("entityExecutions.input")}:
            </Text>
            <CopyButton text={formatJsonString(execution.input)} size={20} />
          </View>
          <ScrollView style={styles.codeScrollView} nestedScrollEnabled>
            <TextInput
              value={formatJsonString(execution.input)}
              multiline
              editable={false}
              scrollEnabled={false}
              style={[
                styles.codeInput,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  color: theme.colors.onSurface,
                },
              ]}
            />
          </ScrollView>
        </View>
      )}

      {/* Output */}
      {execution.output && (
        <View style={styles.codeSection}>
          <View style={styles.codeSectionHeader}>
            <Text variant="labelMedium" style={styles.codeLabel}>
              {t("entityExecutions.output")}:
            </Text>
            <CopyButton text={formatJsonString(execution.output)} size={20} />
          </View>
          <ScrollView style={styles.codeScrollView} nestedScrollEnabled>
            <TextInput
              value={formatJsonString(execution.output)}
              multiline
              editable={false}
              scrollEnabled={false}
              style={[
                styles.codeInput,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  color: theme.colors.onSurface,
                },
              ]}
            />
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export default function EntityExecutionsSection({
  entityId,
  entityType,
  entityName,
}: EntityExecutionsSectionProps) {
  const { t } = useI18n();

  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedExecutionId, setExpandedExecutionId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useGetEntityExecutionsQuery({
    variables: {
      input: {
        type: entityType,
        entityId,
        entityName,
      },
    },
    skip: !isExpanded,
  });

  const executions = data?.getEntityExecutions || [];
  const hasExecutions = executions.length > 0;

  const handleToggleExecution = (executionId: string) => {
    setExpandedExecutionId(
      expandedExecutionId === executionId ? null : executionId
    );
  };

  return (
    <View style={styles.section}>
      <Card
        style={styles.sectionCard}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t("entityExecutions.title")}
            </Text>
            <View style={styles.sectionHeaderRight}>
              {isExpanded && (
                <IconButton
                  icon="refresh"
                  size={20}
                  onPress={() => refetch()}
                  disabled={loading}
                  style={{ margin: 0 }}
                />
              )}
              {hasExecutions && (
                <Chip compact mode="outlined">
                  {executions.length}
                </Chip>
              )}
              <Text style={styles.expandIcon}>{isExpanded ? "−" : "+"}</Text>
            </View>
          </View>

          {!isExpanded && hasExecutions && (
            <Text variant="bodySmall" style={styles.sectionSummary}>
              {t("entityExecutions.lastExecutions", {
                count: executions.length,
              })}
            </Text>
          )}
        </Card.Content>
      </Card>

      {isExpanded && (
        <View style={styles.executionsContainer}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" />
              <Text variant="bodySmall" style={styles.loadingText}>
                {t("common.loading")}
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text variant="bodySmall" style={styles.errorText}>
                {t("common.error")}: {error.message}
              </Text>
            </View>
          )}

          {!loading && !error && !hasExecutions && (
            <View style={styles.emptyContainer}>
              <Text variant="bodySmall" style={styles.emptyText}>
                {t("entityExecutions.noExecutions")}
              </Text>
            </View>
          )}

          {!loading && !error && hasExecutions && (
            <FlashList
              data={executions}
              renderItem={({ item }) => (
                <ExecutionItem
                  execution={item}
                  isExpanded={expandedExecutionId === item.id}
                  onToggle={() => handleToggleExecution(item.id)}
                  showEntityName={!entityName}
                />
              )}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              onRefresh={() => refetch()}
              refreshing={loading}
              style={{ maxHeight: 500 }}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 16,
  },
  sectionCard: {
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontWeight: "600",
  },
  sectionSummary: {
    marginTop: 8,
    opacity: 0.7,
  },
  expandIcon: {
    fontSize: 24,
    fontWeight: "bold",
    opacity: 0.6,
  },
  executionsContainer: {
    marginTop: 8,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  loadingText: {
    opacity: 0.7,
  },
  errorContainer: {
    padding: 16,
    alignItems: "center",
  },
  errorText: {
    color: "#dc3545",
    textAlign: "center",
  },
  emptyContainer: {
    padding: 16,
    alignItems: "center",
  },
  emptyText: {
    opacity: 0.7,
    textAlign: "center",
  },
  executionCard: {
    // marginBottom: 8,
    elevation: 1,
  },
  executionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  executionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    flexWrap: "wrap",
  },
  executionDate: {
    opacity: 0.7,
  },
  entityNameText: {
    opacity: 0.85,
    fontWeight: "600",
  },
  durationText: {
    opacity: 0.7,
  },
  expandedContent: {
    paddingTop: 0,
  },
  detailsGrid: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    opacity: 0.7,
    minWidth: 100,
  },
  detailValue: {
    flex: 1,
    textAlign: "right",
  },
  codeSection: {
    marginTop: 12,
  },
  codeSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  codeLabel: {
    fontWeight: "600",
  },
  codeScrollView: {
    maxHeight: 200,
    borderRadius: 8,
  },
  codeInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 18,
    textAlignVertical: "top",
  },
});
