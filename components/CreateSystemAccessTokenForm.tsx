import { Colors } from "@/constants/Colors";
import {
  useCreateSystemAccessTokenMutation,
  useGetAllUsersQuery,
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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

interface CreateSystemAccessTokenFormProps {
  showTitle?: boolean;
}

export default function CreateSystemAccessTokenForm({
  showTitle,
}: CreateSystemAccessTokenFormProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const [creating, setCreating] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [newToken, setNewToken] = useState<string>("");
  const [showUserSelector, setShowUserSelector] = useState(false);

  // form fields
  const [maxCalls, setMaxCalls] = useState("0");
  const [expirationDays, setExpirationDays] = useState("");
  const [requesterId, setRequesterId] = useState("");
  const [description, setDescription] = useState("");

  const [createSystemToken] = useCreateSystemAccessTokenMutation();

  const { data: usersData, loading: usersLoading } = useGetAllUsersQuery();
  const users = usersData?.users || [];

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
    <ThemedView style={styles.container}>
      {showTitle && (
        <View style={styles.header}>
          <Ionicons
            name="key-outline"
            size={48}
            color={Colors[colorScheme ?? "light"].tint}
          />
          <ThemedText style={styles.title}>
            {t("systemAccessTokens.form.title")}
          </ThemedText>
          <ThemedText style={styles.description}>
            {t("systemAccessTokens.form.description")}
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
            {t("systemAccessTokens.form.maxCalls")}
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
            value={maxCalls}
            onChangeText={setMaxCalls}
            placeholder={t("systemAccessTokens.form.maxCallsPlaceholder")}
            placeholderTextColor={Colors[colorScheme ?? "light"].tabIconDefault}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.inputLabel}>
            {t("systemAccessTokens.form.expiration")}
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
            placeholder={t("systemAccessTokens.form.expirationPlaceholder")}
            placeholderTextColor={Colors[colorScheme ?? "light"].tabIconDefault}
            keyboardType="numeric"
          />
          <ThemedText style={styles.inputHint}>
            {t("systemAccessTokens.form.expirationHint")}
          </ThemedText>
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.inputLabel}>
            {t("systemAccessTokens.form.requester")}
          </ThemedText>
          <TouchableOpacity
            style={[
              styles.userSelectorButton,
              {
                backgroundColor: Colors[colorScheme ?? "light"].background,
                borderColor: Colors[colorScheme ?? "light"].border,
              },
            ]}
            onPress={() => setShowUserSelector(true)}
          >
            <ThemedText
              style={[
                styles.userSelectorText,
                {
                  color: requesterId
                    ? Colors[colorScheme ?? "light"].text
                    : Colors[colorScheme ?? "light"].tabIconDefault,
                },
              ]}
            >
              {requesterId
                ? users.find((u) => u.id === requesterId)?.username ||
                  users.find((u) => u.id === requesterId)?.email ||
                  requesterId
                : t("systemAccessTokens.form.requesterPlaceholder")}
            </ThemedText>
            <Ionicons
              name="chevron-down"
              size={20}
              color={Colors[colorScheme ?? "light"].tabIconDefault}
            />
          </TouchableOpacity>
          <ThemedText style={styles.inputHint}>
            {t("systemAccessTokens.form.requesterHint")}
          </ThemedText>
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.inputLabel}>
            {t("systemAccessTokens.form.description")}
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
            value={description}
            onChangeText={setDescription}
            placeholder={t("systemAccessTokens.form.descriptionPlaceholder")}
            placeholderTextColor={Colors[colorScheme ?? "light"].tabIconDefault}
          />
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
                ? t("systemAccessTokens.form.creating")
                : t("systemAccessTokens.form.createButton")}
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

      <Modal
        visible={showTokenModal}
        animationType="fade"
        transparent
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
                {t("systemAccessTokens.form.tokenCreatedTitle")}
              </ThemedText>
              <ThemedText style={styles.tokenModalSubtitle}>
                {t("systemAccessTokens.form.tokenCreatedSubtitle")}
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
                  {t("systemAccessTokens.form.copy")}
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
                {t("systemAccessTokens.form.done")}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>

      {/* User Selector Modal */}
      <Modal
        visible={showUserSelector}
        animationType="slide"
        transparent
        onRequestClose={() => setShowUserSelector(false)}
      >
        <View style={styles.userSelectorOverlay}>
          <ThemedView style={styles.userSelectorContainer}>
            <View style={styles.userSelectorHeader}>
              <ThemedText style={styles.userSelectorTitle}>
                {t("systemAccessTokens.form.selectUser")}
              </ThemedText>
              <TouchableOpacity onPress={() => setShowUserSelector(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={Colors[colorScheme ?? "light"].text}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.userList}>
              {usersLoading ? (
                <ThemedText style={styles.loadingText}>
                  {t("common.loading")}
                </ThemedText>
              ) : users.length === 0 ? (
                <ThemedText style={styles.noUsersText}>
                  {t("systemAccessTokens.form.noUsers")}
                </ThemedText>
              ) : (
                users.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={[
                      styles.userItem,
                      {
                        backgroundColor:
                          Colors[colorScheme ?? "light"].background,
                      },
                      requesterId === user.id && {
                        backgroundColor:
                          Colors[colorScheme ?? "light"].tint + "20",
                      },
                    ]}
                    onPress={() => {
                      setRequesterId(user.id);
                      setShowUserSelector(false);
                    }}
                  >
                    <View style={styles.userInfo}>
                      <ThemedText
                        style={[
                          styles.userName,
                          { color: Colors[colorScheme ?? "light"].text },
                        ]}
                      >
                        {user.username || user.email}
                      </ThemedText>
                      {user.firstName && user.lastName && (
                        <ThemedText
                          style={[
                            styles.userFullName,
                            {
                              color:
                                Colors[colorScheme ?? "light"].textSecondary,
                            },
                          ]}
                        >
                          {user.firstName} {user.lastName}
                        </ThemedText>
                      )}
                    </View>
                    {requesterId === user.id && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={Colors[colorScheme ?? "light"].tint}
                      />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: { alignItems: "center", marginBottom: 24 },
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
  inputGroup: { marginBottom: 24 },
  inputLabel: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  inputHint: { fontSize: 12, opacity: 0.7, marginTop: 4 },
  userSelectorButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userSelectorText: { fontSize: 16, flex: 1 },
  userSelectorOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  userSelectorContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  userSelectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  userSelectorTitle: { fontSize: 18, fontWeight: "600" },
  userList: { padding: 20 },
  loadingText: { textAlign: "center", padding: 20, opacity: 0.7 },
  noUsersText: { textAlign: "center", padding: 20, opacity: 0.7 },
  userItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "500" },
  userFullName: { fontSize: 14, marginTop: 2 },
  buttonRow: { flexDirection: "row", gap: 12 },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  createButton: {},
  createButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
  resetButton: { borderWidth: 1 },
  resetButtonText: { fontSize: 16, fontWeight: "600" },
  buttonDisabled: { opacity: 0.5 },
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
  tokenModalHeader: { alignItems: "center", marginBottom: 24 },
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
  copyButtonText: { color: "white", fontSize: 14, fontWeight: "600" },
  doneButton: { padding: 16, borderRadius: 8, alignItems: "center" },
  doneButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
});
