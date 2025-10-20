import {
  EntityExecutionFragment,
  ExecutionType,
  useGetEntityExecutionsQuery,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React, { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
  TextInput,
} from "react-native";
import {
  ActivityIndicator,
  Card,
  Chip,
  Text,
  useTheme,
  IconButton,
} from "react-native-paper";
import { FlashList } from "@shopify/flash-list";
import ExecutionDetailModal from "./ExecutionDetailModal";
import * as Clipboard from "expo-clipboard";

interface EntityExecutionsSectionProps {
  entityId: string;
  entityType: ExecutionType;
  entityName?: string;
}

interface ExecutionItemProps {
  execution: EntityExecutionFragment;
  onPress: (execution: EntityExecutionFragment) => void;
}

function ExecutionItem({ execution, onPress }: ExecutionItemProps) {
  const theme = useTheme();
  const { t } = useI18n();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return theme.colors.primary;
      case "ERROR":
        return theme.colors.error;
      case "TIMEOUT":
        return theme.colors.tertiary;
      case "SKIPPED":
        return theme.colors.outline;
      default:
        return theme.colors.onSurface;
    }
  };

  const formatDuration = (durationMs?: number | null) => {
    if (!durationMs) return "";
    return `${durationMs}ms`;
  };

  const handlePress = () => {
    onPress(execution);
  };

  const handleCopyInput = async () => {
    if (execution.input) {
      await Clipboard.setStringAsync(execution.input);
    }
  };

  const handleCopyOutput = async () => {
    if (execution.output) {
      await Clipboard.setStringAsync(execution.output);
    }
  };

  const handleCopyErrors = async () => {
    if (execution.errors) {
      await Clipboard.setStringAsync(execution.errors);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Card>
        <Card.Content>
          <View style={styles.executionHeader}>
            <Chip
              mode="outlined"
              compact
              style={[{ borderColor: getStatusColor(execution.status) }]}
              textStyle={{ color: getStatusColor(execution.status) }}
            >
              {execution.status}
            </Chip>
            <Text variant="bodySmall" style={styles.executionDate}>
              {new Date(execution.createdAt).toLocaleString()}
            </Text>
          </View>

          <View style={styles.executionDetails}>
            {execution.durationMs && (
              <Text variant="bodySmall" style={styles.durationText}>
                {t("entityExecutions.duration")}:{" "}
                {formatDuration(execution.durationMs)}
              </Text>
            )}

            {execution.errors && (
              <View style={styles.codeSection}>
                <View style={styles.codeSectionHeader}>
                  <Text variant="labelSmall" style={styles.codeLabel}>
                    {t("entityExecutions.errors")}:
                  </Text>
                  <IconButton
                    icon="content-copy"
                    size={16}
                    onPress={handleCopyErrors}
                  />
                </View>
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
              </View>
            )}

            {execution.input && (
              <View style={styles.codeSection}>
                <View style={styles.codeSectionHeader}>
                  <Text variant="labelSmall" style={styles.codeLabel}>
                    {t("entityExecutions.input")}:
                  </Text>
                  <IconButton
                    icon="content-copy"
                    size={16}
                    onPress={handleCopyInput}
                  />
                </View>
                <TextInput
                  value={execution.input}
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
              </View>
            )}

            {execution.output && (
              <View style={styles.codeSection}>
                <View style={styles.codeSectionHeader}>
                  <Text variant="labelSmall" style={styles.codeLabel}>
                    {t("entityExecutions.output")}:
                  </Text>
                  <IconButton
                    icon="content-copy"
                    size={16}
                    onPress={handleCopyOutput}
                  />
                </View>
                <TextInput
                  value={execution.output}
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
              </View>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

export default function EntityExecutionsSection({
  entityId,
  entityType,
  entityName,
}: EntityExecutionsSectionProps) {
  const { t } = useI18n();

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedExecution, setSelectedExecution] =
    useState<EntityExecutionFragment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

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

  const handleExecutionPress = (execution: EntityExecutionFragment) => {
    setSelectedExecution(execution);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedExecution(null);
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
                  onPress={handleExecutionPress}
                />
              )}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              onRefresh={refetch}
              refreshing={loading}
              style={{ maxHeight: 500 }}
            />
          )}
        </View>
      )}

      {/* Execution Detail Modal */}
      <ExecutionDetailModal
        visible={modalVisible}
        execution={selectedExecution}
        onClose={handleCloseModal}
      />
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
  executionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  executionDate: {
    opacity: 0.7,
  },
  executionDetails: {
    gap: 4,
  },
  durationText: {
    opacity: 0.8,
  },
  codeSection: {
    marginTop: 8,
  },
  codeSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  codeLabel: {
    opacity: 0.8,
  },
  codeInput: {
    padding: 8,
    borderRadius: 4,
    fontFamily: "monospace",
    fontSize: 12,
    maxHeight: 200,
    textAlignVertical: "top",
  },
});
