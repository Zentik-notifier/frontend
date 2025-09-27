import {
  useChangePasswordMutation,
  useGetMeQuery,
  useSetPasswordMutation,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React, { useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, Text, TextInput, useTheme } from "react-native-paper";
import { useNavigationUtils } from "@/utils/navigation";

export function ChangePasswordForm() {
  const { t } = useI18n();
  const theme = useTheme();
  const { data: meData, refetch } = useGetMeQuery();
  const hasPassword = meData?.me?.hasPassword ?? false;
  const { navigateBack } = useNavigationUtils();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [changePassword, { loading: changingPassword }] =
    useChangePasswordMutation({
      refetchQueries: ["GetMe", "GetUserSessions"],
    });
  const [setPassword, { loading: settingPassword }] = useSetPasswordMutation({
    refetchQueries: ["GetMe", "GetUserSessions"],
  });

  const loading = changingPassword || settingPassword;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validazione password attuale (solo se l'utente ha già una password)
    if (hasPassword && !currentPassword.trim()) {
      newErrors.currentPassword = t(
        "changePassword.validation.currentPasswordRequired"
      ) as string;
    }

    // Validazione nuova password
    if (!newPassword.trim()) {
      newErrors.newPassword = (
        hasPassword
          ? t("changePassword.validation.newPasswordRequired")
          : t("setPassword.validation.newPasswordRequired")
      ) as string;
    } else if (newPassword.length < 8) {
      newErrors.newPassword = (
        hasPassword
          ? t("changePassword.validation.newPasswordMinLength")
          : t("setPassword.validation.newPasswordMinLength")
      ) as string;
    }

    // Validazione conferma password
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = (
        hasPassword
          ? t("changePassword.validation.passwordsDoNotMatch")
          : t("setPassword.validation.passwordsDoNotMatch")
      ) as string;
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = (
        hasPassword
          ? t("changePassword.validation.passwordsDoNotMatch")
          : t("setPassword.validation.passwordsDoNotMatch")
      ) as string;
    }

    // Validazione password diversa (solo se entrambe le password sono valide e coincidono)
    if (
      newPassword.trim() &&
      confirmPassword.trim() &&
      newPassword === confirmPassword
    ) {
      if (hasPassword && currentPassword === newPassword) {
        newErrors.newPassword = t(
          "changePassword.validation.samePassword"
        ) as string;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const effectiveHasPassword =
    typeof hasPassword === "boolean"
      ? hasPassword
      : meData?.me?.hasPassword ?? false;

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (effectiveHasPassword) {
        await changePassword({
          variables: {
            input: {
              currentPassword,
              newPassword,
            },
          },
        });
        // Reset form and navigate back
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setErrors({});
        navigateBack?.();
        await refetch();
      } else {
        await setPassword({
          variables: {
            input: {
              currentPassword: "", // Richiesto dal tipo attuale ma non utilizzato dal backend
              newPassword,
            },
          },
        });
        // Reset form and navigate back
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setErrors({});
        navigateBack();
        await refetch();
      }
    } catch (error) {
      console.error("Password operation failed:", error);
      Alert.alert(
        hasPassword
          ? t("changePassword.errors.title")
          : t("setPassword.errors.title"),
        hasPassword
          ? t("changePassword.errors.unknown")
          : t("setPassword.errors.unknown")
      );
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <Card>
        <Card.Content>
          <View style={styles.header}>
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface }}
            >
              {effectiveHasPassword
                ? t("changePassword.title")
                : t("setPassword.title")}
            </Text>
          </View>

          {effectiveHasPassword && (
            <View style={styles.inputContainer}>
              <TextInput
                mode="outlined"
                label={t("changePassword.currentPassword")}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder={t("changePassword.currentPasswordPlaceholder")}
                secureTextEntry
                error={!!errors.currentPassword}
                style={styles.input}
              />
              {errors.currentPassword && (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.currentPassword}
                </Text>
              )}
            </View>
          )}

          <View style={styles.inputContainer}>
            <TextInput
              mode="outlined"
              label={t("changePassword.newPassword")}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={
                effectiveHasPassword
                  ? t("changePassword.newPasswordPlaceholder")
                  : t("setPassword.newPasswordPlaceholder")
              }
              secureTextEntry
              error={!!errors.newPassword}
              style={styles.input}
            />
            {errors.newPassword && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.newPassword}
              </Text>
            )}
            <Text
              style={[
                styles.helperText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {hasPassword
                ? t("changePassword.validation.newPasswordMinLength")
                : t("setPassword.validation.newPasswordMinLength")}
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              mode="outlined"
              label={t("changePassword.confirmPassword")}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={
                effectiveHasPassword
                  ? t("changePassword.confirmPasswordPlaceholder")
                  : t("setPassword.confirmPasswordPlaceholder")
              }
              secureTextEntry
              error={!!errors.confirmPassword}
              style={styles.input}
            />
            {errors.confirmPassword && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.confirmPassword}
              </Text>
            )}
          </View>

          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={loading}
            loading={loading}
            style={styles.button}
          >
            {effectiveHasPassword
              ? t("changePassword.changeButton")
              : t("setPassword.setButton")}
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 12,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 12,
  },
  button: {
    marginTop: 16,
  },
});
