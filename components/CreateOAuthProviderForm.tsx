import { Colors } from "@/constants/Colors";
import {
  CreateOAuthProviderDto,
  OAuthProviderFragment,
  OAuthProviderType,
  UpdateOAuthProviderDto,
  useCreateOAuthProviderMutation,
  useOAuthProviderQuery,
  useUpdateOAuthProviderMutation,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ColorPicker, { ColorPickerRef } from "./ColorPicker";
import { ThemedText } from "./ThemedText";

interface CreateOAuthProviderFormProps {
  showTitle?: boolean;
  providerId?: string;
}

export default function CreateOAuthProviderForm({
  showTitle,
  providerId,
}: CreateOAuthProviderFormProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { t } = useI18n();

  // Load provider data if editing
  const { data: providerData, loading: loadingProvider } = useOAuthProviderQuery({
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
  const isLoading = loadingProvider;

  // Refs for color pickers
  const colorPickerRef = useRef<ColorPickerRef>(null);
  const textColorPickerRef = useRef<ColorPickerRef>(null);

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
    // Per i provider non-custom (GitHub, Google) sono richiesti solo clientId e clientSecret
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
          refetchQueries: ["AllOAuthProviders"],
        });

        Alert.alert(
          t("administration.oauthProviderForm.success.title"),
          t("administration.oauthProviderForm.success.updated"),
          [
            {
              text: t("administration.oauthProviderForm.success.ok"),
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        // Create new provider
        await createOAuthProvider({
          variables: { input: input as CreateOAuthProviderDto },
          refetchQueries: ["AllOAuthProviders"],
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

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors[colorScheme ?? "light"].tint} />
        <ThemedText style={styles.loadingText}>
          {t("common.loading")}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showTitle && (
        <View style={styles.header}>
          <ThemedText style={styles.title}>
            {isEditing
              ? t("administration.oauthProviderForm.editTitle")
              : t("administration.oauthProviderForm.createTitle")}
          </ThemedText>
          <View style={styles.saveButton} />
        </View>
      )}

      <View style={styles.content}>
        {isCustomProvider && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>
              {t("administration.oauthProviderForm.basicInformation")}
            </ThemedText>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>
                {t("administration.oauthProviderForm.nameRequired")}
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: Colors[colorScheme ?? "light"].background,
                    borderColor: Colors[colorScheme ?? "light"].border,
                    color: Colors[colorScheme ?? "light"].text,
                  },
                ]}
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
                placeholder={t(
                  "administration.oauthProviderForm.namePlaceholder"
                )}
                placeholderTextColor={
                  Colors[colorScheme ?? "light"].textSecondary
                }
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>
                {t("administration.oauthProviderForm.providerIdRequired")}
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: Colors[colorScheme ?? "light"].background,
                    borderColor: Colors[colorScheme ?? "light"].border,
                    color: Colors[colorScheme ?? "light"].text,
                  },
                ]}
                value={formData.providerId}
                onChangeText={(text) =>
                  setFormData({ ...formData, providerId: text })
                }
                placeholder={t(
                  "administration.oauthProviderForm.providerIdPlaceholder"
                )}
                placeholderTextColor={
                  Colors[colorScheme ?? "light"].textSecondary
                }
                autoCapitalize="none"
              />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            {t("administration.oauthProviderForm.oauthConfiguration")}
          </ThemedText>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>
              {t("administration.oauthProviderForm.clientIdRequired")}
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: Colors[colorScheme ?? "light"].background,
                  borderColor: Colors[colorScheme ?? "light"].border,
                  color: Colors[colorScheme ?? "light"].text,
                },
              ]}
              value={formData.clientId}
              onChangeText={(text) =>
                setFormData({ ...formData, clientId: text })
              }
              placeholder={t(
                "administration.oauthProviderForm.clientIdPlaceholder"
              )}
              placeholderTextColor={
                Colors[colorScheme ?? "light"].textSecondary
              }
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>
              {t("administration.oauthProviderForm.clientSecretRequired")}
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: Colors[colorScheme ?? "light"].background,
                  borderColor: Colors[colorScheme ?? "light"].border,
                  color: Colors[colorScheme ?? "light"].text,
                },
              ]}
              value={formData.clientSecret}
              onChangeText={(text) =>
                setFormData({ ...formData, clientSecret: text })
              }
              placeholder={t(
                "administration.oauthProviderForm.clientSecretPlaceholder"
              )}
              placeholderTextColor={
                Colors[colorScheme ?? "light"].textSecondary
              }
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {isCustomProvider && (
            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>
                {t("administration.oauthProviderForm.scopes")}
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: Colors[colorScheme ?? "light"].background,
                    borderColor: Colors[colorScheme ?? "light"].border,
                    color: Colors[colorScheme ?? "light"].text,
                  },
                ]}
                value={formData.scopes}
                onChangeText={(text) =>
                  setFormData({ ...formData, scopes: text })
                }
                placeholder={t(
                  "administration.oauthProviderForm.scopesPlaceholder"
                )}
                placeholderTextColor={
                  Colors[colorScheme ?? "light"].textSecondary
                }
                autoCapitalize="none"
              />
            </View>
          )}
        </View>

        {isCustomProvider && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>
              {t("administration.oauthProviderForm.customUrls")}
            </ThemedText>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>
                {t("administration.oauthProviderForm.authorizationUrl")}
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: Colors[colorScheme ?? "light"].background,
                    borderColor: Colors[colorScheme ?? "light"].border,
                    color: Colors[colorScheme ?? "light"].text,
                  },
                ]}
                value={formData.authorizationUrl}
                onChangeText={(text) =>
                  setFormData({ ...formData, authorizationUrl: text })
                }
                placeholder={t(
                  "administration.oauthProviderForm.authorizationUrlPlaceholder"
                )}
                placeholderTextColor={
                  Colors[colorScheme ?? "light"].textSecondary
                }
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>
                {t("administration.oauthProviderForm.tokenUrl")}
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: Colors[colorScheme ?? "light"].background,
                    borderColor: Colors[colorScheme ?? "light"].border,
                    color: Colors[colorScheme ?? "light"].text,
                  },
                ]}
                value={formData.tokenUrl}
                onChangeText={(text) =>
                  setFormData({ ...formData, tokenUrl: text })
                }
                placeholder={t(
                  "administration.oauthProviderForm.tokenUrlPlaceholder"
                )}
                placeholderTextColor={
                  Colors[colorScheme ?? "light"].textSecondary
                }
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>
                {t("administration.oauthProviderForm.userInfoUrl")}
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: Colors[colorScheme ?? "light"].background,
                    borderColor: Colors[colorScheme ?? "light"].border,
                    color: Colors[colorScheme ?? "light"].text,
                  },
                ]}
                value={formData.userInfoUrl}
                onChangeText={(text) =>
                  setFormData({ ...formData, userInfoUrl: text })
                }
                placeholder={t(
                  "administration.oauthProviderForm.userInfoUrlPlaceholder"
                )}
                placeholderTextColor={
                  Colors[colorScheme ?? "light"].textSecondary
                }
                autoCapitalize="none"
              />
            </View>
          </View>
        )}

        {isCustomProvider && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>
              {t("administration.oauthProviderForm.appearance")}
            </ThemedText>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>
                {t("administration.oauthProviderForm.iconUrl")}
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: Colors[colorScheme ?? "light"].background,
                    borderColor: Colors[colorScheme ?? "light"].border,
                    color: Colors[colorScheme ?? "light"].text,
                  },
                ]}
                value={formData.iconUrl}
                onChangeText={(text) =>
                  setFormData({ ...formData, iconUrl: text })
                }
                placeholder={t(
                  "administration.oauthProviderForm.iconUrlPlaceholder"
                )}
                placeholderTextColor={
                  Colors[colorScheme ?? "light"].textSecondary
                }
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>
                {t("administration.oauthProviderForm.color")}
              </ThemedText>
              <TouchableOpacity
                style={[
                  styles.colorInput,
                  {
                    backgroundColor: Colors[colorScheme ?? "light"].background,
                    borderColor: Colors[colorScheme ?? "light"].border,
                  },
                ]}
                onPress={() => colorPickerRef.current?.openModal()}
              >
                <View
                  style={[
                    styles.colorPreview,
                    { backgroundColor: formData.color || "#4285f4" },
                  ]}
                />
                <ThemedText
                  style={[
                    styles.colorInputText,
                    {
                      color: formData.color
                        ? Colors[colorScheme ?? "light"].text
                        : Colors[colorScheme ?? "light"].textSecondary,
                    },
                  ]}
                >
                  {formData.color || t("administration.oauthProviderForm.colorPlaceholder")}
                </ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>
                {t("administration.oauthProviderForm.textColor")}
              </ThemedText>
              <TouchableOpacity
                style={[
                  styles.colorInput,
                  {
                    backgroundColor: Colors[colorScheme ?? "light"].background,
                    borderColor: Colors[colorScheme ?? "light"].border,
                  },
                ]}
                onPress={() => textColorPickerRef.current?.openModal()}
              >
                <View
                  style={[
                    styles.colorPreview,
                    { backgroundColor: formData.textColor || "#FFFFFF" },
                  ]}
                />
                <ThemedText
                  style={[
                    styles.colorInputText,
                    {
                      color: formData.textColor
                        ? Colors[colorScheme ?? "light"].text
                        : Colors[colorScheme ?? "light"].textSecondary,
                    },
                  ]}
                >
                  {formData.textColor || t("administration.oauthProviderForm.textColorPlaceholder")}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
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
          <TouchableOpacity
            onPress={handleSave}
            style={[
              styles.saveButtonFinal,
              {
                backgroundColor: Colors[colorScheme ?? "light"].tint,
                opacity: isSaving ? 0.6 : 1,
              },
            ]}
            disabled={isSaving}
          >
            <ThemedText
              style={[
                styles.saveButtonTextFinal,
                { color: Colors[colorScheme ?? "light"].background },
              ]}
            >
              {isSaving
                ? isEditing
                  ? t("administration.oauthProviderForm.updating")
                  : t("administration.oauthProviderForm.creating")
                : t("administration.oauthProviderForm.save")}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Add minimal bottom padding */}
        <View style={{ height: 8 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  colorInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
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
    fontSize: 16,
  },
  typeButtons: {
    flexDirection: "row",
    gap: 8,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  typeDescription: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  descriptionText: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
  },
  saveButtonContainer: {
    marginTop: 16,
    marginBottom: 0,
  },
  saveButtonFinal: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  saveButtonTextFinal: {
    fontSize: 16,
    fontWeight: "600",
  },
});
