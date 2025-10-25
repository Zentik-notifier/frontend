import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
  useMemo,
} from "react";
import {
  DateFormatStyle,
  MarkAsReadMode,
  settingsService,
} from "@/services/settings-service";
import { ThemePreset } from "@/services/theme-presets";
import { Locale, useI18n } from "@/hooks/useI18n";
import { UsePushNotifications } from "@/hooks/usePushNotifications";
import { detectRetentionPreset } from "./utils";
import { useCreateAccessTokenForBucketMutation } from "@/generated/gql-operations-generated";
import { useCreateBucket } from "@/hooks/notifications";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface OnboardingContextType {
  // Navigation
  currentStep: Step;
  goToNextStep: () => void;
  goToPreviousStep: () => void;

  // Step 1: Server Configuration
  customServerUrl: string;
  useCustomServer: boolean;
  testingServer: boolean;
  testResult: { success: boolean; message: string } | null;
  setCustomServerUrl: (url: string) => void;
  setUseCustomServer: (value: boolean) => void;
  setTestingServer: (value: boolean) => void;
  setTestResult: (result: { success: boolean; message: string } | null) => void;
  testServerConnection: () => Promise<void>;

  // Step 2: UI Preferences
  selectedLanguage: Locale;
  selectedThemePreset: ThemePreset;
  selectedDateFormat: DateFormatStyle;
  selectedTimezone: string;
  selectedMarkAsReadMode: MarkAsReadMode;
  setSelectedLanguage: (lang: Locale) => void;
  setSelectedThemePreset: (preset: ThemePreset) => void;
  setSelectedDateFormat: (format: DateFormatStyle) => void;
  setSelectedTimezone: (timezone: string) => void;
  setSelectedMarkAsReadMode: (mode: MarkAsReadMode) => void;

  // Step 3: Retention and Auto-download
  step3RetentionPreset: string;
  setStep3RetentionPreset: (preset: string) => void;
  step3MaxCacheSizeMB: number | undefined;
  setStep3MaxCacheSizeMB: (value: number | undefined) => void;
  step3MaxCacheAgeDays: number | undefined;
  setStep3MaxCacheAgeDays: (value: number | undefined) => void;
  step3MaxNotifications: number | undefined;
  setStep3MaxNotifications: (value: number | undefined) => void;
  step3MaxNotificationsDays: number | undefined;
  setStep3MaxNotificationsDays: (value: number | undefined) => void;
  step3AutoDownloadEnabled: boolean;
  setStep3AutoDownloadEnabled: (enabled: boolean) => void;
  step3WifiOnlyDownload: boolean;
  setStep3WifiOnlyDownload: (wifiOnly: boolean) => void;

  // Step 4: Messaging Setup
  deviceRegistered: boolean;
  tokenCreated: boolean;
  step4SelectedBucketId: string;
  step4GeneratedToken: string | null;
  step4SelectedTokenId: string | null;
  step4TokenSelectionMode: "existing" | "create";
  step4BucketName: string;
  step4BucketSelectionMode: "existing" | "create";
  setStep4SelectedBucketId: (id: string) => void;
  setStep4GeneratedToken: (token: string | null) => void;
  setStep4SelectedTokenId: (tokenId: string | null) => void;
  setStep4TokenSelectionMode: (mode: "existing" | "create") => void;
  setStep4BucketName: (name: string) => void;
  setStep4BucketSelectionMode: (mode: "existing" | "create") => void;
  isStep4Complete: () => boolean;

  // Step 5: Test Notification
  sendTestNotification: (
    title: string,
    body: string
  ) => Promise<{ success: boolean; message: string }>;

  // Step 6: API Integration
  generatedToken: string | null;
  setGeneratedToken: (token: string | null) => void;

  // Push notifications
  push: UsePushNotifications;

  // Apply all settings at the end
  applySettings: () => Promise<void>;

  // Create bucket and token for Step 4
  createStep4Resources: () => Promise<void>;

  // Reset onboarding to step 1
  resetOnboarding: () => void;

  token?: string | null;
  bucketId?: string | null;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined
);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
};

interface OnboardingProviderProps {
  children: ReactNode;
  push: UsePushNotifications;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({
  children,
  push,
}) => {
  const { t } = useI18n();

  // Navigation
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Step 1: Server Configuration
  const [customServerUrl, setCustomServerUrl] = useState("");
  const [useCustomServer, setUseCustomServer] = useState(false);
  const [testingServer, setTestingServer] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Step 2: UI Preferences - Just local state, no persistence here
  const [selectedLanguage, setSelectedLanguage] = useState<Locale>("en-EN");
  const [selectedThemePreset, setSelectedThemePreset] = useState<ThemePreset>(
    ThemePreset.Material3
  );
  const [selectedDateFormat, setSelectedDateFormat] =
    useState<DateFormatStyle>("medium");
  const [selectedTimezone, setSelectedTimezone] = useState<string>("UTC");
  const [selectedMarkAsReadMode, setSelectedMarkAsReadMode] =
    useState<MarkAsReadMode>("on-view");

  // Step 3: Retention and Auto-download - Just local state, no persistence here
  const [step3RetentionPreset, setStep3RetentionPreset] =
    useState<string>("balanced");
  const [step3MaxCacheSizeMB, setStep3MaxCacheSizeMB] = useState<
    number | undefined
  >(500);
  const [step3MaxCacheAgeDays, setStep3MaxCacheAgeDays] = useState<
    number | undefined
  >(30);
  const [step3MaxNotifications, setStep3MaxNotifications] = useState<
    number | undefined
  >(1000);
  const [step3MaxNotificationsDays, setStep3MaxNotificationsDays] = useState<
    number | undefined
  >(90);
  const [step3AutoDownloadEnabled, setStep3AutoDownloadEnabled] =
    useState<boolean>(true); // Default ON
  const [step3WifiOnlyDownload, setStep3WifiOnlyDownload] =
    useState<boolean>(false); // Default OFF

  // Initialize download settings and retention preset with current values from settings service
  useEffect(() => {
    try {
      const currentDownloadSettings = settingsService.getDownloadSettings();
      setStep3AutoDownloadEnabled(currentDownloadSettings.autoDownloadEnabled);
      setStep3WifiOnlyDownload(currentDownloadSettings.wifiOnlyDownload);

      // Initialize retention preset based on current settings
      const currentRetentionPolicies = settingsService.getRetentionPolicies();
      const detectedPreset = detectRetentionPreset(currentRetentionPolicies);
      setStep3RetentionPreset(detectedPreset);

      // If custom preset, set the current values
      if (detectedPreset === "custom") {
        setStep3MaxCacheSizeMB(currentRetentionPolicies.maxCacheSizeMB);
        setStep3MaxCacheAgeDays(currentRetentionPolicies.maxCageAgeDays);
        setStep3MaxNotifications(
          currentRetentionPolicies.maxCachedNotifications
        );
        setStep3MaxNotificationsDays(
          currentRetentionPolicies.maxCachedNotificationsDay
        );
      }
    } catch (error) {
      console.warn(
        "[Onboarding] Could not load current settings, using defaults:",
        error
      );
    }
  }, []);

  // Step 4: Messaging Setup
  const [deviceRegistered] = useState(true);
  const [tokenCreated] = useState(false);
  const [step4SelectedBucketId, setStep4SelectedBucketId] =
    useState<string>("");
  const [step4BucketGenerated, setStep4BucketGenerated] = useState<
    string | null
  >(null);
  const [step4GeneratedToken, setStep4GeneratedToken] = useState<string | null>(
    null
  );
  const [step4SelectedTokenId, setStep4SelectedTokenId] = useState<
    string | null
  >(null);
  const [step4TokenSelectionMode, setStep4TokenSelectionMode] = useState<
    "existing" | "create"
  >("existing");
  const [step4BucketName, setStep4BucketName] = useState<string>(
    t("onboardingV2.step4.bucketNamePlaceholder")
  );
  const [step4BucketSelectionMode, setStep4BucketSelectionMode] = useState<
    "existing" | "create"
  >("existing");

  // Step 6: API Integration
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  // Mutation for creating bucket-scoped tokens
  const [createAccessTokenForBucket] = useCreateAccessTokenForBucketMutation();
  const { createBucket } = useCreateBucket();

  const goToNextStep = useCallback(() => {
    if (currentStep < 6) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  }, [currentStep]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  }, [currentStep]);

  const testServerConnection = useCallback(async () => {
    if (!customServerUrl) {
      setTestResult({
        success: false,
        message: "Please enter a server URL",
      });
      return;
    }

    setTestingServer(true);
    setTestResult(null);
    try {
      const response = await fetch(`${customServerUrl}/health`, {
        method: "GET",
      });

      if (response.ok) {
        setTestResult({
          success: true,
          message: "Connection successful",
        });
      } else {
        setTestResult({
          success: false,
          message: "Server not responding",
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: "Connection failed",
      });
    } finally {
      setTestingServer(false);
    }
  }, [customServerUrl]);

  const sendTestNotification = useCallback(
    async (
      title: string,
      body: string
    ): Promise<{ success: boolean; message: string }> => {
      if (!step4GeneratedToken || !step4SelectedBucketId) {
        return {
          success: false,
          message: "Missing token or bucket ID",
        };
      }

      if (!title.trim() || !body.trim()) {
        return {
          success: false,
          message: "Title and body are required",
        };
      }

      try {
        const apiUrl = settingsService.getApiBaseWithPrefix();
        console.log("[Onboarding] Sending test notification:", {
          apiUrl,
          token: step4GeneratedToken,
          bucketId: step4SelectedBucketId,
        });

        const response = await fetch(`${apiUrl}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${step4GeneratedToken}`,
          },
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            bucketId: step4SelectedBucketId,
            actions: [],
            addMarkAsReadAction: false,
            addDeleteAction: false,
            addSnoozeAction: false,
            addOpenAction: false,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log(
            "[Onboarding] Test notification sent successfully:",
            data.id
          );
          return {
            success: true,
            message: "Test notification sent successfully!",
          };
        } else {
          const errorText = await response.text();
          console.error(
            "[Onboarding] Error sending test notification:",
            response.status,
            errorText
          );
          return {
            success: false,
            message: "Failed to send test notification",
          };
        }
      } catch (error) {
        console.error("[Onboarding] Failed to send test notification:", error);
        return {
          success: false,
          message: "Failed to send test notification",
        };
      }
    },
    [step4GeneratedToken, step4SelectedBucketId]
  );

  const bucketId = useMemo(() => {
    if (step4BucketSelectionMode === "existing") {
      return step4SelectedBucketId;
    } else {
      return step4BucketGenerated;
    }
  }, [step4BucketGenerated, step4SelectedBucketId]);

  const token = useMemo(() => {
    if (step4TokenSelectionMode === "existing") {
      return step4SelectedTokenId;
    } else {
      return step4GeneratedToken;
    }
  }, [step4GeneratedToken, step4SelectedTokenId]);

  const isStep4Complete = useCallback(() => {
    const isBucketValid =
      step4BucketSelectionMode === "existing" ? !!step4SelectedBucketId : true;

    const isTokenValid =
      step4TokenSelectionMode === "existing" ? !!step4SelectedTokenId : true;

    return isBucketValid && isTokenValid;
  }, [
    step4BucketSelectionMode,
    step4BucketGenerated,
    step4SelectedBucketId,
    step4TokenSelectionMode,
    step4SelectedTokenId,
    step4GeneratedToken,
  ]);

  const applySettings = useCallback(async () => {
    try {
      console.log("[Onboarding] Applying all settings...");

      // Apply custom server URL if configured
      if (useCustomServer && customServerUrl.trim()) {
        console.log("[Onboarding] Setting custom API URL:", customServerUrl);
        await settingsService.saveApiEndpoint(customServerUrl.trim());
      } else if (!useCustomServer) {
        // Clear custom URL if user disabled it
        console.log("[Onboarding] Clearing custom API URL");
        await settingsService.clearApiEndpoint();
      }

      // Apply Step 3 retention and auto-download settings
      console.log("[Onboarding] Applying retention policies:", {
        maxCacheSizeMB: step3MaxCacheSizeMB,
        maxCageAgeDays: step3MaxCacheAgeDays,
        maxNotifications: step3MaxNotifications,
        maxNotificationsDays: step3MaxNotificationsDays,
      });
      await settingsService.updateRetentionPolicies({
        maxCacheSizeMB: step3MaxCacheSizeMB,
        maxCageAgeDays: step3MaxCacheAgeDays,
        maxCachedNotifications: step3MaxNotifications,
        maxCachedNotificationsDay: step3MaxNotificationsDays,
      });

      console.log("[Onboarding] Applying auto-download settings:", {
        autoDownloadEnabled: step3AutoDownloadEnabled,
        wifiOnlyDownload: step3WifiOnlyDownload,
      });
      await settingsService.updateDownloadSettings({
        autoDownloadEnabled: step3AutoDownloadEnabled,
        wifiOnlyDownload: step3WifiOnlyDownload,
      });

      console.log("[Onboarding] All settings applied successfully");
    } catch (error) {
      console.error("[Onboarding] Error applying settings:", error);
      throw error;
    }
  }, [
    useCustomServer,
    customServerUrl,
    step3MaxCacheSizeMB,
    step3MaxCacheAgeDays,
    step3MaxNotifications,
    step3MaxNotificationsDays,
    step3AutoDownloadEnabled,
    step3WifiOnlyDownload,
  ]);

  const createStep4Resources = useCallback(async () => {
    try {
      console.log(
        "[Onboarding] Creating Step 4 resources...",
        step4BucketSelectionMode,
        step4BucketName
      );

      // Create bucket automatically if in create mode and not already created
      let finalBucketId = step4SelectedBucketId;
      if (
        step4BucketSelectionMode === "create" &&
        step4BucketName.trim() &&
        !step4BucketGenerated
      ) {
        console.log(
          "[Onboarding] Creating bucket automatically:",
          step4BucketName
        );
        try {
          const bucket = await createBucket({
            name: step4BucketName.trim(),
            description: "Bucket created during onboarding",
            color: "#2196F3",
            icon: "inbox",
            isProtected: false,
            isPublic: false,
          });

          if (bucket?.id) {
            finalBucketId = bucket.id;
            setStep4BucketGenerated(finalBucketId);
            setStep4SelectedBucketId(finalBucketId);
            console.log(
              "[Onboarding] Bucket created successfully:",
              finalBucketId
            );
          }
        } catch (error) {
          console.error("[Onboarding] Error creating bucket:", error);
          throw error; // Re-throw to prevent onboarding completion
        }
      }

      // Generate token automatically if in create mode and not already created
      if (
        step4TokenSelectionMode === "create" &&
        finalBucketId &&
        !step4GeneratedToken
      ) {
        console.log(
          "[Onboarding] Generating token automatically for bucket:",
          finalBucketId
        );
        try {
          const { data } = await createAccessTokenForBucket({
            variables: {
              bucketId: finalBucketId,
              name: "Onboarding Token",
            },
          });

          if (data?.createAccessTokenForBucket?.token) {
            setStep4GeneratedToken(data.createAccessTokenForBucket.token);
            setGeneratedToken(data.createAccessTokenForBucket.token);
            console.log("[Onboarding] Token generated successfully");
          }
        } catch (error) {
          console.error("[Onboarding] Error generating token:", error);
          throw error; // Re-throw to prevent onboarding completion
        }
      }

      console.log("[Onboarding] Step 4 resources created successfully");
    } catch (error) {
      console.error("[Onboarding] Error creating Step 4 resources:", error);
      throw error;
    }
  }, [
    step4BucketSelectionMode,
    step4BucketName,
    step4SelectedBucketId,
    step4TokenSelectionMode,
    step4GeneratedToken,
    createBucket,
    createAccessTokenForBucket,
    setStep4SelectedBucketId,
    setStep4GeneratedToken,
    setGeneratedToken,
  ]);

  const resetOnboarding = useCallback(() => {
    console.log("[Onboarding] Resetting onboarding to step 1");

    // Reset to step 1
    setCurrentStep(1);

    // Reset Step 1: Server Configuration
    setCustomServerUrl("");
    setUseCustomServer(false);
    setTestingServer(false);
    setTestResult(null);

    // Reset Step 2: UI Preferences to defaults
    setSelectedLanguage("en-EN");
    setSelectedThemePreset(ThemePreset.Material3);
    setSelectedDateFormat("medium");
    setSelectedTimezone("UTC");
    setSelectedMarkAsReadMode("on-view");

    // Reset Step 3: Retention and Auto-download to defaults
    // Note: Retention preset will be auto-detected from current settings in useEffect
    setStep3MaxCacheSizeMB(500);
    setStep3MaxCacheAgeDays(30);
    setStep3MaxNotifications(1000);
    setStep3MaxNotificationsDays(90);
    setStep3AutoDownloadEnabled(true); // Default ON
    setStep3WifiOnlyDownload(false); // Default OFF

    // Reset Step 4: Messaging Setup
    setStep4SelectedBucketId("");
    setStep4GeneratedToken(null);
    setStep4SelectedTokenId(null);
    setStep4TokenSelectionMode("existing");
    setStep4BucketName(t("onboardingV2.step4.bucketNamePlaceholder"));
    setStep4BucketSelectionMode("existing");

    // Reset Step 6: API Integration
    setGeneratedToken(null);
  }, []);

  const value: OnboardingContextType = {
    currentStep,
    goToNextStep,
    goToPreviousStep,
    customServerUrl,
    useCustomServer,
    testingServer,
    testResult,
    setCustomServerUrl,
    setUseCustomServer,
    setTestingServer,
    setTestResult,
    testServerConnection,
    selectedLanguage,
    selectedThemePreset,
    selectedDateFormat,
    selectedTimezone,
    selectedMarkAsReadMode,
    setSelectedLanguage,
    setSelectedThemePreset,
    setSelectedDateFormat,
    setSelectedTimezone,
    setSelectedMarkAsReadMode,
    step3RetentionPreset,
    setStep3RetentionPreset,
    step3MaxCacheSizeMB,
    setStep3MaxCacheSizeMB,
    step3MaxCacheAgeDays,
    setStep3MaxCacheAgeDays,
    step3MaxNotifications,
    setStep3MaxNotifications,
    step3MaxNotificationsDays,
    setStep3MaxNotificationsDays,
    step3AutoDownloadEnabled,
    setStep3AutoDownloadEnabled,
    step3WifiOnlyDownload,
    setStep3WifiOnlyDownload,
    deviceRegistered,
    tokenCreated,
    step4SelectedBucketId,
    step4GeneratedToken,
    step4SelectedTokenId,
    step4TokenSelectionMode,
    step4BucketName,
    step4BucketSelectionMode,
    setStep4SelectedBucketId,
    setStep4GeneratedToken,
    setStep4SelectedTokenId,
    setStep4TokenSelectionMode,
    setStep4BucketName,
    setStep4BucketSelectionMode,
    isStep4Complete,
    sendTestNotification,
    generatedToken,
    setGeneratedToken,
    push,
    applySettings,
    createStep4Resources,
    resetOnboarding,
    bucketId,
    token,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};
