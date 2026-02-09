import {
  ExternalNotifySystemType,
  useGetExternalNotifySystemsQuery,
  usePublicAppConfigQuery,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React, { memo, useCallback, useMemo } from "react";
import { Keyboard, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Icon,
  RadioButton,
  Switch,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import Selector, { SelectorOption } from "@/components/ui/Selector";
import { useOnboarding } from "./OnboardingContext";

const Step1 = memo(() => {
  const theme = useTheme();
  const { t } = useI18n();
  const { data: appConfig } = usePublicAppConfigQuery();
  const externalNotifySystemsEnabled =
    appConfig?.publicAppConfig?.externalNotifySystemsEnabled ?? false;

  const {
    customServerUrl,
    useCustomServer,
    testingServer,
    testResult,
    setCustomServerUrl,
    setUseCustomServer,
    setTestResult,
    testServerConnection,
    step1ExternalSystemMode,
    setStep1ExternalSystemMode,
    step1SelectedExistingExternalSystemId,
    setStep1SelectedExistingExternalSystemId,
    step1ExternalSystemType,
    setStep1ExternalSystemType,
    step1ExternalSystemName,
    setStep1ExternalSystemName,
    step1ExternalSystemBaseUrl,
    setStep1ExternalSystemBaseUrl,
    step1ExternalSystemAuthUser,
    setStep1ExternalSystemAuthUser,
    step1ExternalSystemAuthPassword,
    setStep1ExternalSystemAuthPassword,
    step1ExternalSystemAuthToken,
    setStep1ExternalSystemAuthToken,
  } = useOnboarding();

  const { data: externalSystemsData } = useGetExternalNotifySystemsQuery();
  const externalSystems = externalSystemsData?.externalNotifySystems ?? [];

  const externalSystemTypeOptions: SelectorOption[] = useMemo(
    () => [
      {
        id: ExternalNotifySystemType.Ntfy,
        name: t("externalServers.form.typeNtfy"),
        iconUrl: require("@/assets/icons/ntfy.svg"),
      },
      {
        id: ExternalNotifySystemType.Gotify,
        name: t("externalServers.form.typeGotify"),
        iconUrl: require("@/assets/icons/gotify.png"),
      },
    ],
    [t]
  );

  const existingExternalSystemOptions: SelectorOption[] = useMemo(() => {
    return externalSystems.map((sys) => ({
      id: sys.id,
      name: sys.name,
      iconUrl: sys.iconUrl
        ? { uri: sys.iconUrl }
        : sys.type === ExternalNotifySystemType.Ntfy
          ? require("@/assets/icons/ntfy.svg")
          : require("@/assets/icons/gotify.png"),
    }));
  }, [externalSystems]);

  const handleCustomServerUrlChange = useCallback((text: string) => {
    setCustomServerUrl(text);
    setTestResult(null);
  }, [setCustomServerUrl, setTestResult]);

  const handleUseCustomServerChange = useCallback((value: boolean) => {
    setUseCustomServer(value);
  }, [setUseCustomServer]);

  return (
    <ScrollView
      style={styles.stepContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.stepContent}>
        <Icon source="server" size={64} color={theme.colors.primary} />
        <Text variant="headlineMedium" style={styles.stepTitle}>
          {t("onboardingV2.step1.title")}
        </Text>
        <Text variant="bodyLarge" style={styles.stepDescription}>
          {t("onboardingV2.step1.description")}
        </Text>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t("onboardingV2.step1.serverConfiguration")}
          </Text>

          <View style={styles.switchRow}>
            <Text variant="bodyMedium">{t("onboardingV2.step1.useCustomServer")}</Text>
            <Switch
              value={useCustomServer}
              onValueChange={handleUseCustomServerChange}
            />
          </View>

          {useCustomServer && (
            <View style={styles.customServerSection}>
              <TextInput
                mode="outlined"
                label={t("onboardingV2.step1.customServerUrl")}
                value={customServerUrl}
                onChangeText={handleCustomServerUrlChange}
                placeholder={t("onboardingV2.step1.customServerPlaceholder")}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              <Button
                mode="contained-tonal"
                onPress={testServerConnection}
                loading={testingServer}
                disabled={testingServer || !customServerUrl}
                icon="test-tube"
                style={styles.testButton}
              >
                {t("onboardingV2.step1.testConnection")}
              </Button>

              {testResult && (
                <Card
                  style={[
                    styles.testResultCard,
                    {
                      backgroundColor: testResult.success
                        ? "rgba(76, 175, 80, 0.1)"
                        : "rgba(244, 67, 54, 0.1)",
                      borderColor: testResult.success ? "#4CAF50" : "#F44336",
                    },
                  ]}
                >
                  <Card.Content style={styles.testResultContent}>
                    <Icon
                      source={
                        testResult.success ? "check-circle" : "alert-circle"
                      }
                      size={20}
                      color={testResult.success ? "#4CAF50" : "#F44336"}
                    />
                    <Text
                      variant="bodySmall"
                      style={[
                        styles.testResultText,
                        {
                          color: testResult.success ? "#4CAF50" : "#F44336",
                        },
                      ]}
                    >
                      {testResult.message}
                    </Text>
                  </Card.Content>
                </Card>
              )}
            </View>
          )}
        </View>

        {externalNotifySystemsEnabled && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t("onboardingV2.step1.externalSystemTitle")}
            </Text>
            <RadioButton.Group
              value={step1ExternalSystemMode}
              onValueChange={(value) =>
                setStep1ExternalSystemMode(value as "none" | "create" | "existing")
              }
            >
              <RadioButton.Item
                label={t("onboardingV2.step1.externalSystemNone")}
                value="none"
              />
              <RadioButton.Item
                label={t("onboardingV2.step1.externalSystemUseExisting")}
                value="existing"
              />
              <RadioButton.Item
                label={t("onboardingV2.step1.externalSystemCreateNew")}
                value="create"
              />
            </RadioButton.Group>
            {step1ExternalSystemMode === "existing" && (
              <View style={styles.customServerSection}>
                <Selector
                  mode="inline"
                  label={t("onboardingV2.step1.selectExistingExternalSystem")}
                  selectedValue={step1SelectedExistingExternalSystemId ?? ""}
                  onValueChange={(id) =>
                    setStep1SelectedExistingExternalSystemId(id || null)
                  }
                  options={existingExternalSystemOptions}
                  placeholder={t("onboardingV2.step1.selectExistingPlaceholder")}
                />
              </View>
            )}
            {step1ExternalSystemMode === "create" && (
              <View style={styles.customServerSection}>
                <TextInput
                  mode="outlined"
                  label={t("externalServers.form.name")}
                  value={step1ExternalSystemName}
                  onChangeText={setStep1ExternalSystemName}
                  placeholder={t("externalServers.form.namePlaceholder")}
                  style={styles.input}
                  autoCapitalize="none"
                />
                <Selector
                  mode="inline"
                  label={t("externalServers.form.type")}
                  selectedValue={step1ExternalSystemType}
                  onValueChange={setStep1ExternalSystemType}
                  options={externalSystemTypeOptions}
                />
                <TextInput
                  mode="outlined"
                  label={t("externalServers.form.baseUrl")}
                  value={step1ExternalSystemBaseUrl}
                  onChangeText={setStep1ExternalSystemBaseUrl}
                  placeholder={t("externalServers.form.baseUrlPlaceholder")}
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
                {step1ExternalSystemType === ExternalNotifySystemType.Ntfy && (
                  <>
                    <TextInput
                      mode="outlined"
                      label={t("externalServers.form.authUser")}
                      value={step1ExternalSystemAuthUser}
                      onChangeText={setStep1ExternalSystemAuthUser}
                      style={styles.input}
                      autoCapitalize="none"
                    />
                    <TextInput
                      mode="outlined"
                      label={t("externalServers.form.authPassword")}
                      value={step1ExternalSystemAuthPassword}
                      onChangeText={setStep1ExternalSystemAuthPassword}
                      secureTextEntry
                      style={styles.input}
                    />
                  </>
                )}
                {step1ExternalSystemType === ExternalNotifySystemType.Gotify && (
                  <TextInput
                    mode="outlined"
                    label={t("externalServers.form.authToken")}
                    value={step1ExternalSystemAuthToken}
                    onChangeText={setStep1ExternalSystemAuthToken}
                    placeholder={t("externalServers.form.authTokenPlaceholder")}
                    style={styles.input}
                    autoCapitalize="none"
                    secureTextEntry
                  />
                )}
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
});

Step1.displayName = "Step1";

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
  section: {
    width: "100%",
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  customServerSection: {
    marginTop: 16,
    gap: 12,
  },
  input: {
    marginBottom: 8,
  },
  testButton: {
    marginTop: 8,
  },
  testResultCard: {
    marginTop: 12,
    borderWidth: 2,
  },
  testResultContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  testResultText: {
    flex: 1,
    fontWeight: "500",
  },
});

export default Step1;
