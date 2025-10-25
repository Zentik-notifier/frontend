import BucketSelector from "@/components/BucketSelector";
import Selector, { SelectorOption } from "@/components/ui/Selector";
import { useGetAccessTokensForBucketQuery } from "@/generated/gql-operations-generated";
import { useNotificationsState } from "@/hooks/notifications/useNotificationQueries";
import { useI18n } from "@/hooks/useI18n";
import { UsePushNotifications } from "@/hooks/usePushNotifications";
import React, { memo, useCallback, useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Icon,
  RadioButton,
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
  const {
    step4SelectedBucketId: selectedBucketId,
    step4SelectedTokenId: selectedTokenId,
    step4TokenSelectionMode: tokenSelectionMode,
    step4BucketName: bucketName,
    step4BucketSelectionMode: bucketSelectionMode,
    setStep4SelectedBucketId: setSelectedBucketId,
    setStep4SelectedTokenId: setSelectedTokenId,
    setStep4TokenSelectionMode: setTokenSelectionMode,
    setStep4BucketName: setBucketName,
    setStep4BucketSelectionMode: setBucketSelectionMode,
  } = useOnboarding();

  // Device registration state from usepush

  // Get buckets from app state (same as BucketSelector)
  const { data: appState } = useNotificationsState();
  const availableBuckets = (appState?.buckets || []).filter(
    (bucket) => !bucket.isOrphan && !bucket.isProtected
  );

  // Load access tokens for selected bucket
  const { data: tokensData, loading: tokensLoading } =
    useGetAccessTokensForBucketQuery({
      variables: { bucketId: selectedBucketId },
      skip: !selectedBucketId,
    });

  // Create token options for selector
  const tokenOptions = useMemo(() => {
    if (!tokensData?.getAccessTokensForBucket) return [];

    return tokensData.getAccessTokensForBucket
      .filter((token) => token.token)
      .map(
        (token): SelectorOption => ({
          id: token.id,
          name: token.name,
          description: `${token.scopes?.join(", ") || "No scopes"} • ${new Date(
            token.createdAt
          ).toLocaleDateString()}`,
          iconName: "key",
          iconColor: theme.colors.primary,
        })
      );
  }, [tokensData, selectedBucketId, theme.colors.primary]);

  // Loading states (questi rimangono locali)

  // GraphQL queries - con gestione errori per quando non autenticati

  // Check device registration using usepush
  useEffect(() => {
    checkDeviceRegistration();
  }, []);

  // Reset token selection when bucket changes
  useEffect(() => {
    if (selectedBucketId) {
      // Reset all token state when bucket changes
      setSelectedTokenId(null);
      setTokenSelectionMode("create");
    }
  }, [selectedBucketId, setSelectedTokenId, setTokenSelectionMode]);

  // Monitor deviceRegistered changes - buckets are now loaded automatically from appState

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
        // Buckets will be automatically loaded from appState
      }
    } catch (error) {
      console.error("[Step4] Error registering device:", error);
    }
  };

  const handleSelectExistingToken = (tokenId: string) => {
    // Then set the selection mode and token ID
    setTokenSelectionMode("existing");
    setSelectedTokenId(tokenId);
  };

  // Auto-select first available token when tokens are loaded
  useEffect(() => {
    if (
      tokenSelectionMode === "existing" &&
      !selectedTokenId &&
      tokenOptions.length > 0
    ) {
      const firstToken = tokenOptions[0];
      handleSelectExistingToken(firstToken.id);
    }
  }, [
    tokenSelectionMode,
    selectedTokenId,
    tokenOptions,
    handleSelectExistingToken,
  ]);

  // Sync token selection mode with bucket selection mode
  useEffect(() => {
    if (bucketSelectionMode === "create") {
      setTokenSelectionMode("create");
    }
  }, [bucketSelectionMode, setTokenSelectionMode]);

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
    <ScrollView style={styles.stepContainer}>
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
              />
            )}

          {/* Create New Bucket */}
          {bucketSelectionMode === "create" && (
            <View style={styles.createBucketContainer}>
              <TextInput
                placeholder={t("onboardingV2.step4.bucketNamePlaceholder")}
                value={bucketName}
                onChangeText={setBucketName}
                style={styles.input}
                mode="outlined"
              />
            </View>
          )}
        </View>

        {/* Token Creation */}
        {((bucketSelectionMode === "existing" && selectedBucketId) ||
          (bucketSelectionMode === "create" &&
            bucketName.trim() !== "" &&
            bucketName.trim() !==
              t("onboardingV2.step4.bucketNamePlaceholder"))) && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t("onboardingV2.step4.createToken")}
            </Text>
            <Text variant="bodyMedium" style={styles.sectionDescription}>
              {t("onboardingV2.step4.createTokenDescription")}
            </Text>

            {/* Token Selection Mode - Only show when bucket is existing */}
            {bucketSelectionMode === "existing" && (
              <RadioButton.Group
                value={tokenSelectionMode}
                onValueChange={(value) =>
                  setTokenSelectionMode(value as "existing" | "create")
                }
              >
                <RadioButton.Item
                  label={t("onboardingV2.step4.createNewToken")}
                  value="create"
                />
                <RadioButton.Item
                  label={t("onboardingV2.step4.useExistingToken")}
                  value="existing"
                />
              </RadioButton.Group>
            )}

            {/* Show message when bucket is create mode */}
            {bucketSelectionMode === "create" && (
              <View style={styles.infoBox}>
                <Icon
                  source="information"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text variant="bodySmall" style={styles.infoText}>
                  {t("onboardingV2.step4.tokenWillBeCreated")}
                </Text>
              </View>
            )}

            {/* Existing Tokens - Always show when in existing mode */}
            {tokenSelectionMode === "existing" && (
              <View style={styles.tokensContainer}>
                {tokensLoading ? (
                  <ActivityIndicator size="small" />
                ) : tokenOptions.length > 0 ? (
                  <Selector
                    label="Seleziona Token Esistente"
                    placeholder="Scegli un token..."
                    options={tokenOptions}
                    selectedValue={selectedTokenId}
                    onValueChange={handleSelectExistingToken}
                    mode="inline"
                    isSearchable={true}
                    searchPlaceholder="Cerca token..."
                  />
                ) : (
                  <Text variant="bodyMedium" style={styles.noTokensText}>
                    {t("onboardingV2.step4.noTokensAvailable")}
                  </Text>
                )}
              </View>
            )}

            {/* Token will be generated automatically when clicking Next in create mode */}
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Icon
            source="information-outline"
            size={20}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            variant="bodySmall"
            style={[
              styles.disclaimerText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {t("onboardingV2.step4.disclaimer")}
          </Text>
        </View>
      </View>
    </ScrollView>
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
  },
  tokensContainer: {
    marginTop: 8,
  },
  tokenList: {
    gap: 8,
  },
  tokenItem: {
    marginBottom: 8,
  },
  selectedTokenItem: {
    borderWidth: 2,
    borderColor: "#1976d2",
  },
  tokenItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  tokenItemInfo: {
    flex: 1,
    marginLeft: 8,
  },
  tokenScopes: {
    opacity: 0.7,
    marginTop: 2,
  },
  tokenDate: {
    opacity: 0.5,
    marginTop: 2,
  },
  noTokensText: {
    textAlign: "center",
    opacity: 0.7,
    marginVertical: 16,
  },
  warningCard: {
    marginTop: 8,
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  disclaimerText: {
    flex: 1,
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  infoText: {
    flex: 1,
    opacity: 0.8,
  },
});

export default Step4;
