import {
  useCreateSystemAccessTokenMutation,
  useGetAllUsersQuery,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Dialog,
  Icon,
  Portal,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import ThemedInputSelect from "./ui/ThemedInputSelect";
import PaperScrollView from "./ui/PaperScrollView";

export default function CreateSystemAccessTokenForm() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  const [creating, setCreating] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [newToken, setNewToken] = useState<string>("");

  // form fields
  const [maxCalls, setMaxCalls] = useState("0");
  const [expirationDays, setExpirationDays] = useState("");
  const [requesterId, setRequesterId] = useState("");
  const [description, setDescription] = useState("");

  const [createSystemToken] = useCreateSystemAccessTokenMutation();

  const {
    data: usersData,
    loading: usersLoading,
    refetch: refetchUsers,
  } = useGetAllUsersQuery();
  const users = usersData?.users || [];

  // Prepare user options for ThemedInputSelect
  const userOptions = [
    { id: "", name: t("systemAccessTokens.form.requesterPlaceholder") },
    ...users.map((user) => ({
      id: user.id,
      name: user.username || user.email || user.id,
    })),
  ];

  const createToken = async () => {
    const parsedMax = parseFloat(maxCalls || "0");
    if (isNaN(parsedMax) || parsedMax < 0) {
      Alert.alert(
        t("common.error"),
        t("systemAccessTokens.form.maxCallsRequired")
      );
      return;
    }

    let expiresAt: string | null = null;
    if (expirationDays.trim()) {
      const days = parseInt(expirationDays);
      if (days > 0) {
        const expires = new Date();
        expires.setDate(expires.getDate() + days);
        expiresAt = expires.toISOString();
      }
    }

    try {
      setCreating(true);

      const res = await createSystemToken({
        variables: {
          maxCalls: parsedMax,
          expiresAt,
          requesterId: requesterId || null,
          description: description || null,
        },
        refetchQueries: ["GetSystemAccessTokens"],
      });

      const created = res.data?.createSystemToken;
      if (created?.rawToken) {
        setNewToken(created.rawToken);
        setShowTokenModal(true);

        // reset form
        setMaxCalls("0");
        setExpirationDays("");
        setRequesterId("");
        setDescription("");
      }
    } catch (error) {
      console.error("Error creating system token:", error);
      Alert.alert(t("common.error"), t("systemAccessTokens.form.createError"));
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert(
      t("systemAccessTokens.form.copied"),
      t("systemAccessTokens.form.tokenCopied")
    );
  };

  const resetForm = () => {
    setMaxCalls("0");
    setExpirationDays("");
    setRequesterId("");
    setDescription("");
  };

  const isFormValid = !isNaN(parseFloat(maxCalls || "0"));

  return (
    <PaperScrollView
      style={styles.container}
      refreshing={false}
      onRefresh={refetchUsers}
    >
      <Card style={styles.formContainer} mode="outlined">
        <Card.Content>
          <View style={styles.inputGroup}>
            <Text variant="titleMedium" style={styles.inputLabel}>
              {t("systemAccessTokens.form.maxCalls")}
            </Text>
            <TextInput
              mode="outlined"
              value={maxCalls}
              onChangeText={setMaxCalls}
              placeholder={t("systemAccessTokens.form.maxCallsPlaceholder")}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text variant="titleMedium" style={styles.inputLabel}>
              {t("systemAccessTokens.form.expiration")}
            </Text>
            <TextInput
              mode="outlined"
              value={expirationDays}
              onChangeText={setExpirationDays}
              placeholder={t("systemAccessTokens.form.expirationPlaceholder")}
              keyboardType="numeric"
            />
            <Text variant="bodySmall" style={styles.inputHint}>
              {t("systemAccessTokens.form.expirationHint")}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text variant="titleMedium" style={styles.inputLabel}>
              {t("systemAccessTokens.form.requester")}
            </Text>
            <ThemedInputSelect
              selectedValue={requesterId}
              placeholder={t("systemAccessTokens.form.requesterPlaceholder")}
              options={userOptions}
              optionLabel="name"
              optionValue="id"
              onValueChange={setRequesterId}
              isSearchable={true}
            />
            <Text variant="bodySmall" style={styles.inputHint}>
              {t("systemAccessTokens.form.requesterHint")}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text variant="titleMedium" style={styles.inputLabel}>
              {t("systemAccessTokens.form.description")}
            </Text>
            <TextInput
              mode="outlined"
              value={description}
              onChangeText={setDescription}
              placeholder={t("systemAccessTokens.form.descriptionPlaceholder")}
            />
          </View>

          <View style={styles.buttonRow}>
            <Button
              mode="contained"
              onPress={createToken}
              disabled={!isFormValid || creating}
              loading={creating}
              style={styles.createButton}
            >
              {creating
                ? t("systemAccessTokens.form.creating")
                : t("systemAccessTokens.form.createButton")}
            </Button>

            <Button
              mode="outlined"
              onPress={resetForm}
              disabled={creating}
              style={styles.resetButton}
            >
              {t("common.reset")}
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Token Display Dialog */}
      <Portal>
        <Dialog
          visible={showTokenModal}
          onDismiss={() => setShowTokenModal(false)}
        >
          <Dialog.Title>{t("systemAccessTokens.form.tokenCreatedTitle")}</Dialog.Title>
          <Dialog.Content>
            <View style={styles.tokenModalHeader}>
              <Icon
                source="check-circle"
                size={48}
                color={theme.colors.primary}
              />
              <Text variant="bodyMedium" style={styles.tokenModalSubtitle}>
                {t("systemAccessTokens.form.tokenCreatedSubtitle")}
              </Text>
            </View>

            <Surface style={styles.tokenContainer} elevation={1}>
              <Text
                variant="bodySmall"
                style={styles.tokenText}
              >
                {newToken}
              </Text>
              <Button
                mode="contained"
                compact
                onPress={() => copyToClipboard(newToken)}
                style={styles.copyButton}
              >
                <Icon source="content-copy" size={16} />
              </Button>
            </Surface>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => {
              setShowTokenModal(false);
              router.back();
            }}>
              {t("systemAccessTokens.form.done")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  formContainer: {
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    marginBottom: 8,
  },
  inputHint: {
    marginTop: 4,
    opacity: 0.7,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  createButton: {
    flex: 1,
  },
  resetButton: {
    flex: 1,
  },
  tokenModalHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  tokenModalSubtitle: {
    marginTop: 8,
    textAlign: "center",
    opacity: 0.7,
  },
  tokenContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 8,
  },
  tokenText: {
    flex: 1,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  copyButton: {
    minWidth: 0,
  },
});
