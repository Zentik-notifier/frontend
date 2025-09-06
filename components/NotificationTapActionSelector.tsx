import { Colors } from "@/constants/Colors";
import {
  HttpMethod,
  NotificationActionDto,
  NotificationActionType,
} from "@/generated/gql-operations-generated";
import { useNotificationUtils } from "@/hooks";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import React, { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import NotificationActionForm from "./NotificationActionForm";
import { ThemedText } from "./ThemedText";
import { Icon, IconButton, InlinePickerOption } from "./ui";

interface NotificationTapActionSelectorProps {
  tapAction: NotificationActionDto | null;
  onTapActionChange: (tapAction: NotificationActionDto | null) => void;
  label?: string;
  webhookOptions?: InlinePickerOption<string>[];
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
  const colorScheme = useColorScheme();
  const { getActionTypeFriendlyName } = useNotificationUtils();

  const [showTapActionForm, setShowTapActionForm] = useState(false);
  const [editingAction, setEditingAction] = useState<NotificationActionDto | null>(null);
  const [webhookMethod, setWebhookMethod] = useState<HttpMethod | undefined>(undefined);
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    if (tapAction && showTapActionForm) {
      setEditingAction(tapAction);
      if (tapAction.type === NotificationActionType.BackgroundCall && tapAction.value.includes(":")) {
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
    } else {
      // For non-webhook actions, ensure the value is set
      if (!editingAction.value.trim()) {
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
      value: "default",
      destructive: false,
      icon: "sfsymbols:info.circle",
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
      if (tapAction.type === NotificationActionType.BackgroundCall && tapAction.value.includes(":")) {
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
      <ThemedText style={styles.label}>
        {label || t("notifications.tapAction.title")}
      </ThemedText>
      <ThemedText
        style={[
          styles.inputHint,
          { color: Colors[colorScheme ?? "light"].textSecondary },
        ]}
      >
        {t("notifications.tapAction.description")}
      </ThemedText>

      {tapAction ? (
        <View
          style={[
            styles.actionItem,
            {
              backgroundColor: Colors[colorScheme ?? "light"].backgroundSecondary,
              borderColor: Colors[colorScheme ?? "light"].border,
            },
          ]}
        >
          <View style={styles.actionInfo}>
            <Icon
              name="action"
              size="sm"
              color={Colors[colorScheme ?? "light"].tint}
            />
            <View style={styles.actionDetails}>
              <ThemedText
                style={[
                  styles.actionValue,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
              >
                {tapAction.title}
              </ThemedText>
              <ThemedText
                style={[
                  styles.actionMeta,
                  { color: Colors[colorScheme ?? "light"].textSecondary },
                ]}
              >
                {getActionTypeFriendlyName(tapAction.type)} •{" "}
                {tapAction.value}{" "}
                {tapAction.destructive ? "• Destructive" : ""}
              </ThemedText>
            </View>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.editActionButton,
                { backgroundColor: Colors[colorScheme ?? "light"].tint },
              ]}
              onPress={handleEditTapAction}
            >
              <Icon name="edit" size="xs" color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeActionButton}
              onPress={() => onTapActionChange(null)}
            >
              <Icon name="remove" size="xs" color="white" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <IconButton
          title={t("notifications.tapAction.addTapAction")}
          iconName="add"
          onPress={handleAddTapAction}
          variant="secondary"
          size="md"
        />
      )}

      {showTapActionForm && editingAction && (
        <NotificationActionForm
          actionType={editingAction.type}
          actionValue={editingAction.value}
          actionTitle={editingAction.title}
          actionIconName={editingAction.icon.replace("sfsymbols:", "")}
          actionDestructive={editingAction.destructive}
          webhookMethod={webhookMethod}
          webhookUrl={webhookUrl}
          onActionTypeChange={(type) => {
            // Only reset value when absolutely necessary
            let newValue = editingAction.value;
            
            if (type === NotificationActionType.BackgroundCall) {
              // When switching to BackgroundCall, clear the value as it will be set by webhook fields
              newValue = "";
            } else if (editingAction.type === NotificationActionType.BackgroundCall) {
              // When switching from BackgroundCall, clear the value as it was a webhook URL
              newValue = "";
            } else if (editingAction.value === "default") {
              // Keep the default value for any type that can use it
              newValue = "default";
            }
            // For all other cases, keep the existing value unchanged
            
            const updatedAction = { ...editingAction, type, value: newValue };
            setEditingAction(updatedAction);
            
            // Immediately update the parent component
            onTapActionChange(updatedAction);
            
            if (type !== NotificationActionType.BackgroundCall) {
              setWebhookMethod(undefined);
              setWebhookUrl("");
            }
          }}
          onActionValueChange={(value) => {
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
            if (editingAction?.type === NotificationActionType.BackgroundCall && method && webhookUrl) {
              const updatedAction = { ...editingAction, value: `${method}:${webhookUrl}` };
              setEditingAction(updatedAction);
              onTapActionChange(updatedAction);
            }
          }}
          onWebhookUrlChange={(url) => {
            setWebhookUrl(url);
            // Update the action value for BackgroundCall actions
            if (editingAction?.type === NotificationActionType.BackgroundCall && webhookMethod && url) {
              const updatedAction = { ...editingAction, value: `${webhookMethod}:${url}` };
              setEditingAction(updatedAction);
              onTapActionChange(updatedAction);
            }
          }}
          onCancel={handleCancel}
          onSave={handleSave}
          saveButtonTitle={t("notifications.tapAction.saveTapAction")}
          webhookOptions={webhookOptions}
          hasWebhooks={hasWebhooks}
          isEditing={true}
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
