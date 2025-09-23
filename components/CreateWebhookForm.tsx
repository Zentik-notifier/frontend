import { Colors } from "@/constants/Colors";
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
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { getHttpMethodColor } from "@/utils/webhookUtils";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import SettingsScrollView from "@/components/SettingsScrollView";
import IdWithCopyButton from "./IdWithCopyButton";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import InlinePicker, { InlinePickerOption } from "./ui/InlinePicker";

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
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { formatDate } = useDateFormat();
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const isOffline = isOfflineAuth || isBackendUnreachable;

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
        Alert.alert(
          t("common.error"),
          error.message || t("webhooks.createErrorMessage")
        );
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
        Alert.alert(
          t("common.error"),
          error.message || t("webhooks.updateErrorMessage")
        );
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
      Alert.alert(t("common.error"), t("webhooks.form.nameRequired"));
      return false;
    }
    if (!url.trim()) {
      Alert.alert(t("common.error"), t("webhooks.form.urlRequired"));
      return false;
    }
    // Basic URL validation
    try {
      new URL(url.trim());
    } catch {
      Alert.alert(t("common.error"), t("webhooks.form.urlInvalid"));
      return false;
    }

    // Validate JSON body if provided
    if (bodyText.trim()) {
      try {
        JSON.parse(bodyText.trim());
      } catch (error) {
        Alert.alert(t("common.error"), t("webhooks.form.jsonValidationError"));
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
          Alert.alert(t("common.error"), t("webhooks.form.jsonParsingError"));
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

  const httpMethodOptions: InlinePickerOption<HttpMethod>[] = httpMethods.map(
    (method) => ({
      value: method,
      label: getMethodDisplayName(method),
      color: getHttpMethodColor(method),
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
    <SettingsScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <ThemedView
        style={[
          styles.formContainer,
          { backgroundColor: Colors[colorScheme ?? "light"].backgroundCard },
        ]}
      >
        {/* Webhook Name */}
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>
            {t("webhooks.form.name")}
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: Colors[colorScheme ?? "light"].background,
                borderColor: Colors[colorScheme ?? "light"].border,
                color: Colors[colorScheme ?? "light"].text,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder={t("webhooks.form.namePlaceholder")}
            placeholderTextColor={Colors[colorScheme ?? "light"].tabIconDefault}
            maxLength={100}
            autoFocus
          />
        </View>

        {/* HTTP Method */}
        <View style={styles.inputGroup}>
          <InlinePicker
            label={t("webhooks.form.method")}
            selectedValue={method}
            options={httpMethodOptions}
            onValueChange={setMethod}
            placeholder={t("webhooks.form.method")}
          />
        </View>

        {/* URL */}
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>{t("webhooks.form.url")}</ThemedText>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: Colors[colorScheme ?? "light"].background,
                borderColor: Colors[colorScheme ?? "light"].border,
                color: Colors[colorScheme ?? "light"].text,
              },
            ]}
            value={url}
            onChangeText={setUrl}
            placeholder={t("webhooks.form.urlPlaceholder")}
            placeholderTextColor={Colors[colorScheme ?? "light"].tabIconDefault}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        {/* Headers */}
        <View style={styles.inputGroup}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <ThemedText style={styles.label}>Headers</ThemedText>
            <TouchableOpacity style={{ padding: 4 }} onPress={addHeader}>
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={Colors[colorScheme ?? "light"].tint}
              />
            </TouchableOpacity>
          </View>

          {headers.map((header, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
                gap: 8,
              }}
            >
              <TextInput
                style={[
                  styles.textInput,
                  { flex: 1 },
                  {
                    backgroundColor: Colors[colorScheme ?? "light"].background,
                    borderColor: Colors[colorScheme ?? "light"].border,
                    color: Colors[colorScheme ?? "light"].text,
                  },
                ]}
                value={header.key}
                onChangeText={(value) => updateHeader(index, "key", value)}
                placeholder="Header Key"
                placeholderTextColor={
                  Colors[colorScheme ?? "light"].tabIconDefault
                }
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                style={[
                  styles.textInput,
                  { flex: 1 },
                  {
                    backgroundColor: Colors[colorScheme ?? "light"].background,
                    borderColor: Colors[colorScheme ?? "light"].border,
                    color: Colors[colorScheme ?? "light"].text,
                  },
                ]}
                value={header.value}
                onChangeText={(value) => updateHeader(index, "value", value)}
                placeholder="Header Value"
                placeholderTextColor={
                  Colors[colorScheme ?? "light"].tabIconDefault
                }
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={{ padding: 4 }}
                onPress={() => removeHeader(index)}
              >
                <Ionicons name="trash-outline" size={18} color="#ff4444" />
              </TouchableOpacity>
            </View>
          ))}

          {headers.length === 0 && (
            <ThemedText style={styles.description}>
              No headers configured
            </ThemedText>
          )}
        </View>

        {/* Body */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <ThemedText style={styles.label}>
              {t("webhooks.form.body")}
            </ThemedText>
            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => {
                Alert.alert(
                  t("webhooks.form.jsonHelpTitle"),
                  `${t("webhooks.form.jsonHelpMessage")}\n\n${t(
                    "webhooks.form.jsonExample"
                  )}`,
                  [{ text: t("common.ok") }]
                );
              }}
            >
              <Ionicons
                name="help-circle-outline"
                size={20}
                color={Colors[colorScheme ?? "light"].tint}
              />
            </TouchableOpacity>
          </View>
          <ThemedText style={styles.description}>
            {t("webhooks.form.bodyHelp")}
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              styles.jsonInput,
              {
                backgroundColor: Colors[colorScheme ?? "light"].background,
                borderColor: Colors[colorScheme ?? "light"].border,
                color: Colors[colorScheme ?? "light"].text,
              },
            ]}
            value={bodyText}
            onChangeText={setBodyText}
            placeholder={t("webhooks.form.bodyPlaceholder")}
            placeholderTextColor={Colors[colorScheme ?? "light"].tabIconDefault}
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
          <TouchableOpacity
            style={[
              styles.button,
              styles.saveButton,
              { backgroundColor: Colors[colorScheme ?? "light"].tint },
              (isLoading || isOffline) && styles.buttonDisabled,
            ]}
            onPress={saveWebhook}
            disabled={isLoading || isOffline || !name.trim() || !url.trim()}
          >
            <ThemedText style={styles.saveButtonText}>
              {isLoading
                ? isEditing
                  ? t("webhooks.form.saving")
                  : t("webhooks.form.creating")
                : isEditing
                ? t("webhooks.form.save")
                : t("webhooks.form.create")}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={resetForm}
          >
            <ThemedText style={styles.cancelButtonText}>
              {t("common.reset")}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>

      {/* Readonly fields for editing mode */}
      {isEditing && webhook && (
        <ThemedView
          style={[
            styles.readonlyContainer,
            {
              backgroundColor: Colors[colorScheme ?? "light"].backgroundCard,
              borderColor: Colors[colorScheme ?? "light"].border,
            },
          ]}
        >
          <IdWithCopyButton
            id={webhook.id}
            label="Webhook ID"
            copyMessage="Webhook ID copied"
            valueStyle={styles.readonlyValue}
          />
          <View style={styles.readonlyField}>
            <ThemedText style={styles.readonlyLabel}>Created:</ThemedText>
            <ThemedText style={styles.readonlyValue}>
              {formatDate(webhook.createdAt)}
            </ThemedText>
          </View>
          {webhook.updatedAt && (
            <View style={styles.readonlyField}>
              <ThemedText style={styles.readonlyLabel}>Updated:</ThemedText>
              <ThemedText style={styles.readonlyValue}>
                {formatDate(webhook.updatedAt)}
              </ThemedText>
            </View>
          )}
        </ThemedView>
      )}
    </SettingsScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  description: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 8,
    textAlign: "center",
  },
  formContainer: {
    padding: 20,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  helpButton: {
    padding: 4,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  jsonInput: {
    minHeight: 160,
    fontFamily: "monospace",
    fontSize: 14,
    lineHeight: 20,
  },
  authSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    opacity: 0.8,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButton: {
    // backgroundColor set dynamically
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#6c757d",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  readonlyContainer: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  readonlyField: {
    marginBottom: 10,
  },
  readonlyLabel: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.7,
    marginBottom: 4,
  },
  readonlyValue: {
    fontSize: 14,
    fontFamily: "monospace",
  },
});
