import { ThemedText } from "@/components/ThemedText";
import UnauthenticatedHeader from "@/components/UnauthenticatedHeader";
import { Button } from "@/components/ui";
import { Colors } from "@/constants/Colors";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
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
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

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
        router.replace({
          pathname: "/(mobile)/public/email-confirmation",
          params: { email },
        });
        return;
      } else if (res === "ok") {
        router.replace("/(mobile)/private/home");
        return;
      } else {
        Alert.alert(t("common.error"), t("register.errors.registrationFailed"));
        router.replace({ pathname: "/(mobile)/public/login" });
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
            { paddingTop: Math.max(100, insets.top + 50) }, // Dynamic padding based on safe area
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedText
            style={[styles.title, { color: Colors[colorScheme].tint }]}
          >
            {t("register.title")}
          </ThemedText>
          
          <View style={styles.inputContainer}>
            <ThemedText style={[styles.label, { color: Colors[colorScheme].text }]}>
              {t("register.firstName")} *
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: Colors[colorScheme].inputBackground || Colors[colorScheme].background,
                  borderColor: errors.firstName ? '#FF3B30' : Colors[colorScheme].border,
                  color: Colors[colorScheme].text,
                },
              ]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t("register.firstNamePlaceholder")}
              placeholderTextColor={Colors[colorScheme].textSecondary}
              autoCapitalize="words"
              returnKeyType="next"
              textContentType="givenName"
              autoComplete="name-given"
              importantForAutofill="yes"
            />
            {errors.firstName && (
              <ThemedText style={styles.errorText}>{errors.firstName}</ThemedText>
            )}
          </View>

          <View style={styles.inputContainer}>
            <ThemedText style={[styles.label, { color: Colors[colorScheme].text }]}>
              {t("register.lastName")} *
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: Colors[colorScheme].inputBackground || Colors[colorScheme].background,
                  borderColor: errors.lastName ? '#FF3B30' : Colors[colorScheme].border,
                  color: Colors[colorScheme].text,
                },
              ]}
              value={lastName}
              onChangeText={setLastName}
              placeholder={t("register.lastNamePlaceholder")}
              placeholderTextColor={Colors[colorScheme].textSecondary}
              autoCapitalize="words"
              returnKeyType="next"
              textContentType="familyName"
              autoComplete="name-family"
              importantForAutofill="yes"
            />
            {errors.lastName && (
              <ThemedText style={styles.errorText}>{errors.lastName}</ThemedText>
            )}
          </View>

          <View style={styles.inputContainer}>
            <ThemedText style={[styles.label, { color: Colors[colorScheme].text }]}>
              {t("register.email")} *
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: Colors[colorScheme].inputBackground || Colors[colorScheme].background,
                  borderColor: errors.email ? '#FF3B30' : Colors[colorScheme].border,
                  color: Colors[colorScheme].text,
                },
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder={t("register.emailPlaceholder")}
              placeholderTextColor={Colors[colorScheme].textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              textContentType="emailAddress"
              autoComplete="email"
              importantForAutofill="yes"
            />
            {errors.email && (
              <ThemedText style={styles.errorText}>{errors.email}</ThemedText>
            )}
          </View>

          <View style={styles.inputContainer}>
            <ThemedText style={[styles.label, { color: Colors[colorScheme].text }]}>
              {t("register.password")} *
            </ThemedText>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  {
                    backgroundColor: Colors[colorScheme].inputBackground || Colors[colorScheme].background,
                    borderColor: errors.password ? '#FF3B30' : Colors[colorScheme].border,
                    color: Colors[colorScheme].text,
                  },
                ]}
                value={password}
                onChangeText={setPassword}
                placeholder={t("register.passwordPlaceholder")}
                placeholderTextColor={Colors[colorScheme].textSecondary}
                secureTextEntry={!showPassword}
                returnKeyType="next"
                textContentType="newPassword"
                autoComplete="password-new"
                importantForAutofill="yes"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={Colors[colorScheme].textSecondary}
                />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <ThemedText style={styles.errorText}>{errors.password}</ThemedText>
            )}
            <ThemedText style={styles.helperText}>
              Minimo 6 caratteri, massimo 100
            </ThemedText>
          </View>

          <View style={styles.inputContainer}>
            <ThemedText style={[styles.label, { color: Colors[colorScheme].text }]}>
              {t("register.confirmPassword")} *
            </ThemedText>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  {
                    backgroundColor: Colors[colorScheme].inputBackground || Colors[colorScheme].background,
                    borderColor: errors.confirmPassword ? '#FF3B30' : Colors[colorScheme].border,
                    color: Colors[colorScheme].text,
                  },
                ]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t("register.confirmPasswordPlaceholder")}
                placeholderTextColor={Colors[colorScheme].textSecondary}
                secureTextEntry={!showConfirmPassword}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                textContentType="newPassword"
                autoComplete="password-new"
                importantForAutofill="yes"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={20}
                  color={Colors[colorScheme].textSecondary}
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <ThemedText style={styles.errorText}>{errors.confirmPassword}</ThemedText>
            )}
          </View>

          <Button
            title={
              isLoading
                ? t("register.registering")
                : t("register.registerButton")
            }
            onPress={handleRegister}
            loading={isLoading}
            disabled={isLoading}
            style={{ marginTop: 24 }}
          />
          <View style={styles.loginContainer}>
            <ThemedText style={styles.loginText}>
              {t("register.haveAccount")}
            </ThemedText>
            <TouchableOpacity
              onPress={() => router.replace("/(mobile)/public/login")}
            >
              <Text
                style={[styles.loginLink, { color: Colors[colorScheme].tint }]}
              >
                {t("register.login")}
              </Text>
            </TouchableOpacity>
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
    minHeight: "100%", // Ensure full height
    padding: 24,
    // paddingTop: 100, // Now dynamic based on safe area
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    lineHeight: 36, // Increased line height to prevent cutting
    marginBottom: 32,
    marginTop: 20, // Extra margin top for title
    textAlign: "center",
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
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50, // Make space for eye icon
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 14,
    padding: 4,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
  },
  helperText: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.7,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  loginText: {
    fontSize: 16,
  },
  loginLink: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
