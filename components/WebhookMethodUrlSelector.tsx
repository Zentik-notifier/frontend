import { Colors } from "@/constants/Colors";
import { HttpMethod } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { getHttpMethodColor } from "@/utils/webhookUtils";
import React from "react";
import { TextInput, View } from "react-native";
import { ThemedText } from "./ThemedText";
import InlinePicker, { InlinePickerOption } from "./ui/InlinePicker";

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
  const colorScheme = useColorScheme();
  const { t } = useI18n();

  const getMethodDisplayName = (method: HttpMethod) => {
    return t(`webhooks.methods.${method}`);
  };

  const httpMethodOptions: InlinePickerOption<HttpMethod>[] = httpMethods.map(method => ({
    value: method,
    label: getMethodDisplayName(method),
    color: getHttpMethodColor(method),
  }));

  return (
    <>
      {/* HTTP Method Selection */}
      <View style={{ marginBottom: 16 }}>
        <InlinePicker
          label={t('webhooks.form.method')}
          selectedValue={method || HttpMethod.Post}
          options={httpMethodOptions}
          onValueChange={onMethodChange}
          placeholder={t('webhooks.form.method')}
        />
      </View>
      
      {/* Webhook URL Input */}
      <View style={{ marginBottom: 16 }}>
        <ThemedText style={{ 
          fontSize: 16, 
          fontWeight: "600", 
          marginBottom: 8 
        }}>
          {t('webhooks.form.url')}
        </ThemedText>
        <TextInput
          style={{
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            fontSize: 16,
            backgroundColor: Colors[colorScheme ?? 'light'].background,
            borderColor: Colors[colorScheme ?? 'light'].border,
            color: Colors[colorScheme ?? 'light'].text,
          }}
          value={url}
          onChangeText={onUrlChange}
          placeholder={t('webhooks.form.urlPlaceholder')}
          placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    </>
  );
}
