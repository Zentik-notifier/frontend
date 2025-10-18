import {
  EntityExecutionFragment,
  ExecutionStatus,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React from "react";
import { ScrollView, StyleSheet, View, TextInput } from "react-native";
import { Card, Chip, Modal, Portal, Text, useTheme, IconButton } from "react-native-paper";
import * as Clipboard from "expo-clipboard";

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

  const handleCopyErrors = async () => {
    if (execution.errors) {
      await Clipboard.setStringAsync(execution.errors);
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
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={styles.modalTitle}>
                {t("entityExecutions.details")}
              </Text>
              <IconButton
                icon="close"
                size={24}
                onPress={onClose}
                style={styles.closeButton}
              />
            </View>
            
            <ScrollView 
              showsVerticalScrollIndicator={false}
              style={styles.modalScrollView}
            >

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
                <View style={styles.codeSection}>
                  <View style={styles.codeSectionHeader}>
                    <Text variant="labelMedium" style={styles.codeLabel}>
                      {t("entityExecutions.errors")}:
                    </Text>
                    <IconButton
                      icon="content-copy"
                      size={20}
                      onPress={handleCopyErrors}
                    />
                  </View>
                  <TextInput
                    value={execution.errors}
                    multiline
                    editable={false}
                    scrollEnabled
                    style={[
                      styles.jsonInput,
                      {
                        backgroundColor: theme.colors.errorContainer,
                        borderColor: theme.colors.error,
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
                    <Text variant="labelMedium" style={styles.codeLabel}>
                      {t("entityExecutions.input")}:
                    </Text>
                  </View>
                  <TextInput
                    value={formatJsonString(execution.input)}
                    multiline
                    editable={false}
                    scrollEnabled
                    style={[
                      styles.jsonInput,
                      {
                        backgroundColor: theme.colors.surfaceVariant,
                        borderColor: theme.colors.outline,
                        color: theme.colors.onSurface,
                      },
                    ]}
                  />
                </View>
              )}

              {execution.output && (
                <View style={styles.codeSection}>
                  <View style={styles.codeSectionHeader}>
                    <Text variant="labelMedium" style={styles.codeLabel}>
                      {t("entityExecutions.output")}:
                    </Text>
                  </View>
                  <TextInput
                    value={formatJsonString(execution.output)}
                    multiline
                    editable={false}
                    scrollEnabled
                    style={[
                      styles.jsonInput,
                      {
                        backgroundColor: theme.colors.surfaceVariant,
                        borderColor: theme.colors.outline,
                        color: theme.colors.onSurface,
                      },
                    ]}
                  />
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
    maxHeight: "85%",
  },
  modalCard: {
    maxHeight: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontWeight: "600",
    flex: 1,
  },
  closeButton: {
    margin: 0,
  },
  modalScrollView: {
    maxHeight: "100%",
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
  codeSection: {
    marginTop: 8,
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
  jsonInput: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    maxHeight: 300,
    minHeight: 100,
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 18,
    padding: 12,
    textAlignVertical: "top",
  },
});
