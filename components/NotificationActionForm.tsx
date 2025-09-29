import {
  HttpMethod,
  NotificationActionType
} from "@/generated/gql-operations-generated";
import { useNotificationUtils } from "@/hooks";
import { useI18n } from "@/hooks/useI18n";
import React from "react";
import {
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { Text, useTheme, Button } from "react-native-paper";
import Selector from "./ui/Selector";
import WebhookMethodUrlSelector from "./WebhookMethodUrlSelector";

interface NotificationActionFormProps {
  actionType: NotificationActionType | undefined;
  actionValue: string;
  actionTitle: string;
  actionIconName: string;
  actionDestructive: boolean;
  webhookMethod: HttpMethod | undefined;
  webhookUrl: string;
  onActionTypeChange: (type: NotificationActionType) => void;
  onActionValueChange: (value: string) => void;
  onActionTitleChange: (title: string) => void;
  onActionIconNameChange: (iconName: string) => void;
  onActionDestructiveChange: (destructive: boolean) => void;
  onWebhookMethodChange: (method: HttpMethod | undefined) => void;
  onWebhookUrlChange: (url: string) => void;
  onCancel: () => void;
  onSave: () => void;
  saveButtonTitle: string;
  webhookOptions?: Array<{ id: string; name: string; description?: string }>;
  hasWebhooks?: boolean;
  isEditing?: boolean;
}

export default function NotificationActionForm({
  actionType,
  actionValue,
  actionTitle = '',
  actionIconName,
  actionDestructive,
  webhookMethod,
  webhookUrl,
  onActionTypeChange,
  onActionValueChange,
  onActionTitleChange,
  onActionIconNameChange,
  onActionDestructiveChange,
  onWebhookMethodChange,
  onWebhookUrlChange,
  onCancel,
  onSave,
  saveButtonTitle,
  webhookOptions = [],
  hasWebhooks = false,
  isEditing = false,
}: NotificationActionFormProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const { getActionTypeFriendlyName, getActionTypeIcon } = useNotificationUtils();

  const actionTypeOptions = [
    NotificationActionType.Navigate,
    NotificationActionType.BackgroundCall,
    NotificationActionType.Webhook,
    NotificationActionType.OpenNotification,
  ].map((actionType) => ({
    id: actionType,
    name: getActionTypeFriendlyName(actionType),
  }));

  const isFormValid = () => {
    if (!actionType || !actionTitle.trim()) return false;
    
    if (actionType === NotificationActionType.BackgroundCall) {
      return webhookMethod && webhookUrl.trim();
    }
    
    return actionValue.trim();
  };

  return (
    <View
      style={[
        styles.actionForm,
        {
          backgroundColor: theme.colors.surfaceVariant,
          borderColor: theme.colors.outline,
        },
      ]}
    >
      <Selector
        label={t("notifications.actions.actionType")}
        placeholder={t("notifications.actions.selectActionType")}
        options={actionTypeOptions}
        selectedValue={actionType}
        onValueChange={(value) => {
          onActionTypeChange(value as NotificationActionType);
        }}
        isSearchable={false}
      />

      <View style={styles.field}>
        <Text style={styles.label}>
          {t("notifications.actions.actionValue")}
        </Text>
        {actionType === NotificationActionType.Webhook ? (
          hasWebhooks ? (
            <Selector
              selectedValue={actionValue}
              placeholder={t("notifications.actions.selectWebhook")}
              options={webhookOptions}
              onValueChange={onActionValueChange}
              isSearchable={true}
            />
          ) : (
            <View
              style={[
                styles.noWebhooksContainer,
                {
                  backgroundColor:
                    theme.colors.surfaceVariant,
                },
              ]}
            >
              <Text
                style={[
                styles.noWebhooksText,
                {
                  color: theme.colors.onSurfaceVariant,
                },
                ]}
              >
                {t("notifications.noWebhooks.message", {
                  type: "ACTION",
                })}
              </Text>
            </View>
          )
        ) : actionType === NotificationActionType.BackgroundCall ? (
          <WebhookMethodUrlSelector
            method={webhookMethod}
            url={webhookUrl}
            onMethodChange={onWebhookMethodChange}
            onUrlChange={onWebhookUrlChange}
          />
        ) : (
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
                color: theme.colors.onSurface,
              },
            ]}
            value={actionValue}
            onChangeText={onActionValueChange}
            placeholder={t("notifications.actions.actionValuePlaceholder")}
            placeholderTextColor={
              theme.colors.onSurfaceVariant
            }
          />
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>
          {t("notifications.actions.actionTitle")}
        </Text>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
              color: theme.colors.onSurface,
            },
          ]}
          value={actionTitle}
          onChangeText={onActionTitleChange}
          placeholder={t("notifications.actions.actionTitlePlaceholder")}
          placeholderTextColor={
            theme.colors.onSurfaceVariant
          }
          maxLength={50}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text
          style={[
            styles.inputLabel,
            { color: theme.colors.onSurface },
          ]}
        >
          {t("notifications.actions.iconName")}
        </Text>
        <Text
          style={[
            styles.inputHint,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          {t("notifications.actions.iconHint")}
        </Text>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
              color: theme.colors.onSurface,
            },
          ]}
          value={actionIconName}
          onChangeText={onActionIconNameChange}
          placeholder={t("notifications.actions.iconNamePlaceholder")}
          placeholderTextColor={
            theme.colors.onSurfaceVariant
          }
          maxLength={50}
        />
      </View>

      <View
        style={[
          styles.switchRow,
          {
            backgroundColor: theme.colors.surfaceVariant,
          },
        ]}
      >
        <Text
          style={[
            styles.switchLabel,
            { color: theme.colors.onSurface },
          ]}
        >
          {t("notifications.actions.destructiveAction")}
        </Text>
        <Switch
          value={actionDestructive}
          onValueChange={onActionDestructiveChange}
          trackColor={{
            false: theme.colors.outline,
            true: theme.colors.primary,
          }}
        />
      </View>

      <View style={styles.actionFormButtons}>
        <Button
          mode="outlined"
          onPress={onCancel}
          style={styles.button}
        >
          {t("notifications.form.cancel")}
        </Button>
        <Button
          mode="contained"
          onPress={onSave}
          disabled={!isFormValid()}
          style={styles.button}
        >
          {saveButtonTitle}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionForm: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  field: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.7,
    marginBottom: 5,
  },
  textInput: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    padding: 16,
    borderRadius: 8,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  actionFormButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    gap: 10,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 5,
  },
  inputHint: {
    fontSize: 12,
    marginBottom: 8,
    fontStyle: "italic",
  },
  inputContainer: {
    marginBottom: 15,
  },
  noWebhooksContainer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    marginBottom: 8,
    alignItems: "center",
  },
  noWebhooksText: {
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
});
