import {
  AccessTokenListDto,
  CreateAccessTokenDto,
  GetUserAccessTokensDocument,
  GetUserAccessTokensQuery,
  useCreateAccessTokenMutation,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import * as Clipboard from 'expo-clipboard';
import PaperScrollView from "@/components/ui/PaperScrollView";
import CopyButton from "@/components/ui/CopyButton";
import {
  Button,
  Card,
  Dialog,
  Icon,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

export default function CreateAccessTokenForm() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  const [creating, setCreating] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [newToken, setNewToken] = useState<string>("");
  const [newTokenName, setNewTokenName] = useState("");
  const [expirationDays, setExpirationDays] = useState("");
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyToken = async () => {
    if (newToken && newToken !== "N/A") {
      await Clipboard.setStringAsync(newToken);
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
      }, 1000);
    }
  };

  const [createAccessToken] = useCreateAccessTokenMutation({
    update: (cache, { data }) => {
      console.log("createAccessToken", data);
      if (data?.createAccessToken) {
        const existingAccessTokens = cache.readQuery<GetUserAccessTokensQuery>({
          query: GetUserAccessTokensDocument,
        });
        if (existingAccessTokens?.getUserAccessTokens) {
          cache.writeQuery({
            query: GetUserAccessTokensDocument,
            data: {
              getUserAccessTokens: [
                ...existingAccessTokens.getUserAccessTokens,
                {
                  id: data.createAccessToken.id,
                  name: data.createAccessToken.name,
                  expiresAt: data.createAccessToken.expiresAt,
                  createdAt: data.createAccessToken.createdAt,
                  lastUsed: null,
                  isExpired: false,
                  __typename: "AccessTokenListDto",
                } satisfies AccessTokenListDto
              ],
            },
          });
        }
      }
    },
  });

  const createToken = async () => {
    if (!newTokenName.trim()) {
      setErrorMessage(t("accessTokens.form.nameRequired"));
      setShowErrorDialog(true);
      return;
    }

    try {
      setCreating(true);
      const createData: CreateAccessTokenDto = {
        name: newTokenName.trim(),
      };

      // Add expiration if specified
      if (expirationDays.trim()) {
        const days = parseInt(expirationDays);
        if (days > 0) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + days);
          createData.expiresAt = expiresAt.toISOString();
        }
      }

      const response = await createAccessToken({
        variables: { input: createData },
      });

      if (response.data?.createAccessToken) {
        setNewToken(response.data.createAccessToken.token);
        setShowTokenModal(true);
        setNewTokenName("");
        setExpirationDays("");
      }
    } catch (error) {
      console.error("Error creating token:", error);
      setErrorMessage(t("accessTokens.form.createError"));
      setShowErrorDialog(true);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setNewTokenName("");
    setExpirationDays("");
  };

  const isFormValid = newTokenName.trim();

  return (
    <PaperScrollView>
      <Card style={styles.formContainer} elevation={0}>
        <Card.Content>
          <View style={styles.inputGroup}>
            <Text variant="titleMedium" style={styles.inputLabel}>
              {t("accessTokens.form.tokenName")}
            </Text>
            <TextInput
              mode="outlined"
              value={newTokenName}
              onChangeText={setNewTokenName}
              placeholder={t("accessTokens.form.tokenNamePlaceholder")}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text variant="titleMedium" style={styles.inputLabel}>
              {t("accessTokens.form.expiration")}
            </Text>
            <TextInput
              mode="outlined"
              value={expirationDays}
              onChangeText={setExpirationDays}
              placeholder={t("accessTokens.form.expirationPlaceholder")}
              keyboardType="numeric"
            />
            <Text variant="bodySmall" style={styles.inputHint}>
              {t("accessTokens.form.expirationHint")}
            </Text>
          </View>

          <View style={styles.buttonRow}>
            <Button
              mode="contained"
              onPress={createToken}
              disabled={!isFormValid || creating}
              style={styles.createButton}
            >
              {creating
                ? t("accessTokens.form.creating")
                : t("accessTokens.form.createButton")}
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
          <Dialog.Title>
            {t("accessTokens.form.tokenCreatedTitle")}
          </Dialog.Title>
          <Dialog.Content>
            <View style={styles.tokenModalHeader}>
              <Icon
                source="check-circle"
                size={48}
                color={theme.colors.primary}
              />
              <Text variant="bodyMedium" style={styles.tokenModalSubtitle}>
                {t("accessTokens.form.tokenCreatedSubtitle")}
              </Text>
            </View>

            <View style={styles.tokenContainer}>
              <Text
                variant="bodySmall"
                style={[
                  styles.tokenText,
                  { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
                ]}
              >
                {newToken}
              </Text>
              <CopyButton
                text={newToken}
                size={20}
                style={styles.copyButtonContainer}
                label={t("accessTokens.form.copy")}
                successLabel={t("common.copied")}
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              mode="contained"
              onPress={() => {
                setShowTokenModal(false);
                router.back();
              }}
            >
              {t("accessTokens.form.done")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Error Dialog */}
      <Portal>
        <Dialog
          visible={showErrorDialog}
          onDismiss={() => setShowErrorDialog(false)}
        >
          <Dialog.Title>{t("common.error")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{errorMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowErrorDialog(false)}>
              {t("common.ok")}
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
  scrollView: {
    paddingHorizontal: 0, // Rimuove il padding orizzontale di PaperScrollView
  },
  formContainer: {
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 8,
  },
  inputHint: {
    marginTop: 4,
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
  },
  tokenContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  tokenText: {
    flex: 1,
    fontSize: 12,
  },
  copyButton: {
    margin: 0,
  },
  copyButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  copyButtonText: {
    marginLeft: 4,
  },
});
