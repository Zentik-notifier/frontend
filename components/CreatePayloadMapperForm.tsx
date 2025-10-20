import { useAppContext } from "@/contexts/AppContext";
import {
  CreatePayloadMapperDto,
  ExecutionType,
  GetPayloadMappersDocument,
  GetPayloadMappersQuery,
  PayloadMapperFragment,
  UpdatePayloadMapperDto,
  UserSettingType,
  useCreatePayloadMapperMutation,
  useDeletePayloadMapperMutation,
  useGetPayloadMapperQuery,
  useGetUserSettingsQuery,
  useUpdatePayloadMapperMutation,
  useUpsertUserSettingMutation,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Checkbox,
  Dialog,
  IconButton,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import CodeEditor from "./CodeEditor";
import EntityExecutionsSection from "./EntityExecutionsSection";
import PaperScrollView from "./ui/PaperScrollView";

interface CreatePayloadMapperFormProps {
  payloadMapperId?: string;
}

export default function CreatePayloadMapperForm({
  payloadMapperId,
}: CreatePayloadMapperFormProps) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const isOffline = isOfflineAuth || isBackendUnreachable;

  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Field error states
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    jsEvalFn?: string;
    testInput?: string;
  }>({});

  // Load payload mapper data if editing
  const {
    data: payloadMapperData,
    loading: loadingPayloadMapper,
    error: errorPayloadMapper,
    refetch,
  } = useGetPayloadMapperQuery({
    variables: { id: payloadMapperId || "" },
    skip: !payloadMapperId,
  });

  const handleRefresh = async () => {
    await refetch();
  };

  const payloadMapper = payloadMapperData?.payloadMapper;
  const isEditing = !!payloadMapperId;
  const isBuiltIn = !!payloadMapper?.builtInName;

  const [name, setName] = useState("");
  const [jsEvalFn, setJsEvalFn] = useState("");

  // Load user settings
  const {
    data: userSettingsData,
    loading: loadingUserSettings,
    refetch: refetchUserSettings,
  } = useGetUserSettingsQuery();

  const [upsertUserSettingMutation, { loading: updatingUserSetting }] =
    useUpsertUserSettingMutation();

  // Local state for editing user settings
  const [editingSettings, setEditingSettings] = useState<
    Record<UserSettingType, { valueText?: string; valueBool?: boolean }>
  >({} as any);

  // Track which settings have been modified and their original values
  const [modifiedSettings, setModifiedSettings] = useState<
    Set<UserSettingType>
  >(new Set());
  const [originalSettings, setOriginalSettings] = useState<
    Record<UserSettingType, { valueText?: string; valueBool?: boolean }>
  >({} as any);

  // Helper function to determine if a setting type is boolean
  const isBooleanSetting = (settingType: UserSettingType): boolean => {
    return [
      UserSettingType.UnencryptOnBigPayload,
      UserSettingType.AutoAddDeleteAction,
      UserSettingType.AutoAddMarkAsReadAction,
      UserSettingType.AutoAddOpenNotificationAction,
    ].includes(settingType);
  };

  // Initialize editing settings from loaded user settings
  useEffect(() => {
    if (userSettingsData?.userSettings) {
      const settings: Record<
        UserSettingType,
        { valueText?: string; valueBool?: boolean }
      > = {} as any;

      userSettingsData.userSettings.forEach((setting) => {
        settings[setting.configType] = {
          valueText: setting.valueText || undefined,
          valueBool: setting.valueBool ?? undefined,
        };
      });

      setEditingSettings(settings);
      setOriginalSettings(settings);
      setModifiedSettings(new Set());
    }
  }, [userSettingsData]);

  // Default function template for new payload mappers
  const defaultJsEvalFn = `(payload, headers) => {
  // This function transforms incoming webhook payloads into notification messages
  // Return null to skip the notification
  // https://notifier-docs.zentik.app/docs/notifications

  // Access to HTTP headers (optional second parameter)
  // Example: const userAgent = headers['user-agent'];
  // Example: const contentType = headers['content-type'];

  return {
    // Required fields
    title: payload.title || 'Notification Title',
    deliveryType: 'NORMAL', // 'NORMAL', 'CRITICAL', or 'SILENT'

    // Optional fields - uncomment and customize as needed
    subtitle: payload.subtitle || 'Notification Subtitle',
    body: payload.body || 'Notification body content',

    // tapAction: {
    //   type: 'NAVIGATE',
    //   value: payload.pull_request?.html_url
    // }
  };
};`;

  // Test function state
  const [testInput, setTestInput] = useState(`{
  "title": "New Feature Released",
  "subtitle": "Version 2.1.0",
  "body": "We've released a new version with exciting features!",
  "url": "https://example.com/release-notes"
}`);

  const [testHeaders, setTestHeaders] = useState(`{
  "user-agent": "GitHub-Hookshot/1234567",
  "content-type": "application/json",
  "x-github-event": "push",
  "x-github-delivery": "example-delivery-id"
}`);
  const [testOutput, setTestOutput] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  // Load data when editing
  useEffect(() => {
    if (payloadMapper) {
      setName(payloadMapper.name);
      setJsEvalFn(payloadMapper.jsEvalFn);
    } else if (!isEditing) {
      // Set default function for new payload mappers
      setJsEvalFn(defaultJsEvalFn);
    }
  }, [payloadMapper, isEditing]);

  // Reset form function
  const handleResetForm = () => {
    // Prevent reset for built-in payload mappers
    if (isBuiltIn) {
      return;
    }

    if (isEditing && payloadMapper) {
      // Reset to saved values
      setName(payloadMapper.name);
      setJsEvalFn(payloadMapper.jsEvalFn);
    } else {
      // Reset to default template
      setName("");
      setJsEvalFn(defaultJsEvalFn);
    }
    // Clear field errors
    setFieldErrors({});
    // Clear test output
    setTestOutput("");
    // Reset test headers to default
    setTestHeaders(`{
  "user-agent": "GitHub-Hookshot/1234567",
  "content-type": "application/json",
  "x-github-event": "push",
  "x-github-delivery": "example-delivery-id"
}`);
  };

  const [createPayloadMapperMutation, { loading: creatingPayloadMapper }] =
    useCreatePayloadMapperMutation({
      update: (cache, { data }) => {
        if (data?.createPayloadMapper) {
          const existingPayloadMappers =
            cache.readQuery<GetPayloadMappersQuery>({
              query: GetPayloadMappersDocument,
            });
          if (existingPayloadMappers?.payloadMappers) {
            cache.writeQuery({
              query: GetPayloadMappersDocument,
              data: {
                payloadMappers: [
                  ...existingPayloadMappers.payloadMappers,
                  data.createPayloadMapper,
                ] satisfies PayloadMapperFragment[],
              },
            });
          }
        }
      },
    });

  const [updatePayloadMapperMutation, { loading: updatingPayloadMapper }] =
    useUpdatePayloadMapperMutation();

  const [deletePayloadMapperMutation, { loading: deletingPayloadMapper }] =
    useDeletePayloadMapperMutation({
      update: (cache, { data }) => {
        if (data?.deletePayloadMapper) {
          const existingPayloadMappers =
            cache.readQuery<GetPayloadMappersQuery>({
              query: GetPayloadMappersDocument,
            });
          if (existingPayloadMappers?.payloadMappers) {
            cache.writeQuery({
              query: GetPayloadMappersDocument,
              data: {
                payloadMappers: existingPayloadMappers.payloadMappers.filter(
                  (mapper: PayloadMapperFragment) =>
                    mapper.id !== payloadMapperId
                ),
              },
            });
          }
        }
      },
      onCompleted: () => {
        router.back();
      },
      onError: (error) => {
        console.error("Error deleting payload mapper:", error);
        setErrorMessage(
          error.message || t("payloadMappers.deleteErrorMessage")
        );
        setShowErrorDialog(true);
      },
    });

  const validateForm = (): boolean => {
    const errors: { name?: string; jsEvalFn?: string; testInput?: string } = {};

    if (!name.trim()) {
      errors.name = t("payloadMappers.form.nameRequired");
    }

    if (!jsEvalFn.trim()) {
      errors.jsEvalFn = t("payloadMappers.form.jsEvalFnRequired");
    } else {
      // Basic syntax validation for the function
      try {
        new Function(jsEvalFn);
      } catch (e) {
        errors.jsEvalFn = t("payloadMappers.form.jsEvalFnInvalidSyntax");
      }
    }

    // Clear test input errors when validating form (only for save)
    if (errors.name || errors.jsEvalFn) {
      errors.testInput = undefined;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const testFunction = async () => {
    if (!testInput.trim() || !testHeaders.trim() || !jsEvalFn.trim()) {
      return;
    }

    // Clear previous test errors
    setFieldErrors({ ...fieldErrors, testInput: undefined });

    setIsTesting(true);
    try {
      // Parse test input as JSON
      let parsedInput;
      let parsedHeaders;
      try {
        parsedInput = JSON.parse(testInput);
        parsedHeaders = JSON.parse(testHeaders);
      } catch (e) {
        setFieldErrors({
          ...fieldErrors,
          testInput: t("payloadMappers.form.testInputInvalidJson"),
        });
        setIsTesting(false);
        return;
      }

      // Parse test headers as JSON
      try {
        parsedHeaders = JSON.parse(testHeaders);
      } catch (e) {
        setFieldErrors({
          ...fieldErrors,
          testInput: t("payloadMappers.form.testHeadersInvalidJson"),
        });
        setIsTesting(false);
        return;
      }
      const testFn = eval(jsEvalFn);

      const result = testFn(parsedInput, parsedHeaders);
      setTestOutput(JSON.stringify(result ?? {}, null, 2));
    } catch (error: any) {
      setTestOutput(
        t("payloadMappers.form.testExecutionError") + ": " + error.message
      );
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    // Prevent saving for built-in payload mappers
    if (isBuiltIn) {
      setErrorMessage(t("payloadMappers.cannotEditBuiltIn"));
      setShowErrorDialog(true);
      return;
    }

    try {
      const payloadMapperInput = {
        name: name.trim(),
        jsEvalFn: jsEvalFn.trim(),
      };

      if (isEditing && payloadMapperId) {
        await updatePayloadMapperMutation({
          variables: {
            id: payloadMapperId,
            input: payloadMapperInput as UpdatePayloadMapperDto,
          },
        });
      } else {
        await createPayloadMapperMutation({
          variables: {
            input: payloadMapperInput as CreatePayloadMapperDto,
          },
        });
      }

      router.back();
    } catch (error: any) {
      setErrorMessage(error.message || t("common.errorOccurred"));
      setShowErrorDialog(true);
    }
  };

  const handleDelete = () => {
    if (!payloadMapper || isBuiltIn) return;

    Alert.alert(
      t("payloadMappers.deleteConfirmTitle"),
      t("payloadMappers.deleteConfirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("payloadMappers.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deletePayloadMapperMutation({
                variables: { id: payloadMapper.id },
              });
            } catch {}
          },
        },
      ]
    );
  };

  const handleSaveUserSetting = async (configType: UserSettingType) => {
    try {
      const isBoolean = isBooleanSetting(configType);
      const value = editingSettings[configType];
      await upsertUserSettingMutation({
        variables: {
          input: {
            configType,
            valueText: isBoolean ? null : value?.valueText || null,
            valueBool: isBoolean ? value?.valueBool ?? null : null,
            deviceId: null,
          },
        },
      });
      await refetchUserSettings();
      // Remove from modified settings after successful save
      setModifiedSettings((prev) => {
        const newSet = new Set(prev);
        newSet.delete(configType);
        return newSet;
      });
    } catch (error: any) {
      console.error("Error saving user setting:", error);
      setErrorMessage(error.message || t("common.errorOccurred"));
      setShowErrorDialog(true);
    }
  };

  const handleDiscardUserSetting = (configType: UserSettingType) => {
    // Restore original value
    setEditingSettings((prev) => ({
      ...prev,
      [configType]: originalSettings[configType] || {},
    }));
    // Remove from modified settings
    setModifiedSettings((prev) => {
      const newSet = new Set(prev);
      newSet.delete(configType);
      return newSet;
    });
  };

  const handleSettingChange = (
    configType: UserSettingType,
    value: string | boolean,
    isBoolean: boolean
  ) => {
    setEditingSettings((prev) => ({
      ...prev,
      [configType]: {
        ...prev[configType],
        ...(isBoolean
          ? { valueBool: value as boolean }
          : { valueText: value as string }),
      },
    }));
    // Mark as modified
    setModifiedSettings((prev) => new Set(prev).add(configType));
  };

  return (
    <PaperScrollView
      loading={loadingPayloadMapper}
      onRefresh={handleRefresh}
      error={!!errorPayloadMapper && !loadingPayloadMapper}
      onRetry={handleRefresh}
    >
      <TextInput
        label={t("payloadMappers.form.name")}
        value={name}
        onChangeText={(text) => {
          setName(text);
          if (fieldErrors.name) {
            setFieldErrors({ ...fieldErrors, name: undefined });
          }
        }}
        placeholder={t("payloadMappers.form.namePlaceholder")}
        error={!!fieldErrors.name}
        style={styles.input}
        mode="outlined"
        disabled={isBuiltIn}
      />
      {fieldErrors.name && (
        <Text style={styles.errorText}>{fieldErrors.name}</Text>
      )}

      {/* Required User Settings Section */}
      {payloadMapper?.requiredUserSettings &&
        payloadMapper.requiredUserSettings.length > 0 && (
          <View style={styles.userSettingsSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t("payloadMappers.form.requiredUserSettings")}
            </Text>
            <Text style={styles.helpText}>
              {t("payloadMappers.form.requiredUserSettingsHelp")}
            </Text>

            <View style={styles.settingsContainer}>
              {payloadMapper.requiredUserSettings.map((settingType) => {
                const currentValue = editingSettings[settingType];
                const isBoolean = isBooleanSetting(settingType);
                const isModified = modifiedSettings.has(settingType);

                return (
                  <Card
                    key={settingType}
                    style={[
                      styles.settingCard,
                      isModified && styles.settingCardModified,
                    ]}
                    mode="outlined"
                  >
                    <Card.Content>
                      <View style={styles.settingCardHeader}>
                        <View style={styles.settingTitleContainer}>
                          <Text variant="titleSmall" style={styles.settingName}>
                            {t(`userSettings.${settingType}` as any) ||
                              settingType}
                          </Text>
                          <Text
                            variant="bodySmall"
                            style={[
                              styles.settingDescription,
                              { color: theme.colors.onSurfaceVariant },
                            ]}
                          >
                            {t(`userSettings.${settingType}_description` as any) ||
                              ""}
                          </Text>
                        </View>
                        {isModified && (
                          <View style={styles.actionButtons}>
                            <IconButton
                              icon="check"
                              mode="contained"
                              onPress={() => handleSaveUserSetting(settingType)}
                              disabled={updatingUserSetting}
                              size={24}
                              iconColor={theme.colors.onPrimary}
                              containerColor={theme.colors.primary}
                            />
                            <IconButton
                              icon="close"
                              mode="outlined"
                              onPress={() =>
                                handleDiscardUserSetting(settingType)
                              }
                              disabled={updatingUserSetting}
                              size={24}
                            />
                          </View>
                        )}
                      </View>
                      <View style={styles.settingValueContainer}>
                        {isBoolean ? (
                          <View style={styles.checkboxContainer}>
                            <Checkbox
                              status={
                                currentValue?.valueBool
                                  ? "checked"
                                  : "unchecked"
                              }
                              onPress={() => {
                                const newValue = !currentValue?.valueBool;
                                handleSettingChange(
                                  settingType,
                                  newValue,
                                  true
                                );
                              }}
                              disabled={updatingUserSetting}
                            />
                            <Text>
                              {currentValue?.valueBool
                                ? t("common.enabled")
                                : t("common.disabled")}
                            </Text>
                          </View>
                        ) : (
                          <TextInput
                            value={currentValue?.valueText || ""}
                            onChangeText={(text) => {
                              handleSettingChange(settingType, text, false);
                            }}
                            style={styles.settingInput}
                            mode="outlined"
                            dense
                            disabled={updatingUserSetting}
                            placeholder={t("payloadMappers.form.settingValue")}
                          />
                        )}
                      </View>
                    </Card.Content>
                  </Card>
                );
              })}
            </View>
          </View>
        )}

      {!isBuiltIn && (
        <View style={styles.codeSection}>
          <Text variant="bodyLarge" style={styles.sectionTitle}>
            {t("payloadMappers.form.jsEvalFn")}
          </Text>
          <Text style={styles.helpText}>
            {t("payloadMappers.form.jsEvalFnHelp")}
          </Text>

          <CodeEditor
            value={jsEvalFn}
            onChange={(text: string) => {
              setJsEvalFn(text);
              if (fieldErrors.jsEvalFn) {
                setFieldErrors({ ...fieldErrors, jsEvalFn: undefined });
              }
            }}
            language="typescript"
            error={!!fieldErrors.jsEvalFn}
            errorText={fieldErrors.jsEvalFn}
            placeholder={t("payloadMappers.form.jsEvalFnPlaceholder")}
            label={t("payloadMappers.form.jsEvalFn")}
          />
        </View>
      )}

      {/* Test Section */}
      {!isBuiltIn && (
        <View style={styles.testSection}>
          <Text variant="bodyLarge" style={styles.sectionTitle}>
            {t("payloadMappers.form.test")}
          </Text>

          <CodeEditor
            value={testInput}
            onChange={(text: string) => {
              setTestInput(text);
              if (fieldErrors.testInput) {
                setFieldErrors({ ...fieldErrors, testInput: undefined });
              }
            }}
            placeholder={t("payloadMappers.form.testInputPlaceholder")}
            label={t("payloadMappers.form.testInput")}
            language="json"
            error={!!fieldErrors.testInput}
            errorText={fieldErrors.testInput}
          />

          <Text style={styles.helpText}>
            {t("payloadMappers.form.testInputHelp")}
          </Text>

          <CodeEditor
            value={testHeaders}
            onChange={(text: string) => {
              setTestHeaders(text);
            }}
            placeholder={t("payloadMappers.form.testHeadersPlaceholder")}
            label={t("payloadMappers.form.testHeaders")}
            language="json"
          />

          <Text style={styles.helpText}>
            {t("payloadMappers.form.testHeadersHelp")}
          </Text>

          <Button
            mode="outlined"
            onPress={testFunction}
            loading={isTesting}
            disabled={
              isTesting ||
              !testInput.trim() ||
              !testHeaders.trim() ||
              !jsEvalFn.trim() ||
              !!fieldErrors.name ||
              !!fieldErrors.jsEvalFn
            }
            style={styles.testButton}
          >
            {t("payloadMappers.form.test")}
          </Button>

          {testOutput && (
            <View style={styles.testOutput}>
              <Text variant="bodyLarge" style={styles.outputTitle}>
                {t("payloadMappers.form.testOutput")}
              </Text>
              <CodeEditor
                value={testOutput}
                onChange={() => {}} // Read-only, no-op function
                language="json"
                readOnly={true}
              />
            </View>
          )}
        </View>
      )}

      {/* Action Buttons */}
      {!isBuiltIn && (
        <>
          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={handleResetForm}
              style={styles.resetButton}
            >
              {isEditing
                ? t("payloadMappers.form.resetToSaved")
                : t("payloadMappers.form.resetToDefault")}
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={creatingPayloadMapper || updatingPayloadMapper}
              disabled={
                creatingPayloadMapper ||
                updatingPayloadMapper ||
                isOffline ||
                !!fieldErrors.name ||
                !!fieldErrors.jsEvalFn
              }
              style={styles.saveButton}
            >
              {creatingPayloadMapper || updatingPayloadMapper
                ? t("payloadMappers.form.saving")
                : t("payloadMappers.form.save")}
            </Button>
          </View>

          {/* Delete Button - Full Width */}
          {isEditing && (
            <View style={styles.deleteSection}>
              <Button
                mode="contained"
                buttonColor={theme.colors.error}
                textColor={theme.colors.onError}
                icon="delete"
                onPress={handleDelete}
                loading={deletingPayloadMapper}
                disabled={deletingPayloadMapper}
                style={styles.deleteButton}
              >
                {deletingPayloadMapper
                  ? "Deleting..."
                  : t("payloadMappers.delete")}
              </Button>
            </View>
          )}
        </>
      )}

      {/* Entity Executions Section */}
      {payloadMapperId && (
        <View style={{ marginBottom: 100 }}>
          <EntityExecutionsSection
            entityId={payloadMapperId}
            entityType={ExecutionType.PayloadMapper}
            entityName={payloadMapper?.builtInName!}
          />
        </View>
      )}

      {/* Error Dialog */}
      <Portal>
        <Dialog
          visible={showErrorDialog}
          onDismiss={() => setShowErrorDialog(false)}
        >
          <Dialog.Icon icon="alert-circle" />
          <Dialog.Title>{t("common.error")}</Dialog.Title>
          <Dialog.Content>
            <Text>{errorMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowErrorDialog(false)}>
              {t("common.ok")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  input: {
    marginBottom: 8,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
    marginBottom: 8,
    marginTop: -4,
  },
  userSettingsSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  settingsContainer: {
    marginTop: 8,
    gap: 12,
  },
  settingCard: {
    marginBottom: 8,
  },
  settingCardModified: {
    borderColor: "#3b82f6",
    borderWidth: 2,
  },
  settingCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  settingTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  settingName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.8,
  },
  settingValueContainer: {
    marginTop: 8,
  },
  settingInput: {
    width: "100%",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  codeSection: {
    marginTop: 16,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: "600",
  },
  helpText: {
    color: "#6b7280",
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  codeEditor: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
  },
  codeInput: {
    fontFamily: "monospace",
    fontSize: 14,
  },
  exampleText: {
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 8,
    fontFamily: "monospace",
    fontSize: 12,
    color: "#374151",
    marginTop: 8,
  },
  testSection: {
    marginTop: 24,
  },
  testButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  testOutput: {
    marginTop: 16,
  },
  outputTitle: {
    marginBottom: 8,
    fontWeight: "600",
  },
  outputInput: {
    fontFamily: "monospace",
    fontSize: 12,
    backgroundColor: "#f9fafb",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 32,
  },
  cancelButton: {
    flex: 1,
  },
  resetButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  deleteButton: {
    marginTop: 16,
    minWidth: 150,
  },
  deleteSection: {
    marginTop: 16,
  },
});
