import { useAppContext } from "@/contexts/AppContext";
import {
  CreatePayloadMapperDto,
  GetPayloadMappersDocument,
  GetPayloadMappersQuery,
  PayloadMapperFragment,
  UpdatePayloadMapperDto,
  useCreatePayloadMapperMutation,
  useGetPayloadMapperQuery,
  useUpdatePayloadMapperMutation,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Dialog,
  Icon,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import PaperScrollView from "./ui/PaperScrollView";

// Dynamic import for Monaco Editor (web only)
let MonacoEditor: any = null;
if (Platform.OS === 'web') {
  // Dynamic import to avoid issues on mobile
  import('@monaco-editor/react').then((module) => {
    MonacoEditor = module.default;
  });
}

interface CreatePayloadMapperFormProps {
  payloadMapperId?: string;
}

// Code Editor Component that uses Monaco Editor on web and TextInput on mobile
interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  errorText?: string;
  placeholder?: string;
  label?: string;
  language?: string;
  readOnly?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  error,
  errorText,
  placeholder,
  label,
  language = 'typescript',
  readOnly = false
}) => {
  // Use Monaco Editor on web
  if (Platform.OS === 'web' && MonacoEditor) {
    return (
      <View style={styles.codeEditor}>
        <MonacoEditor
          height="300px"
          language={language}
          value={value}
          onChange={readOnly ? undefined : (newValue: string | undefined) => onChange(newValue || '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: readOnly,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            wrappingStrategy: 'advanced',
            suggestOnTriggerCharacters: !readOnly,
            quickSuggestions: !readOnly,
            parameterHints: { enabled: !readOnly },
          }}
        />
        {error && errorText && (
          <Text style={[styles.errorText, { marginTop: 8 }]}>
            {errorText}
          </Text>
        )}
      </View>
    );
  }

  // Fallback to TextInput on mobile
  return (
    <View style={styles.codeEditor}>
      <TextInput
        label={label}
        value={value}
        onChangeText={readOnly ? undefined : onChange}
        placeholder={placeholder}
        error={!!error}
        multiline
        numberOfLines={12}
        style={[styles.codeInput, { height: 300 }]}
        mode="outlined"
        editable={!readOnly}
      />
      {error && errorText && (
        <Text style={styles.errorText}>{errorText}</Text>
      )}
    </View>
  );
};

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

  const [name, setName] = useState("");
  const [jsEvalFn, setJsEvalFn] = useState("");

  // Test function state
  const [testInput, setTestInput] = useState("");
  const [testOutput, setTestOutput] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  // Load data when editing
  useEffect(() => {
    if (payloadMapper) {
      setName(payloadMapper.name);
      setJsEvalFn(payloadMapper.jsEvalFn);
    }
  }, [payloadMapper]);

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

  const validateForm = (): boolean => {
    const errors: { name?: string; jsEvalFn?: string } = {};

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

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const testFunction = async () => {
    if (!testInput.trim() || !jsEvalFn.trim()) {
      Alert.alert(
        t("payloadMappers.form.testError"),
        t("payloadMappers.form.testInputRequired")
      );
      return;
    }

    setIsTesting(true);
    try {
      // Parse test input as JSON
      let parsedInput;
      try {
        parsedInput = JSON.parse(testInput);
      } catch (e) {
        Alert.alert(
          t("payloadMappers.form.testError"),
          t("payloadMappers.form.testInputInvalidJson")
        );
        setIsTesting(false);
        return;
      }

      // Create a function from the code and execute it
      const testFn = new Function(
        "payload",
        `
        "use strict";
        ${jsEvalFn}
        return (${
          jsEvalFn.includes("=>") ? jsEvalFn : `(${jsEvalFn})`
        })(payload);
      `
      );

      const result = testFn(parsedInput);
      setTestOutput(JSON.stringify(result, null, 2));
    } catch (error: any) {
      setTestOutput(t("payloadMappers.form.testExecutionError") + ": " + error.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
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
        Alert.alert(
          t("common.success"),
          t("payloadMappers.createSuccessMessage")
        );
      }

      router.back();
    } catch (error: any) {
      setErrorMessage(error.message || t("common.errorOccurred"));
      setShowErrorDialog(true);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <PaperScrollView
      loading={loadingPayloadMapper}
      onRefresh={handleRefresh}
      error={!!errorPayloadMapper && !loadingPayloadMapper}
      onRetry={handleRefresh}
    >
      <Card>
        <Card.Content>
          <View style={styles.header}>
            <Icon source="function" size={24} color={theme.colors.primary} />
            <Text variant="headlineSmall" style={styles.title}>
              {isEditing
                ? t("payloadMappers.edit")
                : t("payloadMappers.create")}
            </Text>
          </View>

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
          />
          {fieldErrors.name && (
            <Text style={styles.errorText}>{fieldErrors.name}</Text>
          )}

          <View style={styles.codeSection}>
            <Text variant="bodyLarge" style={styles.sectionTitle}>
              {t("payloadMappers.form.jsEvalFn")}
            </Text>
            <Text style={styles.helpText}>
              {t("payloadMappers.form.jsEvalFnHelp")}
            </Text>

            <CodeEditor
              value={jsEvalFn}
              onChange={(text) => {
                setJsEvalFn(text);
                if (fieldErrors.jsEvalFn) {
                  setFieldErrors({ ...fieldErrors, jsEvalFn: undefined });
                }
              }}
              error={!!fieldErrors.jsEvalFn}
              errorText={fieldErrors.jsEvalFn}
              placeholder={t("payloadMappers.form.jsEvalFnPlaceholder")}
              label={t("payloadMappers.form.jsEvalFn")}
              language="typescript"
            />

            <Text style={styles.exampleText}>
              {t("payloadMappers.form.jsEvalFnExample")}
            </Text>
          </View>

          {/* Test Section */}
          <View style={styles.testSection}>
            <Text variant="bodyLarge" style={styles.sectionTitle}>
              {t("payloadMappers.form.test")}
            </Text>

            <CodeEditor
              value={testInput}
              onChange={setTestInput}
              placeholder={t("payloadMappers.form.testInputPlaceholder")}
              label={t("payloadMappers.form.testInput")}
              language="json"
            />

            <Text style={styles.helpText}>
              {t("payloadMappers.form.testInputHelp")}
            </Text>

            <Button
              mode="outlined"
              onPress={testFunction}
              loading={isTesting}
              disabled={isTesting || !testInput.trim() || !jsEvalFn.trim()}
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

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={handleCancel}
              style={styles.cancelButton}
            >
              {t("common.cancel")}
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={creatingPayloadMapper || updatingPayloadMapper}
              disabled={
                creatingPayloadMapper || updatingPayloadMapper || isOffline
              }
              style={styles.saveButton}
            >
              {creatingPayloadMapper || updatingPayloadMapper
                ? t("payloadMappers.form.saving")
                : t("payloadMappers.form.save")}
            </Button>
          </View>
        </Card.Content>
      </Card>

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
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  title: {
    flex: 1,
  },
  input: {
    marginBottom: 8,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
    marginBottom: 8,
    marginTop: -4,
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
    overflow: 'hidden',
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
    minWidth: 100,
  },
  saveButton: {
    minWidth: 100,
  },
});
