import BucketSelector from "@/components/BucketSelector";
import { BucketPresetSelector } from "@/components/BucketPresetSelector";
import { useNotificationsState } from "@/hooks/notifications/useNotificationQueries";
import { useI18n } from "@/hooks/useI18n";
import { UserRole, useGetMeQuery } from "@/generated/gql-operations-generated";
import { UsePushNotifications } from "@/hooks/usePushNotifications";
import { useAppLog } from "@/hooks/useAppLog";
import React, { memo, useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  Keyboard,
} from "react-native";
import {
  Button,
  Card,
  Icon,
  RadioButton,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useOnboarding } from "./OnboardingContext";

interface Step4Props {
  push: UsePushNotifications;
}

const Step4 = memo(({ push }: Step4Props) => {
  const theme = useTheme();
  const { t } = useI18n();
  const { logAppEvent } = useAppLog();
  const {
    step4SelectedBucketId: selectedBucketId,
    step4BucketName: bucketName,
    step4BucketSelectionMode: bucketSelectionMode,
    step4SelectedTemplateId: selectedTemplateId,
    step4ExternalSystemChannel,
    setStep4ExternalSystemChannel,
    setStep4SelectedBucketId: setSelectedBucketId,
    setStep4BucketName: setBucketName,
    setStep4BucketSelectionMode: setBucketSelectionMode,
    setStep4SelectedTemplateId: setSelectedTemplateId,
    setStep4TemplateColor: setTemplateColor,
    setStep4TemplateIconUrl: setTemplateIconUrl,
    step1CreatedExternalSystemId,
  } = useOnboarding();

  const { data: appState } = useNotificationsState();
  const { data: meData } = useGetMeQuery();
  const isAdmin = meData?.me?.role === UserRole.Admin;
  let availableBuckets = (appState?.buckets || []).filter(
    (bucket) =>
      !bucket.isOrphan &&
      !bucket.isProtected &&
      (!bucket.isPublic || isAdmin)
  );
  if (step1CreatedExternalSystemId) {
    availableBuckets = availableBuckets.filter(
      (bucket) =>
        bucket.externalNotifySystem?.id === step1CreatedExternalSystemId
    );
  }

  // Check device registration using usepush
  useEffect(() => {
    checkDeviceRegistration();
  }, []);

  // Auto-select first bucket when availableBuckets changes
  useEffect(() => {
    if (availableBuckets.length > 0 && !selectedBucketId) {
      const firstBucket = availableBuckets[0];
      setSelectedBucketId(firstBucket.id);
    }
  }, [availableBuckets, selectedBucketId, setSelectedBucketId]);

  // Reset bucket selection mode only when necessary
  useEffect(() => {
    // Only reset if current mode is not valid for current state
    if (availableBuckets.length <= 0) {
      // If no buckets available but user is in existing mode, switch to create
      setBucketSelectionMode("create");
    }
  }, [availableBuckets, setBucketSelectionMode]);

  const checkDeviceRegistration = async () => {
    try {
      // deviceRegistered è già gestito da usepush
      // I bucket vengono caricati automaticamente da appState
      console.log("[Step4] Device registration check completed");
    } catch (error) {
      console.error("[Step4] Error checking device registration:", error);
    }
  };

  const handleRegisterDevice = async () => {
    try {
      const success = await push.registerDevice();
      if (success) {
        console.log("[Step4] Device registered successfully");
        logAppEvent({
          event: "onboarding_device_registered",
          level: "info",
          message: "Device registered during onboarding",
          context: "Onboarding.Step4.handleRegisterDevice",
        }).catch(() => {});
        // Buckets will be automatically loaded from appState
      }
    } catch (error) {
      console.error("[Step4] Error registering device:", error);
    }
  };

  const handleBucketSelect = useCallback(
    (bucketId: string) => {
      setSelectedBucketId(bucketId);
    },
    [setSelectedBucketId]
  );

  if (!push.deviceRegistered) {
    return (
      <ScrollView style={styles.stepContainer}>
        <View style={styles.stepContent}>
          <Icon source="alert-circle" size={64} color={theme.colors.error} />
          <Text variant="headlineMedium" style={styles.stepTitle}>
            {t("onboardingV2.step4.deviceNotRegistered")}
          </Text>
          <Text variant="bodyLarge" style={styles.stepDescription}>
            {t("onboardingV2.step4.deviceNotRegisteredDescription")}
          </Text>
          <Button
            mode="contained"
            onPress={handleRegisterDevice}
            disabled={push.registeringDevice}
            loading={push.registeringDevice}
            style={styles.registerButton}
          >
            {push.registeringDevice
              ? t("onboardingV2.step4.registeringDevice")
              : t("onboardingV2.step4.registerDevice")}
          </Button>
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.stepContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView
        style={styles.stepContainer}
        contentContainerStyle={styles.scrollContentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepContent}>
          <Icon source="key" size={64} color={theme.colors.primary} />
          <Text variant="headlineMedium" style={styles.stepTitle}>
            {t("onboardingV2.step4.title")}
          </Text>
          <Text variant="bodyLarge" style={styles.stepDescription}>
            {t("onboardingV2.step4.description")}
          </Text>

          {/* Device Status */}
          <Card style={styles.statusCard} elevation={0}>
            <Card.Content>
              <View style={styles.statusRow}>
                <Icon
                  source="check-circle"
                  size={24}
                  color={theme.colors.primary}
                />
                <Text variant="bodyMedium" style={styles.statusText}>
                  {t("onboardingV2.step4.deviceRegistered")}
                </Text>
              </View>
            </Card.Content>
          </Card>

          {/* Bucket Selection */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t("onboardingV2.step4.selectBucket")}
            </Text>
            <Text variant="bodyMedium" style={styles.sectionDescription}>
              {t("onboardingV2.step4.selectBucketDescription")}
            </Text>

            {/* Bucket Selection Mode */}
            <RadioButton.Group
              value={bucketSelectionMode}
              onValueChange={(value) =>
                setBucketSelectionMode(value as "existing" | "create")
              }
            >
              <RadioButton.Item
                label={t("onboardingV2.step4.createNewBucket")}
                value="create"
              />
              <RadioButton.Item
                label={t("onboardingV2.step4.useExistingBucket")}
                value="existing"
              />
            </RadioButton.Group>

            {/* Existing Buckets */}
            {bucketSelectionMode === "existing" &&
              availableBuckets.length > 0 && (
                <BucketSelector
                  label={t("onboardingV2.step4.bucketLabel")}
                  selectedBucketId={selectedBucketId}
                  onBucketChange={handleBucketSelect}
                  filterByExternalSystemId={step1CreatedExternalSystemId ?? undefined}
                />
              )}

            {/* Create New Bucket */}
            {bucketSelectionMode === "create" && (
              <View style={styles.createBucketContainer}>
                <BucketPresetSelector
                  selectedId={selectedTemplateId}
                  onSelect={(preset) => {
                    setSelectedTemplateId(preset.id);
                    setBucketName(preset.name);
                    setTemplateColor(preset.color || null);
                    setTemplateIconUrl(preset.iconUrl || null);
                  }}
                />

                <TextInput
                  placeholder={t("onboardingV2.step4.bucketNamePlaceholder")}
                  value={bucketName}
                  onChangeText={setBucketName}
                  style={styles.input}
                  mode="outlined"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />

                {step1CreatedExternalSystemId && (
                  <TextInput
                    placeholder={t("onboardingV2.step4.externalSystemChannelPlaceholder")}
                    value={step4ExternalSystemChannel}
                    onChangeText={setStep4ExternalSystemChannel}
                    style={styles.input}
                    mode="outlined"
                    label={t("onboardingV2.step4.externalSystemChannelLabel")}
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                )}
              </View>
            )}
          </View>

          {/* Magic Code Disclaimer */}
          {/* {bucketSelectionMode === "create" && (
            <Surface style={styles.warningSurface} elevation={0}>
              <View style={styles.warningHeader}>
                <Icon source="alert" size={24} color={theme.colors.error} />
                <Text variant="titleSmall" style={styles.warningTitle}>
                  {t("onboardingV2.step4.magicCodeWarningTitle")}
                </Text>
              </View>
              <Text variant="bodySmall" style={styles.warningText}>
                {t("onboardingV2.step4.magicCodeWarning")}
              </Text>
            </Surface>
          )} */}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

Step4.displayName = "Step4";

const styles = StyleSheet.create({
  stepContainer: {
    flex: 1,
  },
  stepContent: {
    padding: 24,
    alignItems: "center",
  },
  stepTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  stepDescription: {
    marginBottom: 24,
    textAlign: "center",
    opacity: 0.8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    textAlign: "center",
  },
  registerButton: {
    marginTop: 24,
    minWidth: 200,
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  statusCard: {
    width: "100%",
    marginBottom: 24,
    backgroundColor: "rgba(0, 200, 0, 0.1)",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusText: {
    flex: 1,
  },
  section: {
    width: "100%",
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  sectionDescription: {
    marginBottom: 16,
    opacity: 0.7,
  },
  loadingContainer: {
    padding: 24,
    alignItems: "center",
  },
  noBucketsContainer: {
    alignItems: "center",
    padding: 16,
  },
  noBucketsText: {
    marginBottom: 16,
    textAlign: "center",
    opacity: 0.7,
  },
  input: {
    width: "100%",
    marginBottom: 16,
  },
  createBucketContainer: {
    marginTop: 8,
    width: "100%",
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  warningSurface: {
    width: "100%",
    padding: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255, 152, 0, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 152, 0, 0.3)",
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  warningTitle: {
    fontWeight: "600",
  },
  warningText: {
    lineHeight: 20,
  },
});

export default Step4;
