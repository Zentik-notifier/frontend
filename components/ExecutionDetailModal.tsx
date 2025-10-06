import { EntityExecutionFragment, ExecutionStatus } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Card,
  Chip,
  Modal,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";

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

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={styles.modalContainer}
      >
        <Card style={styles.modalCard}>
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
                    style={[
                      styles.typeChip,
                      { borderColor: getStatusColor(execution.status) },
                    ]}
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
                    style={[
                      styles.statusChip,
                      { borderColor: getStatusColor(execution.status) },
                    ]}
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
                  <Text variant="bodySmall" style={[styles.errorText, { color: theme.colors.error }]}>
                    {execution.errors}
                  </Text>
                </View>
              )}

              {execution.input && (
                <View style={styles.codeSection}>
                  <Text variant="labelMedium" style={styles.codeLabel}>
                    {t("entityExecutions.input")}:
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={[styles.codeText, { backgroundColor: theme.colors.surfaceVariant }]}
                  >
                    {execution.input}
                  </Text>
                </View>
              )}

              {execution.output && (
                <View style={styles.codeSection}>
                  <Text variant="labelMedium" style={styles.codeLabel}>
                    {t("entityExecutions.output")}:
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={[styles.codeText, { backgroundColor: theme.colors.surfaceVariant }]}
                  >
                    {execution.output}
                  </Text>
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
    backgroundColor: "white",
    margin: 20,
    borderRadius: 8,
    maxHeight: "80%",
  },
  modalCard: {
    backgroundColor: "white",
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
  statusChip: {
    height: 24,
  },
  typeChip: {
    height: 24,
  },
  errorSection: {
    marginTop: 8,
  },
  errorLabel: {
    marginBottom: 4,
    fontWeight: "600",
  },
  errorText: {
    backgroundColor: "#ffebee",
    padding: 8,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: "#f44336",
  },
  codeSection: {
    marginTop: 8,
  },
  codeLabel: {
    marginBottom: 8,
    fontWeight: "600",
  },
  codeText: {
    padding: 12,
    borderRadius: 8,
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 18,
    maxHeight: 150,
  },
});
