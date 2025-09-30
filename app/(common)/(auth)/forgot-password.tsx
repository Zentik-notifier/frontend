import { ForgotPasswordFlow } from "@/components/ForgotPasswordFlow";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import { Stack } from "expo-router";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { Text } from "react-native-paper";
import {
  SafeAreaView
} from "react-native-safe-area-context";

export default function ForgotPasswordScreen() {
  const { t } = useI18n();
  const { navigateToLogin } = useNavigationUtils();

  const handleBackToLogin = () => {
    navigateToLogin();
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
          <View style={styles.headerContainer}>
            <Text variant="headlineMedium" style={styles.title}>
              {t("auth.forgotPassword.title")}
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              {t("auth.forgotPassword.description")}
            </Text>
          </View>

          <ForgotPasswordFlow onBackToLogin={handleBackToLogin} />
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
  headerContainer: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 0,
  },
  title: {
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    opacity: 0.7,
    textAlign: "center",
  },
});
