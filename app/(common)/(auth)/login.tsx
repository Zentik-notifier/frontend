import LoginForm from "@/components/LoginForm";
import { usePublicAppConfigQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const { t } = useI18n();
  const { data } = usePublicAppConfigQuery();
  const emailEnabled = data?.publicAppConfig.emailEnabled;
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { navigateToRegister, navigateToHome, navigateToForgotPassword } =
    useNavigationUtils();

  const handleLoginSuccess = () => {
    navigateToHome();
  };

  const goToRegister = () => {
    navigateToRegister();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        enabled
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Text variant="headlineLarge" style={styles.appName}>
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
            <Text variant="titleMedium" style={styles.subtitle}>
              {t("login.welcomeBack")}
            </Text>
          </View>

          <LoginForm
            onSuccess={handleLoginSuccess}
            initialEmail={typeof email === "string" ? email : undefined}
          />

          <View style={styles.registerContainer}>
            <Text variant="bodyLarge" style={styles.registerText}>
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
    </SafeAreaView>
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
    overflow: "hidden",
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
