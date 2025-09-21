import { Colors } from "@/constants/Colors";
import {
  CreateAccessTokenDto,
  useCreateAccessTokenMutation,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

interface CreateAccessTokenFormProps {
  showTitle?: boolean;
}

export default function CreateAccessTokenForm({
  showTitle,
}: CreateAccessTokenFormProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const [creating, setCreating] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [newToken, setNewToken] = useState<string>("");
  const [newTokenName, setNewTokenName] = useState("");
  const [expirationDays, setExpirationDays] = useState("");

  const [createAccessToken] = useCreateAccessTokenMutation();

  const createToken = async () => {
    if (!newTokenName.trim()) {
      Alert.alert(t("common.error"), t("accessTokens.form.nameRequired"));
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
        refetchQueries: ["GetUserAccessTokens"], // Aggiorna automaticamente la lista
      });

      if (response.data?.createAccessToken) {
        setNewToken(response.data.createAccessToken.token);
        setShowTokenModal(true);
        setNewTokenName("");
        setExpirationDays("");
      }
    } catch (error) {
      console.error("Error creating token:", error);
      Alert.alert(t("common.error"), t("accessTokens.form.createError"));
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert(
      t("accessTokens.form.copied"),
      t("accessTokens.form.tokenCopied")
    );
  };

  const resetForm = () => {
    setNewTokenName("");
    setExpirationDays("");
  };

  const isFormValid = newTokenName.trim();

  return (
    <ThemedView style={styles.container}>
      {showTitle && (
        <View style={styles.header}>
          <Ionicons
            name="key-outline"
            size={48}
            color={Colors[colorScheme ?? "light"].tint}
          />
          <ThemedText style={styles.title}>
            {t("accessTokens.form.title")}
          </ThemedText>
          <ThemedText style={styles.description}>
            {t("accessTokens.form.description")}
          </ThemedText>
        </View>
      )}

      <ThemedView
        style={[
          styles.formContainer,
          { backgroundColor: Colors[colorScheme ?? "light"].backgroundCard },
        ]}
      >
        <View style={styles.inputGroup}>
          <ThemedText style={styles.inputLabel}>
            {t("accessTokens.form.tokenName")}
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
            value={newTokenName}
            onChangeText={setNewTokenName}
            placeholder={t("accessTokens.form.tokenNamePlaceholder")}
            placeholderTextColor={Colors[colorScheme ?? "light"].tabIconDefault}
            autoFocus
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.inputLabel}>
            {t("accessTokens.form.expiration")}
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
            value={expirationDays}
            onChangeText={setExpirationDays}
            placeholder={t("accessTokens.form.expirationPlaceholder")}
            placeholderTextColor={Colors[colorScheme ?? "light"].tabIconDefault}
            keyboardType="numeric"
          />
          <ThemedText style={styles.inputHint}>
            {t("accessTokens.form.expirationHint")}
          </ThemedText>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.createButton,
              { backgroundColor: Colors[colorScheme ?? "light"].tint },
              (!isFormValid || creating) && styles.buttonDisabled,
            ]}
            onPress={createToken}
            disabled={!isFormValid || creating}
          >
            <ThemedText style={styles.createButtonText}>
              {creating
                ? t("accessTokens.form.creating")
                : t("accessTokens.form.createButton")}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.resetButton,
              { borderColor: Colors[colorScheme ?? "light"].tint },
            ]}
            onPress={resetForm}
            disabled={creating}
          >
            <ThemedText
              style={[
                styles.resetButtonText,
                { color: Colors[colorScheme ?? "light"].tint },
              ]}
            >
              {t("common.reset")}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>

      {/* Token Display Modal */}
      <Modal
        visible={showTokenModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowTokenModal(false)}
      >
        <View style={styles.tokenModalOverlay}>
          <ThemedView style={styles.tokenModalContainer}>
            <View style={styles.tokenModalHeader}>
              <Ionicons
                name="checkmark-circle"
                size={48}
                color={Colors[colorScheme ?? "light"].tint}
              />
              <ThemedText style={styles.tokenModalTitle}>
                {t("accessTokens.form.tokenCreatedTitle")}
              </ThemedText>
              <ThemedText style={styles.tokenModalSubtitle}>
                {t("accessTokens.form.tokenCreatedSubtitle")}
              </ThemedText>
            </View>

            <View
              style={[
                styles.tokenContainer,
                {
                  backgroundColor:
                    Colors[colorScheme ?? "light"].backgroundSecondary,
                },
              ]}
            >
              <Text
                style={[
                  styles.tokenText,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
              >
                {newToken}
              </Text>
              <TouchableOpacity
                style={[
                  styles.copyButton,
                  { backgroundColor: Colors[colorScheme ?? "light"].tint },
                ]}
                onPress={() => copyToClipboard(newToken)}
              >
                <Ionicons name="copy" size={20} color="white" />
                <Text style={styles.copyButtonText}>
                  {t("accessTokens.form.copy")}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.doneButton,
                { backgroundColor: Colors[colorScheme ?? "light"].tint },
              ]}
              onPress={() => {
                setShowTokenModal(false);
                router.back();
              }}
            >
              <ThemedText style={styles.doneButtonText}>
                {t("accessTokens.form.done")}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 8,
    textAlign: "center",
  },
  formContainer: {
    padding: 20,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputHint: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  createButton: {
    // backgroundColor set dynamically
  },
  createButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  resetButton: {
    borderWidth: 1,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  tokenModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  tokenModalContainer: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  tokenModalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  tokenModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 12,
    textAlign: "center",
  },
  tokenModalSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 8,
    textAlign: "center",
  },
  tokenContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
    padding: 12,
    borderRadius: 8,
  },
  tokenText: {
    flex: 1,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  copyButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  doneButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  doneButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
