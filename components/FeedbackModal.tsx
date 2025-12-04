import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, TextInput, View } from "react-native";
import { Checkbox, HelperText, Text, useTheme } from "react-native-paper";
import { useI18n } from "@/hooks/useI18n";
import DetailModal from "./ui/DetailModal";
import { useAppLog } from "@/hooks/useAppLog";
import { useGetMeQuery } from "@/generated/gql-operations-generated";

interface FeedbackModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function FeedbackModal({
  visible,
  onDismiss,
}: FeedbackModalProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const { sendFeedback, loading } = useAppLog();
  const { data: meData } = useGetMeQuery({
    fetchPolicy: "cache-first",
  });
  const userEmail = meData?.me?.email ?? null;
  const hasUser = !!meData?.me;

  const [text, setText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState<boolean>(!hasUser);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [manualEmail, setManualEmail] = useState("");

  useEffect(() => {
    // Default to non-anonymous when a logged user is available
    if (hasUser) {
      setIsAnonymous(false);
    }
  }, [hasUser]);

  const handleClose = () => {
    if (loading) return;
    setText("");
    setValidationError(null);
    setIsAnonymous(true);
    setManualEmail("");
    onDismiss();
  };

  const handleConfirm = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setValidationError(t("feedbackModal.validation.requiredText") as string);
      return;
    }

    let emailForPayload: string | undefined;
    if (!isAnonymous && !hasUser) {
      const emailTrimmed = manualEmail.trim();
      if (!emailTrimmed) {
        setValidationError(
          t("feedbackModal.validation.requiredEmail") as string
        );
        return;
      }
      emailForPayload = emailTrimmed;
    }

    try {
      await sendFeedback(trimmed, isAnonymous, emailForPayload);

      Alert.alert(
        t("feedbackModal.successTitle") as string,
        t("feedbackModal.successMessage") as string
      );

      handleClose();
    } catch (error: any) {
      console.error("Error sending feedback:", error);
      Alert.alert(
        t("feedbackModal.errorTitle") as string,
        error?.message ||
          (t("feedbackModal.errorMessage") as string)
      );
    }
  };

  const canSend = !loading && text.trim().length > 0;

  return (
    <DetailModal
      visible={visible}
      onDismiss={handleClose}
      title={t("feedbackModal.title") as string}
      icon="comment-quote"
      actions={{
        cancel: {
          label: t("common.cancel") as string,
          onPress: handleClose,
        },
        confirm: {
          label: t("feedbackModal.submitLabel") as string,
          onPress: handleConfirm,
          loading,
          disabled: !canSend,
        },
      }}
    >
      <View style={styles.container}>
        <Text
          variant="bodyMedium"
          style={[styles.description, { color: theme.colors.onSurface }]}
        >
          {t("feedbackModal.description") as string}
        </Text>

        <View style={styles.row}>
          <Checkbox
            status={isAnonymous ? "checked" : "unchecked"}
            onPress={() => {
              setIsAnonymous(!isAnonymous);
              setValidationError(null);
            }}
          />
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurface }}
          >
            {t("feedbackModal.anonymousLabel") as string}
          </Text>
        </View>

        {!isAnonymous && hasUser && userEmail && (
          <View style={styles.userInfo}>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}
            >
              {t("feedbackModal.sendingAs") as string}
            </Text>
            <TextInput
              value={userEmail}
              editable={false}
              style={[
                styles.emailInput,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  color: theme.colors.onSurface,
                  borderColor: theme.colors.outline,
                },
              ]}
            />
          </View>
        )}

        {!isAnonymous && !hasUser && (
          <View style={styles.userInfo}>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}
            >
              {t("feedbackModal.emailLabel") as string}
            </Text>
            <TextInput
              value={manualEmail}
              onChangeText={(value) => {
                setManualEmail(value);
                if (validationError) setValidationError(null);
              }}
              placeholder={t("feedbackModal.emailPlaceholder") as string}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.emailInput,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  color: theme.colors.onSurface,
                  borderColor: validationError
                    ? theme.colors.error
                    : theme.colors.outline,
                },
              ]}
            />
          </View>
        )}

        <TextInput
          value={text}
          onChangeText={(value) => {
            setText(value);
            if (validationError) setValidationError(null);
          }}
          placeholder={t("feedbackModal.placeholder") as string}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          style={[
            styles.textArea,
            {
              backgroundColor: theme.colors.surfaceVariant,
              color: theme.colors.onSurface,
              borderColor: validationError
                ? theme.colors.error
                : theme.colors.outline,
            },
          ]}
        />
        {validationError && (
          <HelperText type="error" visible={true}>
            {validationError}
          </HelperText>
        )}
      </View>
    </DetailModal>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  description: {
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userInfo: {
    marginTop: 4,
  },
  emailInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 120,
    maxHeight: 260,
  },
});


