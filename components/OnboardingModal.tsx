import { Colors } from "@/constants/Colors";
import {
  CreateBucketDto,
  CreateMessageDto,
  NotificationDeliveryType,
  useCreateBucketMutation,
  useCreateMessageMutation,
  useGetBucketsQuery,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { ApiConfigService } from "@/services/api-config";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
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

export default function OnboardingModal({ visible, onClose }: OnboardingModalProps) {
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [bucketName, setBucketName] = useState("My First Bucket");
  const [tokenName, setTokenName] = useState("Test Token");
  const [notificationTitle, setNotificationTitle] = useState("Welcome to Zentik!");
  const [notificationBody, setNotificationBody] = useState("This is your first test notification.");
  
  const [createBucketMutation, { loading: creatingBucket }] = useCreateBucketMutation();
  const [createMessageMutation, { loading: sendingMessage }] = useCreateMessageMutation();
  const { data: bucketsData, refetch: refetchBuckets } = useGetBucketsQuery();

  const steps: OnboardingStep[] = [
    {
      id: "welcome",
      title: t("common.onboarding.welcome.title"),
      description: t("common.onboarding.welcome.description"),
      icon: "app",
      completed: true,
    },
    {
      id: "bucket",
      title: t("common.onboarding.bucket.title"),
      description: t("common.onboarding.bucket.description"),
      icon: "folder",
      completed: false,
    },
    {
      id: "token",
      title: t("common.onboarding.token.title"),
      description: t("common.onboarding.token.description"),
      icon: "key",
      completed: false,
    },
    {
      id: "notification",
      title: t("common.onboarding.notification.title"),
      description: t("common.onboarding.notification.description"),
      icon: "notifications",
      completed: false,
    },
    {
      id: "api",
      title: t("common.onboarding.api.title"),
      description: t("common.onboarding.api.description"),
      icon: "code",
      completed: false,
    },
  ];

  const handleCreateBucket = async () => {
    if (!bucketName.trim()) {
      Alert.alert(t("common.error"), t("common.onboarding.messages.bucketNameRequired"));
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
      Alert.alert(t("common.success"), t("common.onboarding.messages.bucketCreated"));
      setCurrentStep(2);
    } catch (error) {
      console.error("Error creating bucket:", error);
      Alert.alert(t("common.error"), t("common.onboarding.messages.bucketCreateError"));
    }
  };

  const handleCreateToken = async () => {
    if (!tokenName.trim()) {
      Alert.alert(t("common.error"), t("common.onboarding.messages.tokenNameRequired"));
      return;
    }

    try {
      // Simuliamo la creazione del token (in realtà dovremmo chiamare l'API)
      const mockToken = "zt_" + Math.random().toString(36).substring(2, 15);
      await Clipboard.setStringAsync(mockToken);
      
      Alert.alert(
        t("common.onboarding.messages.tokenCreated"),
        `${t("common.onboarding.messages.tokenCopied")}\n\n${mockToken}\n\n${t("common.onboarding.messages.useInHeader")} ${mockToken}`,
        [{ text: t("common.ok"), onPress: () => setCurrentStep(3) }]
      );
    } catch (error) {
      console.error("Error creating token:", error);
      Alert.alert(t("common.error"), t("common.onboarding.messages.tokenCreateError"));
    }
  };

  const handleSendNotification = async () => {
    if (!notificationTitle.trim() || !notificationBody.trim()) {
      Alert.alert(t("common.error"), t("common.onboarding.messages.notificationFieldsRequired"));
      return;
    }

    const buckets = bucketsData?.buckets || [];
    if (buckets.length === 0) {
      Alert.alert(t("common.error"), t("common.onboarding.messages.createBucketFirst"));
      return;
    }

    try {
      const messageData: CreateMessageDto = {
        title: notificationTitle.trim(),
        body: notificationBody.trim(),
        bucketId: buckets[0].id,
        deliveryType: NotificationDeliveryType.Normal,
      };

      await createMessageMutation({
        variables: { input: messageData },
      });

      Alert.alert(t("common.success"), t("common.onboarding.messages.notificationSent"));
      setCurrentStep(4);
    } catch (error) {
      console.error("Error sending notification:", error);
      Alert.alert(t("common.error"), t("common.onboarding.messages.notificationSendError"));
    }
  };

  const handleShowApiExample = async () => {
    const buckets = bucketsData?.buckets || [];
    if (buckets.length === 0) {
      Alert.alert(t("common.error"), t("common.onboarding.messages.createBucketFirst"));
      return;
    }

    const apiBase = ApiConfigService.getApiBaseWithPrefix();
    const examplePayload = {
      title: "API Notification",
      body: "This notification was sent via REST API",
      bucketId: buckets[0].id,
      deliveryType: "NORMAL",
    };

    const curlExample = `curl -X POST "${apiBase}/messages" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -d '${JSON.stringify(examplePayload, null, 2)}'`;

    await Clipboard.setStringAsync(curlExample);
    
    Alert.alert(
      t("common.onboarding.messages.apiExample"),
      `${t("common.onboarding.messages.apiExampleCopied")}\n\n${curlExample}\n\n${t("common.onboarding.messages.exampleCopied")}`,
      [{ text: t("common.ok"), onPress: () => setCurrentStep(5) }]
    );
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    const step = steps[currentStep];

    switch (step.id) {
      case "welcome":
        return (
          <View style={styles.stepContent}>
            <Icon name="app" size="xl" color="primary" style={styles.stepIcon} />
            <ThemedText style={styles.stepDescription}>
              {t("common.onboarding.welcome.description")}
            </ThemedText>
          </View>
        );

      case "bucket":
        return (
          <View style={styles.stepContent}>
            <Icon name="folder" size="xl" color="primary" style={styles.stepIcon} />
            <ThemedText style={styles.stepDescription}>
              {t("common.onboarding.bucket.description")}
            </ThemedText>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>{t("common.onboarding.bucket.nameLabel")}</ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  { 
                    backgroundColor: Colors[colorScheme ?? "light"].backgroundCard,
                    color: Colors[colorScheme ?? "light"].text,
                    borderColor: Colors[colorScheme ?? "light"].border,
                  }
                ]}
                value={bucketName}
                onChangeText={setBucketName}
                placeholder={t("common.onboarding.bucket.namePlaceholder")}
                placeholderTextColor={Colors[colorScheme ?? "light"].textSecondary}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: Colors[colorScheme ?? "light"].tint },
                creatingBucket && styles.disabledButton
              ]}
              onPress={handleCreateBucket}
              disabled={creatingBucket}
            >
              <ThemedText style={styles.actionButtonText}>
                {creatingBucket ? t("common.onboarding.bucket.creating") : t("common.onboarding.bucket.createButton")}
              </ThemedText>
            </TouchableOpacity>
          </View>
        );

      case "token":
        return (
          <View style={styles.stepContent}>
            <Icon name="key" size="xl" color="primary" style={styles.stepIcon} />
            <ThemedText style={styles.stepDescription}>
              {t("common.onboarding.token.description")}
            </ThemedText>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>{t("common.onboarding.token.nameLabel")}</ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  { 
                    backgroundColor: Colors[colorScheme ?? "light"].backgroundCard,
                    color: Colors[colorScheme ?? "light"].text,
                    borderColor: Colors[colorScheme ?? "light"].border,
                  }
                ]}
                value={tokenName}
                onChangeText={setTokenName}
                placeholder={t("common.onboarding.token.namePlaceholder")}
                placeholderTextColor={Colors[colorScheme ?? "light"].textSecondary}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: Colors[colorScheme ?? "light"].tint }
              ]}
              onPress={handleCreateToken}
            >
              <ThemedText style={styles.actionButtonText}>{t("common.onboarding.token.createButton")}</ThemedText>
            </TouchableOpacity>
          </View>
        );

      case "notification":
        return (
          <View style={styles.stepContent}>
            <Icon name="notifications" size="xl" color="primary" style={styles.stepIcon} />
            <ThemedText style={styles.stepDescription}>
              {t("common.onboarding.notification.description")}
            </ThemedText>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>{t("common.onboarding.notification.titleLabel")}</ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  { 
                    backgroundColor: Colors[colorScheme ?? "light"].backgroundCard,
                    color: Colors[colorScheme ?? "light"].text,
                    borderColor: Colors[colorScheme ?? "light"].border,
                  }
                ]}
                value={notificationTitle}
                onChangeText={setNotificationTitle}
                placeholder={t("common.onboarding.notification.titlePlaceholder")}
                placeholderTextColor={Colors[colorScheme ?? "light"].textSecondary}
              />
            </View>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>{t("common.onboarding.notification.bodyLabel")}</ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  styles.multilineInput,
                  { 
                    backgroundColor: Colors[colorScheme ?? "light"].backgroundCard,
                    color: Colors[colorScheme ?? "light"].text,
                    borderColor: Colors[colorScheme ?? "light"].border,
                  }
                ]}
                value={notificationBody}
                onChangeText={setNotificationBody}
                placeholder={t("common.onboarding.notification.bodyPlaceholder")}
                placeholderTextColor={Colors[colorScheme ?? "light"].textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: Colors[colorScheme ?? "light"].tint },
                sendingMessage && styles.disabledButton
              ]}
              onPress={handleSendNotification}
              disabled={sendingMessage}
            >
              <ThemedText style={styles.actionButtonText}>
                {sendingMessage ? t("common.onboarding.notification.sending") : t("common.onboarding.notification.sendButton")}
              </ThemedText>
            </TouchableOpacity>
          </View>
        );

      case "api":
        return (
          <View style={styles.stepContent}>
            <Icon name="code" size="xl" color="primary" style={styles.stepIcon} />
            <ThemedText style={styles.stepDescription}>
              {t("common.onboarding.api.description")}
            </ThemedText>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: Colors[colorScheme ?? "light"].tint }
              ]}
              onPress={handleShowApiExample}
            >
              <ThemedText style={styles.actionButtonText}>{t("common.onboarding.api.showExampleButton")}</ThemedText>
            </TouchableOpacity>
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
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons 
              name="close" 
              size={24} 
              color={Colors[colorScheme ?? "light"].text} 
            />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>
            {t("common.onboarding.title")}
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
                    backgroundColor: index <= currentStep 
                      ? Colors[colorScheme ?? "light"].tint 
                      : Colors[colorScheme ?? "light"].border,
                  }
                ]}
              />
            ))}
          </View>
          <ThemedText style={styles.progressText}>
            Passo {currentStep + 1} di {steps.length}
          </ThemedText>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText style={styles.stepTitle}>
            {steps[currentStep].title}
          </ThemedText>
          
          {renderStepContent()}
        </ScrollView>

        <View style={styles.footer}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={[
                styles.navigationButton,
                styles.previousButton,
                { borderColor: Colors[colorScheme ?? "light"].border }
              ]}
              onPress={handlePrevious}
            >
              <ThemedText style={styles.previousButtonText}>{t("common.onboarding.navigation.back")}</ThemedText>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[
              styles.navigationButton,
              styles.nextButton,
              { backgroundColor: Colors[colorScheme ?? "light"].tint }
            ]}
            onPress={handleNext}
          >
            <ThemedText style={styles.nextButtonText}>
              {currentStep === steps.length - 1 ? t("common.onboarding.navigation.complete") : t("common.onboarding.navigation.next")}
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
});
