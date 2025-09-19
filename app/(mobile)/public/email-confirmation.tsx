import { ThemedText } from "@/components/ThemedText";
import UnauthenticatedHeader from "@/components/UnauthenticatedHeader";
import { Button } from "@/components/ui";
import { Colors } from "@/constants/Colors";
import { useConfirmEmailMutation, useRequestEmailConfirmationMutation } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useLanguageSync } from "@/hooks/useLanguageSync";
import { useColorScheme } from "@/hooks/useTheme";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EmailConfirmationScreen() {
  const { t } = useI18n();
  const { currentLocale } = useLanguageSync();
  const { email: initialEmail, code } = useLocalSearchParams<{ email?: string; code?: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [confirmationStatus, setConfirmationStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [confirmationCode, setConfirmationCode] = useState(code || '');
  const [showCodeInput, setShowCodeInput] = useState(!code);
  const [email, setEmail] = useState(initialEmail || '');
  const [showEmailInput, setShowEmailInput] = useState(!initialEmail);
  
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  
  const [confirmEmailMutation] = useConfirmEmailMutation();
  const [requestEmailConfirmationMutation] = useRequestEmailConfirmationMutation();

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
        variables: { input: { code: emailCode, locale: currentLocale } }
      });
      
      if (result.data?.confirmEmail.success) {
        setConfirmationStatus('success');
        setTimeout(() => {
          router.replace({
            pathname: "/(mobile)/public/login",
            params: email ? { email } : undefined,
          });
        }, 3000);
      } else {
        setConfirmationStatus('error');
      }
    } catch (error) {
      console.error("Email confirmation error:", error);
      setConfirmationStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email) return;
    
    setIsResending(true);
    try {
      const result = await requestEmailConfirmationMutation({
        variables: { input: { email, locale: currentLocale } }
      });
      
      if (result.data?.requestEmailConfirmation.success) {
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 5000);
      } else {
        Alert.alert(t("common.error"), t("auth.emailConfirmation.errorMessage"));
      }
    } catch (error) {
      console.error("Resend email error:", error);
      Alert.alert(t("common.error"), t("auth.emailConfirmation.errorMessage"));
    } finally {
      setIsResending(false);
    }
  };

  const handleRequestEmailConfirmation = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert(t("common.error"), t("auth.emailConfirmation.invalidEmail"));
      return;
    }
    
    setIsResending(true);
    try {
      const result = await requestEmailConfirmationMutation({
        variables: { input: { email, locale: currentLocale } }
      });
      
      if (result.data?.requestEmailConfirmation.success) {
        setEmailSent(true);
        setShowEmailInput(false);
        setTimeout(() => setEmailSent(false), 5000);
      } else {
        Alert.alert(t("common.error"), t("auth.emailConfirmation.errorMessage"));
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
    if (confirmationStatus === 'success') {
      return (
        <View style={styles.contentContainer}>
          <View style={styles.iconContainer}>
            <Text style={[styles.successIcon, { color: Colors[colorScheme].success }]}>✓</Text>
          </View>
          <ThemedText style={[styles.title, { color: Colors[colorScheme].success }]}>
            {t("auth.emailConfirmation.success")}
          </ThemedText>
          <ThemedText style={styles.description}>
            {t("auth.emailConfirmation.successMessage")}
          </ThemedText>
          <ThemedText style={styles.redirectText}>
            {t("common.loading")}
          </ThemedText>
          <Button
            title={t("auth.emailConfirmation.backToLogin")}
            onPress={() => router.replace({ pathname: "/(mobile)/public/login", params: email ? { email } : undefined })}
            style={{ marginTop: 20 }}
            variant="outline"
          />
        </View>
      );
    }

    if (confirmationStatus === 'error') {
      return (
        <View style={styles.contentContainer}>
          <View style={styles.iconContainer}>
            <Text style={[styles.errorIcon, { color: Colors[colorScheme].error }]}>✗</Text>
          </View>
          <ThemedText style={[styles.title, { color: Colors[colorScheme].error }]}>
            {t("auth.emailConfirmation.error")}
          </ThemedText>
          <ThemedText style={styles.description}>
            {t("auth.emailConfirmation.errorMessage")}
          </ThemedText>
          <Button
            title={t("auth.emailConfirmation.backToLogin")}
            onPress={() => router.replace({ pathname: "/(mobile)/public/login", params: email ? { email } : undefined })}
            style={{ marginTop: 20 }}
          />
        </View>
      );
    }

    return (
      <View style={styles.contentContainer}>
        <View style={styles.iconContainer}>
          <Text style={[styles.emailIcon, { color: Colors[colorScheme].tint }]}>✉️</Text>
        </View>
        <ThemedText style={[styles.title, { color: Colors[colorScheme].tint }]}>
          {t("register.emailConfirmation.title")}
        </ThemedText>
        <ThemedText style={styles.description}>
          {t("register.emailConfirmation.description")}
        </ThemedText>
        
        {showEmailInput && (
          <View style={styles.emailInputContainer}>
            <ThemedText style={styles.emailInputLabel}>
              {t("auth.emailConfirmation.title")}
            </ThemedText>
            <ThemedText style={styles.description}>
              {t("auth.emailConfirmation.description")}
            </ThemedText>
            <View style={styles.inputContainer}>
              <ThemedText style={[styles.label, { color: Colors[colorScheme].text }]}>
                {t("login.emailOrUsername")}
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: Colors[colorScheme].inputBackground || Colors[colorScheme].background,
                    borderColor: Colors[colorScheme].border,
                    color: Colors[colorScheme].text,
                  },
                ]}
                placeholder={t("login.emailOrUsernamePlaceholder")}
                placeholderTextColor={Colors[colorScheme].textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <Button
              title={isResending ? t("auth.emailConfirmation.resending") : t("auth.emailConfirmation.resendEmail")}
              onPress={handleRequestEmailConfirmation}
              loading={isResending}
              disabled={isResending || !email || !email.includes('@')}
              style={{ marginTop: 16 }}
            />
            <TouchableOpacity 
              style={styles.backToLoginButton}
              onPress={() => router.replace({ pathname: "/(mobile)/public/login", params: email ? { email } : undefined })}
            >
              <Text style={[styles.backToLoginText, { color: Colors[colorScheme].tint }]}>
                {t("auth.emailConfirmation.backToLogin")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {email && !showEmailInput && (
          <>
            <View style={styles.emailInfo}>
              <ThemedText style={styles.emailLabel}>
                {t("register.emailConfirmation.checkEmail")}
              </ThemedText>
              <ThemedText style={[styles.emailText, { color: Colors[colorScheme].tint }]}>
                {email}
              </ThemedText>
            </View>
            <View style={styles.helpSection}>
              <ThemedText style={styles.helpTitle}>
                {t("register.emailConfirmation.notReceived")}
              </ThemedText>
              <ThemedText style={styles.helpText}>
                {t("register.emailConfirmation.spamFolder")}
              </ThemedText>
            </View>
            {emailSent && (
              <ThemedText style={[styles.successMessage, { color: Colors[colorScheme].success }]}>
                {t("register.emailConfirmation.emailSentMessage")}
              </ThemedText>
            )}
          </>
        )}

        {showCodeInput && (
          <View style={styles.codeInputContainer}>
            <ThemedText style={styles.codeInputLabel}>
              {t("auth.emailConfirmation.enterCode")}
            </ThemedText>
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: Colors[colorScheme].inputBackground || Colors[colorScheme].background,
                    borderColor: Colors[colorScheme].border,
                    color: Colors[colorScheme].text,
                  },
                ]}
                placeholder={t("auth.emailConfirmation.codePlaceholder")}
                placeholderTextColor={Colors[colorScheme].textSecondary}
                value={confirmationCode}
                onChangeText={(v) => {
                  const normalized = v.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                  setConfirmationCode(normalized);
                }}
                keyboardType="default"
                autoCorrect={false}
                maxLength={6}
                autoCapitalize="characters"
                returnKeyType="done"
                onSubmitEditing={handleManualConfirmation}
              />
            </View>
            <View style={styles.buttonRow}>
              <Button
                title={isResending ? t("register.emailConfirmation.resending") : t("register.emailConfirmation.resendEmail")}
                onPress={handleResendEmail}
                loading={isResending}
                disabled={isResending}
                style={{ flex: 1 }}
                variant="outline"
              />
              <Button
                title={isLoading ? t("auth.emailConfirmation.verifying") : t("auth.emailConfirmation.verifyCode")}
                onPress={handleManualConfirmation}
                loading={isLoading}
                disabled={isLoading || confirmationCode.length !== 6}
                style={{ flex: 1 }}
              />
            </View>
            <TouchableOpacity 
              style={styles.backToLoginButton}
              onPress={() => router.replace({ pathname: "/(mobile)/public/login", params: email ? { email } : undefined })}
            >
              <Text style={[styles.backToLoginText, { color: Colors[colorScheme].tint }]}>
                {t("auth.emailConfirmation.backToLogin")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: Colors[colorScheme].background },
      ]}
    >
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />
      <UnauthenticatedHeader />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: Math.max(80, insets.top + 30) },
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
  successIcon: {
    fontSize: 40,
    fontWeight: "bold",
  },
  errorIcon: {
    fontSize: 40,
    fontWeight: "bold",
  },
  emailIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    lineHeight: 32,
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
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
    fontSize: 16,
    marginBottom: 6,
    opacity: 0.7,
    textAlign: "center",
  },
  emailText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  helpSection: {
    alignItems: "center",
    marginBottom: 24,
    marginTop: 20,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  helpText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
  },
  redirectText: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 16,
  },
  backToLoginButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  backToLoginText: {
    fontSize: 16,
    fontWeight: "600",
  },
  successMessage: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
    opacity: 0.8,
  },
  codeInputContainer: {
    width: "100%",
    marginTop: 20,
    alignItems: "center",
  },
  codeInputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },
  emailInputContainer: {
    width: "100%",
    marginTop: 20,
    alignItems: "center",
  },
  emailInputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },
  inputContainer: {
    width: "100%",
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
    textAlign: "center",
    letterSpacing: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    gap: 12,
  },
});
