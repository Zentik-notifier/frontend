import { Colors } from "@/constants/Colors";
import {
  CreateBucketDto,
  CreateMessageDto,
  CreateAccessTokenDto,
  NotificationDeliveryType,
  useCreateBucketMutation,
  useCreateMessageMutation,
  useCreateAccessTokenMutation,
  useGetBucketsQuery,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useUserSettings } from "@/services/user-settings";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useColorScheme } from "@/hooks/useTheme";
import * as Clipboard from "expo-clipboard";
import { ApiConfigService } from "@/services/api-config";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useRef } from "react";
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { Icon } from "./ui";

interface OnboardingModalProps {
  visible: boolean;
  onClose: () => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
}

export default function OnboardingModal({
  visible,
  onClose,
}: OnboardingModalProps) {
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const { registerDevice } = usePushNotifications();
  const { completeOnboarding } = useUserSettings();
  const [currentStep, setCurrentStep] = useState(0);
  const [bucketName, setBucketName] = useState("My First Bucket");
  const [tokenName, setTokenName] = useState("Test Token");
  const [notificationTitle, setNotificationTitle] =
    useState("Welcome to Zentik!");
  const [notificationBody, setNotificationBody] = useState(
    "This is your first test notification."
  );
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const [createBucketMutation, { loading: creatingBucket }] =
    useCreateBucketMutation();
  const [createMessageMutation, { loading: sendingMessage }] =
    useCreateMessageMutation();
  const [createAccessTokenMutation, { loading: creatingToken }] =
    useCreateAccessTokenMutation();
  const { data: bucketsData, refetch: refetchBuckets } = useGetBucketsQuery();

  // Reset modal when it opens
  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      setBucketName("My First Bucket");
      setTokenName("Test Token");
      setNotificationTitle("Welcome to Zentik!");
      setNotificationBody("This is your first test notification.");
      setCreatedToken(null);
    }
  }, [visible]);

  const steps: OnboardingStep[] = [
    {
      id: "welcome",
      title: t("onboarding.welcome.title"),
      description: t("onboarding.welcome.description"),
      icon: "app",
      completed: true,
    },
    {
      id: "bucket",
      title: t("onboarding.bucket.title"),
      description: t("onboarding.bucket.description"),
      icon: "folder",
      completed: false,
    },
    {
      id: "token",
      title: t("onboarding.token.title"),
      description: t("onboarding.token.description"),
      icon: "key",
      completed: false,
    },
    {
      id: "notification",
      title: t("onboarding.notification.title"),
      description: t("onboarding.notification.description"),
      icon: "notifications",
      completed: false,
    },
    {
      id: "api",
      title: t("onboarding.api.title"),
      description: t("onboarding.api.description"),
      icon: "code",
      completed: false,
    },
  ];

  const handleCreateBucket = async () => {
    if (!bucketName.trim()) {
      Alert.alert(
        t("common.error"),
        t("onboarding.messages.bucketNameRequired")
      );
      return;
    }

    try {
      const bucketData: CreateBucketDto = {
        name: bucketName.trim(),
        color: "#007AFF",
        icon: "📱",
      };

      await createBucketMutation({
        variables: { input: bucketData },
      });

      await refetchBuckets();
      setCurrentStep(2);
    } catch (error) {
      console.error("Error creating bucket:", error);
      Alert.alert(
        t("common.error"),
        t("onboarding.messages.bucketCreateError")
      );
    }
  };

  const handleCreateToken = async () => {
    if (!tokenName.trim()) {
      Alert.alert(
        t("common.error"),
        t("onboarding.messages.tokenNameRequired")
      );
      return;
    }

    try {
      const tokenData: CreateAccessTokenDto = {
        name: tokenName.trim(),
        expiresAt: null, // No expiration for onboarding token
        scopes: ["messages:create", "notifications:read"], // Basic scopes for onboarding
      };

      const result = await createAccessTokenMutation({
        variables: { input: tokenData },
      });

      if (result.data?.createAccessToken) {
        const token = result.data.createAccessToken.token;
        setCreatedToken(token);
        await Clipboard.setStringAsync(token);

        Alert.alert(
          t("onboarding.messages.tokenCreated"),
          `${t("onboarding.messages.tokenCopied")}\n\n${token}\n\n${t(
            "onboarding.messages.useInHeader"
          )} ${token}`,
          [{ text: t("common.ok"), onPress: () => setCurrentStep(3) }]
        );
      }
    } catch (error) {
      console.error("Error creating token:", error);
      Alert.alert(t("common.error"), t("onboarding.messages.tokenCreateError"));
    }
  };

  const handleSendNotification = async () => {
    if (!notificationTitle.trim() || !notificationBody.trim()) {
      Alert.alert(
        t("common.error"),
        t("onboarding.messages.notificationFieldsRequired")
      );
      return;
    }

    const buckets = bucketsData?.buckets || [];
    if (buckets.length === 0) {
      Alert.alert(
        t("common.error"),
        t("onboarding.messages.createBucketFirst")
      );
      return;
    }

    try {
      // Register device before sending notification
      await registerDevice();

      const messageData: CreateMessageDto = {
        title: notificationTitle.trim(),
        body: notificationBody.trim(),
        bucketId: buckets[0].id,
        deliveryType: NotificationDeliveryType.Normal,
      };

      await createMessageMutation({
        variables: { input: messageData },
      });

      setCurrentStep(4);
    } catch (error) {
      console.error("Error sending notification:", error);
      Alert.alert(
        t("common.error"),
        t("onboarding.messages.notificationSendError")
      );
    }
  };

  const buildMessagePayload = () => {
    const buckets = bucketsData?.buckets || [];
    return {
      title: notificationTitle.trim(),
      body: notificationBody.trim(),
      bucketId: buckets[0]?.id,
      deliveryType: "NORMAL",
    };
  };

  const copyJsonToClipboard = async () => {
    try {
      const jsonString = JSON.stringify(buildMessagePayload(), null, 2);
      await Clipboard.setStringAsync(jsonString);
      Alert.alert(t("common.success"), t("onboarding.preview.copied"));
    } catch (error) {
      Alert.alert(t("common.error"), "Failed to copy JSON to clipboard");
    }
  };

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      // Scroll to top when changing step
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    } else {
      await completeOnboarding();
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      // Scroll to top when changing step
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  };

  const handleClose = async () => {
    await completeOnboarding();
    onClose();
  };

  const renderStepContent = () => {
    const step = steps[currentStep];

    switch (step.id) {
      case "welcome":
        return (
          <View style={styles.stepContent}>
            <Icon
              name="app"
              size="xl"
              color="primary"
              style={styles.stepIcon}
            />
            <ThemedText style={styles.stepDescription}>
              {t("onboarding.welcome.description")}
            </ThemedText>
          </View>
        );

      case "bucket":
        return (
          <View style={styles.stepContent}>
            <Icon
              name="folder"
              size="xl"
              color="primary"
              style={styles.stepIcon}
            />
            <ThemedText style={styles.stepDescription}>
              {t("onboarding.bucket.description")}
            </ThemedText>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>
                {t("onboarding.bucket.nameLabel")}
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor:
                      Colors[colorScheme ?? "light"].backgroundCard,
                    color: Colors[colorScheme ?? "light"].text,
                    borderColor: Colors[colorScheme ?? "light"].border,
                  },
                ]}
                value={bucketName}
                onChangeText={setBucketName}
                placeholder={t("onboarding.bucket.namePlaceholder")}
                placeholderTextColor={
                  Colors[colorScheme ?? "light"].textSecondary
                }
              />
            </View>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: Colors[colorScheme ?? "light"].tint },
                creatingBucket && styles.disabledButton,
              ]}
              onPress={handleCreateBucket}
              disabled={creatingBucket}
            >
              <ThemedText style={styles.actionButtonText}>
                {creatingBucket
                  ? t("onboarding.bucket.creating")
                  : t("onboarding.bucket.createButton")}
              </ThemedText>
            </TouchableOpacity>
          </View>
        );

      case "token":
        return (
          <View style={styles.stepContent}>
            <Icon
              name="key"
              size="xl"
              color="primary"
              style={styles.stepIcon}
            />
            <ThemedText style={styles.stepDescription}>
              {t("onboarding.token.description")}
            </ThemedText>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>
                {t("onboarding.token.nameLabel")}
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor:
                      Colors[colorScheme ?? "light"].backgroundCard,
                    color: Colors[colorScheme ?? "light"].text,
                    borderColor: Colors[colorScheme ?? "light"].border,
                  },
                ]}
                value={tokenName}
                onChangeText={setTokenName}
                placeholder={t("onboarding.token.namePlaceholder")}
                placeholderTextColor={
                  Colors[colorScheme ?? "light"].textSecondary
                }
              />
            </View>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: Colors[colorScheme ?? "light"].tint },
                creatingToken && styles.disabledButton,
              ]}
              onPress={handleCreateToken}
              disabled={creatingToken}
            >
              <ThemedText style={styles.actionButtonText}>
                {creatingToken
                  ? t("onboarding.token.creating")
                  : t("onboarding.token.createButton")}
              </ThemedText>
            </TouchableOpacity>
          </View>
        );

      case "notification":
        return (
          <View style={styles.stepContent}>
            <Icon
              name="notifications"
              size="xl"
              color="primary"
              style={styles.stepIcon}
            />
            <ThemedText style={styles.stepDescription}>
              {t("onboarding.notification.description")}
            </ThemedText>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>
                {t("onboarding.notification.titleLabel")}
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor:
                      Colors[colorScheme ?? "light"].backgroundCard,
                    color: Colors[colorScheme ?? "light"].text,
                    borderColor: Colors[colorScheme ?? "light"].border,
                  },
                ]}
                value={notificationTitle}
                onChangeText={setNotificationTitle}
                placeholder={t("onboarding.notification.titlePlaceholder")}
                placeholderTextColor={
                  Colors[colorScheme ?? "light"].textSecondary
                }
              />
            </View>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>
                {t("onboarding.notification.bodyLabel")}
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  styles.multilineInput,
                  {
                    backgroundColor:
                      Colors[colorScheme ?? "light"].backgroundCard,
                    color: Colors[colorScheme ?? "light"].text,
                    borderColor: Colors[colorScheme ?? "light"].border,
                  },
                ]}
                value={notificationBody}
                onChangeText={setNotificationBody}
                placeholder={t("onboarding.notification.bodyPlaceholder")}
                placeholderTextColor={
                  Colors[colorScheme ?? "light"].textSecondary
                }
                multiline
                numberOfLines={3}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: Colors[colorScheme ?? "light"].tint },
                sendingMessage && styles.disabledButton,
              ]}
              onPress={handleSendNotification}
              disabled={sendingMessage}
            >
              <ThemedText style={styles.actionButtonText}>
                {sendingMessage
                  ? t("onboarding.notification.sending")
                  : t("onboarding.notification.sendButton")}
              </ThemedText>
            </TouchableOpacity>
          </View>
        );

      case "api":
        return (
          <View style={styles.stepContent}>
            <Icon
              name="code"
              size="xl"
              color="primary"
              style={styles.stepIcon}
            />
            <ThemedText style={styles.stepDescription}>
              {t("onboarding.api.description")}
            </ThemedText>

            <View style={styles.documentationContainer}>
              <ThemedText style={styles.documentationText}>
                {t("onboarding.api.documentationInfo")}{" "}
                <ThemedText
                  style={styles.documentationLinkText}
                  onPress={() => {
                    Linking.openURL(t("onboarding.api.documentationLink"));
                  }}
                >
                  {t("onboarding.api.documentationLink")}
                </ThemedText>
              </ThemedText>
            </View>

            {/* Endpoint Information */}
            <View style={styles.endpointContainer}>
              <ThemedText style={styles.endpointValue}>
                POST {ApiConfigService.getApiBaseWithPrefix()}/messages
              </ThemedText>
            </View>

            {/* JSON Preview - Always Visible */}
            <ThemedView
              style={[
                styles.jsonPreviewContainer,
                {
                  backgroundColor:
                    Colors[colorScheme ?? "light"].backgroundCard,
                },
              ]}
            >
              <ScrollView
                style={[
                  styles.jsonPreviewScrollView,
                  {
                    backgroundColor:
                      Colors[colorScheme ?? "light"].backgroundSecondary,
                    borderColor: Colors[colorScheme ?? "light"].border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.jsonPreviewText,
                    { color: Colors[colorScheme ?? "light"].text },
                  ]}
                >
                  {JSON.stringify(buildMessagePayload(), null, 2)}
                </ThemedText>
              </ScrollView>

              <TouchableOpacity
                style={[
                  styles.copyButton,
                  {
                    backgroundColor:
                      Colors[colorScheme ?? "light"].backgroundSecondary,
                  },
                ]}
                onPress={copyJsonToClipboard}
              >
                <Icon
                  name="copy"
                  size="sm"
                  color={Colors[colorScheme ?? "light"].tint}
                />
                <ThemedText style={styles.copyButtonText}>
                  {t("onboarding.preview.copy")}
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons
              name="close"
              size={24}
              color={Colors[colorScheme ?? "light"].text}
            />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>
            {t("onboarding.title")}
          </ThemedText>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor:
                      index <= currentStep
                        ? Colors[colorScheme ?? "light"].tint
                        : Colors[colorScheme ?? "light"].border,
                  },
                ]}
              />
            ))}
          </View>
          <ThemedText style={styles.progressText}>
            {t("onboarding.navigation.step", {
              current: currentStep + 1,
              total: steps.length,
            })}
          </ThemedText>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText style={styles.stepTitle}>
            {steps[currentStep]?.title}
          </ThemedText>

          {renderStepContent()}
        </ScrollView>

        <View style={styles.footer}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={[
                styles.navigationButton,
                styles.previousButton,
                { borderColor: Colors[colorScheme ?? "light"].border },
              ]}
              onPress={handlePrevious}
            >
              <ThemedText style={styles.previousButtonText}>
                {t("onboarding.navigation.back")}
              </ThemedText>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.navigationButton,
              styles.nextButton,
              { backgroundColor: Colors[colorScheme ?? "light"].tint },
            ]}
            onPress={handleNext}
          >
            <ThemedText style={styles.nextButtonText}>
              {currentStep === steps.length - 1
                ? t("onboarding.navigation.complete")
                : t("onboarding.navigation.next")}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  progressBar: {
    flexDirection: "row",
    marginBottom: 10,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  progressText: {
    fontSize: 14,
    opacity: 0.7,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  stepContent: {
    alignItems: "center",
  },
  stepIcon: {
    marginBottom: 20,
  },
  stepDescription: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 30,
    opacity: 0.8,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: "top",
  },
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  navigationButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  previousButton: {
    borderWidth: 1,
    marginRight: 10,
  },
  previousButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  nextButton: {
    marginLeft: 10,
  },
  nextButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  endpointContainer: {
    marginVertical: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  endpointLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  endpointValue: {
    fontSize: 12,
    fontFamily: "monospace",
    opacity: 0.8,
  },
  documentationContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  documentationLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  documentationLink: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  documentationText: {
    fontSize: 14,
  },
  documentationLinkText: {
    fontSize: 12,
    color: "#007AFF",
    textDecorationLine: "underline",
  },
  jsonPreviewContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  previewHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewHeaderTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  previewDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  jsonPreviewScrollView: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    maxHeight: 200,
  },
  jsonPreviewText: {
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 18,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
