import LoginForm from "@/components/LoginForm";
import { usePublicAppConfigQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { settingsRepository } from "@/services/settings-repository";

export default function LoginScreen() {
  const { t } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const { data } = usePublicAppConfigQuery();
  const { emailEnabled, localRegistrationEnabled } = data?.publicAppConfig || {} as any;
  const { email, error, errorTitle } = useLocalSearchParams<{ email?: string, error?: string, errorTitle?: string }>();
  const { navigateToRegister, navigateToHome, navigateToForgotPassword } =
    useNavigationUtils();

  const handleLoginSuccess = async () => {
    // Check for redirect path after login
    try {
      const redirectPath = await settingsRepository.getSetting(
        "auth_redirectAfterLogin"
      );
      if (redirectPath && redirectPath !== "/") {
        // Remove redirect path immediately
        await settingsRepository.removeSetting("auth_redirectAfterLogin");
        // Navigate to the saved path
        router.replace(redirectPath as any);
        return;
      }
    } catch (error) {
      console.error("Error checking redirect after login:", error);
    }
    // Default navigation to home
    navigateToHome();
  };

  const goToRegister = () => {
    navigateToRegister();
  };

  return (
    <View
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        enabled
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContainer]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Text
              variant="headlineLarge"
              style={[styles.appName, { color: theme.colors.onBackground }]}
            >
              Zentik
            </Text>
            <View style={styles.logoPlaceholder}>
              <View style={styles.logoImageWrapper}>
                <Image
                  source={require("../../../assets/icons/icon-512x512.png")}
                  style={styles.logoImage}
                  resizeMode="cover"
                />
              </View>
            </View>
            <Text
              variant="titleMedium"
              style={[styles.subtitle, { color: theme.colors.onBackground }]}
            >
              {t("login.welcomeBack")}
            </Text>
          </View>

          {typeof error === 'string' && (
            <View style={{ marginBottom: 12 }}>
              <Text
                variant="titleSmall"
                style={{ color: theme.colors.error, marginBottom: 4, textAlign: 'center' }}
              >
                {typeof errorTitle === 'string' && errorTitle.length > 0 ? errorTitle : t('login.errors.loginFailed')}
              </Text>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onBackground, opacity: 0.8, textAlign: 'center' }}
              >
                {error}
              </Text>
            </View>
          )}

          <LoginForm
            onSuccess={handleLoginSuccess}
            initialEmail={typeof email === "string" ? email : undefined}
          />

          {localRegistrationEnabled && (
            <View style={styles.registerContainer}>
              <Text
                variant="bodyLarge"
                style={[
                  styles.registerText,
                  { color: theme.colors.onBackground },
                ]}
              >
                {t("login.noAccount")}
              </Text>
              <Button
                mode="text"
                onPress={goToRegister}
                style={styles.registerButton}
              >
                {t("login.signUp")}
              </Button>
            </View>
          )}

          {emailEnabled && (
            <View style={styles.forgotPasswordContainer}>
              <Button
                mode="text"
                onPress={() => navigateToForgotPassword()}
                style={styles.forgotPasswordButton}
              >
                {t("login.forgotPassword")}
              </Button>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    minHeight: "100%",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 10,
    marginTop: 0,
  },
  appName: {
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: "center",
  },
  logoPlaceholder: {
    width: 144,
    height: 144,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logoImageWrapper: {
    width: 144,
    height: 144,
    borderRadius: 72,
    justifyContent: "center",
    alignItems: "center",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  subtitle: {
    opacity: 0.7,
    textAlign: "center",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    gap: 8,
  },
  registerText: {
    textAlign: "center",
  },
  registerButton: {
    marginLeft: 4,
  },
  forgotPasswordContainer: {
    alignItems: "center",
    marginTop: 16,
  },
  forgotPasswordButton: {
    marginTop: 8,
  },
});
