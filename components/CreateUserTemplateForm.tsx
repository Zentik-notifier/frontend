import { useAppContext } from "@/contexts/AppContext";
import {
  CreateUserTemplateDto,
  GetUserTemplatesDocument,
  GetUserTemplatesQuery,
  UpdateUserTemplateDto,
  useCreateUserTemplateMutation,
  useDeleteUserTemplateMutation,
  useGetUserTemplateQuery,
  useUpdateUserTemplateMutation,
  UserTemplateFragment,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useRouter } from "expo-router";
import Handlebars from "handlebars";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import {
  Button,
  Dialog,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import CodeEditor from "./CodeEditor";
import PaperScrollView from "./ui/PaperScrollView";

interface CreateUserTemplateFormProps {
  userTemplateId?: string;
}

export default function CreateUserTemplateForm({
  userTemplateId,
}: CreateUserTemplateFormProps) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const isOffline = isOfflineAuth || isBackendUnreachable;

  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    description?: string;
    title?: string;
    subtitle?: string;
    body?: string;
    testInput?: string;
  }>({});

  const {
    data: userTemplateData,
    loading: loadingUserTemplate,
    error: errorUserTemplate,
    refetch,
  } = useGetUserTemplateQuery({
    variables: { id: userTemplateId || "" },
    skip: !userTemplateId,
  });

  const handleRefresh = async () => {
    await refetch();
  };

  const userTemplate = userTemplateData?.userTemplate;
  const isEditing = !!userTemplateId;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [body, setBody] = useState("");

  // Test section states
  const [testInput, setTestInput] = useState(`{
  "title": "Example Title",
  "message": "Example message content",
  "user": "John Doe"
}`);
  const [testOutput, setTestOutput] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  const defaultTitle = `Hello {{user}}!`;
  const defaultSubtitle = `Subtitle: {{subtitle}}`;
  const defaultBody = `Body content with {{title}}`;

  useEffect(() => {
    if (userTemplate) {
      setName(userTemplate.name || "");
      setDescription(userTemplate.description || "");
      setTitle(userTemplate.title || "");
      setSubtitle(userTemplate.subtitle || "");
      setBody(userTemplate.body || "");
    } else if (!isEditing) {
      setTitle(defaultTitle);
      setSubtitle(defaultSubtitle);
      setBody(defaultBody);
    }
  }, [userTemplate, isEditing]);

  const handleResetForm = () => {
    if (isEditing && userTemplate) {
      setName(userTemplate.name || "");
      setDescription(userTemplate.description || "");
      setTitle(userTemplate.title || "");
      setSubtitle(userTemplate.subtitle || "");
      setBody(userTemplate.body || "");
    } else {
      setName("");
      setDescription("");
      setTitle(defaultTitle);
      setSubtitle(defaultSubtitle);
      setBody(defaultBody);
    }
    setFieldErrors({});
    setTestOutput("");
  };

  const validateForm = (): boolean => {
    const errors: {
      name?: string;
      description?: string;
      title?: string;
      subtitle?: string;
      body?: string;
      testInput?: string;
    } = {};

    if (!name.trim()) {
      errors.name = t("userTemplates.form.nameRequired");
    }

    if (!body.trim()) {
      errors.body = t("userTemplates.form.bodyRequired");
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const testTemplate = () => {
    if (!testInput.trim() || (!body.trim() && !subtitle.trim() && !title.trim())) {
      return;
    }

    setFieldErrors({ ...fieldErrors, testInput: undefined });
    setIsTesting(true);
    setTestOutput("");

    try {
      // Parse test input as JSON
      let parsedInput;
      try {
        parsedInput = JSON.parse(testInput);
      } catch (e) {
        setFieldErrors({
          ...fieldErrors,
          testInput: t("userTemplates.form.testInputInvalidJson"),
        });
        setIsTesting(false);
        return;
      }

      // Process all templates with input data using Handlebars
      const results: any = {};
      
      if (title.trim()) {
        const compiledTitle = Handlebars.compile(title);
        results.title = compiledTitle(parsedInput);
      }
      
      if (subtitle.trim()) {
        const compiledSubtitle = Handlebars.compile(subtitle);
        results.subtitle = compiledSubtitle(parsedInput);
      }
      
      if (body.trim()) {
        const compiledBody = Handlebars.compile(body);
        results.body = compiledBody(parsedInput);
      }

      setTestOutput(JSON.stringify(results, null, 2));
    } catch (error: any) {
      setTestOutput(
        t("userTemplates.form.testExecutionError") + ": " + error.message
      );
    } finally {
      setIsTesting(false);
    }
  };

  const [createUserTemplateMutation, { loading: creatingUserTemplate }] =
    useCreateUserTemplateMutation({
      update: (cache, { data }) => {
        if (data?.createUserTemplate) {
          const existingUserTemplates =
            cache.readQuery<GetUserTemplatesQuery>({
              query: GetUserTemplatesDocument,
            });
          if (existingUserTemplates?.userTemplates) {
            cache.writeQuery({
              query: GetUserTemplatesDocument,
              data: {
                userTemplates: [
                  ...existingUserTemplates.userTemplates,
                  data.createUserTemplate,
                ] satisfies UserTemplateFragment[],
              },
            });
          }
        }
      },
    });

  const [updateUserTemplateMutation, { loading: updatingUserTemplate }] =
    useUpdateUserTemplateMutation();

  const [deleteUserTemplateMutation, { loading: deletingUserTemplate }] =
    useDeleteUserTemplateMutation({
      update: (cache) => {
        if (userTemplateId) {
          const existingUserTemplates =
            cache.readQuery<GetUserTemplatesQuery>({
              query: GetUserTemplatesDocument,
            });
          if (existingUserTemplates?.userTemplates) {
            cache.writeQuery({
              query: GetUserTemplatesDocument,
              data: {
                userTemplates: existingUserTemplates.userTemplates.filter(
                  (t) => t.id !== userTemplateId
                ),
              },
            });
          }
        }
      },
    });

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const userTemplateInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        title: title.trim() || undefined,
        subtitle: subtitle.trim() || undefined,
        body: body.trim(),
      };

      if (isEditing && userTemplateId) {
        await updateUserTemplateMutation({
          variables: {
            id: userTemplateId,
            input: userTemplateInput as UpdateUserTemplateDto,
          },
        });
      } else {
        await createUserTemplateMutation({
          variables: {
            input: userTemplateInput as CreateUserTemplateDto,
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
    if (!userTemplate) return;

    Alert.alert(
      t("userTemplates.deleteConfirmTitle"),
      t("userTemplates.deleteConfirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("userTemplates.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteUserTemplateMutation({
                variables: { id: userTemplate.id },
              });
              router.back();
            } catch (error: any) {
              setErrorMessage(error.message || t("common.errorOccurred"));
              setShowErrorDialog(true);
            }
          },
        },
      ]
    );
  };

  return (
    <PaperScrollView
      loading={loadingUserTemplate}
      onRefresh={handleRefresh}
      error={!!errorUserTemplate && !loadingUserTemplate}
      onRetry={handleRefresh}
    >
      <TextInput
        label={t("userTemplates.form.name")}
        value={name}
        onChangeText={(text) => {
          setName(text);
          if (fieldErrors.name) {
            setFieldErrors({ ...fieldErrors, name: undefined });
          }
        }}
        placeholder={t("userTemplates.form.namePlaceholder")}
        error={!!fieldErrors.name}
        style={styles.input}
        mode="outlined"
      />
      {fieldErrors.name && (
        <Text style={styles.errorText}>{fieldErrors.name}</Text>
      )}

      <TextInput
        label={t("userTemplates.form.description")}
        value={description}
        onChangeText={(text) => {
          setDescription(text);
          if (fieldErrors.description) {
            setFieldErrors({ ...fieldErrors, description: undefined });
          }
        }}
        placeholder={t("userTemplates.form.descriptionPlaceholder")}
        error={!!fieldErrors.description}
        style={styles.input}
        mode="outlined"
        multiline
        numberOfLines={3}
      />
      {fieldErrors.description && (
        <Text style={styles.errorText}>{fieldErrors.description}</Text>
      )}

      <Text variant="bodyLarge" style={styles.sectionTitle}>
        {t("userTemplates.form.title")}
      </Text>
      <CodeEditor
        value={title}
        onChange={(text: string) => {
          setTitle(text);
          if (fieldErrors.title) {
            setFieldErrors({ ...fieldErrors, title: undefined });
          }
        }}
        placeholder={t("userTemplates.form.titlePlaceholder")}
        label={t("userTemplates.form.title")}
        language="handlebars"
        error={!!fieldErrors.title}
        errorText={fieldErrors.title}
        height={72}
        numberOfLines={3}
      />
      {fieldErrors.title && (
        <Text style={styles.errorText}>{fieldErrors.title}</Text>
      )}

      <Text variant="bodyLarge" style={styles.sectionTitle}>
        {t("userTemplates.form.subtitle")}
      </Text>
      <CodeEditor
        value={subtitle}
        onChange={(text: string) => {
          setSubtitle(text);
          if (fieldErrors.subtitle) {
            setFieldErrors({ ...fieldErrors, subtitle: undefined });
          }
        }}
        placeholder={t("userTemplates.form.subtitlePlaceholder")}
        label={t("userTemplates.form.subtitle")}
        language="handlebars"
        error={!!fieldErrors.subtitle}
        errorText={fieldErrors.subtitle}
        height={72}
        numberOfLines={3}
      />
      {fieldErrors.subtitle && (
        <Text style={styles.errorText}>{fieldErrors.subtitle}</Text>
      )}

      <Text variant="bodyLarge" style={styles.sectionTitle}>
        {t("userTemplates.form.body")}
      </Text>
      <CodeEditor
        value={body}
        onChange={(text: string) => {
          setBody(text);
          if (fieldErrors.body) {
            setFieldErrors({ ...fieldErrors, body: undefined });
          }
        }}
        placeholder={t("userTemplates.form.bodyPlaceholder")}
        label={t("userTemplates.form.body")}
        language="handlebars"
        error={!!fieldErrors.body}
        errorText={fieldErrors.body}
      />
      {fieldErrors.body && (
        <Text style={styles.errorText}>{fieldErrors.body}</Text>
      )}

      {/* Test Section */}
      <View style={styles.testSection}>
        <Text variant="bodyLarge" style={styles.sectionTitle}>
          {t("userTemplates.form.test")}
        </Text>

        <CodeEditor
          value={testInput}
          onChange={(text: string) => {
            setTestInput(text);
            if (fieldErrors.testInput) {
              setFieldErrors({ ...fieldErrors, testInput: undefined });
            }
          }}
          placeholder={t("userTemplates.form.testInputPlaceholder")}
          label={t("userTemplates.form.testInput")}
          language="json"
          error={!!fieldErrors.testInput}
          errorText={fieldErrors.testInput}
        />

        <Text style={styles.helpText}>
          {t("userTemplates.form.testInputHelp")}
        </Text>

        <Button
          mode="outlined"
          onPress={testTemplate}
          loading={isTesting}
          disabled={
            isTesting ||
            !testInput.trim() ||
            (!body.trim() && !subtitle.trim() && !title.trim()) ||
            !!fieldErrors.name ||
            !!fieldErrors.body ||
            !!fieldErrors.subtitle
          }
          style={styles.testButton}
        >
          {t("userTemplates.form.test")}
        </Button>

        {testOutput && (
          <View style={styles.testOutput}>
            <Text variant="bodyLarge" style={styles.outputTitle}>
              {t("userTemplates.form.testOutput")}
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

      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={handleResetForm}
          style={styles.resetButton}
        >
          {isEditing
            ? t("userTemplates.form.resetToSaved")
            : t("userTemplates.form.resetToDefault")}
        </Button>
        <Button
          mode="contained"
          onPress={handleSave}
          loading={creatingUserTemplate || updatingUserTemplate}
          disabled={
            creatingUserTemplate ||
            updatingUserTemplate ||
            isOffline ||
            !!fieldErrors.name ||
            !!fieldErrors.body ||
            !!fieldErrors.subtitle
          }
          style={styles.saveButton}
        >
          {creatingUserTemplate || updatingUserTemplate
            ? t("userTemplates.form.saving")
            : t("userTemplates.form.save")}
        </Button>
      </View>

      {isEditing && (
        <View style={styles.deleteSection}>
          <Button
            mode="contained"
            buttonColor={theme.colors.error}
            textColor={theme.colors.onError}
            icon="delete"
            onPress={handleDelete}
            loading={deletingUserTemplate}
            disabled={deletingUserTemplate}
            style={styles.deleteButton}
          >
            {deletingUserTemplate
              ? t("userTemplates.form.deleting")
              : t("userTemplates.delete")}
          </Button>
        </View>
      )}

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
    marginBottom: 16,
  },
  errorText: {
    color: "#B00020",
    fontSize: 12,
    marginTop: -12,
    marginBottom: 8,
    marginLeft: 16,
  },
  testSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: "600",
  },
  helpText: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 8,
    marginBottom: 16,
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
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  resetButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  deleteSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  deleteButton: {
    width: "100%",
  },
});
