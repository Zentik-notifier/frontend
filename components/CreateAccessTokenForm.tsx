import CopyButton from "@/components/ui/CopyButton";
import MultiBucketSelector from "@/components/MultiBucketSelector";
import {
  AccessTokenListDto,
  CreateAccessTokenDto,
  useCreateAccessTokenMutation,
  useGetBucketsQuery,
  useUpdateAccessTokenMutation,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Keyboard,
  Platform,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import {
  Button,
  Card,
  Dialog,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

interface CreateAccessTokenFormProps {
  tokenData?: AccessTokenListDto;
}

export default function CreateAccessTokenForm({
  tokenData,
}: CreateAccessTokenFormProps) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  const [creating, setCreating] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [expirationDays, setExpirationDays] = useState("");
  const [storeToken, setStoreToken] = useState(true);
  const [useScopes, setUseScopes] = useState(false);
  const [selectedBucketIds, setSelectedBucketIds] = useState<string[]>([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdToken, setCreatedToken] = useState("");
  const [wasTokenStored, setWasTokenStored] = useState(false);
  const isWatchToken = tokenData?.scopes?.includes("watch") ?? false;
  const editMode = !!tokenData;

  // Initialize form in edit mode
  React.useEffect(() => {
    if (editMode && tokenData) {
      setNewTokenName(tokenData.name);

      // Initialize expiration if exists
      if (tokenData.expiresAt) {
        const daysUntilExpiry = Math.ceil(
          (new Date(tokenData.expiresAt).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        );
        if (daysUntilExpiry > 0) {
          setExpirationDays(daysUntilExpiry.toString());
        }
      }

      // Initialize scopes if exists
      if (tokenData.scopes && tokenData.scopes.length > 0) {
        setUseScopes(true);
        const bucketIds = tokenData.scopes
          .filter((s) => s.startsWith("message-bucket-creation:"))
          .map((s) => s.split(":")[1]);
        setSelectedBucketIds(bucketIds);
      }
    }
  }, [editMode, tokenData]);

  const [createAccessToken] = useCreateAccessTokenMutation({
    refetchQueries: ["GetUserAccessTokens", "GetAccessTokensForBucket"],
  });

  const [updateAccessToken] = useUpdateAccessTokenMutation({
    refetchQueries: [
      "GetUserAccessTokens",
      "GetAccessToken",
      "GetAccessTokensForBucket",
    ],
  });

  const updateToken = async () => {
    if (!newTokenName.trim()) {
      Alert.alert(t("common.error"), t("accessTokens.form.nameRequired"));
      return;
    }

    if (!tokenData?.id) {
      Alert.alert(t("common.error"), t("accessTokens.form.tokenNotFound"));
      return;
    }

    if (useScopes && selectedBucketIds.length === 0) {
      Alert.alert(t("common.error"), t("accessTokens.form.bucketRequired"));
      return;
    }

    try {
      setCreating(true);

      const updateData: any = {
        name: newTokenName.trim(),
      };

      // Update expiration
      if (expirationDays.trim()) {
        const days = parseInt(expirationDays);
        if (days > 0) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + days);
          updateData.expiresAt = expiresAt.toISOString();
        }
      } else {
        updateData.expiresAt = null;
      }

      // Update scopes
      if (useScopes && selectedBucketIds.length > 0) {
        updateData.scopes = selectedBucketIds.map(
          (bucketId) => `message-bucket-creation:${bucketId}`,
        );
      } else {
        updateData.scopes = [];
      }

      await updateAccessToken({
        variables: {
          tokenId: tokenData.id,
          input: updateData,
        },
      });

      router.back();
    } catch (error) {
      console.error("Error updating token:", error);
      Alert.alert(t("common.error"), t("accessTokens.form.updateError"));
    } finally {
      setCreating(false);
    }
  };

  const createToken = async () => {
    if (!newTokenName.trim()) {
      Alert.alert(t("common.error"), t("accessTokens.form.nameRequired"));
      return;
    }

    if (useScopes && selectedBucketIds.length === 0) {
      Alert.alert(t("common.error"), t("accessTokens.form.bucketRequired"));
      return;
    }

    try {
      setCreating(true);
      const createData: CreateAccessTokenDto = {
        name: newTokenName.trim(),
        storeToken,
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

      // Add scopes if enabled
      if (useScopes && selectedBucketIds.length > 0) {
        createData.scopes = selectedBucketIds.map(
          (bucketId) => `message-bucket-creation:${bucketId}`,
        );
      }

      const response = await createAccessToken({
        variables: { input: createData },
      });

      if (response.data?.createAccessToken) {
        const token = response.data.createAccessToken.token;

        // Store token info for dialog
        setCreatedToken(token);
        setWasTokenStored(storeToken);
        setShowSuccessDialog(true);

        // Reset form
        setNewTokenName("");
        setExpirationDays("");
        setSelectedBucketIds([]);
        setUseScopes(false);
      }
    } catch (error) {
      console.error("Error creating token:", error);
      Alert.alert(t("common.error"), t("accessTokens.form.createError"));
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setNewTokenName("");
    setExpirationDays("");
    setSelectedBucketIds([]);
    setUseScopes(false);
    setStoreToken(true);
  };

  const isFormValid =
    newTokenName.trim() && (!useScopes || selectedBucketIds.length > 0);

  return (
    <View>
      <Card style={styles.formContainer} elevation={0}>
        <Card.Content>
          {editMode && tokenData?.token && (
            <View style={styles.inputGroup}>
              <Text variant="titleMedium" style={styles.inputLabel}>
                Token
              </Text>
              <View style={styles.tokenDisplayContainer}>
                <TextInput
                  mode="outlined"
                  value={tokenData.token}
                  editable={false}
                  style={styles.tokenReadonly}
                  multiline
                />
                <CopyButton
                  text={tokenData.token}
                  size={20}
                  label={t("accessTokens.form.copy")}
                  successLabel={t("common.copied")}
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text variant="titleMedium" style={styles.inputLabel}>
              {t("accessTokens.form.tokenName")}
            </Text>
            <TextInput
              mode="outlined"
              value={newTokenName}
              onChangeText={setNewTokenName}
              placeholder={t("accessTokens.form.tokenNamePlaceholder")}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </View>

          {/* Expiration - Editable in both modes */}
          {!isWatchToken && (
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
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              <Text variant="bodySmall" style={styles.inputHint}>
                {t("accessTokens.form.expirationHint")}
              </Text>
            </View>
          )}

          {!editMode && (
            <View
              style={[
                styles.switchRow,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <View style={styles.switchLabelContainer}>
                <Text
                  style={[
                    styles.switchLabel,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {t("accessTokens.form.storeToken")}
                </Text>
                <Text
                  style={[
                    styles.switchDescription,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {t("accessTokens.form.storeTokenHint")}
                </Text>
              </View>
              <Switch
                value={storeToken}
                onValueChange={setStoreToken}
                trackColor={{
                  false: theme.colors.outline,
                  true: theme.colors.primary,
                }}
              />
            </View>
          )}

          {/* Scopes - Show in both modes */}
          {!isWatchToken && (
            <View
              style={[
                styles.switchRow,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <View style={styles.switchLabelContainer}>
                <Text
                  style={[
                    styles.switchLabel,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {t("accessTokens.form.limitToBuckets")}
                </Text>
                <Text
                  style={[
                    styles.switchDescription,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {t("accessTokens.form.limitToBucketsHint")}
                </Text>
              </View>
              <Switch
                value={useScopes}
                onValueChange={(value) => {
                  setUseScopes(value);
                  if (!value) {
                    setSelectedBucketIds([]);
                  }
                }}
                trackColor={{
                  false: theme.colors.outline,
                  true: theme.colors.primary,
                }}
              />
            </View>
          )}

          {useScopes && !isWatchToken && (
            <View style={styles.inputGroup}>
              <MultiBucketSelector
                label={t("accessTokens.form.selectBuckets")}
                selectedBucketIds={selectedBucketIds}
                onBucketsChange={setSelectedBucketIds}
              />
            </View>
          )}

          {!isWatchToken && (
            <View style={styles.buttonRow}>
              {!editMode ? (
                <>
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
                </>
              ) : (
                <Button
                  mode="contained"
                  onPress={updateToken}
                  disabled={!isFormValid || creating}
                  style={styles.createButton}
                >
                  {creating ? t("common.saving") : t("common.save")}
                </Button>
              )}
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Success Dialog */}
      <Portal>
        <Dialog
          visible={showSuccessDialog}
          onDismiss={() => {
            setShowSuccessDialog(false);
            router.back();
          }}
        >
          <Dialog.Title>
            {t("accessTokens.form.tokenCreatedTitle")}
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogMessage}>
              {wasTokenStored
                ? t("accessTokens.form.tokenCreatedStoredMessage")
                : t("accessTokens.form.tokenCreatedNotStoredMessage")}
            </Text>

            {/* Token display with copy button */}
            <View style={styles.tokenContainer}>
              <Text variant="labelMedium" style={styles.tokenLabel}>
                {t("accessTokens.form.yourToken")}
              </Text>
              <View style={styles.tokenDisplayBox}>
                <Text
                  variant="bodySmall"
                  style={[
                    styles.tokenText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                  selectable
                >
                  {createdToken}
                </Text>
              </View>
              <CopyButton
                text={createdToken}
                label={t("accessTokens.form.copy")}
                successLabel={t("accessTokens.form.copied")}
                style={styles.copyButton}
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setShowSuccessDialog(false);
                router.back();
              }}
            >
              {t("common.ok")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    paddingHorizontal: 0,
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
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
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
  tokenDisplayContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tokenReadonly: {
    flex: 1,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
  },
  dialogMessage: {
    marginBottom: 16,
    lineHeight: 20,
  },
  tokenContainer: {
    marginTop: 8,
  },
  tokenLabel: {
    marginBottom: 8,
  },
  tokenDisplayBox: {
    padding: 12,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 8,
    marginBottom: 12,
  },
  tokenText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    lineHeight: 18,
  },
  copyButton: {
    marginTop: 4,
  },
});
