import {
  useConfirmEmailMutation,
  useRequestEmailConfirmationMutation,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useLanguageSync } from "@/hooks/useLanguageSync";
import { useNavigationUtils } from "@/utils/navigation";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { Button, Icon, Text, TextInput } from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export default function EmailConfirmationScreen() {
  const { t } = useI18n();
  const { currentLocale } = useLanguageSync();
  const { email: initialEmail, code } = useLocalSearchParams<{
    email?: string;
    code?: string;
  }>();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [confirmationStatus, setConfirmationStatus] = useState<
    "pending" | "success" | "error"
  >("pending");
  const [confirmationCode, setConfirmationCode] = useState(code || "");
  const [showCodeInput] = useState(!code);
  const [email, setEmail] = useState(initialEmail || "");
  const [showEmailInput, setShowEmailInput] = useState(!initialEmail);
  const { navigateToLogin } = useNavigationUtils();

  const [confirmEmailMutation] = useConfirmEmailMutation();
  const [requestEmailConfirmationMutation] =
    useRequestEmailConfirmationMutation();

  useEffect(() => {
    if (code) {
      handleConfirmEmail(code);
    } else if (!initialEmail) {
      // No code and no email, show email input
      setShowEmailInput(true);
    }
  }, [code, initialEmail]);

  const handleConfirmEmail = async (emailCode: string) => {
    setIsLoading(true);
    try {
      const result = await confirmEmailMutation({
        variables: { input: { code: emailCode, locale: currentLocale } },
      });

      if (result.data?.confirmEmail.success) {
        setConfirmationStatus("success");
        setTimeout(() => {
          navigateToLogin(email);
        }, 1500);
      } else {
        setConfirmationStatus("error");
      }
    } catch (error) {
      console.error("Email confirmation error:", error);
      setConfirmationStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email) return;

    setIsResending(true);
    try {
      const result = await requestEmailConfirmationMutation({
        variables: { input: { email, locale: currentLocale } },
      });

      if (result.data?.requestEmailConfirmation.success) {
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 5000);
      } else {
        Alert.alert(
          t("common.error"),
          t("auth.emailConfirmation.errorMessage")
        );
      }
    } catch (error) {
      console.error("Resend email error:", error);
      Alert.alert(t("common.error"), t("auth.emailConfirmation.errorMessage"));
    } finally {
      setIsResending(false);
    }
  };

  const handleRequestEmailConfirmation = async () => {
    if (!email || !email.includes("@")) {
      Alert.alert(t("common.error"), t("auth.emailConfirmation.invalidEmail"));
      return;
    }

    setIsResending(true);
    try {
      const result = await requestEmailConfirmationMutation({
        variables: { input: { email, locale: currentLocale } },
      });

      if (result.data?.requestEmailConfirmation.success) {
        setEmailSent(true);
        setShowEmailInput(false);
        setTimeout(() => setEmailSent(false), 5000);
      } else {
        Alert.alert(
          t("common.error"),
          t("auth.emailConfirmation.errorMessage")
        );
      }
    } catch (error) {
      console.error("Request email confirmation error:", error);
      Alert.alert(t("common.error"), t("auth.emailConfirmation.errorMessage"));
    } finally {
      setIsResending(false);
    }
  };

  const handleManualConfirmation = async () => {
    if (!confirmationCode || confirmationCode.length !== 6) {
      Alert.alert(t("common.error"), t("auth.emailConfirmation.invalidCode"));
      return;
    }

    await handleConfirmEmail(confirmationCode);
  };

  const renderContent = () => {
    if (confirmationStatus === "success") {
      return (
        <View style={styles.contentContainer}>
          <View style={styles.iconContainer}>
            <Icon source="check-circle" size={40} />
          </View>
          <Text variant="headlineMedium" style={styles.title}>
            {t("auth.emailConfirmation.success")}
          </Text>
          <Text variant="bodyLarge" style={styles.description}>
            {t("auth.emailConfirmation.successMessage")}
          </Text>
          <Text variant="bodyMedium" style={styles.redirectText}>
            {t("common.loading")}
          </Text>
          <Button
            mode="outlined"
            onPress={() => navigateToLogin(email)}
            style={styles.actionButton}
          >
            {t("auth.emailConfirmation.backToLogin")}
          </Button>
        </View>
      );
    }

    if (confirmationStatus === "error") {
      return (
        <View style={styles.contentContainer}>
          <View style={styles.iconContainer}>
            <Icon source="alert-circle" size={40} />
          </View>
          <Text variant="headlineMedium" style={styles.title}>
            {t("auth.emailConfirmation.error")}
          </Text>
          <Text variant="bodyLarge" style={styles.description}>
            {t("auth.emailConfirmation.errorMessage")}
          </Text>
          <Button
            mode="contained"
            onPress={() => navigateToLogin(email)}
            style={styles.actionButton}
          >
            {t("auth.emailConfirmation.backToLogin")}
          </Button>
        </View>
      );
    }

    return (
      <View style={styles.contentContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.iconContainer}>
          <Icon source="email" size={40} />
        </View>
        <Text variant="headlineMedium" style={styles.title}>
          {t("register.emailConfirmation.title")}
        </Text>
        <Text variant="bodyLarge" style={styles.description}>
          {t("register.emailConfirmation.description")}
        </Text>

        {showEmailInput && (
          <View style={styles.inputContainer}>
            <Text variant="titleMedium" style={styles.emailInputLabel}>
              {t("auth.emailConfirmation.title")}
            </Text>
            <Text variant="bodyMedium" style={styles.description}>
              {t("auth.emailConfirmation.description")}
            </Text>
            <TextInput
              label={t("login.emailOrUsername")}
              placeholder={t("login.emailOrUsernamePlaceholder")}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              mode="outlined"
              style={styles.input}
            />
            <Button
              mode="contained"
              onPress={handleRequestEmailConfirmation}
              loading={isResending}
              disabled={isResending || !email || !email.includes("@")}
              style={styles.actionButton}
            >
              {isResending
                ? t("auth.emailConfirmation.resending")
                : t("auth.emailConfirmation.resendEmail")}
            </Button>
            <Button
              mode="text"
              onPress={() => navigateToLogin(email)}
              style={styles.backToLoginButton}
            >
              {t("auth.emailConfirmation.backToLogin")}
            </Button>
          </View>
        )}

        {email && !showEmailInput && (
          <>
            <View style={styles.emailInfo}>
              <Text variant="bodyLarge" style={styles.emailLabel}>
                {t("register.emailConfirmation.checkEmail")}
              </Text>
              <Text variant="titleMedium" style={styles.emailText}>
                {email}
              </Text>
            </View>
            <View style={styles.helpSection}>
              <Text variant="titleSmall" style={styles.helpTitle}>
                {t("register.emailConfirmation.notReceived")}
              </Text>
              <Text variant="bodyMedium" style={styles.helpText}>
                {t("register.emailConfirmation.spamFolder")}
              </Text>
            </View>
            {emailSent && (
              <Text variant="bodyMedium" style={styles.successMessage}>
                {t("register.emailConfirmation.emailSentMessage")}
              </Text>
            )}
          </>
        )}

        {showCodeInput && (
          <View style={styles.codeInputContainer}>
            <Text variant="titleMedium" style={styles.codeInputLabel}>
              {t("auth.emailConfirmation.enterCode")}
            </Text>
            <TextInput
              placeholder={t("auth.emailConfirmation.codePlaceholder")}
              value={confirmationCode}
              onChangeText={(v) => {
                const normalized = v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
                setConfirmationCode(normalized);
              }}
              keyboardType="default"
              autoCorrect={false}
              maxLength={6}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={handleManualConfirmation}
              mode="outlined"
              style={styles.codeInput}
            />
            <View style={styles.buttonRow}>
              <Button
                mode="contained-tonal"
                onPress={handleResendEmail}
                loading={isResending}
                disabled={isResending}
                style={styles.halfButton}
              >
                {isResending
                  ? t("register.emailConfirmation.resending")
                  : t("register.emailConfirmation.resendEmail")}
              </Button>
              <Button
                mode="contained"
                onPress={handleManualConfirmation}
                loading={isLoading}
                disabled={isLoading || confirmationCode.length !== 6}
                style={styles.halfButton}
              >
                {isLoading
                  ? t("auth.emailConfirmation.verifying")
                  : t("auth.emailConfirmation.verifyCode")}
              </Button>
            </View>
            <Button
              mode="text"
              onPress={() => navigateToLogin(email)}
              style={styles.backToLoginButton}
            >
              {t("auth.emailConfirmation.backToLogin")}
            </Button>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {renderContent()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    minHeight: "100%",
    padding: 20,
  },
  contentContainer: {
    alignItems: "center",
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    textAlign: "center",
    marginBottom: 24,
    opacity: 0.8,
  },
  emailInfo: {
    alignItems: "center",
    marginBottom: 20,
    marginTop: 20,
  },
  emailLabel: {
    marginBottom: 6,
    opacity: 0.7,
    textAlign: "center",
  },
  emailText: {
    fontWeight: "600",
    textAlign: "center",
  },
  helpSection: {
    alignItems: "center",
    marginBottom: 24,
    marginTop: 20,
  },
  helpTitle: {
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  helpText: {
    opacity: 0.7,
    textAlign: "center",
  },
  redirectText: {
    opacity: 0.6,
    marginTop: 16,
  },
  backToLoginButton: {
    marginTop: 20,
  },
  successMessage: {
    textAlign: "center",
    marginTop: 12,
    opacity: 0.8,
  },
  codeInputContainer: {
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
    marginTop: 20,
    alignItems: "center",
  },
  codeInputLabel: {
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },
  inputContainer: {
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
    marginTop: 20,
    alignItems: "center",
  },
  emailInputLabel: {
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },
  input: {
    width: "100%",
    marginBottom: 16,
  },
  codeInput: {
    width: "100%",
    textAlign: "center",
    letterSpacing: 2,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 20,
    gap: 12,
  },
  halfButton: {
    flex: 1,
  },
  actionButton: {
    marginTop: 20,
  },
});
