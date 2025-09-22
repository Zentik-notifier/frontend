import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/ui";
import { Colors } from "@/constants/Colors";
import { usePublicAppConfigQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useLanguageSync } from "@/hooks/useLanguageSync";
import { useColorScheme } from "@/hooks/useTheme";
import { ApiConfigService } from "@/services/api-config";
import { useAppContext } from "@/services/app-context";
import { useNavigationUtils } from "@/utils/navigation";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialEmail?: string;
};

export default function LoginForm({
  onSuccess,
  onCancel,
  initialEmail,
}: Props) {
  const { t } = useI18n();
  const { currentLocale } = useLanguageSync();
  const [emailOrUsername, setEmailOrUsername] = useState(initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    emailOrUsername?: string;
    password?: string;
  }>({});
  const { login } = useAppContext();
  const colorScheme = useColorScheme();
  const { navigateToEmailConfirmation } = useNavigationUtils();

  const { data: providersData, loading: providersLoading } =
    usePublicAppConfigQuery({ fetchPolicy: "network-only" });
  const enabledProviders = providersData?.publicAppConfig.oauthProviders || [];

  const validateForm = () => {
    const newErrors: { emailOrUsername?: string; password?: string } = {};
    if (!emailOrUsername)
      newErrors.emailOrUsername = t("login.validation.emailOrUsernameRequired");
    else if (emailOrUsername.trim().length < 3)
      newErrors.emailOrUsername = t(
        "login.validation.emailOrUsernameMinLength"
      );
    if (!password) newErrors.password = t("login.validation.passwordRequired");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    console.log("🔐 LoginForm: Login called");
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const ok = await login(emailOrUsername, password);
      console.log("🔐 LoginForm: Login successful:", ok);
      if (ok) onSuccess?.();
    } catch (error: any) {
      // Handle specific error cases
      if (
        error?.message?.includes("Please confirm your email before logging in")
      ) {
        const userEmail = emailOrUsername.includes("@") ? emailOrUsername : "";

        navigateToEmailConfirmation({ email: userEmail });
        return;
      }

      const errorMessage = error?.message || t("login.errors.connectionError");
      Alert.alert(t("login.errors.loginFailed"), errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const openProviderLogin = async (provider: string) => {
    try {
      const baseWithPrefix = ApiConfigService.getApiBaseWithPrefix();
      const redirect = `zentik://(mobile)/public/oauth`;
      const url = `${baseWithPrefix}/auth/${provider}?redirect=${encodeURIComponent(
        redirect
      )}&locale=${encodeURIComponent(currentLocale)}`;
      const { openBrowserAsync, maybeCompleteAuthSession } = await import(
        "expo-web-browser"
      );
      const result = await openBrowserAsync(url, {
        showInRecents: false,
        createTask: false,
      });
      maybeCompleteAuthSession();
      if (result.type === "cancel") {
        Alert.alert(t("common.info"), t("login.providers.cancelled"));
      }
    } catch {
      Alert.alert(t("common.error"), t("login.errors.connectionError"));
    }
  };

  return (
    <View style={styles.formContainer}>
      <View style={styles.inputContainer}>
        <ThemedText style={[styles.label, { color: Colors[colorScheme].text }]}>
          {t("login.emailOrUsername")} *
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor:
                Colors[colorScheme].inputBackground ||
                Colors[colorScheme].background,
              borderColor: errors.emailOrUsername
                ? "#FF3B30"
                : Colors[colorScheme].border,
              color: Colors[colorScheme].text,
            },
          ]}
          placeholder={t("login.emailOrUsernamePlaceholder")}
          placeholderTextColor={Colors[colorScheme].textSecondary}
          value={emailOrUsername}
          onChangeText={setEmailOrUsername}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {errors.emailOrUsername && (
          <ThemedText style={styles.errorText}>
            {errors.emailOrUsername}
          </ThemedText>
        )}
      </View>

      <View style={styles.inputContainer}>
        <ThemedText style={[styles.label, { color: Colors[colorScheme].text }]}>
          {t("login.password")} *
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor:
                Colors[colorScheme].inputBackground ||
                Colors[colorScheme].background,
              borderColor: errors.password
                ? "#FF3B30"
                : Colors[colorScheme].border,
              color: Colors[colorScheme].text,
            },
          ]}
          placeholder={t("login.passwordPlaceholder")}
          placeholderTextColor={Colors[colorScheme].textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={handleLogin}
          returnKeyType="done"
        />
        {errors.password && (
          <ThemedText style={styles.errorText}>{errors.password}</ThemedText>
        )}
      </View>

      <Button
        title={isLoading ? t("login.loggingIn") : t("login.loginButton")}
        onPress={handleLogin}
        loading={isLoading}
        disabled={isLoading}
        size="large"
      />
      {enabledProviders.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <ThemedText style={{ textAlign: "center", marginBottom: 12 }}>
            {t("login.orContinueWith")}
          </ThemedText>
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {enabledProviders.map((provider) => (
              <TouchableOpacity
                key={provider.id}
                style={[
                  styles.providerButton,
                  { backgroundColor: provider.color! },
                ]}
                onPress={() => openProviderLogin(provider.providerId)}
                disabled={isLoading || providersLoading}
              >
                <Image
                  source={{ uri: provider.iconUrl! }}
                  style={styles.providerIconImage}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.providerButtonText,
                    { color: provider.textColor || "#fff" },
                  ]}
                >
                  {provider.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      {onCancel && (
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={{ color: Colors[colorScheme].tint }}>
            {t("common.cancel")}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    width: "100%",
    gap: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 14,
    marginTop: 4,
  },
  providerButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 120,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  providerIconImage: {
    width: 20,
    height: 20,
    backgroundColor: "transparent",
    marginRight: 8,
  },
  providerButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  cancelBtn: {
    marginTop: 12,
    alignSelf: "center",
  },
});
