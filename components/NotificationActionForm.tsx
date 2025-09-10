import { Colors } from "@/constants/Colors";
import {
  HttpMethod,
  NotificationActionType
} from "@/generated/gql-operations-generated";
import { useNotificationUtils } from "@/hooks";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import React from "react";
import {
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { ThemedText } from "./ThemedText";
import { IconButton, InlinePicker, InlinePickerOption } from "./ui";
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
  webhookOptions?: InlinePickerOption<string>[];
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
  const colorScheme = useColorScheme();
  const { getActionTypeFriendlyName, getActionTypeIcon } = useNotificationUtils();

  const actionTypeOptions: InlinePickerOption<NotificationActionType>[] = [
    NotificationActionType.Navigate,
    NotificationActionType.BackgroundCall,
    NotificationActionType.Webhook,
    NotificationActionType.OpenNotification,
  ].map((actionType) => ({
    value: actionType,
    label: getActionTypeFriendlyName(actionType),
    icon: getActionTypeIcon(actionType),
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
          backgroundColor: Colors[colorScheme ?? "light"].backgroundSecondary,
          borderColor: Colors[colorScheme ?? "light"].border,
        },
      ]}
    >
      <InlinePicker
        label={t("notifications.actions.actionType")}
        selectedValue={actionType}
        options={actionTypeOptions}
        onValueChange={(value) => {
          onActionTypeChange(value as NotificationActionType);
        }}
        placeholder={t("notifications.actions.selectActionType")}
      />

      <View style={styles.field}>
        <ThemedText style={styles.label}>
          {t("notifications.actions.actionValue")}
        </ThemedText>
        {actionType === NotificationActionType.Webhook ? (
          hasWebhooks ? (
            <InlinePicker
              selectedValue={actionValue}
              options={webhookOptions}
              onValueChange={onActionValueChange}
              placeholder={t("notifications.actions.selectWebhook")}
              searchable={true}
              searchPlaceholder={t("notifications.actions.searchWebhooks")}
            />
          ) : (
            <View
              style={[
                styles.noWebhooksContainer,
                {
                  backgroundColor:
                    Colors[colorScheme ?? "light"].backgroundSecondary,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.noWebhooksText,
                  {
                    color: Colors[colorScheme ?? "light"].textSecondary,
                  },
                ]}
              >
                {t("notifications.noWebhooks.message", {
                  type: "ACTION",
                })}
              </ThemedText>
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
                backgroundColor: Colors[colorScheme ?? "light"].inputBackground,
                borderColor: Colors[colorScheme ?? "light"].inputBorder,
                color: Colors[colorScheme ?? "light"].text,
              },
            ]}
            value={actionValue}
            onChangeText={onActionValueChange}
            placeholder={t("notifications.actions.actionValuePlaceholder")}
            placeholderTextColor={
              Colors[colorScheme ?? "light"].inputPlaceholder
            }
          />
        )}
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>
          {t("notifications.actions.actionTitle")}
        </ThemedText>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: Colors[colorScheme ?? "light"].inputBackground,
              borderColor: Colors[colorScheme ?? "light"].inputBorder,
              color: Colors[colorScheme ?? "light"].text,
            },
          ]}
          value={actionTitle}
          onChangeText={onActionTitleChange}
          placeholder={t("notifications.actions.actionTitlePlaceholder")}
          placeholderTextColor={
            Colors[colorScheme ?? "light"].inputPlaceholder
          }
          maxLength={50}
        />
      </View>

      <View style={styles.inputContainer}>
        <ThemedText
          style={[
            styles.inputLabel,
            { color: Colors[colorScheme ?? "light"].text },
          ]}
        >
          {t("notifications.actions.iconName")}
        </ThemedText>
        <ThemedText
          style={[
            styles.inputHint,
            { color: Colors[colorScheme ?? "light"].textSecondary },
          ]}
        >
          {t("notifications.actions.iconHint")}
        </ThemedText>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: Colors[colorScheme ?? "light"].inputBackground,
              borderColor: Colors[colorScheme ?? "light"].inputBorder,
              color: Colors[colorScheme ?? "light"].text,
            },
          ]}
          value={actionIconName}
          onChangeText={onActionIconNameChange}
          placeholder={t("notifications.actions.iconNamePlaceholder")}
          placeholderTextColor={
            Colors[colorScheme ?? "light"].inputPlaceholder
          }
          maxLength={50}
        />
      </View>

      <View
        style={[
          styles.switchRow,
          {
            backgroundColor: Colors[colorScheme ?? "light"].backgroundSecondary,
          },
        ]}
      >
        <ThemedText
          style={[
            styles.switchLabel,
            { color: Colors[colorScheme ?? "light"].text },
          ]}
        >
          {t("notifications.actions.destructiveAction")}
        </ThemedText>
        <Switch
          value={actionDestructive}
          onValueChange={onActionDestructiveChange}
          trackColor={{
            false: Colors[colorScheme ?? "light"].border,
            true: Colors[colorScheme ?? "light"].tint,
          }}
        />
      </View>

      <View style={styles.actionFormButtons}>
        <IconButton
          title={t("notifications.form.cancel")}
          iconName="cancel"
          onPress={onCancel}
          variant="secondary"
          size="sm"
        />
        <IconButton
          title={saveButtonTitle}
          iconName={isEditing ? "confirm" : "add"}
          onPress={onSave}
          variant="success"
          size="sm"
          disabled={!isFormValid()}
        />
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
});
