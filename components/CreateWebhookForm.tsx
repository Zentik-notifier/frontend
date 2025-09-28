import {
  CreateWebhookDto,
  GetUserWebhooksDocument,
  GetUserWebhooksQuery,
  HttpMethod,
  UpdateWebhookDto,
  useCreateWebhookMutation,
  useGetWebhookQuery,
  useUpdateWebhookMutation,
  WebhookHeaderDto,
} from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/contexts/AppContext";
import { getHttpMethodColor } from "@/utils/webhookUtils";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import PaperScrollView from "@/components/ui/PaperScrollView";
import IdWithCopyButton from "./IdWithCopyButton";
import ThemedInputSelect from "./ui/ThemedInputSelect";
import {
  Button,
  Card,
  Dialog,
  Icon,
  IconButton,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

const httpMethods = [
  HttpMethod.Get,
  HttpMethod.Post,
  HttpMethod.Put,
  HttpMethod.Patch,
  HttpMethod.Delete,
];

interface CreateWebhookFormProps {
  webhookId?: string;
}

export default function CreateWebhookForm({
  webhookId,
}: CreateWebhookFormProps) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  const { formatDate } = useDateFormat();
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const isOffline = isOfflineAuth || isBackendUnreachable;
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Load webhook data if editing
  const { data: webhookData, loading: loadingWebhook } = useGetWebhookQuery({
    variables: { id: webhookId || "" },
    skip: !webhookId,
  });

  const webhook = webhookData?.webhook;
  const isEditing = !!webhookId;

  const [name, setName] = useState("");
  const [method, setMethod] = useState<HttpMethod>(HttpMethod.Post);
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<WebhookHeaderDto[]>([]);
  const [bodyText, setBodyText] = useState("");

  const [createWebhookMutation, { loading: creatingWebhook }] =
    useCreateWebhookMutation({
      refetchQueries: ["GetUserWebhooks"],
      update: (cache, { data }) => {
        if (data?.createWebhook) {
          const existingWebhooks = cache.readQuery<GetUserWebhooksQuery>({
            query: GetUserWebhooksDocument,
          });
          if (existingWebhooks?.userWebhooks) {
            cache.writeQuery({
              query: GetUserWebhooksDocument,
              data: {
                userWebhooks: [
                  ...existingWebhooks.userWebhooks,
                  data.createWebhook,
                ],
              },
            });
          }
        }
      },
      onCompleted: (data) => {
        resetFormToDefaults();
        router.back();
      },
      onError: (error) => {
        console.error("Create webhook error:", error);
        setErrorMessage(error.message || t("webhooks.createErrorMessage"));
        setShowErrorDialog(true);
      },
    });

  const [updateWebhookMutation, { loading: updatingWebhook }] =
    useUpdateWebhookMutation({
      refetchQueries: ["GetUserWebhooks"],
      onCompleted: (data) => {
        router.back();
      },
      onError: (error) => {
        console.error("Update webhook error:", error);
        setErrorMessage(error.message || t("webhooks.updateErrorMessage"));
        setShowErrorDialog(true);
      },
    });

  const isLoading = creatingWebhook || updatingWebhook || loadingWebhook;

  // Store original values for reset functionality
  const [originalName, setOriginalName] = useState("");
  const [originalMethod, setOriginalMethod] = useState<HttpMethod>(
    HttpMethod.Post
  );
  const [originalUrl, setOriginalUrl] = useState("");
  const [originalHeaders, setOriginalHeaders] = useState<WebhookHeaderDto[]>(
    []
  );
  const [originalBodyText, setOriginalBodyText] = useState("");

  // Populate form fields when webhook data is loaded
  useEffect(() => {
    if (webhook && isEditing) {
      setName(webhook.name || "");
      setMethod(webhook.method || HttpMethod.Post);
      setUrl(webhook.url || "");
      setHeaders(webhook.headers || []);
      setBodyText(webhook.body ? JSON.stringify(webhook.body) : "");

      // Store original values
      setOriginalName(webhook.name || "");
      setOriginalMethod(webhook.method || HttpMethod.Post);
      setOriginalUrl(webhook.url || "");
      setOriginalHeaders(webhook.headers || []);
      setOriginalBodyText(webhook.body ? JSON.stringify(webhook.body) : "");
    }
  }, [webhook, isEditing]);

  const resetFormToDefaults = () => {
    setName("");
    setMethod(HttpMethod.Post);
    setUrl("");
    setHeaders([]);
    setBodyText("");
  };

  const validateForm = () => {
    if (!name.trim()) {
      setErrorMessage(t("webhooks.form.nameRequired"));
      setShowErrorDialog(true);
      return false;
    }
    if (!url.trim()) {
      setErrorMessage(t("webhooks.form.urlRequired"));
      setShowErrorDialog(true);
      return false;
    }
    // Basic URL validation
    try {
      new URL(url.trim());
    } catch {
      setErrorMessage(t("webhooks.form.urlInvalid"));
      setShowErrorDialog(true);
      return false;
    }

    // Validate JSON body if provided
    if (bodyText.trim()) {
      try {
        JSON.parse(bodyText.trim());
      } catch (error) {
        setErrorMessage(t("webhooks.form.jsonValidationError"));
        setShowErrorDialog(true);
        return false;
      }
    }

    return true;
  };

  const saveWebhook = async () => {
    if (!validateForm() || isLoading) return;

    try {
      // Parse JSON body if provided
      let parsedBody: any = undefined;
      if (bodyText.trim()) {
        try {
          parsedBody = JSON.parse(bodyText.trim());
        } catch (error) {
          setErrorMessage(t("webhooks.form.jsonParsingError"));
          setShowErrorDialog(true);
          return;
        }
      }

      const webhookData: CreateWebhookDto | UpdateWebhookDto = {
        name: name.trim(),
        method,
        url: url.trim(),
        headers: headers.filter((h) => h.key.trim() && h.value.trim()),
        body: parsedBody,
      };

      if (isEditing && webhook) {
        await updateWebhookMutation({
          variables: {
            id: webhook.id,
            input: webhookData as UpdateWebhookDto,
          },
        });
      } else {
        await createWebhookMutation({
          variables: {
            input: webhookData as CreateWebhookDto,
          },
        });
      }
    } catch (error: any) {
      console.error(
        `Error ${isEditing ? "updating" : "creating"} webhook:`,
        error
      );
    }
  };

  const resetForm = () => {
    if (isEditing) {
      // Reset to original values when editing
      setName(originalName);
      setMethod(originalMethod);
      setUrl(originalUrl);
      setHeaders(originalHeaders);
      setBodyText(originalBodyText);
    } else {
      // Reset to defaults when creating
      resetFormToDefaults();
    }
  };

  const getMethodDisplayName = (method: HttpMethod) => {
    return t(`webhooks.methods.${method}`);
  };

  const httpMethodOptions = httpMethods.map(
    (method) => ({
      id: method,
      name: getMethodDisplayName(method),
    })
  );

  // Header management functions
  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "" }]);
  };

  const updateHeader = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
  };

  const removeHeader = (index: number) => {
    const newHeaders = headers.filter((_, i) => i !== index);
    setHeaders(newHeaders);
  };

  return (
    <PaperScrollView
      style={[styles.container, styles.scrollView]}
      contentContainerStyle={styles.scrollContent}
    >
      <Card style={styles.formContainer} elevation={0}>
        <Card.Content>
          {/* Webhook Name */}
          <View style={styles.inputGroup}>
            <Text variant="titleMedium" style={styles.label}>
              {t("webhooks.form.name")}
            </Text>
            <TextInput
              mode="outlined"
              value={name}
              onChangeText={setName}
              placeholder={t("webhooks.form.namePlaceholder")}
              maxLength={100}
              autoFocus
            />
          </View>

        {/* HTTP Method */}
        <View style={styles.inputGroup}>
          <ThemedInputSelect
            label={t("webhooks.form.method")}
            placeholder={t("webhooks.form.method")}
            options={httpMethodOptions}
            optionLabel="name"
            optionValue="id"
            selectedValue={method}
            onValueChange={(value) => setMethod(value as HttpMethod)}
            isSearchable={false}
            mode="inline"
          />
        </View>

          {/* URL */}
          <View style={styles.inputGroup}>
            <Text variant="titleMedium" style={styles.label}>
              {t("webhooks.form.url")}
            </Text>
            <TextInput
              mode="outlined"
              value={url}
              onChangeText={setUrl}
              placeholder={t("webhooks.form.urlPlaceholder")}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          {/* Headers */}
          <View style={styles.inputGroup}>
            <View style={styles.headerRow}>
              <Text variant="titleMedium" style={styles.label}>
                Headers
              </Text>
              <IconButton
                icon="plus"
                size={20}
                onPress={addHeader}
              />
            </View>

            {headers.map((header, index) => (
              <View key={index} style={styles.headerInputRow}>
                <TextInput
                  mode="outlined"
                  style={styles.headerInput}
                  value={header.key}
                  onChangeText={(value) => updateHeader(index, "key", value)}
                  placeholder="Header Key"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextInput
                  mode="outlined"
                  style={styles.headerInput}
                  value={header.value}
                  onChangeText={(value) => updateHeader(index, "value", value)}
                  placeholder="Header Value"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <IconButton
                  icon="delete"
                  size={18}
                  iconColor={theme.colors.error}
                  onPress={() => removeHeader(index)}
                />
              </View>
            ))}

            {headers.length === 0 && (
              <Text variant="bodySmall" style={styles.description}>
                No headers configured
              </Text>
            )}
          </View>

          {/* Body */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text variant="titleMedium" style={styles.label}>
                {t("webhooks.form.body")}
              </Text>
              <IconButton
                icon="help-circle"
                size={20}
                onPress={() => {
                  setErrorMessage(
                    `${t("webhooks.form.jsonHelpMessage")}\n\n${t(
                      "webhooks.form.jsonExample"
                    )}`
                  );
                  setShowErrorDialog(true);
                }}
              />
            </View>
            <Text variant="bodySmall" style={styles.description}>
              {t("webhooks.form.bodyHelp")}
            </Text>
            <TextInput
              mode="outlined"
              style={styles.jsonInput}
              value={bodyText}
              onChangeText={setBodyText}
              placeholder={t("webhooks.form.bodyPlaceholder")}
              multiline
              numberOfLines={12}
              autoCapitalize="none"
              autoCorrect={false}
              textAlignVertical="top"
              scrollEnabled={true}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <Button
              mode="contained"
              onPress={saveWebhook}
              disabled={isLoading || isOffline || !name.trim() || !url.trim()}
              style={styles.saveButton}
            >
              {isLoading
                ? isEditing
                  ? t("webhooks.form.saving")
                  : t("webhooks.form.creating")
                : isEditing
                ? t("webhooks.form.save")
                : t("webhooks.form.create")}
            </Button>

            <Button
              mode="outlined"
              onPress={resetForm}
              style={styles.cancelButton}
            >
              {t("common.reset")}
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Readonly fields for editing mode */}
      {isEditing && webhook && (
        <Card style={styles.readonlyContainer} elevation={0}>
          <Card.Content>
            <IdWithCopyButton
              id={webhook.id}
              label="Webhook ID"
              copyMessage="Webhook ID copied"
              valueStyle={styles.readonlyValue}
            />
            <View style={styles.datesRow}>
              <View style={styles.dateField}>
                <Text variant="bodySmall" style={styles.readonlyLabel}>
                  Created:
                </Text>
                <Text variant="bodySmall" style={styles.readonlyValue}>
                  {formatDate(webhook.createdAt)}
                </Text>
              </View>
              {webhook.updatedAt && (
                <View style={styles.dateField}>
                  <Text variant="bodySmall" style={styles.readonlyLabel}>
                    Updated:
                  </Text>
                  <Text variant="bodySmall" style={styles.readonlyValue}>
                    {formatDate(webhook.updatedAt)}
                  </Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Error Dialog */}
      <Portal>
        <Dialog
          visible={showErrorDialog}
          onDismiss={() => setShowErrorDialog(false)}
        >
          <Dialog.Title>{t("common.error")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{errorMessage}</Text>
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
  container: {
    padding: 16,
  },
  scrollView: {
    paddingHorizontal: 0, // Rimuove il padding orizzontale di PaperScrollView
  },
  scrollContent: {
    paddingHorizontal: 16, // Aggiunge il padding orizzontale solo al contenuto
    paddingBottom: 20,
  },
  description: {
    marginTop: 8,
    textAlign: "center",
  },
  formContainer: {
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  headerInput: {
    flex: 1,
  },
  jsonInput: {
    minHeight: 160,
    fontFamily: "monospace",
    fontSize: 14,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
  },
  cancelButton: {
    flex: 1,
  },
  readonlyContainer: {
    marginBottom: 8,
  },
  datesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  dateField: {
    flex: 1,
  },
  readonlyField: {
    marginBottom: 10,
  },
  readonlyLabel: {
    marginBottom: 4,
  },
  readonlyValue: {
    fontFamily: "monospace",
  },
});
