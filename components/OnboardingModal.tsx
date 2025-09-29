import {
  CreateAccessTokenDto,
  CreateBucketDto,
  CreateMessageDto,
  NotificationDeliveryType,
  useCreateAccessTokenMutation,
  useCreateBucketMutation,
  useCreateMessageMutation,
  useGetBucketsQuery,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { ApiConfigService } from "@/services/api-config";
import { useUserSettings } from "@/services/user-settings";
import * as Clipboard from "expo-clipboard";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  GestureResponderEvent,
  Linking,
  PanResponder,
  PanResponderGestureState,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Icon,
  Modal,
  Portal,
  Surface,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

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
  const theme = useTheme();
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
  const push = usePushNotifications();
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (
        _evt: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        const horizontalMove =
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        return horizontalMove && Math.abs(gestureState.dx) > 12;
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dx < -30) {
          // swipe left -> next
          handleNext();
        } else if (gestureState.dx > 30) {
          // swipe right -> previous
          handlePrevious();
        }
      },
    })
  ).current;

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
      await push.registerDevice();

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
            <View style={styles.stepIcon}>
              <Icon source="cellphone" size={64} color={theme.colors.primary} />
            </View>
            <Text
              style={[
                styles.stepDescription,
                { color: theme.colors.onSurface },
              ]}
            >
              {t("onboarding.welcome.description")}
            </Text>
            <Text
              style={[
                styles.stepDescription,
                { color: theme.colors.onSurface },
              ]}
            >
              {t("onboarding.welcome.description2")}
            </Text>
          </View>
        );

      case "bucket":
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepIcon}>
              <Icon source="folder" size={64} color={theme.colors.primary} />
            </View>
            <Text
              style={[
                styles.stepDescription,
                { color: theme.colors.onSurface },
              ]}
            >
              {t("onboarding.bucket.description")}
            </Text>
            <View style={styles.inputContainer}>
              <Text
                style={[styles.inputLabel, { color: theme.colors.onSurface }]}
              >
                {t("onboarding.bucket.nameLabel")}
              </Text>
              <TextInput
                mode="outlined"
                value={bucketName}
                onChangeText={setBucketName}
                placeholder={t("onboarding.bucket.namePlaceholder")}
                style={styles.textInput}
              />
            </View>
            <Button
              mode="contained"
              onPress={handleCreateBucket}
              loading={creatingBucket}
              disabled={creatingBucket}
              style={styles.actionButton}
            >
              {creatingBucket
                ? t("onboarding.bucket.creating")
                : t("onboarding.bucket.createButton")}
            </Button>
          </View>
        );

      case "token":
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepIcon}>
              <Icon source="key" size={64} color={theme.colors.primary} />
            </View>
            <Text
              style={[
                styles.stepDescription,
                { color: theme.colors.onSurface },
              ]}
            >
              {t("onboarding.token.description")}
            </Text>
            <View style={styles.inputContainer}>
              <Text
                style={[styles.inputLabel, { color: theme.colors.onSurface }]}
              >
                {t("onboarding.token.nameLabel")}
              </Text>
              <TextInput
                mode="outlined"
                value={tokenName}
                onChangeText={setTokenName}
                placeholder={t("onboarding.token.namePlaceholder")}
                style={styles.textInput}
              />
            </View>
            <Button
              mode="contained"
              onPress={handleCreateToken}
              loading={creatingToken}
              disabled={creatingToken}
              style={styles.actionButton}
            >
              {creatingToken
                ? t("onboarding.token.creating")
                : t("onboarding.token.createButton")}
            </Button>
          </View>
        );

      case "notification":
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepIcon}>
              <Icon source="bell" size={64} color={theme.colors.primary} />
            </View>
            <Text
              style={[
                styles.stepDescription,
                { color: theme.colors.onSurface },
              ]}
            >
              {t("onboarding.notification.description")}
            </Text>
            <View style={styles.inputContainer}>
              <Text
                style={[styles.inputLabel, { color: theme.colors.onSurface }]}
              >
                {t("onboarding.notification.titleLabel")}
              </Text>
              <TextInput
                mode="outlined"
                value={notificationTitle}
                onChangeText={setNotificationTitle}
                placeholder={t("onboarding.notification.titlePlaceholder")}
                style={styles.textInput}
              />
            </View>
            <View style={styles.inputContainer}>
              <Text
                style={[styles.inputLabel, { color: theme.colors.onSurface }]}
              >
                {t("onboarding.notification.bodyLabel")}
              </Text>
              <TextInput
                mode="outlined"
                value={notificationBody}
                onChangeText={setNotificationBody}
                placeholder={t("onboarding.notification.bodyPlaceholder")}
                multiline
                numberOfLines={3}
                style={[styles.textInput, styles.multilineInput]}
              />
            </View>
            <Button
              mode="contained"
              onPress={handleSendNotification}
              loading={sendingMessage}
              disabled={sendingMessage}
              style={styles.actionButton}
            >
              {sendingMessage
                ? t("onboarding.notification.sending")
                : t("onboarding.notification.sendButton")}
            </Button>
          </View>
        );

      case "api":
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepIcon}>
              <Icon source="cog" size={64} color={theme.colors.primary} />
            </View>
            <Text
              style={[
                styles.stepDescription,
                { color: theme.colors.onSurface },
              ]}
            >
              {t("onboarding.api.description")}
            </Text>

            <View style={styles.documentationContainer}>
              <Text
                style={[
                  styles.documentationText,
                  { color: theme.colors.onSurface },
                ]}
              >
                {t("onboarding.api.documentationInfo")}{" "}
                <Text
                  style={[
                    styles.documentationLinkText,
                    { color: theme.colors.primary },
                  ]}
                  onPress={() => {
                    Linking.openURL(t("onboarding.api.documentationLink"));
                  }}
                >
                  {t("onboarding.api.documentationLink")}
                </Text>
              </Text>
            </View>

            {/* Endpoint Information */}
            <Surface
              style={[
                styles.endpointContainer,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
              elevation={0}
            >
              <Text
                style={[
                  styles.endpointValue,
                  { color: theme.colors.onSurface },
                ]}
              >
                POST {ApiConfigService.getApiBaseWithPrefix()}/messages
              </Text>
            </Surface>

            {/* JSON Preview - Always Visible */}
            <Surface
              style={[
                styles.jsonPreviewContainer,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
              elevation={0}
            >
              <ScrollView
                style={[
                  styles.jsonPreviewScrollView,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outline,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.jsonPreviewText,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {JSON.stringify(buildMessagePayload(), null, 2)}
                </Text>
              </ScrollView>

              <TouchableRipple
                style={[
                  styles.copyButton,
                  { backgroundColor: theme.colors.surface },
                ]}
                onPress={copyJsonToClipboard}
              >
                <View style={styles.copyButtonContent}>
                  <Icon
                    source="content-copy"
                    size={16}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={[
                      styles.copyButtonText,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {t("onboarding.preview.copy")}
                  </Text>
                </View>
              </TouchableRipple>
            </Surface>
          </View>
        );

      default:
        return null;
    }
  };

  const deviceHeight = Dimensions.get("window").height;
  const containerStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 24,
    maxHeight: deviceHeight,
  } as const;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleClose}
        contentContainerStyle={containerStyle}
        dismissable={false}
      >
        <Surface elevation={0}>
          <View style={styles.header}>
            <TouchableRipple onPress={handleClose} style={styles.closeButton}>
              <Icon source="close" size={24} color={theme.colors.onSurface} />
            </TouchableRipple>
            <Text
              style={[styles.headerTitle, { color: theme.colors.onSurface }]}
            >
              {t("onboarding.title")}
            </Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.content}
            showsVerticalScrollIndicator={false}
            {...panResponder.panHandlers}
          >
            <Text style={[styles.stepTitle, { color: theme.colors.onSurface }]}>
              {steps[currentStep]?.title}
            </Text>

            {renderStepContent()}
          </ScrollView>

          <View style={styles.footerCarouselContainer}>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                {steps.map((_, index) => (
                  <Surface
                    key={index}
                    style={[
                      styles.progressDot,
                      {
                        backgroundColor:
                          index <= currentStep
                            ? theme.colors.primary
                            : theme.colors.outline,
                      },
                    ]}
                    elevation={0}
                  >
                    <></>
                  </Surface>
                ))}
              </View>
              <Text
                style={[styles.progressText, { color: theme.colors.onSurface }]}
              >
                {t("onboarding.navigation.step", {
                  current: currentStep + 1,
                  total: steps.length,
                })}
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            {currentStep > 0 && (
              <Button
                mode="outlined"
                onPress={handlePrevious}
                style={styles.previousButton}
                labelStyle={{ color: theme.colors.onSurface }}
              >
                {t("onboarding.navigation.back")}
              </Button>
            )}

            <Button
              mode="contained"
              onPress={handleNext}
              style={styles.nextButton}
            >
              {currentStep === steps.length - 1
                ? t("onboarding.navigation.complete")
                : t("onboarding.navigation.next")}
            </Button>
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
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
    paddingHorizontal: 20,
  },
  footerCarouselContainer: {
    paddingTop: 8,
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
    marginTop: 10,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  previousButton: {
    flex: 1,
    marginRight: 10,
  },
  nextButton: {
    flex: 1,
    marginLeft: 10,
  },
  endpointContainer: {
    marginVertical: 16,
    padding: 12,
    borderRadius: 8,
  },
  copyButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
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
