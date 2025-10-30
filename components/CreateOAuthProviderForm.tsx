import {
  AllOAuthProvidersDocument,
  AllOAuthProvidersQuery,
  CreateOAuthProviderDto,
  OAuthProviderFragment,
  OAuthProviderType,
  UpdateOAuthProviderDto,
  useCreateOAuthProviderMutation,
  useOAuthProviderQuery,
  useUpdateOAuthProviderMutation,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Button, Card, Text, TextInput, useTheme } from "react-native-paper";
import ColorPicker, { ColorPickerRef } from "./ColorPicker";
import PaperScrollView from "./ui/PaperScrollView";

interface CreateOAuthProviderFormProps {
  providerId?: string;
}

export default function CreateOAuthProviderForm({
  providerId,
}: CreateOAuthProviderFormProps) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();

  // Load provider data if editing
  const {
    data: providerData,
    loading,
    refetch,
    error,
  } = useOAuthProviderQuery({
    variables: { id: providerId || "" },
    skip: !providerId,
  });

  const provider = providerData?.oauthProvider;
  const isEditing = !!providerId;

  // GraphQL mutations
  const [createOAuthProvider, { loading: creating }] =
    useCreateOAuthProviderMutation();
  const [updateOAuthProvider, { loading: updating }] =
    useUpdateOAuthProviderMutation();

  const isSaving = creating || updating;

  // Refs for color pickers
  const colorPickerRef = useRef<ColorPickerRef>(null);
  const textColorPickerRef = useRef<ColorPickerRef>(null);

  // State for showing/hiding sensitive data
  const [showClientSecret, setShowClientSecret] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    providerId: "",
    clientId: "",
    clientSecret: "",
    scopes: "",
    iconUrl: "",
    color: "",
    textColor: "",
    authorizationUrl: "",
    tokenUrl: "",
    userInfoUrl: "",
    isEnabled: true,
  });

  // Load provider data when editing
  useEffect(() => {
    if (provider && isEditing) {
      setFormData({
        name: provider.name || "",
        providerId: provider.providerId || "",
        clientId: provider.clientId || "",
        clientSecret: provider.clientSecret || "",
        scopes: provider.scopes?.join(", ") || "",
        iconUrl: provider.iconUrl || "",
        color: provider.color || "",
        textColor: provider.textColor || "",
        authorizationUrl: provider.authorizationUrl || "",
        tokenUrl: provider.tokenUrl || "",
        userInfoUrl: provider.userInfoUrl || "",
        isEnabled: provider.isEnabled ?? true,
      });
    }
  }, [provider, isEditing]);

  const handleSave = async () => {
    if (!formData.clientId.trim() || !formData.clientSecret.trim()) {
      Alert.alert(
        t("administration.oauthProviderForm.validation.error"),
        t("administration.oauthProviderForm.validation.fillRequiredFields")
      );
      return;
    }

    // Per i provider custom sono richiesti anche name e providerId
    if (
      isCustomProvider &&
      (!formData.name.trim() || !formData.providerId.trim())
    ) {
      Alert.alert(
        t("administration.oauthProviderForm.validation.error"),
        t("administration.oauthProviderForm.validation.fillAllRequiredFields")
      );
      return;
    }

    const scopesArray = formData.scopes
      .split(",")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    const input: UpdateOAuthProviderDto | CreateOAuthProviderDto = {
      name: formData.name,
      providerId: formData.providerId,
      clientId: formData.clientId,
      clientSecret: formData.clientSecret,
      scopes: scopesArray,
      iconUrl: formData.iconUrl || null,
      color: formData.color || null,
      textColor: formData.textColor || null,
      authorizationUrl: formData.authorizationUrl || null,
      tokenUrl: formData.tokenUrl || null,
      userInfoUrl: formData.userInfoUrl || null,
      isEnabled: formData.isEnabled,
      type: OAuthProviderType.Custom,
    };

    try {
      if (isEditing && provider) {
        // Update existing provider
        console.log("Updating provider", input);
        await updateOAuthProvider({
          variables: {
            id: provider.id,
            input,
          },
        });

        router.back();
      } else {
        // Create new provider
        await createOAuthProvider({
          variables: { input: input as CreateOAuthProviderDto },
          update: (cache, { data }) => {
            if (data?.createOAuthProvider) {
              const existingProviders = cache.readQuery<AllOAuthProvidersQuery>(
                {
                  query: AllOAuthProvidersDocument,
                }
              );
              if (existingProviders?.allOAuthProviders) {
                cache.writeQuery({
                  query: AllOAuthProvidersDocument,
                  data: {
                    allOAuthProviders: [
                      ...existingProviders.allOAuthProviders,
                      data.createOAuthProvider,
                    ] satisfies OAuthProviderFragment[],
                  },
                });
              }
            }
          },
        });

        router.back();
      }
    } catch (error) {
      console.error("Error saving OAuth provider:", error);
      Alert.alert(
        t("administration.oauthProviderForm.validation.error"),
        "Failed to save OAuth provider. Please try again."
      );
    }
  };

  const isCustomProvider =
    !provider || provider?.type === OAuthProviderType.Custom;

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <PaperScrollView
      loading={loading}
      error={!!error}
      onRetry={handleRefresh}
      onRefresh={isEditing ? handleRefresh : undefined}
    >
      <View>
        {isEditing && provider && (
          <Card style={styles.providerHeader} mode="outlined">
            <Card.Content>
              <Text variant="headlineSmall" style={styles.providerHeaderTitle}>
                {provider.name}
              </Text>
            </Card.Content>
          </Card>
        )}

        {isCustomProvider && (
          <Card style={styles.section} mode="outlined">
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {t("administration.oauthProviderForm.basicInformation")}
              </Text>

              <View style={styles.formGroup}>
                <Text variant="titleMedium" style={styles.label}>
                  {t("administration.oauthProviderForm.nameRequired")}
                </Text>
                <TextInput
                  mode="outlined"
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholder={t(
                    "administration.oauthProviderForm.namePlaceholder"
                  )}
                />
              </View>

              <View style={styles.formGroup}>
                <Text variant="titleMedium" style={styles.label}>
                  {t("administration.oauthProviderForm.providerIdRequired")}
                </Text>
                <TextInput
                  mode="outlined"
                  value={formData.providerId}
                  onChangeText={(text) =>
                    setFormData({ ...formData, providerId: text })
                  }
                  placeholder={t(
                    "administration.oauthProviderForm.providerIdPlaceholder"
                  )}
                  autoCapitalize="none"
                />
              </View>
            </Card.Content>
          </Card>
        )}

        <Card style={styles.section} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t("administration.oauthProviderForm.oauthConfiguration")}
            </Text>

            <View style={styles.formGroup}>
              <Text variant="titleMedium" style={styles.label}>
                {t("administration.oauthProviderForm.clientIdRequired")}
              </Text>
              <TextInput
                mode="outlined"
                value={formData.clientId}
                onChangeText={(text) =>
                  setFormData({ ...formData, clientId: text })
                }
                placeholder={t(
                  "administration.oauthProviderForm.clientIdPlaceholder"
                )}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text variant="titleMedium" style={styles.label}>
                {t("administration.oauthProviderForm.clientSecretRequired")}
              </Text>
              <TextInput
                mode="outlined"
                value={formData.clientSecret}
                onChangeText={(text) =>
                  setFormData({ ...formData, clientSecret: text })
                }
                placeholder={t(
                  "administration.oauthProviderForm.clientSecretPlaceholder"
                )}
                multiline={showClientSecret}
                secureTextEntry={!showClientSecret}
                autoCapitalize="none"
                right={
                  <TextInput.Icon
                    icon={showClientSecret ? "eye-off" : "eye"}
                    onPress={() => setShowClientSecret(!showClientSecret)}
                  />
                }
              />
            </View>

            {isCustomProvider && (
              <View style={styles.formGroup}>
                <Text variant="titleMedium" style={styles.label}>
                  {t("administration.oauthProviderForm.scopes")}
                </Text>
                <TextInput
                  mode="outlined"
                  value={formData.scopes}
                  onChangeText={(text) =>
                    setFormData({ ...formData, scopes: text })
                  }
                  placeholder={t(
                    "administration.oauthProviderForm.scopesPlaceholder"
                  )}
                  autoCapitalize="none"
                />
              </View>
            )}
          </Card.Content>
        </Card>

        {isCustomProvider && (
          <Card style={styles.section} mode="outlined">
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {t("administration.oauthProviderForm.customUrls")}
              </Text>

              <View style={styles.formGroup}>
                <Text variant="titleMedium" style={styles.label}>
                  {t("administration.oauthProviderForm.authorizationUrl")}
                </Text>
                <TextInput
                  mode="outlined"
                  value={formData.authorizationUrl}
                  onChangeText={(text) =>
                    setFormData({ ...formData, authorizationUrl: text })
                  }
                  placeholder={t(
                    "administration.oauthProviderForm.authorizationUrlPlaceholder"
                  )}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text variant="titleMedium" style={styles.label}>
                  {t("administration.oauthProviderForm.tokenUrl")}
                </Text>
                <TextInput
                  mode="outlined"
                  value={formData.tokenUrl}
                  multiline
                  onChangeText={(text) =>
                    setFormData({ ...formData, tokenUrl: text })
                  }
                  placeholder={t(
                    "administration.oauthProviderForm.tokenUrlPlaceholder"
                  )}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text variant="titleMedium" style={styles.label}>
                  {t("administration.oauthProviderForm.userInfoUrl")}
                </Text>
                <TextInput
                  mode="outlined"
                  value={formData.userInfoUrl}
                  onChangeText={(text) =>
                    setFormData({ ...formData, userInfoUrl: text })
                  }
                  placeholder={t(
                    "administration.oauthProviderForm.userInfoUrlPlaceholder"
                  )}
                  autoCapitalize="none"
                />
              </View>
            </Card.Content>
          </Card>
        )}

        {isCustomProvider && (
          <Card style={styles.section} mode="outlined">
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {t("administration.oauthProviderForm.appearance")}
              </Text>

              <View style={styles.formGroup}>
                <Text variant="titleMedium" style={styles.label}>
                  {t("administration.oauthProviderForm.iconUrl")}
                </Text>
                <TextInput
                  mode="outlined"
                  value={formData.iconUrl}
                  multiline
                  onChangeText={(text) =>
                    setFormData({ ...formData, iconUrl: text })
                  }
                  placeholder={t(
                    "administration.oauthProviderForm.iconUrlPlaceholder"
                  )}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text variant="titleMedium" style={styles.label}>
                  {t("administration.oauthProviderForm.color")}
                </Text>
                <Button
                  mode="outlined"
                  style={styles.colorInput}
                  onPress={() => colorPickerRef.current?.openModal()}
                  contentStyle={styles.colorInputContent}
                >
                  <View
                    style={[
                      styles.colorPreview,
                      { backgroundColor: formData.color || "#4285f4" },
                    ]}
                  />
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.colorInputText,
                      {
                        color: formData.color
                          ? theme.colors.onSurface
                          : theme.colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    {formData.color ||
                      t("administration.oauthProviderForm.colorPlaceholder")}
                  </Text>
                </Button>
              </View>

              <View style={styles.formGroup}>
                <Text variant="titleMedium" style={styles.label}>
                  {t("administration.oauthProviderForm.textColor")}
                </Text>
                <Button
                  mode="outlined"
                  style={styles.colorInput}
                  onPress={() => textColorPickerRef.current?.openModal()}
                  contentStyle={styles.colorInputContent}
                >
                  <View
                    style={[
                      styles.colorPreview,
                      { backgroundColor: formData.textColor || "#FFFFFF" },
                    ]}
                  />
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.colorInputText,
                      {
                        color: formData.textColor
                          ? theme.colors.onSurface
                          : theme.colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    {formData.textColor ||
                      t(
                        "administration.oauthProviderForm.textColorPlaceholder"
                      )}
                  </Text>
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Hidden Color Pickers */}
        <ColorPicker
          ref={colorPickerRef}
          selectedColor={formData.color || "#4285f4"}
          onColorChange={(color) => setFormData({ ...formData, color })}
        />
        <ColorPicker
          ref={textColorPickerRef}
          selectedColor={formData.textColor || "#FFFFFF"}
          onColorChange={(textColor) => setFormData({ ...formData, textColor })}
        />

        {/* Save Button */}
        <View style={styles.saveButtonContainer}>
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.saveButtonFinal}
            disabled={isSaving}
            loading={isSaving}
          >
            {isSaving
              ? isEditing
                ? t("administration.oauthProviderForm.updating")
                : t("administration.oauthProviderForm.creating")
              : t("administration.oauthProviderForm.save")}
          </Button>
        </View>

        {/* Add minimal bottom padding */}
        <View style={{ height: 8 }} />
      </View>
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    opacity: 0.7,
  },
  providerHeader: {
    marginBottom: 24,
  },
  providerHeaderTitle: {
    textAlign: "center",
    marginBottom: 4,
  },
  providerHeaderSubtitle: {
    textAlign: "center",
    opacity: 0.7,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  providerInfo: {
    marginBottom: 12,
    opacity: 0.7,
    fontStyle: "italic",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  colorInput: {
    justifyContent: "flex-start",
  },
  colorInputContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  colorInputText: {
    flex: 1,
  },
  saveButtonContainer: {
    marginTop: 16,
    marginBottom: 0,
  },
  saveButtonFinal: {
    borderRadius: 12,
    minHeight: 50,
  },
});
