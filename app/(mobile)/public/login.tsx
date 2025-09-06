import LoginForm from "@/components/LoginForm";
import { ThemedText } from "@/components/ThemedText";
import UnauthenticatedHeader from "@/components/UnauthenticatedHeader";
import { Colors } from "@/constants/Colors";
import { usePublicAppConfigQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LoginScreen() {
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { data } = usePublicAppConfigQuery();
  const emailEnabled = data?.publicAppConfig.emailEnabled;
  const { email } = useLocalSearchParams<{ email?: string }>();

  const handleLoginSuccess = () => {
    router.replace("/(mobile)/private/home");
  };

  const goToRegister = () => {
    router.replace("/(mobile)/public/register");
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
            { paddingTop: Math.max(80, insets.top) }, // Dynamic padding based on safe area
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <ThemedText style={styles.appName}>Zentik</ThemedText>
            <View
              style={[
                styles.logoPlaceholder,
              ]}
            >
              <View style={styles.logoImageWrapper}>
                <Image
                  source={require("../../../assets/generators/zentik_logo_FINAL_circle_aqua_whiteZ_1024_80.png")}
                  style={styles.logoImage}
                  resizeMode="cover"
                />
              </View>
            </View>
            <ThemedText style={styles.subtitle}>
              {t("login.welcomeBack")}
            </ThemedText>
          </View>

          <LoginForm onSuccess={handleLoginSuccess} initialEmail={typeof email === 'string' ? email : undefined} />

          <View style={styles.registerContainer}>
            <ThemedText style={styles.registerText}>
              {t("login.noAccount")}
            </ThemedText>
            <TouchableOpacity onPress={goToRegister}>
              <Text
                style={[
                  styles.registerLink,
                  { color: Colors[colorScheme].tint },
                ]}
              >
                {t("login.signUp")}
              </Text>
            </TouchableOpacity>
          </View>

          {emailEnabled && (
            <View style={styles.forgotPasswordContainer}>
              <TouchableOpacity
                onPress={() => router.push("/(mobile)/public/forgot-password")}
              >
                <Text
                  style={[
                    styles.forgotPasswordText,
                    { color: Colors[colorScheme].tint },
                  ]}
                >
                  {t("login.forgotPassword")}
                </Text>
              </TouchableOpacity>
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
    minHeight: "100%", // Ensure full height
    paddingHorizontal: 24,
    paddingVertical: 32,
    // paddingTop: 100, // Now dynamic based on safe area
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 10,
    marginTop: 0, // Extra margin top for title
  },
  appName: {
    fontSize: 32,
    fontWeight: "bold",
    letterSpacing: 1,
    lineHeight: 40, // Increased line height to prevent cutting
    marginBottom: 16,
  },
  logoPlaceholder: {
    width: 144,
    height: 144,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    elevation: 8,
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
    fontSize: 18,
    opacity: 0.7,
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  registerText: {
    fontSize: 16,
  },
  registerLink: {
    fontSize: 16,
    fontWeight: "600",
  },
  forgotPasswordContainer: {
    alignItems: "center",
    marginTop: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
