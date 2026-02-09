import PaperScrollView, {
  CustomFabAction,
} from "@/components/ui/PaperScrollView";
import Selector, { SelectorOption } from "@/components/ui/Selector";
import {
  BatchUpdateServerSettingsDocument,
  GetServerSettingsDocument,
  RestartServerDocument,
  ServerSettingType,
} from "@/generated/gql-operations-generated";
import {
  useSystemAccessTokens,
  SystemTokenOption,
} from "@/hooks/useSystemAccessTokens";
import { useI18n } from "@/hooks/useI18n";
import { useMutation, useQuery } from "@apollo/client";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  Card,
  Icon,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

// Types based on backend ServerSettingType enum
type ServerSetting = {
  id: string;
  configType: ServerSettingType;
  valueText: string | null;
  valueBool: boolean | null;
  valueNumber: number | null;
  possibleValues: string[] | null;
};

type SettingConfig =
  | ServerSettingType
  | {
      key: ServerSettingType;
      dependsOn?: {
        field: ServerSettingType;
        values: any[];
      };
      visibleWhen?: (values: Record<ServerSettingType, any>) => boolean;
    };

type SectionConfig = {
  title: string;
  icon: any;
  settings: SettingConfig[];
  visibleWhen?: (values: Record<ServerSettingType, any>) => boolean;
};

// Setting sections configuration with dependencies
const settingSections: Record<string, SectionConfig> = {
  authentication: {
    title: "Authentication & JWT",
    icon: "lock",
    settings: [
      ServerSettingType.JwtAccessTokenExpiration,
      ServerSettingType.JwtRefreshTokenExpiration,
      ServerSettingType.JwtSecret,
      ServerSettingType.JwtRefreshSecret,
      ServerSettingType.SocialLoginEnabled,
      ServerSettingType.LocalRegistrationEnabled,
      ServerSettingType.SocialRegistrationEnabled,
    ],
  },
  apnPush: {
    title: "Apple Push Notification (APN)",
    icon: "cellphone",
    settings: [
      ServerSettingType.ApnPush,
      {
        key: ServerSettingType.ApnKeyId,
        dependsOn: { field: ServerSettingType.ApnPush, values: ["Onboard"] },
      },
      {
        key: ServerSettingType.ApnTeamId,
        dependsOn: { field: ServerSettingType.ApnPush, values: ["Onboard"] },
      },
      {
        key: ServerSettingType.ApnPrivateKeyPath,
        dependsOn: { field: ServerSettingType.ApnPush, values: ["Onboard"] },
      },
      {
        key: ServerSettingType.ApnBundleId,
        dependsOn: { field: ServerSettingType.ApnPush, values: ["Onboard"] },
      },
      {
        key: ServerSettingType.ApnProduction,
        dependsOn: { field: ServerSettingType.ApnPush, values: ["Onboard"] },
      },
    ],
  },
  firebasePush: {
    title: "Firebase Cloud Messaging (FCM)",
    icon: "fire",
    settings: [
      ServerSettingType.FirebasePush,
      {
        key: ServerSettingType.FirebaseProjectId,
        dependsOn: {
          field: ServerSettingType.FirebasePush,
          values: ["Onboard"],
        },
      },
      {
        key: ServerSettingType.FirebasePrivateKey,
        dependsOn: {
          field: ServerSettingType.FirebasePush,
          values: ["Onboard"],
        },
      },
      {
        key: ServerSettingType.FirebaseClientEmail,
        dependsOn: {
          field: ServerSettingType.FirebasePush,
          values: ["Onboard"],
        },
      },
    ],
  },
  webPush: {
    title: "Web Push Notification",
    icon: "web",
    settings: [
      ServerSettingType.WebPush,
      {
        key: ServerSettingType.VapidSubject,
        dependsOn: { field: ServerSettingType.WebPush, values: ["Onboard"] },
      },
    ],
  },
  pushPassthrough: {
    title: "Push Passthrough",
    icon: "share-variant",
    settings: [
      ServerSettingType.PushNotificationsPassthroughServer,
      ServerSettingType.PushPassthroughToken,
      ServerSettingType.SystemTokenUsageStats,
    ],
    visibleWhen: (values: Record<ServerSettingType, any>) => {
      return (
        values[ServerSettingType.ApnPush] === "Passthrough" ||
        values[ServerSettingType.FirebasePush] === "Passthrough" ||
        values[ServerSettingType.WebPush] === "Passthrough"
      );
    },
  },
  changelog: {
    title: "Changelog",
    icon: "history",
    settings: [ServerSettingType.ChangelogRemoteServer],
  },
  email: {
    title: "Email Configuration",
    icon: "email",
    settings: [
      ServerSettingType.EmailEnabled,
      {
        key: ServerSettingType.EmailFrom,
        dependsOn: { field: ServerSettingType.EmailEnabled, values: [true] },
      },
      {
        key: ServerSettingType.EmailFromName,
        dependsOn: { field: ServerSettingType.EmailEnabled, values: [true] },
      },
      {
        key: ServerSettingType.EmailType,
        dependsOn: { field: ServerSettingType.EmailEnabled, values: [true] },
      },
      {
        key: ServerSettingType.EmailHost,
        visibleWhen: (values) =>
          values[ServerSettingType.EmailEnabled] === true &&
          values[ServerSettingType.EmailType] === "SMTP",
      },
      {
        key: ServerSettingType.EmailPort,
        visibleWhen: (values) =>
          values[ServerSettingType.EmailEnabled] === true &&
          values[ServerSettingType.EmailType] === "SMTP",
      },
      {
        key: ServerSettingType.EmailSecure,
        visibleWhen: (values) =>
          values[ServerSettingType.EmailEnabled] === true &&
          values[ServerSettingType.EmailType] === "SMTP",
      },
      {
        key: ServerSettingType.EmailUser,
        visibleWhen: (values) =>
          values[ServerSettingType.EmailEnabled] === true &&
          values[ServerSettingType.EmailType] === "SMTP",
      },
      {
        key: ServerSettingType.EmailPass,
        visibleWhen: (values) =>
          values[ServerSettingType.EmailEnabled] === true &&
          values[ServerSettingType.EmailType] === "SMTP",
      },
      {
        key: ServerSettingType.ResendApiKey,
        visibleWhen: (values) =>
          values[ServerSettingType.EmailEnabled] === true &&
          values[ServerSettingType.EmailType] === "Resend",
      },
    ],
  },
  attachments: {
    title: "Attachments",
    icon: "paperclip",
    settings: [
      ServerSettingType.AttachmentsEnabled,
      {
        key: ServerSettingType.IconUploaderEnabled,
        dependsOn: {
          field: ServerSettingType.AttachmentsEnabled,
          values: [true],
        },
      },
      {
        key: ServerSettingType.AttachmentsStoragePath,
        dependsOn: {
          field: ServerSettingType.AttachmentsEnabled,
          values: [true],
        },
      },
      {
        key: ServerSettingType.AttachmentsMaxFileSize,
        dependsOn: {
          field: ServerSettingType.AttachmentsEnabled,
          values: [true],
        },
      },
      {
        key: ServerSettingType.AttachmentsAllowedMimeTypes,
        dependsOn: {
          field: ServerSettingType.AttachmentsEnabled,
          values: [true],
        },
      },
      {
        key: ServerSettingType.AttachmentsDeleteJobEnabled,
        dependsOn: {
          field: ServerSettingType.AttachmentsEnabled,
          values: [true],
        },
      },
      {
        key: ServerSettingType.AttachmentsMaxAge,
        visibleWhen: (values) =>
          values[ServerSettingType.AttachmentsEnabled] === true &&
          values[ServerSettingType.AttachmentsDeleteJobEnabled] === true,
      },
    ],
  },
  backup: {
    title: "Database Backup",
    icon: "database",
    settings: [
      ServerSettingType.BackupEnabled,
      {
        key: ServerSettingType.BackupExecuteOnStart,
        dependsOn: { field: ServerSettingType.BackupEnabled, values: [true] },
      },
      {
        key: ServerSettingType.BackupStoragePath,
        dependsOn: { field: ServerSettingType.BackupEnabled, values: [true] },
      },
      {
        key: ServerSettingType.BackupMaxToKeep,
        dependsOn: { field: ServerSettingType.BackupEnabled, values: [true] },
      },
      {
        key: ServerSettingType.BackupCronJob,
        dependsOn: { field: ServerSettingType.BackupEnabled, values: [true] },
      },
    ],
  },
  serverFiles: {
    title: "Server Files",
    icon: "folder",
    settings: [ServerSettingType.ServerFilesDirectory],
  },
  messages: {
    title: "Messages Retention",
    icon: "message-text",
    settings: [
      ServerSettingType.MessagesDeleteJobEnabled,
      {
        key: ServerSettingType.MessagesMaxAge,
        dependsOn: {
          field: ServerSettingType.MessagesDeleteJobEnabled,
          values: [true],
        },
      },
    ],
  },
  rateLimit: {
    title: "Rate Limiting",
    icon: "speedometer",
    settings: [
      ServerSettingType.RateLimitTrustProxyEnabled,
      ServerSettingType.RateLimitForwardHeader,
      ServerSettingType.RateLimitTtlMs,
      ServerSettingType.RateLimitLimit,
      ServerSettingType.RateLimitBlockMs,
      ServerSettingType.RateLimitMessagesRps,
      ServerSettingType.RateLimitMessagesTtlMs,
    ],
  },
  cors: {
    title: "CORS & Security",
    icon: "shield-check",
    settings: [ServerSettingType.CorsOrigin, ServerSettingType.CorsCredentials],
  },
  logging: {
    title: "Logging",
    icon: "file-document",
    settings: [
      ServerSettingType.StoreLogsOnFs,
      {
        key: ServerSettingType.LogLevel,
        dependsOn: { field: ServerSettingType.StoreLogsOnFs, values: [true] },
      },
      {
        key: ServerSettingType.LogRetentionDays,
        dependsOn: { field: ServerSettingType.StoreLogsOnFs, values: [true] },
      },
      {
        key: ServerSettingType.LogStorageDirectory,
        dependsOn: { field: ServerSettingType.StoreLogsOnFs, values: [true] },
      },
    ],
  },
  prometheus: {
    title: "Prometheus Metrics",
    icon: "chart-line",
    settings: [ServerSettingType.PrometheusEnabled],
  },
  systemAccessTokens: {
    title: "System Access Tokens",
    icon: "key",
    settings: [ServerSettingType.EnableSystemTokenRequests],
  },
  externalNotifySystems: {
    title: "External notify systems",
    icon: "server",
    settings: [ServerSettingType.ExternalNotifySystemsEnabled],
  },
};

// Helper function to get field type
function getFieldType(
  setting: ServerSetting
): "text" | "number" | "boolean" | "select" | "json" {
  if (setting.possibleValues && setting.possibleValues.length > 0) {
    return "select";
  }
  if (setting.valueBool !== null) return "boolean";
  if (setting.valueNumber !== null) return "number";
  if (setting.configType === ServerSettingType.SystemTokenUsageStats)
    return "json";
  return "text";
}

type SettingSectionProps = {
  section: keyof typeof settingSections;
  settings: ServerSetting[];
  values: Record<ServerSettingType, any>;
  onValueChange: (configType: ServerSettingType, value: any) => void;
  theme: any;
  systemTokens?: SystemTokenOption[];
};

function SettingSection({
  section,
  settings,
  values,
  onValueChange,
  theme,
  systemTokens,
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
  const getSettingKey = (config: SettingConfig): ServerSettingType => {
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
          <Icon
            source={sectionConfig.icon}
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
            systemTokens={
              setting.configType === ServerSettingType.PushPassthroughToken
                ? systemTokens
                : undefined
            }
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
  systemTokens?: SystemTokenOption[];
};

const CUSTOM_TOKEN_OPTION_ID = "__custom__";

function SettingField({
  setting,
  value,
  onValueChange,
  theme,
  systemTokens,
}: SettingFieldProps) {
  const { t } = useI18n();
  const [showSecret, setShowSecret] = useState(false);
  const fieldType = getFieldType(setting);
  const label = t(`serverSettings.fields.${setting.configType}` as any);

  const isSensitive = false;

  const isPushMode =
    setting.configType === ServerSettingType.ApnPush ||
    setting.configType === ServerSettingType.FirebasePush ||
    setting.configType === ServerSettingType.WebPush;

  const isPushPassthroughToken =
    setting.configType === ServerSettingType.PushPassthroughToken;
  const tokensWithToken = systemTokens?.filter((t) => t.token) ?? [];
  const showTokenSelector = isPushPassthroughToken && tokensWithToken.length > 0;

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
            placeholder={t("serverSettings.selectPlaceholder", {
              field: label,
            } as any)}
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

  if (fieldType === "json") {
    // Format JSON value for display
    const formatJsonValue = (jsonStr: string | null): string => {
      if (!jsonStr) return "{}";
      try {
        const parsed = JSON.parse(jsonStr);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return jsonStr;
      }
    };

    return (
      <View style={styles.fieldContainer}>
        <Text variant="bodyMedium" style={styles.fieldLabel}>
          {label}
        </Text>
        <ScrollView
          style={[
            styles.jsonSnippetContainer,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: theme.colors.outline,
            },
          ]}
          nestedScrollEnabled
        >
          <Text style={styles.jsonSnippetText}>{formatJsonValue(value)}</Text>
        </ScrollView>
      </View>
    );
  }

  const displayValue =
    isSensitive && !showSecret && value
      ? "•".repeat(Math.min(value.length, 40))
      : value ?? "";

  if (showTokenSelector) {
    const selectorOptions: SelectorOption[] = [
      {
        id: CUSTOM_TOKEN_OPTION_ID,
        name: t("serverSettings.customToken" as any),
      },
      ...tokensWithToken.map((tkn) => ({
        id: tkn.token,
        name:
          tkn.description?.trim() ||
          `Token ${tkn.id.slice(0, 8)}... (${tkn.token.slice(0, 12)}...)`,
      })),
    ];
    const selectedId = tokensWithToken.some((tkn) => tkn.token === value)
      ? value
      : CUSTOM_TOKEN_OPTION_ID;

    return (
      <View style={styles.fieldContainer}>
        <Selector
          label={t("serverSettings.selectSystemToken" as any)}
          options={selectorOptions}
          selectedValue={selectedId}
          onValueChange={(id) => {
            if (id === CUSTOM_TOKEN_OPTION_ID) return;
            onValueChange(id);
          }}
          placeholder={t("serverSettings.selectPlaceholder", {
            field: label,
          } as any)}
        />
        <TextInput
          mode="outlined"
          label={label}
          value={displayValue}
          onChangeText={onValueChange}
          autoCapitalize="none"
          autoCorrect={false}
          multiline={true}
          numberOfLines={3}
          style={[styles.textInput, { marginTop: 8 }]}
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
        numberOfLines={
          setting.configType === ServerSettingType.ApnPrivateKeyPath ||
          setting.configType === ServerSettingType.FirebasePrivateKey
            ? 6
            : 3
        }
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

const UNSAVED_BANNER_HEIGHT = 56;

export function ServerSettings() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  // State
  const [values, setValues] = useState<Record<ServerSettingType, any>>(
    {} as Record<ServerSettingType, any>
  );
  const [originalValues, setOriginalValues] = useState<
    Record<ServerSettingType, any>
  >({} as Record<ServerSettingType, any>);
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
  const { tokens: systemTokens } = useSystemAccessTokens();

  // Initialize values when data loads
  useEffect(() => {
    if (settings.length > 0) {
      const initialValues: Record<ServerSettingType, any> = {} as Record<
        ServerSettingType,
        any
      >;
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

  const handleValueChange = (configType: ServerSettingType, value: any) => {
    setValues((prev) => ({ ...prev, [configType]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Get changed settings
      const changes = (Object.keys(values) as ServerSettingType[]).filter(
        (key) => values[key] !== originalValues[key]
      );

      // Prepare batch update input
      const settingsToUpdate = changes.map((configType) => {
        const value = values[configType];
        return {
          configType: configType,
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
        t("serverSettings.savedSuccessfully", { count: changes.length } as any),
        [
          {
            text: t("common.ok" as any),
            style: "cancel",
          },
          {
            text: t("serverSettings.restartServer" as any),
            onPress: () => {
              confirmRestartServer();
            },
          },
        ]
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

  const stickyBannerBottom = insets.bottom;

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
    <View style={styles.container}>
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
        contentContainerStyle={{
          paddingBottom: hasChanges
            ? UNSAVED_BANNER_HEIGHT + stickyBannerBottom + 16
            : undefined,
        }}
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
            systemTokens={
              sectionKey === "pushPassthrough" ? systemTokens : undefined
            }
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

      {hasChanges && (
        <View
          style={[
            styles.unsavedBanner,
            {
              backgroundColor: theme.colors.surfaceVariant,
              paddingBottom: stickyBannerBottom + 8,
            },
          ]}
        >
          <View style={styles.unsavedBannerIcon}>
            <Icon
              source="alert-circle-outline"
              size={20}
              color={theme.colors.primary}
            />
          </View>
          <Text
            variant="bodyMedium"
            style={[styles.unsavedBannerText, { color: theme.colors.onSurface }]}
          >
            {t("serverSettings.unsavedChangesBanner" as any)}
          </Text>
          <View style={styles.unsavedBannerActions}>
            <Button
              mode="outlined"
              compact
              onPress={() => !saving && resetSettings()}
              disabled={saving}
            >
              {t("serverSettings.reset" as any)}
            </Button>
            <Button
              mode="contained"
              compact
              onPress={() => !saving && saveSettings()}
              loading={saving}
              disabled={saving}
            >
              {t("serverSettings.saveChanges" as any)}
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  unsavedBanner: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.08)",
  },
  unsavedBannerIcon: {
    marginRight: 8,
  },
  unsavedBannerText: {
    flex: 1,
  },
  unsavedBannerActions: {
    flexDirection: "row",
    gap: 8,
  },
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
  jsonSnippetContainer: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
    height: 200,
    padding: 12,
  },
  jsonSnippetText: {
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 18,
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
