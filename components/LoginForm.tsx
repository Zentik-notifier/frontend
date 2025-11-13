import { OAuthSelector } from "@/components/OAuthSelector";
import { useAppContext } from "@/contexts/AppContext";
import {
  OAuthProviderPublicFragment,
  usePublicAppConfigQuery,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { settingsService } from "@/services/settings-service";
import { useNavigationUtils } from "@/utils/navigation";
import { createOAuthRedirectLink } from "@/utils/universal-links";
import React, { useState } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";
import { Button, HelperText, TextInput } from "react-native-paper";

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
  const { locale } = useI18n();
  const [emailOrUsername, setEmailOrUsername] = useState(initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    emailOrUsername?: string;
    password?: string;
  }>({});
  const { login } = useAppContext();
  const { navigateToEmailConfirmation } = useNavigationUtils();
  const { data: appConfigData } = usePublicAppConfigQuery({
    fetchPolicy: "cache-first",
  });
  const socialLoginEnabled =
    !!appConfigData?.publicAppConfig?.socialLoginEnabled;

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

  const openProviderLogin = async (provider: OAuthProviderPublicFragment) => {
    try {
      const baseWithPrefix = settingsService.getApiBaseWithPrefix();
      const redirect = createOAuthRedirectLink();
      const providerKey = provider.providerKey;
      const url = `${baseWithPrefix}/auth/${providerKey}?redirect=${encodeURIComponent(
        redirect
      )}&locale=${encodeURIComponent(locale)}`;

      if (Platform.OS === "web") {
        // On web, use direct redirect instead of popup
        window.location.href = url;
        return;
      }

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
      <TextInput
        label={`${t("login.emailOrUsername")} *`}
        placeholder={t("login.emailOrUsernamePlaceholder")}
        value={emailOrUsername}
        onChangeText={setEmailOrUsername}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        mode="outlined"
        error={!!errors.emailOrUsername}
        style={styles.input}
      />
      <HelperText
        type="error"
        visible={!!errors.emailOrUsername}
        style={styles.errorText}
      >
        {errors.emailOrUsername}
      </HelperText>

      <TextInput
        label={`${t("login.password")} *`}
        placeholder={t("login.passwordPlaceholder")}
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={handleLogin}
        returnKeyType="done"
        mode="outlined"
        error={!!errors.password}
        style={styles.input}
        right={
          <TextInput.Icon
            icon={showPassword ? "eye-off" : "eye"}
            onPress={() => setShowPassword(!showPassword)}
          />
        }
      />
      <HelperText
        type="error"
        visible={!!errors.password}
        style={styles.errorText}
      >
        {errors.password}
      </HelperText>

      {socialLoginEnabled ? (
        <View style={styles.actionsRow}>
          <View style={styles.half}>
            <Button
              mode="contained"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              style={styles.fullWidth}
            >
              {isLoading ? t("login.loggingIn") : t("login.loginButton")}
            </Button>
          </View>
          <View style={styles.half}>
            <OAuthSelector
              onProviderSelect={openProviderLogin}
              disabled={isLoading}
              onSuccess={onSuccess}
            />
          </View>
        </View>
      ) : (
        <View style={styles.actionsRow}>
          <View style={styles.half}>
            <Button
              mode="contained"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              style={styles.fullWidth}
            >
              {isLoading ? t("login.loggingIn") : t("login.loginButton")}
            </Button>
          </View>
        </View>
      )}

      {onCancel && (
        <Button mode="text" onPress={onCancel} style={styles.cancelBtn}>
          {t("common.cancel")}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
  },
  input: {
    width: "100%",
  },
  errorText: {
    width: "100%",
    textAlign: "left",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  half: {
    flex: 1,
  },
  fullWidth: {
    width: "100%",
  },
  oauthButton: {
    flex: 1,
  },
  cancelBtn: {
    width: "100%",
    marginTop: 12,
  },
  menuContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  oauthMenuButton: {
    width: "100%",
    borderRadius: 0,
    marginVertical: 0,
  },
  oauthMenuButtonContent: {
    height: 48,
    paddingVertical: 0,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#00000022",
  },
});
