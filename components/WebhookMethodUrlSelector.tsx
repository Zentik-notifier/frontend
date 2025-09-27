import { HttpMethod } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { getHttpMethodColor } from "@/utils/webhookUtils";
import React from "react";
import { TextInput, View, StyleSheet } from "react-native";
import ThemedInputSelect from "./ui/ThemedInputSelect";
import { Text, useTheme } from "react-native-paper";

interface WebhookMethodUrlSelectorProps {
  method: HttpMethod | undefined;
  url: string;
  onMethodChange: (method: HttpMethod) => void;
  onUrlChange: (url: string) => void;
}

const httpMethods = [
  HttpMethod.Get,
  HttpMethod.Post,
  HttpMethod.Put,
  HttpMethod.Patch,
  HttpMethod.Delete,
];

export default function WebhookMethodUrlSelector({
  method,
  url,
  onMethodChange,
  onUrlChange,
}: WebhookMethodUrlSelectorProps) {
  const theme = useTheme();
  const { t } = useI18n();

  const getMethodDisplayName = (method: HttpMethod) => {
    return t(`webhooks.methods.${method}`);
  };

  const httpMethodOptions = httpMethods.map(method => ({
    id: method,
    name: getMethodDisplayName(method),
    color: getHttpMethodColor(method),
  }));

  const selectedMethod = httpMethodOptions.find(option => option.id === method);

  return (
    <>
      {/* HTTP Method Selection */}
      <View style={styles.container}>
        <ThemedInputSelect
          label={t('webhooks.form.method')}
          placeholder={t('webhooks.form.method')}
          options={httpMethodOptions}
          optionLabel="name"
          optionValue="id"
          selectedValue={selectedMethod?.id}
          onValueChange={(value) => onMethodChange(value as HttpMethod)}
          isSearchable={false}
        />
      </View>
      
      {/* Webhook URL Input */}
      <View style={styles.container}>
        <Text variant="titleMedium" style={styles.label}>
          {t('webhooks.form.url')}
        </Text>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
              color: theme.colors.onSurface,
            }
          ]}
          value={url}
          onChangeText={onUrlChange}
          placeholder={t('webhooks.form.urlPlaceholder')}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  methodIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  dropdownButtonText: {
    flex: 1,
    fontSize: 16,
  },
  dropdownIcon: {
    fontSize: 12,
    marginLeft: 8,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
});
