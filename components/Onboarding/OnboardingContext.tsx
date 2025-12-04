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
  API_PREFIX,
  DateFormatStyle,
  MarkAsReadMode,
  settingsService,
} from "@/services/settings-service";
import { ThemePreset } from "@/services/theme-presets";
import { Locale, useI18n } from "@/hooks/useI18n";
import { UsePushNotifications } from "@/hooks/usePushNotifications";
import { detectRetentionPreset } from "./utils";
import { useAppLog } from "@/hooks/useAppLog";
import { useGetBucketLazyQuery } from "@/generated/gql-operations-generated";
import { useCreateBucket } from "@/hooks/notifications";
import { useQuery } from "@tanstack/react-query";

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
  step4SelectedBucketId: string;
  step4BucketName: string;
  step4BucketSelectionMode: "existing" | "create";
  step4MagicCode: string | null;
  setStep4SelectedBucketId: (id: string) => void;
  setStep4BucketName: (name: string) => void;
  setStep4BucketSelectionMode: (mode: "existing" | "create") => void;
  setStep4MagicCode: (code: string | null) => void;
  isStep4Complete: () => boolean;

  // Step 5: Test Notification
  sendTestNotification: (
    title: string,
    body: string
  ) => Promise<{ success: boolean; message: string }>;

  // Step 6: API Integration
  magicCode: string | null;

  // Push notifications
  push: UsePushNotifications;

  // Apply all settings at the end
  applySettings: () => Promise<void>;

  // Create bucket for Step 4
  createStep4Resources: () => Promise<void>;

  // Reset onboarding to step 1
  resetOnboarding: () => void;

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
  const { logAppEvent } = useAppLog();

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
  const [step4SelectedBucketId, setStep4SelectedBucketId] =
    useState<string>("");
  const [step4BucketGenerated, setStep4BucketGenerated] = useState<
    string | null
  >(null);
  const [step4MagicCode, setStep4MagicCode] = useState<string | null>(null);
  const [step4BucketName, setStep4BucketName] = useState<string>("");
  const [step4BucketSelectionMode, setStep4BucketSelectionMode] = useState<
    "existing" | "create"
  >("existing");

  // Step 6: API Integration
  const [magicCode, setMagicCode] = useState<string | null>(null);

  const { createBucket } = useCreateBucket();
  const [getBucket] = useGetBucketLazyQuery();

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
      // Clean the URL (remove trailing slashes and /api/v1 if present)
      let cleanUrl = customServerUrl.trim().replace(/\/+$/, '');
      cleanUrl = cleanUrl.replace(/\/api\/v1\/?$/, '');
      
      const healthUrl = `${cleanUrl}/${API_PREFIX}/health`;
      
      const response = await fetch(healthUrl, {
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
      logAppEvent({
        event: "onboarding_test_server_connection_error",
        level: "error",
        message: "Failed to test server connection",
        context: "OnboardingContext.testServerConnection",
        error,
        data: { url: customServerUrl },
      }).catch(() => {});
    } finally {
      setTestingServer(false);
    }
  }, [customServerUrl, logAppEvent]);

  const sendTestNotification = useCallback(
    async (
      title: string,
      body: string
    ): Promise<{ success: boolean; message: string }> => {
      if (!step4MagicCode) {
        const msg = "Missing magic code";
        logAppEvent({
          event: "onboarding_send_test_notification_missing_magic_code",
          level: "warn",
          message: msg,
          context: "OnboardingContext.sendTestNotification",
        }).catch(() => {});
        return {
          success: false,
          message: msg,
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
          magicCode: step4MagicCode,
        });

        const response = await fetch(`${apiUrl}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            magicCode: step4MagicCode,
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
          logAppEvent({
            event: "onboarding_send_test_notification_failed",
            level: "error",
            message: "Failed to send test notification",
            context: "OnboardingContext.sendTestNotification",
            data: {
              status: response.status,
              errorText,
            },
          }).catch(() => {});
          return {
            success: false,
            message: "Failed to send test notification",
          };
        }
      } catch (error) {
        console.error("[Onboarding] Failed to send test notification:", error);
        logAppEvent({
          event: "onboarding_send_test_notification_error",
          level: "error",
          message: "Exception while sending test notification",
          context: "OnboardingContext.sendTestNotification",
          error,
        }).catch(() => {});
        return {
          success: false,
          message: "Failed to send test notification",
        };
      }
    },
    [step4MagicCode, logAppEvent]
  );

  const bucketId = useMemo(() => {
    if (step4BucketSelectionMode === "existing") {
      return step4SelectedBucketId;
    } else {
      return step4BucketGenerated;
    }
  }, [step4BucketGenerated, step4SelectedBucketId]);

  const isStep4Complete = useCallback(() => {
    // For create mode, just check if bucket name is filled
    if (step4BucketSelectionMode === "create") {
      return !!step4BucketName && step4BucketName.trim() !== "";
    }
    // For existing mode, just check if a bucket is selected
    return !!step4SelectedBucketId;
  }, [
    step4BucketSelectionMode,
    step4BucketName,
    step4SelectedBucketId,
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
      logAppEvent({
        event: "onboarding_apply_settings_error",
        level: "error",
        message: "Error applying onboarding settings",
        context: "OnboardingContext.applySettings",
        error,
      }).catch(() => {});
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
      let finalMagicCode = null;
      
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
            finalMagicCode = bucket.userBucket?.magicCode || null;
            setStep4BucketGenerated(finalBucketId);
            setStep4SelectedBucketId(finalBucketId);
            setStep4MagicCode(finalMagicCode);
            console.log(
              "[Onboarding] Bucket created successfully:",
              finalBucketId,
              "with magicCode:",
              finalMagicCode
            );
          }
        } catch (error) {
          console.error("[Onboarding] Error creating bucket:", error);
          logAppEvent({
            event: "onboarding_create_bucket_error",
            level: "error",
            message: "Error creating onboarding bucket",
            context: "OnboardingContext.createStep4Resources",
            error,
            data: {
              step4BucketName,
            },
          }).catch(() => {});
          throw error; // Re-throw to prevent onboarding completion
        }
      } else if (step4BucketSelectionMode === "existing" && step4SelectedBucketId) {
        // Fetch magic code for existing bucket
        console.log("[Onboarding] Fetching bucket details for:", step4SelectedBucketId);
        try {
          const { data } = await getBucket({ variables: { id: step4SelectedBucketId } });
          if (data?.bucket?.userBucket?.magicCode) {
            finalMagicCode = data.bucket.userBucket.magicCode;
            setStep4MagicCode(finalMagicCode);
            console.log("[Onboarding] Magic code fetched:", finalMagicCode);
          }
        } catch (error) {
          console.error("[Onboarding] Error fetching bucket details:", error);
        }
      }

      // Set global magic code for Step 6
      if (finalMagicCode) {
        setMagicCode(finalMagicCode);
      }

      console.log("[Onboarding] Step 4 resources created successfully");
    } catch (error) {
      console.error("[Onboarding] Error creating Step 4 resources:", error);
      logAppEvent({
        event: "onboarding_create_step4_resources_error",
        level: "error",
        message: "Error creating Step 4 resources",
        context: "OnboardingContext.createStep4Resources",
        error,
        data: {
          step4BucketSelectionMode,
          step4BucketName,
          step4SelectedBucketId,
        },
      }).catch(() => {});
      throw error;
    }
  }, [
    step4BucketSelectionMode,
    step4BucketName,
    step4SelectedBucketId,
    step4BucketGenerated,
    createBucket,
    getBucket,
    setStep4SelectedBucketId,
    setStep4BucketGenerated,
    setStep4MagicCode,
    setMagicCode,
    logAppEvent,
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
    setStep4BucketGenerated(null);
    setStep4MagicCode(null);
    setStep4BucketName("");
    setStep4BucketSelectionMode("existing");

    // Reset Step 6: API Integration
    setMagicCode(null);
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
    step4SelectedBucketId,
    step4BucketName,
    step4BucketSelectionMode,
    step4MagicCode,
    setStep4SelectedBucketId,
    setStep4BucketName,
    setStep4BucketSelectionMode,
    setStep4MagicCode,
    isStep4Complete,
    sendTestNotification,
    magicCode,
    push,
    applySettings,
    createStep4Resources,
    resetOnboarding,
    bucketId,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};
