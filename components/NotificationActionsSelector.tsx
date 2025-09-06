import { Colors } from "@/constants/Colors";
import {
  HttpMethod,
  NotificationActionDto,
  NotificationActionType,
} from "@/generated/gql-operations-generated";
import { useNotificationUtils } from "@/hooks";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import React, { useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import NotificationActionForm from "./NotificationActionForm";
import { ThemedText } from "./ThemedText";
import { Icon, IconButton, InlinePickerOption } from "./ui";

interface NotificationActionsSelectorProps {
  actions: NotificationActionDto[];
  onActionsChange: (actions: NotificationActionDto[]) => void;
  label?: string;
  webhookOptions?: InlinePickerOption<string>[];
  hasWebhooks?: boolean;
}

export default function NotificationActionsSelector({
  actions,
  onActionsChange,
  label,
  webhookOptions = [],
  hasWebhooks = false,
}: NotificationActionsSelectorProps) {
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const { getActionTypeFriendlyName } = useNotificationUtils();

  const [showActionForm, setShowActionForm] = useState(false);
  const [actionType, setActionType] = useState<NotificationActionType>();
  const [actionValue, setActionValue] = useState("");
  const [actionTitle, setActionTitle] = useState("");
  const [actionIconName, setActionIconName] = useState("");
  const [actionDestructive, setActionDestructive] = useState(false);

  const [webhookMethod, setWebhookMethod] = useState<HttpMethod | undefined>(
    HttpMethod.Post
  );
  const [webhookUrl, setWebhookUrl] = useState("");

  // Reset webhook fields when action type changes
  // useEffect(() => {
  //   if (actionType !== NotificationActionType.BackgroundCall) {
  //     setWebhookMethod(undefined);
  //     setWebhookUrl("");
  //   }
  // }, [actionType]);

  const addAction = () => {
    if (actionType && actionTitle.trim()) {
      let finalValue = actionValue;

      if (actionType === NotificationActionType.BackgroundCall) {
        if (!webhookUrl.trim()) {
          Alert.alert(
            t("common.error"),
            t("notifications.webhookAction.urlRequired")
          );
          return;
        }
        finalValue = `${webhookMethod}::${webhookUrl}`;
      } else if (!actionValue.trim()) {
        Alert.alert(
          t("common.error"),
          t("notifications.actions.actionValueRequired")
        );
        return;
      }

      const newAction = {
        type: actionType,
        value: finalValue,
        title: actionTitle,
        destructive: actionDestructive,
        icon: actionIconName.trim()
          ? `sfsymbols:${actionIconName.trim()}`
          : "action",
      };
      onActionsChange([...actions, newAction]);
      setActionValue("");
      setActionTitle("");
      setActionIconName("");
      setActionDestructive(false);
      setWebhookMethod(HttpMethod.Post);
      setWebhookUrl("");
      setShowActionForm(false);
    }
  };

  const removeAction = (index: number) => {
    onActionsChange(actions.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setActionValue("");
    setActionTitle("");
    setActionIconName("");
    setActionDestructive(false);
    setWebhookMethod(HttpMethod.Post);
    setWebhookUrl("");
    setShowActionForm(false);
  };

  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>
        {label || t("notifications.actions.title")}
      </ThemedText>

      {actions.map((action, index) => (
        <View
          key={index}
          style={[
            styles.actionItem,
            {
              backgroundColor:
                Colors[colorScheme ?? "light"].backgroundSecondary,
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
                {action.title || action.value}
              </ThemedText>
              <ThemedText
                style={[
                  styles.actionMeta,
                  { color: Colors[colorScheme ?? "light"].textSecondary },
                ]}
              >
                {getActionTypeFriendlyName(action.type)} • {action.value}{" "}
                {action.destructive ? "• Destructive" : ""}
              </ThemedText>
            </View>
          </View>
          <TouchableOpacity
            style={styles.removeActionButton}
            onPress={() => removeAction(index)}
          >
            <Icon name="remove" size="xs" color="white" />
          </TouchableOpacity>
        </View>
      ))}

      {showActionForm && (
        <NotificationActionForm
          actionType={actionType}
          actionValue={actionValue}
          actionTitle={actionTitle}
          actionIconName={actionIconName}
          actionDestructive={actionDestructive}
          webhookMethod={webhookMethod}
          webhookUrl={webhookUrl}
          onActionTypeChange={setActionType}
          onActionValueChange={setActionValue}
          onActionTitleChange={setActionTitle}
          onActionIconNameChange={setActionIconName}
          onActionDestructiveChange={setActionDestructive}
          onWebhookMethodChange={setWebhookMethod}
          onWebhookUrlChange={setWebhookUrl}
          onCancel={resetForm}
          onSave={addAction}
          saveButtonTitle={t("notifications.actions.addAction")}
          webhookOptions={webhookOptions}
          hasWebhooks={hasWebhooks}
          isEditing={false}
        />
      )}

      {!showActionForm && (
        <IconButton
          title={t("notifications.actions.addAction")}
          iconName="add"
          onPress={() => setShowActionForm(true)}
          variant="secondary"
          size="md"
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
});
