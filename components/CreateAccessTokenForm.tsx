import {
  AccessTokenListDto,
  CreateAccessTokenDto,
  GetUserAccessTokensDocument,
  GetUserAccessTokensQuery,
  useCreateAccessTokenMutation,
  useGetBucketsQuery,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Platform, StyleSheet, Switch, View } from "react-native";
import * as Clipboard from 'expo-clipboard';
import PaperScrollView from "@/components/ui/PaperScrollView";
import CopyButton from "@/components/ui/CopyButton";
import BucketSelector from "@/components/BucketSelector";
import {
  Button,
  Card,
  Chip,
  Dialog,
  Icon,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

interface CreateAccessTokenFormProps {
  editMode?: boolean;
  tokenData?: AccessTokenListDto;
}

export default function CreateAccessTokenForm({
  editMode = false,
  tokenData,
}: CreateAccessTokenFormProps) {
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
  const [storeToken, setStoreToken] = useState(true);
  const [useScopes, setUseScopes] = useState(false);
  const [selectedBucketId, setSelectedBucketId] = useState<string>("");

  const { data: bucketsData } = useGetBucketsQuery();

  // Initialize form in edit mode
  React.useEffect(() => {
    if (editMode && tokenData) {
      setNewTokenName(tokenData.name);
      if (tokenData.token) {
        setNewToken(tokenData.token);
      }
    }
  }, [editMode, tokenData]);

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
                  token: data.createAccessToken.tokenStored ? data.createAccessToken.token : null,
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

    if (useScopes && !selectedBucketId) {
      setErrorMessage(t("accessTokens.form.bucketRequired"));
      setShowErrorDialog(true);
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
      if (useScopes && selectedBucketId) {
        createData.scopes = [`message-bucket-creation:${selectedBucketId}`];
      }

      const response = await createAccessToken({
        variables: { input: createData },
      });

      if (response.data?.createAccessToken) {
        setNewToken(response.data.createAccessToken.token);
        setShowTokenModal(true);
        setNewTokenName("");
        setExpirationDays("");
        setSelectedBucketId("");
        setUseScopes(false);
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
    setSelectedBucketId("");
    setUseScopes(false);
    setStoreToken(true);
  };

  const isFormValid = newTokenName.trim() && (!useScopes || selectedBucketId);

  return (
    <PaperScrollView>
      <Card style={styles.formContainer} elevation={0}>
        <Card.Content>
          {editMode && newToken && (
            <View style={styles.inputGroup}>
              <Text variant="titleMedium" style={styles.inputLabel}>
                Token
              </Text>
              <View style={styles.tokenDisplayContainer}>
                <TextInput
                  mode="outlined"
                  value={newToken}
                  editable={false}
                  style={styles.tokenReadonly}
                  multiline
                />
                <CopyButton
                  text={newToken}
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
              editable={!editMode}
            />
          </View>

          {!editMode && (
            <>
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

              <View
                style={[
                  styles.switchRow,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                <View style={styles.switchLabelContainer}>
                  <Text style={[styles.switchLabel, { color: theme.colors.onSurface }]}>
                    {t("accessTokens.form.storeToken")}
                  </Text>
                  <Text
                    style={[styles.switchDescription, { color: theme.colors.onSurfaceVariant }]}
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

              <View
                style={[
                  styles.switchRow,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                <View style={styles.switchLabelContainer}>
                  <Text style={[styles.switchLabel, { color: theme.colors.onSurface }]}>
                    {t("accessTokens.form.limitToBucket")}
                  </Text>
                  <Text
                    style={[styles.switchDescription, { color: theme.colors.onSurfaceVariant }]}
                  >
                    {t("accessTokens.form.limitToBucketHint")}
                  </Text>
                </View>
                <Switch
                  value={useScopes}
                  onValueChange={(value) => {
                    setUseScopes(value);
                    if (!value) {
                      setSelectedBucketId("");
                    }
                  }}
                  trackColor={{
                    false: theme.colors.outline,
                    true: theme.colors.primary,
                  }}
                />
              </View>

              {useScopes && (
                <View style={styles.inputGroup}>
                  <Text variant="titleMedium" style={styles.inputLabel}>
                    {t("accessTokens.form.selectBucket")}
                  </Text>
                  <BucketSelector
                    selectedBucketId={selectedBucketId}
                    onBucketChange={setSelectedBucketId}
                    buckets={bucketsData?.buckets || []}
                  />
                </View>
              )}
            </>
          )}

          {!editMode ? (
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
          ) : (
            <View style={styles.buttonRow}>
              <Button
                mode="contained"
                onPress={() => router.back()}
                style={styles.createButton}
              >
                {t("common.close")}
              </Button>
            </View>
          )}
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
