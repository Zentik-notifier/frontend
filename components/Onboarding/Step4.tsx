import BucketSelector from "@/components/BucketSelector";
import {
  BucketFragment,
  useCreateAccessTokenMutation,
  useCreateBucketMutation,
  useGetBucketsLazyQuery,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks";
import { UsePushNotifications } from "@/hooks/usePushNotifications";
import { useOnboarding } from "./OnboardingContext";
import React, { memo, useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Icon,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

interface Step4Props {
  push: UsePushNotifications;
}

const Step4 = memo(({ push }: Step4Props) => {
  const theme = useTheme();
  const { t } = useI18n();
  const {
    setGeneratedToken: setContextGeneratedToken,
    setSelectedBucketId: setContextBucketId,
    step4Buckets: buckets,
    step4SelectedBucketId: selectedBucketId,
    step4BucketName: bucketName,
    step4TokenName: tokenName,
    step4TokenCreated: tokenCreated,
    step4GeneratedToken: generatedToken,
    setStep4Buckets: setBuckets,
    setStep4SelectedBucketId: setSelectedBucketId,
    setStep4BucketName: setBucketName,
    setStep4TokenName: setTokenName,
    setStep4TokenCreated: setTokenCreated,
    setStep4GeneratedToken: setGeneratedToken,
  } = useOnboarding();

  // Device registration state from usepush
  const [checkingDevice, setCheckingDevice] = useState(true);

  // Loading states (questi rimangono locali)
  const [loadingBuckets, setLoadingBuckets] = useState(false);
  const [creatingBucket, setCreatingBucket] = useState(false);
  const [creatingToken, setCreatingToken] = useState(false);

  // GraphQL queries and mutations - con gestione errori per quando non autenticati
  const [fetchBuckets] = useGetBucketsLazyQuery({
    fetchPolicy: "network-only",
    onError: (error) => {
      console.error("[Step4] Error fetching buckets:", error);
      setLoadingBuckets(false);
    },
  });
  const [createBucket] = useCreateBucketMutation({
    onError: (error) => {
      console.error("[Step4] Error creating bucket:", error);
      setCreatingBucket(false);
    },
  });
  const [createToken] = useCreateAccessTokenMutation({
    onError: (error) => {
      console.error("[Step4] Error creating token:", error);
      setCreatingToken(false);
    },
  });

  // Check device registration using usepush
  useEffect(() => {
    checkDeviceRegistration();
  }, []);

  // Monitor deviceRegistered changes to load buckets when device is registered
  useEffect(() => {
    if (push.deviceRegistered && !checkingDevice) {
      loadBuckets();
    }
  }, [push.deviceRegistered, checkingDevice]);

  // Update token name when bucket is selected
  useEffect(() => {
    if (selectedBucketId && !tokenCreated) {
      const selectedBucket = buckets.find((b) => b.id === selectedBucketId);
      if (selectedBucket) {
        setTokenName(selectedBucket.name);
      }
    }
  }, [selectedBucketId, buckets, tokenCreated]);

  const checkDeviceRegistration = async () => {
    try {
      // deviceRegistered è già gestito da usepush
      // Controlliamo solo se dobbiamo caricare i bucket
      if (push.deviceRegistered) {
        await loadBuckets();
      }
    } catch (error) {
      console.error("[Step4] Error checking device registration:", error);
    } finally {
      setCheckingDevice(false);
    }
  };

  const handleRegisterDevice = async () => {
    try {
      const success = await push.registerDevice();
      if (success) {
        console.log("[Step4] Device registered successfully");
        await loadBuckets();
      }
    } catch (error) {
      console.error("[Step4] Error registering device:", error);
    }
  };

  const loadBuckets = async () => {
    // Se abbiamo già i bucket nel context, non ricaricarli
    if (buckets.length > 0) {
      console.log("[Step4] Buckets already loaded from context");
      return;
    }

    setLoadingBuckets(true);
    try {
      const { data } = await fetchBuckets();
      const fetchedBuckets = data?.buckets || [];

      setBuckets(fetchedBuckets as BucketFragment[]);

      // Auto-select first bucket if available
      if (fetchedBuckets.length > 0 && !selectedBucketId) {
        setSelectedBucketId(fetchedBuckets[0].id);
        // Save to context
        setContextBucketId(fetchedBuckets[0].id);
        // Preset token name with first bucket name
        if (!tokenCreated) {
          setTokenName(fetchedBuckets[0].name);
        }
      }
    } catch (error) {
      console.error("[Step4] Error loading buckets:", error);
    } finally {
      setLoadingBuckets(false);
    }
  };

  const handleCreateBucket = async () => {
    if (!bucketName.trim()) {
      return;
    }

    setCreatingBucket(true);
    try {
      const { data } = await createBucket({
        variables: {
          input: {
            name: bucketName.trim(),
            description: t("onboardingV2.step4.defaultBucketDescription"),
            color: theme.colors.primary,
            icon: "inbox",
            isProtected: false,
            isPublic: false,
          },
        },
      });

      if (data?.createBucket) {
        const newBucket = data.createBucket as BucketFragment;
        setBuckets([...buckets, newBucket]);
        setSelectedBucketId(newBucket.id);
        // Save to context
        setContextBucketId(newBucket.id);
        // Preset token name with the newly created bucket name
        if (!tokenCreated) {
          setTokenName(newBucket.name);
        }
        setBucketName("");
      }
    } catch (error) {
      console.error("[Step4] Error creating bucket:", error);
    } finally {
      setCreatingBucket(false);
    }
  };

  const handleCreateToken = async () => {
    if (!selectedBucketId) {
      console.warn("[Step4] No bucket selected for token creation");
      return;
    }

    if (!tokenName.trim()) {
      return;
    }

    setCreatingToken(true);
    try {
      const { data } = await createToken({
        variables: {
          input: {
            name: tokenName.trim(),
          },
        },
      });

      if (data?.createAccessToken) {
        const token = data.createAccessToken.token;
        setGeneratedToken(token);
        // Save to context
        setContextGeneratedToken(token);
        setTokenCreated(true); // Questo ora usa setStep4TokenCreated dal context
      }
    } catch (error) {
      console.error("[Step4] Error creating token:", error);
    } finally {
      setCreatingToken(false);
    }
  };

  const handleBucketSelect = useCallback((bucketId: string) => {
    setSelectedBucketId(bucketId);
    // Save to context
    setContextBucketId(bucketId);
  }, [setContextBucketId]);

  // Rendering states
  if (checkingDevice) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          {t("onboardingV2.step4.checkingDevice")}
        </Text>
      </View>
    );
  }

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
            loading={push.registeringDevice}
            disabled={push.registeringDevice}
            icon="cellphone-link"
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

          {loadingBuckets ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator />
            </View>
          ) : buckets.length > 0 ? (
            <BucketSelector
              label={t("onboardingV2.step4.bucketLabel")}
              buckets={buckets}
              selectedBucketId={selectedBucketId}
              onBucketChange={handleBucketSelect}
            />
          ) : (
            <View style={styles.noBucketsContainer}>
              <Text variant="bodyMedium" style={styles.noBucketsText}>
                {t("onboardingV2.step4.noBuckets")}
              </Text>
              <TextInput
                mode="outlined"
                label={t("onboardingV2.step4.bucketNameLabel")}
                placeholder={t("onboardingV2.step4.bucketNamePlaceholder")}
                value={bucketName}
                onChangeText={setBucketName}
                style={styles.input}
                left={<TextInput.Icon icon="inbox" />}
              />
              <Button
                mode="contained"
                onPress={handleCreateBucket}
                loading={creatingBucket}
                disabled={creatingBucket || !bucketName.trim()}
                icon="plus"
                style={styles.createButton}
              >
                {t("onboardingV2.step4.createBucket")}
              </Button>
            </View>
          )}
        </View>

        {/* Token Creation */}
        {buckets.length > 0 && selectedBucketId && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t("onboardingV2.step4.createToken")}
            </Text>
            <Text variant="bodyMedium" style={styles.sectionDescription}>
              {t("onboardingV2.step4.createTokenDescription")}
            </Text>

            {!tokenCreated ? (
              <>
                <TextInput
                  mode="outlined"
                  label={t("onboardingV2.step4.tokenNameLabel")}
                  placeholder={t("onboardingV2.step4.tokenNamePlaceholder")}
                  value={tokenName}
                  onChangeText={setTokenName}
                  style={styles.input}
                  left={<TextInput.Icon icon="key" />}
                />
                <Button
                  mode="contained"
                  onPress={handleCreateToken}
                  loading={creatingToken}
                  disabled={creatingToken || !tokenName.trim()}
                  icon="key-plus"
                  style={styles.createButton}
                >
                  {t("onboardingV2.step4.generateToken")}
                </Button>
              </>
            ) : (
              <Card style={styles.tokenCard} elevation={1}>
                <Card.Content>
                  <View style={styles.tokenHeader}>
                    <Icon
                      source="check-circle"
                      size={24}
                      color={theme.colors.primary}
                    />
                    <Text variant="titleSmall" style={styles.tokenTitle}>
                      {t("onboardingV2.step4.tokenCreated")}
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={styles.tokenHint}>
                    {t("onboardingV2.step4.tokenHint")}
                  </Text>
                  {generatedToken && (
                    <View style={styles.tokenContainer}>
                      <Text
                        variant="bodySmall"
                        style={styles.tokenText}
                        selectable
                      >
                        {generatedToken}
                      </Text>
                    </View>
                  )}
                </Card.Content>
              </Card>
            )}
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
  createButton: {
    marginTop: 8,
  },
  tokenCard: {
    marginTop: 16,
  },
  tokenHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  tokenTitle: {
    fontWeight: "600",
  },
  tokenHint: {
    marginBottom: 12,
    opacity: 0.7,
  },
  tokenContainer: {
    padding: 12,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 8,
  },
  tokenText: {
    fontFamily: "monospace",
    fontSize: 12,
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
});

export default Step4;
