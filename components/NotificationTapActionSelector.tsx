import {
  HttpMethod,
  NotificationActionDto,
  NotificationActionType,
} from "@/generated/gql-operations-generated";
import { useNotificationUtils } from "@/hooks";
import { useI18n } from "@/hooks/useI18n";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import NotificationActionForm from "./NotificationActionForm";
import {
  Text,
  Icon,
  Button,
  useTheme,
} from "react-native-paper";

interface NotificationTapActionSelectorProps {
  tapAction: NotificationActionDto | null;
  onTapActionChange: (tapAction: NotificationActionDto | null) => void;
  label?: string;
  webhookOptions?: Array<{ id: string; name: string; description?: string }>;
  hasWebhooks?: boolean;
}

export default function NotificationTapActionSelector({
  tapAction,
  onTapActionChange,
  label,
  webhookOptions = [],
  hasWebhooks = false,
}: NotificationTapActionSelectorProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const { getActionTypeFriendlyName,getActionTypeIcon } = useNotificationUtils();

  const [showTapActionForm, setShowTapActionForm] = useState(false);
  const [editingAction, setEditingAction] =
    useState<NotificationActionDto | null>(null);
  const [webhookMethod, setWebhookMethod] = useState<HttpMethod | undefined>(
    undefined
  );
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    if (tapAction && showTapActionForm) {
      setEditingAction(tapAction);
      if (
        tapAction.type === NotificationActionType.BackgroundCall &&
        tapAction.value && tapAction.value.includes(":")
      ) {
        const [method, url] = tapAction.value.split(":");
        setWebhookMethod(method as HttpMethod);
        setWebhookUrl(url);
      } else {
        setWebhookMethod(undefined);
        setWebhookUrl("");
      }
    }
  }, [tapAction, showTapActionForm]);

  const handleSave = () => {
    if (!editingAction) return;

    if (editingAction.type === NotificationActionType.BackgroundCall) {
      if (!webhookMethod || !webhookUrl.trim()) {
        Alert.alert(
          t("common.error"),
          t("notifications.webhookAction.methodRequired") +
            " " +
            t("notifications.webhookAction.urlRequired")
        );
        return;
      }
      onTapActionChange({
        ...editingAction,
        value: `${webhookMethod}:${webhookUrl}`,
      });
    } else if (editingAction.type === NotificationActionType.OpenNotification) {
      const { value, ...rest } = editingAction;
      onTapActionChange(rest);
    } else {
      // For non-webhook actions, ensure the value is set
      if (!editingAction.value || !editingAction.value.trim()) {
        Alert.alert(
          t("common.error"),
          t("notifications.actions.actionValueRequired")
        );
        return;
      }
      onTapActionChange(editingAction);
    }

    setShowTapActionForm(false);
    setEditingAction(null);
    setWebhookMethod(undefined);
    setWebhookUrl("");
  };

  const handleCancel = () => {
    setShowTapActionForm(false);
    setEditingAction(null);
    setWebhookMethod(undefined);
    setWebhookUrl("");
  };

  const handleAddTapAction = () => {
    const newAction: NotificationActionDto = {
      type: NotificationActionType.OpenNotification,
      destructive: false,
      icon: "",
      title: "Open",
    };
    onTapActionChange(newAction);
    setEditingAction(newAction);
    setShowTapActionForm(true);
    // Reset webhook values for new actions
    setWebhookMethod(undefined);
    setWebhookUrl("");
  };

  const handleEditTapAction = () => {
    if (tapAction) {
      setEditingAction(tapAction);
      if (
        tapAction.type === NotificationActionType.BackgroundCall &&
        tapAction.value && tapAction.value.includes(":")
      ) {
        const [method, url] = tapAction.value.split(":");
        setWebhookMethod(method as HttpMethod);
        setWebhookUrl(url);
      } else {
        setWebhookMethod(undefined);
        setWebhookUrl("");
      }
      setShowTapActionForm(true);
    }
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label || t("notifications.tapAction.title")}
      </Text>
      <Text
        style={[
          styles.inputHint,
          { color: theme.colors.onSurfaceVariant },
        ]}
      >
        {t("notifications.tapAction.description")}
      </Text>

      {tapAction ? (
        <View
          style={[
            styles.actionItem,
            {
              backgroundColor:
                theme.colors.surfaceVariant,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <View style={styles.actionInfo}>
            <Icon
              source={getActionTypeIcon(tapAction.type)}
              size={20}
              color={theme.colors.primary}
            />
            <View style={styles.actionDetails}>
              <Text
                style={[
                  styles.actionValue,
                  { color: theme.colors.onSurface },
                ]}
              >
                {tapAction.title}
              </Text>
              <Text
                style={[
                  styles.actionMeta,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {getActionTypeFriendlyName(tapAction.type)} • {tapAction.value}{" "}
                {tapAction.destructive ? "• Destructive" : ""}
              </Text>
            </View>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.editActionButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={handleEditTapAction}
            >
              <Icon source="pencil" size={16} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeActionButton}
              onPress={() => onTapActionChange(null)}
            >
              <Icon source="minus" size={16} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Button
          mode="outlined"
          icon="plus"
          onPress={handleAddTapAction}
          compact
        >
          {t("notifications.tapAction.addTapAction")}
        </Button>
      )}

      {showTapActionForm && editingAction && (
        <NotificationActionForm
          actionTitle={editingAction.title || ""}
          actionType={editingAction.type}
          actionValue={editingAction.value || ""}
          actionIconName={editingAction.icon?.replace("sfsymbols:", "") || ""}
          actionDestructive={editingAction.destructive || false}
          webhookMethod={webhookMethod}
          webhookUrl={webhookUrl}
          onActionTypeChange={(type) => {
            // Only reset value when absolutely necessary
            let newValue = editingAction.value;

            if (type === NotificationActionType.BackgroundCall) {
              // When switching to BackgroundCall, clear the value as it will be set by webhook fields
              newValue = "";
            } else if (
              editingAction.type === NotificationActionType.BackgroundCall
            ) {
              // When switching from BackgroundCall, clear the value as it was a webhook URL
              newValue = "";
            } else if (type === NotificationActionType.OpenNotification) {
              // value must be omitted for OpenNotification
              newValue = undefined;
            }
            // For all other cases, keep the existing value unchanged

            const baseUpdatedAction = { ...editingAction, type };
            const updatedAction =
              type === NotificationActionType.OpenNotification
                ? (() => {
                    const { value, ...rest } = baseUpdatedAction;
                    return rest;
                  })()
                : { ...baseUpdatedAction, value: newValue ?? "" };
            setEditingAction(updatedAction);

            // Immediately update the parent component
            onTapActionChange(updatedAction);

            if (type !== NotificationActionType.BackgroundCall) {
              setWebhookMethod(undefined);
              setWebhookUrl("");
            }
          }}
          onActionValueChange={(value) => {
            if (editingAction.type === NotificationActionType.OpenNotification) {
              const { value: _ignored, ...rest } = editingAction;
              setEditingAction(rest);
              onTapActionChange(rest);
              return;
            }

            const updatedAction = { ...editingAction, value };
            setEditingAction(updatedAction);
            onTapActionChange(updatedAction);
          }}
          onActionTitleChange={(title) => {
            const updatedAction = { ...editingAction, title };
            setEditingAction(updatedAction);
            onTapActionChange(updatedAction);
          }}
          onActionIconNameChange={(iconName) => {
            const updatedAction = {
              ...editingAction,
              icon: `sfsymbols:${iconName}`,
            };
            setEditingAction(updatedAction);
            onTapActionChange(updatedAction);
          }}
          onActionDestructiveChange={(destructive) => {
            const updatedAction = { ...editingAction, destructive };
            setEditingAction(updatedAction);
            onTapActionChange(updatedAction);
          }}
          onWebhookMethodChange={(method) => {
            setWebhookMethod(method);
            // Update the action value for BackgroundCall actions
            if (
              editingAction?.type === NotificationActionType.BackgroundCall &&
              method &&
              webhookUrl
            ) {
              const updatedAction = {
                ...editingAction,
                value: `${method}:${webhookUrl}`,
              };
              setEditingAction(updatedAction);
              onTapActionChange(updatedAction);
            }
          }}
          onWebhookUrlChange={(url) => {
            setWebhookUrl(url);
            // Update the action value for BackgroundCall actions
            if (
              editingAction?.type === NotificationActionType.BackgroundCall &&
              webhookMethod &&
              url
            ) {
              const updatedAction = {
                ...editingAction,
                value: `${webhookMethod}:${url}`,
              };
              setEditingAction(updatedAction);
              onTapActionChange(updatedAction);
            }
          }}
          onCancel={handleCancel}
          onSave={handleSave}
          saveButtonTitle={t("notifications.tapAction.saveTapAction")}
          webhookOptions={webhookOptions}
          hasWebhooks={hasWebhooks}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  inputHint: {
    fontSize: 12,
    marginBottom: 8,
    fontStyle: "italic",
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  actionDetails: {
    flex: 1,
    marginLeft: 10,
  },
  actionValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  actionMeta: {
    fontSize: 14,
    marginTop: 2,
  },
  removeActionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },
  editActionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
});
