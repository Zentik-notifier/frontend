import {
  EntityExecutionFragment,
  ExecutionStatus,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Chip, Modal, Portal, Text, useTheme } from "react-native-paper";

interface ExecutionDetailModalProps {
  visible: boolean;
  execution: EntityExecutionFragment | null;
  onClose: () => void;
}

export default function ExecutionDetailModal({
  visible,
  execution,
  onClose,
}: ExecutionDetailModalProps) {
  const theme = useTheme();
  const { t } = useI18n();

  if (!execution) return null;

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
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Card
          style={[
            styles.modalCard,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <Card.Content>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text variant="titleLarge" style={styles.modalTitle}>
                {t("entityExecutions.details")}
              </Text>

              <View style={styles.detailsGrid}>
                <View style={styles.detailRow}>
                  <Text variant="bodySmall" style={styles.detailLabel}>
                    ID:
                  </Text>
                  <Text variant="bodySmall" style={styles.detailValue}>
                    {execution.id}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text variant="bodySmall" style={styles.detailLabel}>
                    {t("entityExecutions.type")}:
                  </Text>
                  <Chip
                    mode="outlined"
                    compact
                    style={[{ borderColor: getStatusColor(execution.status) }]}
                    textStyle={{ color: getStatusColor(execution.status) }}
                  >
                    {execution.type}
                  </Chip>
                </View>

                <View style={styles.detailRow}>
                  <Text variant="bodySmall" style={styles.detailLabel}>
                    {t("entityExecutions.status")}:
                  </Text>
                  <Chip
                    mode="outlined"
                    compact
                    style={[{ borderColor: getStatusColor(execution.status) }]}
                    textStyle={{ color: getStatusColor(execution.status) }}
                  >
                    {execution.status}
                  </Chip>
                </View>

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

                <View style={styles.detailRow}>
                  <Text variant="bodySmall" style={styles.detailLabel}>
                    {t("entityExecutions.userId")}:
                  </Text>
                  <Text variant="bodySmall" style={styles.detailValue}>
                    {execution.userId}
                  </Text>
                </View>

                {execution.durationMs && (
                  <View style={styles.detailRow}>
                    <Text variant="bodySmall" style={styles.detailLabel}>
                      {t("entityExecutions.duration")}:
                    </Text>
                    <Text variant="bodySmall" style={styles.detailValue}>
                      {formatDuration(execution.durationMs)}
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text variant="bodySmall" style={styles.detailLabel}>
                    {t("entityExecutions.createdAt")}:
                  </Text>
                  <Text variant="bodySmall" style={styles.detailValue}>
                    {new Date(execution.createdAt).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text variant="bodySmall" style={styles.detailLabel}>
                    {t("entityExecutions.updatedAt")}:
                  </Text>
                  <Text variant="bodySmall" style={styles.detailValue}>
                    {new Date(execution.updatedAt).toLocaleString()}
                  </Text>
                </View>
              </View>

              {execution.errors && (
                <View style={styles.errorSection}>
                  <Text variant="bodySmall" style={styles.errorLabel}>
                    {t("entityExecutions.errors")}:
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={[
                      styles.errorText,
                      {
                        color: theme.colors.error,
                        backgroundColor: theme.colors.errorContainer,
                        borderLeftColor: theme.colors.error,
                      },
                    ]}
                  >
                    {execution.errors}
                  </Text>
                </View>
              )}

              {execution.input && (
                <View style={styles.codeSection}>
                  <Text variant="labelMedium" style={styles.codeLabel}>
                    {t("entityExecutions.input")}:
                  </Text>
                  <ScrollView
                    style={[
                      styles.jsonContainer,
                      {
                        backgroundColor: theme.colors.surfaceVariant,
                        borderColor: theme.colors.outline,
                      },
                    ]}
                    nestedScrollEnabled
                  >
                    <Text
                      variant="bodySmall"
                      style={[
                        styles.jsonText,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {formatJsonString(execution.input)}
                    </Text>
                  </ScrollView>
                </View>
              )}

              {execution.output && (
                <View style={styles.codeSection}>
                  <Text variant="labelMedium" style={styles.codeLabel}>
                    {t("entityExecutions.output")}:
                  </Text>
                  <ScrollView
                    style={[
                      styles.jsonContainer,
                      {
                        backgroundColor: theme.colors.surfaceVariant,
                        borderColor: theme.colors.outline,
                      },
                    ]}
                    nestedScrollEnabled
                  >
                    <Text
                      variant="bodySmall"
                      style={[
                        styles.jsonText,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {formatJsonString(execution.output)}
                    </Text>
                  </ScrollView>
                </View>
              )}
            </ScrollView>
          </Card.Content>
        </Card>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    borderRadius: 8,
  },
  modalCard: {
    // Background color will be applied inline
  },
  modalTitle: {
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  detailsGrid: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    opacity: 0.7,
    minWidth: 80,
  },
  detailValue: {
    flex: 1,
    textAlign: "right",
  },
  errorSection: {
    marginTop: 8,
  },
  errorLabel: {
    marginBottom: 4,
    fontWeight: "600",
  },
  errorText: {
    padding: 8,
    borderRadius: 4,
    borderLeftWidth: 4,
  },
  codeSection: {
    marginTop: 8,
  },
  codeLabel: {
    marginBottom: 8,
    fontWeight: "600",
  },
  jsonContainer: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    maxHeight: 200,
  },
  jsonText: {
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 18,
    padding: 12,
  },
});
