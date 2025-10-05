import {
  GetSystemAccessTokensDocument,
  useCreateSystemAccessTokenMutation,
  useGetAllUsersQuery,
  useGetSystemTokenQuery,
  useUpdateSystemAccessTokenMutation,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import * as Clipboard from "expo-clipboard";
import React, { useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";
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
import PaperScrollView from "./ui/PaperScrollView";
import Selector from "./ui/Selector";

interface SystemAccessTokenFormProps {
  id?: string;
}

export default function SystemAccessTokenForm({
  id,
}: SystemAccessTokenFormProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const [creating, setCreating] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [newToken, setNewToken] = useState<string>("");
  const { navigateToSystemAccessTokens } = useNavigationUtils();

  // form fields
  const [maxCalls, setMaxCalls] = useState("0");
  const [expirationDays, setExpirationDays] = useState("");
  const [requesterId, setRequesterId] = useState("");
  const [description, setDescription] = useState("");

  const [createSystemToken] = useCreateSystemAccessTokenMutation({
    refetchQueries: [GetSystemAccessTokensDocument],
  });
  const [updateSystemToken] = useUpdateSystemAccessTokenMutation();

  const {
    data: usersData,
    loading: usersLoading,
    refetch: refetchUsers,
  } = useGetAllUsersQuery();
  const users = usersData?.users || [];
  const isEdit = !!id;

  const {
    data: singleTokenData,
    loading: singleTokenLoading,
    refetch: refetchSingleToken,
  } = useGetSystemTokenQuery({
    variables: { id: id! },
    skip: !isEdit || !id, // Only fetch when in edit mode with valid id
  });

  // Find the token to edit - use single query in edit mode, list query in create mode
  const tokenToEdit = isEdit ? singleTokenData?.getSystemToken : null;

  // Pre-fill form when token data is loaded (only in edit mode)
  useEffect(() => {
    if (isEdit && tokenToEdit) {
      setMaxCalls(tokenToEdit.maxCalls.toString());
      if (tokenToEdit.expiresAt) {
        const expiresDate = new Date(tokenToEdit.expiresAt);
        const today = new Date();
        const daysDiff = Math.ceil(
          (expiresDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        setExpirationDays(daysDiff > 0 ? daysDiff.toString() : "");
      } else {
        setExpirationDays("");
      }
      setRequesterId(tokenToEdit.requester?.id || "");
      setDescription(tokenToEdit.description || "");
    }
  }, [isEdit, tokenToEdit]);

  const userOptions = [
    { id: "", name: t("systemAccessTokens.form.requesterPlaceholder") },
    ...users.map((user) => ({
      id: user.id,
      name: user.username || user.email || user.id,
    })),
  ];

  const handleSubmit = async () => {
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

      if (isEdit && tokenToEdit) {
        // Update existing token
        await updateSystemToken({
          variables: {
            id: tokenToEdit.id,
            maxCalls: parsedMax,
            expiresAt,
            description: description || null,
          },
        });

        navigateToSystemAccessTokens();
      } else {
        // Create new token
        const res = await createSystemToken({
          variables: {
            maxCalls: parsedMax,
            expiresAt,
            requesterId: requesterId || null,
            description: description || null,
          },
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
      }
    } catch (error) {
      console.error(
        `Error ${isEdit ? "updating" : "creating"} system token:`,
        error
      );
      Alert.alert(
        t("common.error"),
        isEdit
          ? t("systemAccessTokens.edit.updateError")
          : t("systemAccessTokens.form.createError")
      );
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
  };

  const resetForm = () => {
    if (isEdit && tokenToEdit) {
      setMaxCalls(tokenToEdit.maxCalls.toString());
      if (tokenToEdit.expiresAt) {
        const expiresDate = new Date(tokenToEdit.expiresAt);
        const today = new Date();
        const daysDiff = Math.ceil(
          (expiresDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        setExpirationDays(daysDiff > 0 ? daysDiff.toString() : "");
      } else {
        setExpirationDays("");
      }
      setRequesterId(tokenToEdit.requester?.id || "");
      setDescription(tokenToEdit.description || "");
    } else {
      setMaxCalls("0");
      setExpirationDays("");
      setRequesterId("");
      setDescription("");
    }
  };

  const isFormValid = !isNaN(parseFloat(maxCalls || "0"));
  const loading = usersLoading || (isEdit ? singleTokenLoading : false);

  const handlerRefetch = async () => {
    const promises: Promise<any>[] = [refetchUsers()];
    if (isEdit) {
      promises.push(refetchSingleToken());
    }
    await Promise.all(promises);
  };

  // Handle error state through PaperScrollView props
  const showError = isEdit && !tokenToEdit;

  return (
    <PaperScrollView
      loading={loading}
      onRefresh={handlerRefetch}
      error={showError}
      errorTitle={t("systemAccessTokens.edit.tokenNotFound")}
      onRetry={handlerRefetch}
    >
      <Card style={styles.formContainer} mode="outlined">
        <Card.Content>
          {/* Token Info (only in edit mode) */}
          {isEdit && tokenToEdit && (
            <View style={styles.tokenInfo}>
              <Text variant="titleMedium" style={styles.infoTitle}>
                {t("systemAccessTokens.edit.currentTokenInfo")}
              </Text>
              <Text variant="bodySmall" style={styles.tokenId}>
                ID: {tokenToEdit.id}
              </Text>
              <Text variant="bodySmall" style={styles.tokenCalls}>
                {t("systemAccessTokens.item.calls")}: {tokenToEdit.calls}/
                {tokenToEdit.maxCalls}
              </Text>
            </View>
          )}

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
            {isEdit ? (
              // Readonly display in edit mode
              <View style={styles.readonlyRequester}>
                <Text variant="bodyMedium">
                  {tokenToEdit?.requester
                    ? tokenToEdit.requester.username ||
                      tokenToEdit.requester.email ||
                      tokenToEdit.requester.id
                    : t("systemAccessTokens.form.requesterPlaceholder")}
                </Text>
              </View>
            ) : (
              // Editable selector in create mode
              <Selector
                selectedValue={requesterId}
                placeholder={t("systemAccessTokens.form.requesterPlaceholder")}
                options={userOptions}
                onValueChange={setRequesterId}
                isSearchable={true}
              />
            )}
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
              onPress={handleSubmit}
              disabled={!isFormValid || creating}
              loading={creating}
              style={styles.primaryButton}
            >
              {creating
                ? isEdit
                  ? t("systemAccessTokens.edit.updating")
                  : t("systemAccessTokens.form.creating")
                : isEdit
                ? t("systemAccessTokens.edit.updateButton")
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
          <Dialog.Title>
            {t("systemAccessTokens.form.tokenCreatedTitle")}
          </Dialog.Title>
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
              <Text variant="bodySmall" style={styles.tokenText}>
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
            <Button
              onPress={() => {
                setShowTokenModal(false);
                navigateToSystemAccessTokens();
              }}
            >
              {t("systemAccessTokens.form.done")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    marginBottom: 16,
  },
  tokenInfo: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoTitle: {
    marginBottom: 8,
    fontWeight: "600",
  },
  tokenId: {
    opacity: 0.7,
    marginBottom: 4,
  },
  tokenCalls: {
    opacity: 0.7,
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
  readonlyRequester: {
    padding: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  primaryButton: {
    flex: 1,
  },
  resetButton: {
    flex: 1,
  },
  warningText: {
    flex: 1,
    color: "#856404",
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
