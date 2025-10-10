import PaperScrollView, {
  CustomFabAction,
} from "@/components/ui/PaperScrollView";
import Selector, { SelectorOption } from "@/components/ui/Selector";
import { useI18n } from "@/hooks/useI18n";
import React, { useEffect, useState } from "react";
import { StyleSheet, View, Alert } from "react-native";
import {
  Button,
  Card,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@apollo/client";
import {
  GetServerSettingsDocument,
  UpdateServerSettingDocument,
  BatchUpdateServerSettingsDocument,
  RestartServerDocument,
  ServerSettingType,
} from "@/generated/gql-operations-generated";

// Types based on backend ServerSettingType enum
type ServerSetting = {
  id: string;
  configType: string;
  valueText: string | null;
  valueBool: boolean | null;
  valueNumber: number | null;
  possibleValues: string[] | null;
};

type SettingConfig =
  | string
  | {
      key: string;
      dependsOn?: {
        field: string;
        values: any[];
      };
      visibleWhen?: (values: Record<string, any>) => boolean;
    };

type SectionConfig = {
  title: string;
  icon: any;
  settings: SettingConfig[];
  visibleWhen?: (values: Record<string, any>) => boolean;
};

// Setting sections configuration with dependencies
const settingSections: Record<string, SectionConfig> = {
  authentication: {
    title: "Authentication & JWT",
    icon: "shield-key" as const,
    settings: [
      "JwtAccessTokenExpiration",
      "JwtRefreshTokenExpiration",
      "JwtSecret",
      "JwtRefreshSecret",
    ],
  },
  apnPush: {
    title: "Apple Push Notification (APN)",
    icon: "apple" as const,
    settings: [
      "ApnPush",
      { key: "ApnKeyId", dependsOn: { field: "ApnPush", values: ["Onboard"] } },
      {
        key: "ApnTeamId",
        dependsOn: { field: "ApnPush", values: ["Onboard"] },
      },
      {
        key: "ApnPrivateKeyPath",
        dependsOn: { field: "ApnPush", values: ["Onboard"] },
      },
      {
        key: "ApnBundleId",
        dependsOn: { field: "ApnPush", values: ["Onboard"] },
      },
      {
        key: "ApnProduction",
        dependsOn: { field: "ApnPush", values: ["Onboard"] },
      },
    ],
  },
  firebasePush: {
    title: "Firebase Cloud Messaging (FCM)",
    icon: "firebase" as const,
    settings: [
      "FirebasePush",
      {
        key: "FirebaseProjectId",
        dependsOn: { field: "FirebasePush", values: ["Onboard"] },
      },
      {
        key: "FirebasePrivateKey",
        dependsOn: { field: "FirebasePush", values: ["Onboard"] },
      },
      {
        key: "FirebaseClientEmail",
        dependsOn: { field: "FirebasePush", values: ["Onboard"] },
      },
    ],
  },
  webPush: {
    title: "Web Push Notification",
    icon: "web" as const,
    settings: [
      "WebPush",
      {
        key: "VapidSubject",
        dependsOn: { field: "WebPush", values: ["Onboard"] },
      },
    ],
  },
  pushPassthrough: {
    title: "Push Passthrough",
    icon: "transit-connection-variant" as const,
    settings: ["PushNotificationsPassthroughServer", "PushPassthroughToken"],
    visibleWhen: (values: Record<string, any>) => {
      return (
        values.ApnPush === "Passthrough" ||
        values.FirebasePush === "Passthrough" ||
        values.WebPush === "Passthrough"
      );
    },
  },
  email: {
    title: "Email Configuration",
    icon: "email" as const,
    settings: [
      "EmailEnabled",
      {
        key: "EmailFrom",
        dependsOn: { field: "EmailEnabled", values: [true] },
      },
      {
        key: "EmailFromName",
        dependsOn: { field: "EmailEnabled", values: [true] },
      },
      {
        key: "EmailType",
        dependsOn: { field: "EmailEnabled", values: [true] },
      },
      { key: "EmailHost", dependsOn: { field: "EmailType", values: ["SMTP"] } },
      { key: "EmailPort", dependsOn: { field: "EmailType", values: ["SMTP"] } },
      {
        key: "EmailSecure",
        dependsOn: { field: "EmailType", values: ["SMTP"] },
      },
      { key: "EmailUser", dependsOn: { field: "EmailType", values: ["SMTP"] } },
      { key: "EmailPass", dependsOn: { field: "EmailType", values: ["SMTP"] } },
      {
        key: "ResendApiKey",
        dependsOn: { field: "EmailType", values: ["Resend"] },
      },
    ],
  },
  attachments: {
    title: "Attachments",
    icon: "paperclip" as const,
    settings: [
      "AttachmentsEnabled",
      {
        key: "AttachmentsStoragePath",
        dependsOn: { field: "AttachmentsEnabled", values: [true] },
      },
      {
        key: "AttachmentsMaxFileSize",
        dependsOn: { field: "AttachmentsEnabled", values: [true] },
      },
      {
        key: "AttachmentsAllowedMimeTypes",
        dependsOn: { field: "AttachmentsEnabled", values: [true] },
      },
      {
        key: "AttachmentsDeleteJobEnabled",
        dependsOn: { field: "AttachmentsEnabled", values: [true] },
      },
      {
        key: "AttachmentsDeleteCronJob",
        visibleWhen: (values) =>
          values.AttachmentsEnabled === true &&
          values.AttachmentsDeleteJobEnabled === true,
      },
      {
        key: "AttachmentsMaxAge",
        visibleWhen: (values) =>
          values.AttachmentsEnabled === true &&
          values.AttachmentsDeleteJobEnabled === true,
      },
    ],
  },
  backup: {
    title: "Database Backup",
    icon: "database-arrow-down" as const,
    settings: [
      "BackupEnabled",
      {
        key: "BackupExecuteOnStart",
        dependsOn: { field: "BackupEnabled", values: [true] },
      },
      {
        key: "BackupStoragePath",
        dependsOn: { field: "BackupEnabled", values: [true] },
      },
      {
        key: "BackupMaxToKeep",
        dependsOn: { field: "BackupEnabled", values: [true] },
      },
      {
        key: "BackupCronJob",
        dependsOn: { field: "BackupEnabled", values: [true] },
      },
    ],
  },
  messages: {
    title: "Messages Retention",
    icon: "message-text-clock" as const,
    settings: [
      "MessagesDeleteJobEnabled",
      {
        key: "MessagesDeleteCronJob",
        dependsOn: { field: "MessagesDeleteJobEnabled", values: [true] },
      },
      {
        key: "MessagesMaxAge",
        dependsOn: { field: "MessagesDeleteJobEnabled", values: [true] },
      },
    ],
  },
  rateLimit: {
    title: "Rate Limiting",
    icon: "speedometer" as const,
    settings: [
      "RateLimitTrustProxyEnabled",
      "RateLimitForwardHeader",
      "RateLimitTtlMs",
      "RateLimitLimit",
      "RateLimitBlockMs",
      "RateLimitMessagesRps",
      "RateLimitMessagesTtlMs",
    ],
  },
  cors: {
    title: "CORS & Security",
    icon: "shield-check" as const,
    settings: ["CorsOrigin", "CorsCredentials"],
  },
  logging: {
    title: "Logging",
    icon: "text-box-multiple" as const,
    settings: ["LogLevel"],
  },
  logStorage: {
    title: "Log Storage",
    icon: "database-clock" as const,
    settings: [
      "LogStorageEnabled",
      {
        key: "LogRetentionDays",
        dependsOn: { field: "LogStorageEnabled", values: [true] },
      },
    ],
  },
  loki: {
    title: "Loki Remote Logging",
    icon: "cloud-upload" as const,
    settings: [
      "LokiEnabled",
      {
        key: "LokiUrl",
        dependsOn: { field: "LokiEnabled", values: [true] },
      },
      {
        key: "LokiUsername",
        dependsOn: { field: "LokiEnabled", values: [true] },
      },
      {
        key: "LokiPassword",
        dependsOn: { field: "LokiEnabled", values: [true] },
      },
      {
        key: "LokiLabels",
        dependsOn: { field: "LokiEnabled", values: [true] },
      },
      {
        key: "LokiBatchSize",
        dependsOn: { field: "LokiEnabled", values: [true] },
      },
      {
        key: "LokiBatchIntervalMs",
        dependsOn: { field: "LokiEnabled", values: [true] },
      },
    ],
  },
  prometheus: {
    title: "Prometheus Metrics",
    icon: "chart-line" as const,
    settings: [
      "PrometheusEnabled",
      {
        key: "PrometheusPath",
        dependsOn: { field: "PrometheusEnabled", values: [true] },
      },
    ],
  },
};

// Helper function to get field type
function getFieldType(
  setting: ServerSetting
): "text" | "number" | "boolean" | "select" {
  if (setting.possibleValues && setting.possibleValues.length > 0) {
    return "select";
  }
  if (setting.valueBool !== null) return "boolean";
  if (setting.valueNumber !== null) return "number";
  return "text";
}

type SettingSectionProps = {
  section: keyof typeof settingSections;
  settings: ServerSetting[];
  values: Record<string, any>;
  onValueChange: (configType: string, value: any) => void;
  theme: any;
};

function SettingSection({
  section,
  settings,
  values,
  onValueChange,
  theme,
}: SettingSectionProps) {
  const { t } = useI18n();
  const sectionConfig = settingSections[section];

  // Check if section should be visible
  if (sectionConfig.visibleWhen && !sectionConfig.visibleWhen(values)) {
    return null;
  }

  // Helper to check if a setting should be visible based on dependencies
  const isSettingVisible = (settingConfig: SettingConfig): boolean => {
    if (typeof settingConfig === "string") return true;

    // Check visibleWhen function first (takes precedence)
    if (settingConfig.visibleWhen) {
      return settingConfig.visibleWhen(values);
    }

    if (settingConfig.dependsOn) {
      const { field, values: dependentValues } = settingConfig.dependsOn;
      const currentValue = values[field];
      return dependentValues.includes(currentValue);
    }

    return true;
  };

  // Get setting key from config
  const getSettingKey = (config: SettingConfig): string => {
    return typeof config === "string" ? config : config.key;
  };

  // Filter settings based on visibility
  const visibleSettings = sectionConfig.settings
    .filter(isSettingVisible)
    .map(getSettingKey);

  const sectionSettings = settings.filter((s) =>
    visibleSettings.includes(s.configType)
  );

  if (sectionSettings.length === 0) return null;

  return (
    <Card style={styles.sectionCard}>
      <Card.Content>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name={sectionConfig.icon}
            size={24}
            color={theme.colors.primary}
          />
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            {t(`serverSettings.sections.${section}` as any)}
          </Text>
        </View>

        {sectionSettings.map((setting) => (
          <SettingField
            key={setting.id}
            setting={setting}
            value={values[setting.configType]}
            onValueChange={(value) => onValueChange(setting.configType, value)}
            theme={theme}
          />
        ))}
      </Card.Content>
    </Card>
  );
}

type SettingFieldProps = {
  setting: ServerSetting;
  value: any;
  onValueChange: (value: any) => void;
  theme: any;
};

function SettingField({
  setting,
  value,
  onValueChange,
  theme,
}: SettingFieldProps) {
  const { t } = useI18n();
  const [showSecret, setShowSecret] = useState(false);
  const fieldType = getFieldType(setting);
  const label = t(`serverSettings.fields.${setting.configType}` as any);

  // Don't show sensitive fields in plain text
  const isSensitive =
    setting.configType.includes("Secret") ||
    setting.configType.includes("Password") ||
    setting.configType.includes("Pass") ||
    setting.configType.includes("Key");

  // Check if this is a push mode field
  const isPushMode =
    setting.configType === "ApnPush" ||
    setting.configType === "FirebasePush" ||
    setting.configType === "WebPush";

  if (fieldType === "boolean") {
    return (
      <View style={styles.switchRow}>
        <Text variant="bodyLarge" style={styles.switchLabel}>
          {label}
        </Text>
        <Switch
          value={value ?? false}
          onValueChange={onValueChange}
          color={theme.colors.primary}
        />
      </View>
    );
  }

  if (fieldType === "select" && setting.possibleValues) {
    // Use Selector for push mode fields
    if (isPushMode) {
      const selectorOptions: SelectorOption[] = setting.possibleValues.map(
        (val) => ({
          id: val,
          name: val,
        })
      );

      return (
        <View style={styles.fieldContainer}>
          <Selector
            label={label}
            options={selectorOptions}
            selectedValue={value ?? setting.possibleValues[0]}
            onValueChange={onValueChange}
            placeholder={t("serverSettings.selectPlaceholder", { field: label } as any)}
          />
        </View>
      );
    }

    // Use SegmentedButtons for other select fields
    const buttons = setting.possibleValues.map((val) => ({
      value: val,
      label: val,
    }));

    return (
      <View style={styles.fieldContainer}>
        <Text variant="bodyMedium" style={styles.fieldLabel}>
          {label}
        </Text>
        <SegmentedButtons
          value={value ?? setting.possibleValues[0]}
          onValueChange={onValueChange}
          buttons={buttons}
          style={styles.segmentedButtons}
        />
      </View>
    );
  }

  if (fieldType === "number") {
    return (
      <View style={styles.fieldContainer}>
        <TextInput
          mode="outlined"
          label={label}
          value={value?.toString() ?? ""}
          onChangeText={(text) => {
            const num = parseInt(text, 10);
            onValueChange(isNaN(num) ? null : num);
          }}
          keyboardType="numeric"
          style={styles.textInput}
          multiline={false}
        />
      </View>
    );
  }

  // Text field - make all fields multiline and add show/hide for sensitive fields
  // Note: secureTextEntry doesn't work with multiline, so we mask the value manually
  const displayValue =
    isSensitive && !showSecret && value
      ? "•".repeat(Math.min(value.length, 40))
      : value ?? "";

  return (
    <View style={styles.fieldContainer}>
      <TextInput
        mode="outlined"
        label={label}
        value={displayValue}
        onChangeText={onValueChange}
        autoCapitalize="none"
        autoCorrect={false}
        multiline={true}
        numberOfLines={setting.configType.includes("PrivateKey") ? 6 : 3}
        style={styles.textInput}
        editable={!isSensitive || showSecret}
        right={
          isSensitive ? (
            <TextInput.Icon
              icon={showSecret ? "eye-off" : "eye"}
              onPress={() => setShowSecret(!showSecret)}
            />
          ) : undefined
        }
      />
    </View>
  );
}

export function ServerSettings() {
  const theme = useTheme();
  const { t } = useI18n();

  // State
  const [values, setValues] = useState<Record<string, any>>({});
  const [originalValues, setOriginalValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  // GraphQL operations
  const { data, loading, error, refetch } = useQuery(GetServerSettingsDocument);
  const [batchUpdateServerSettings] = useMutation(
    BatchUpdateServerSettingsDocument
  );
  const [restartServerMutation, { loading: restarting }] = useMutation(
    RestartServerDocument
  );

  const settings = (data?.serverSettings ?? []) as ServerSetting[];

  // Initialize values when data loads
  useEffect(() => {
    if (settings.length > 0) {
      const initialValues: Record<string, any> = {};
      settings.forEach((setting: ServerSetting) => {
        if (setting.valueBool !== null) {
          initialValues[setting.configType] = setting.valueBool;
        } else if (setting.valueNumber !== null) {
          initialValues[setting.configType] = setting.valueNumber;
        } else {
          initialValues[setting.configType] = setting.valueText;
        }
      });

      setValues(initialValues);
      setOriginalValues(initialValues);
    }
  }, [settings]);

  // Handle query error
  useEffect(() => {
    if (error) {
      console.error("Failed to load server settings:", error);
      Alert.alert(
        t("common.error" as any),
        t("serverSettings.failedToLoad" as any)
      );
    }
  }, [error, t]);

  const handleValueChange = (configType: string, value: any) => {
    setValues((prev) => ({ ...prev, [configType]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Get changed settings
      const changes = Object.keys(values).filter(
        (key) => values[key] !== originalValues[key]
      );

      // Prepare batch update input
      const settingsToUpdate = changes.map((configType) => {
        const value = values[configType];
        return {
          configType: configType as ServerSettingType,
          valueText: typeof value === "string" ? value : null,
          valueBool: typeof value === "boolean" ? value : null,
          valueNumber: typeof value === "number" ? value : null,
        };
      });

      // Batch update all settings at once
      await batchUpdateServerSettings({
        variables: {
          settings: settingsToUpdate,
        },
      });

      setOriginalValues(values);
      Alert.alert(
        t("common.success" as any),
        t("serverSettings.savedSuccessfully", { count: changes.length } as any)
      );
    } catch (error) {
      console.error("Failed to save settings:", error);
      Alert.alert(
        t("common.error" as any),
        t("serverSettings.failedToSave" as any)
      );
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = () => {
    setValues(originalValues);
  };

  const confirmRestartServer = () => {
    Alert.alert(
      t("serverSettings.restartConfirm" as any),
      t("serverSettings.restartConfirmMessage" as any),
      [
        {
          text: t("common.cancel" as any),
          style: "cancel",
        },
        {
          text: t("serverSettings.restartServer" as any),
          style: "destructive",
          onPress: async () => {
            try {
              await restartServerMutation();
              Alert.alert(
                t("common.success" as any),
                t("serverSettings.restartSuccess" as any)
              );
            } catch (error) {
              console.error("Failed to restart server:", error);
              Alert.alert(
                t("common.error" as any),
                t("serverSettings.restartFailed" as any)
              );
            }
          },
        },
      ]
    );
  };

  const hasChanges = JSON.stringify(values) !== JSON.stringify(originalValues);

  const handleRefresh = async () => {
    await refetch();
  };

  const additionalActions: CustomFabAction[] = hasChanges
    ? [
        {
          icon: "restore",
          label: t("serverSettings.reset" as any),
          onPress: () => {
            !saving && resetSettings();
          },
        },
        {
          icon: "content-save",
          label: t("serverSettings.saveChanges" as any),
          onPress: () => {
            !saving && saveSettings();
          },
        },
      ]
    : [];

  return (
    <>
      <PaperScrollView
        onRefresh={handleRefresh}
        loading={loading}
        error={!!error}
        fabGroupIcon={hasChanges ? "content-save" : undefined}
        customActions={[
          ...additionalActions,
          {
            label: t("serverSettings.restartServer"),
            icon: "restart",
            onPress: confirmRestartServer,
          },
        ]}
      >
        {/* Setting Sections */}
        {Object.keys(settingSections).map((sectionKey) => (
          <SettingSection
            key={sectionKey}
            section={sectionKey as keyof typeof settingSections}
            settings={settings}
            values={values}
            onValueChange={handleValueChange}
            theme={theme}
          />
        ))}

        <View style={styles.footer}>
          <Text
            variant="bodySmall"
            style={[
              styles.footerText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {t("serverSettings.warningFooter" as any)}
          </Text>
        </View>
      </PaperScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionCard: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 0,
  },
  sectionDescription: {
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
  },
  fieldContainer: {
    marginBottom: 12,
  },
  fieldLabel: {
    marginBottom: 8,
  },
  textInput: {
    marginBottom: 4,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  switchLabel: {
    flex: 1,
  },
  segmentedButtons: {
    marginBottom: 4,
  },
  footer: {
    padding: 24,
    alignItems: "center",
  },
  footerText: {
    textAlign: "center",
    lineHeight: 18,
  },
});
