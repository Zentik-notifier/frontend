import { ForgotPasswordFlow } from "@/components/ForgotPasswordFlow";
import { ThemedText } from "@/components/ThemedText";
import UnauthenticatedHeader from "@/components/UnauthenticatedHeader";
import { Colors } from "@/constants/Colors";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useNavigationUtils } from "@/utils/navigation";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function ForgotPasswordScreen() {
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { navigateToLogin } = useNavigationUtils();

  const handleBackToLogin = () => {
    navigateToLogin();
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
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        enabled
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingTop: Math.max(100, insets.top + 50) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContainer}>
            <ThemedText style={styles.title}>
              {t("auth.forgotPassword.title")}
            </ThemedText>
            <ThemedText
              style={[
                styles.subtitle,
                { color: Colors[colorScheme].textSecondary },
              ]}
            >
              {t("auth.forgotPassword.description")}
            </ThemedText>
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
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: 1,
    lineHeight: 36,
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    opacity: 0.7,
    lineHeight: 24,
    textAlign: "center",
  },
});
