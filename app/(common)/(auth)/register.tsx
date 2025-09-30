import { useAppContext } from "@/contexts/AppContext";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import { Stack } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, HelperText, Text, TextInput } from "react-native-paper";
import {
  SafeAreaView
} from "react-native-safe-area-context";

export default function RegisterScreen() {
  const { t } = useI18n();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const { register } = useAppContext();
  const { navigateToHome, navigateToLogin, navigateToEmailConfirmation } =
    useNavigationUtils();

  const validateForm = () => {
    const newErrors: {
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    // firstName validation (required)
    if (!firstName || firstName.trim().length === 0)
      newErrors.firstName = "Il nome è obbligatorio";
    else if (firstName.trim().length < 2)
      newErrors.firstName = "Il nome deve essere di almeno 2 caratteri";
    else if (firstName.length > 50)
      newErrors.firstName = "Il nome non può superare 50 caratteri";

    // lastName validation (required)
    if (!lastName || lastName.trim().length === 0)
      newErrors.lastName = "Il cognome è obbligatorio";
    else if (lastName.trim().length < 2)
      newErrors.lastName = "Il cognome deve essere di almeno 2 caratteri";
    else if (lastName.length > 50)
      newErrors.lastName = "Il cognome non può superare 50 caratteri";

    if (!email) newErrors.email = t("register.validation.emailRequired");
    else if (!/\S+@\S+\.\S+/.test(email))
      newErrors.email = t("register.validation.emailInvalid");
    if (!password)
      newErrors.password = t("register.validation.passwordRequired");
    else if (password.length < 6)
      newErrors.password = "La password deve essere di almeno 6 caratteri";
    else if (password.length > 100)
      newErrors.password = "La password non può superare 100 caratteri";
    if (!confirmPassword)
      newErrors.confirmPassword = t(
        "register.validation.confirmPasswordRequired"
      );
    else if (password && password !== confirmPassword)
      newErrors.confirmPassword = t("register.validation.passwordsDoNotMatch");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const res = await register(firstName, lastName, email, password);

      if (!res) {
        Alert.alert(t("common.error"), t("register.errors.registrationFailed"));
        return;
      }

      if (res === "emailConfirmationRequired") {
        navigateToEmailConfirmation({ email });
        return;
      } else if (res === "ok") {
        navigateToHome();
        return;
      } else {
        Alert.alert(t("common.error"), t("register.errors.registrationFailed"));
        navigateToLogin();
        return;
      }
    } catch (error: any) {
      console.error("Register error:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        t("register.errors.connectionError");
      Alert.alert(t("common.error"), errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.container]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.titleContainer}>
            <Text variant="headlineMedium" style={styles.title}>
              {t("register.title")}
            </Text>
          </View>

          <View style={styles.formContainer}>
            <TextInput
              label={`${t("register.firstName")} *`}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t("register.firstNamePlaceholder")}
              autoCapitalize="words"
              returnKeyType="next"
              textContentType="givenName"
              autoComplete="name-given"
              importantForAutofill="yes"
              mode="outlined"
              error={!!errors.firstName}
              style={styles.input}
            />
            <HelperText type="error" visible={!!errors.firstName}>
              {errors.firstName}
            </HelperText>

            <TextInput
              label={`${t("register.lastName")} *`}
              value={lastName}
              onChangeText={setLastName}
              placeholder={t("register.lastNamePlaceholder")}
              autoCapitalize="words"
              returnKeyType="next"
              textContentType="familyName"
              autoComplete="name-family"
              importantForAutofill="yes"
              mode="outlined"
              error={!!errors.lastName}
              style={styles.input}
            />
            <HelperText type="error" visible={!!errors.lastName}>
              {errors.lastName}
            </HelperText>

            <TextInput
              label={`${t("register.email")} *`}
              value={email}
              onChangeText={setEmail}
              placeholder={t("register.emailPlaceholder")}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              textContentType="emailAddress"
              autoComplete="email"
              importantForAutofill="yes"
              mode="outlined"
              error={!!errors.email}
              style={styles.input}
            />
            <HelperText type="error" visible={!!errors.email}>
              {errors.email}
            </HelperText>

            <View style={styles.passwordContainer}>
              <TextInput
                label={`${t("register.password")} *`}
                value={password}
                onChangeText={setPassword}
                placeholder={t("register.passwordPlaceholder")}
                secureTextEntry={!showPassword}
                returnKeyType="next"
                textContentType="newPassword"
                autoComplete="password-new"
                importantForAutofill="yes"
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
              <HelperText type="error" visible={!!errors.password}>
                {errors.password}
              </HelperText>
            </View>

            <View style={styles.passwordContainer}>
              <TextInput
                label={`${t("register.confirmPassword")} *`}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t("register.confirmPasswordPlaceholder")}
                secureTextEntry={!showConfirmPassword}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                textContentType="newPassword"
                autoComplete="password-new"
                importantForAutofill="yes"
                mode="outlined"
                error={!!errors.confirmPassword}
                style={styles.input}
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? "eye-off" : "eye"}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                }
              />
              <HelperText type="error" visible={!!errors.confirmPassword}>
                {errors.confirmPassword}
              </HelperText>
            </View>

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={isLoading}
              disabled={isLoading}
              style={styles.registerButton}
            >
              {isLoading
                ? t("register.registering")
                : t("register.registerButton")}
            </Button>
          </View>

          <View style={styles.loginContainer}>
            <Text variant="bodyLarge" style={styles.loginText}>
              {t("register.haveAccount")}
            </Text>
            <Button
              mode="text"
              onPress={() => navigateToLogin()}
              style={styles.loginButton}
            >
              {t("register.login")}
            </Button>
          </View>
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
    padding: 24,
    alignItems: "center",
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 20,
  },
  title: {
    fontWeight: "bold",
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
    maxWidth: 500,
  },
  input: {
    width: "100%",
  },
  passwordContainer: {
    width: "100%",
  },
  registerButton: {
    marginTop: 16,
    width: "100%",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
  },
  loginText: {
    textAlign: "center",
  },
  loginButton: {
    marginLeft: 4,
  },
});
