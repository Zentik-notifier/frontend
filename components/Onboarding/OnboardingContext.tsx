import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { i18nService } from "@/services/i18n";
import { DateFormatStyle, MarkAsReadMode, userSettings } from "@/services/user-settings";
import { ThemePreset } from "@/services/theme-presets";
import { Locale } from "@/hooks/useI18n";
import { UsePushNotifications } from "@/hooks/usePushNotifications";
import { ApiConfigService } from "@/services/api-config";
import { BucketFragment } from "@/generated/gql-operations-generated";

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
  bucketCreated: boolean;
  tokenCreated: boolean;
  step4Buckets: BucketFragment[];
  step4SelectedBucketId: string;
  step4BucketName: string;
  step4TokenName: string;
  step4TokenCreated: boolean;
  step4GeneratedToken: string | null;
  setStep4Buckets: (buckets: BucketFragment[]) => void;
  setStep4SelectedBucketId: (id: string) => void;
  setStep4BucketName: (name: string) => void;
  setStep4TokenName: (name: string) => void;
  setStep4TokenCreated: (created: boolean) => void;
  setStep4GeneratedToken: (token: string | null) => void;
  isStep4Complete: () => boolean;
  
  // Step 5: Test Notification
  sendTestNotification: () => void;
  
  // Step 6: API Integration
  generatedToken: string | null;
  bucketId: string | null;
  setGeneratedToken: (token: string | null) => void;
  setSelectedBucketId: (bucketId: string | null) => void;
  
  // Push notifications
  push: UsePushNotifications;
  
  // Apply all settings at the end
  applySettings: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

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

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children, push }) => {
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
  const [selectedThemePreset, setSelectedThemePreset] = useState<ThemePreset>(ThemePreset.Material3);
  const [selectedDateFormat, setSelectedDateFormat] = useState<DateFormatStyle>("medium");
  const [selectedTimezone, setSelectedTimezone] = useState<string>("UTC");
  const [selectedMarkAsReadMode, setSelectedMarkAsReadMode] = useState<MarkAsReadMode>("on-view");
  
  // Step 3: Retention and Auto-download - Just local state, no persistence here
  const [step3RetentionPreset, setStep3RetentionPreset] = useState<string>("balanced");
  const [step3MaxCacheSizeMB, setStep3MaxCacheSizeMB] = useState<number | undefined>(500);
  const [step3MaxCacheAgeDays, setStep3MaxCacheAgeDays] = useState<number | undefined>(30);
  const [step3MaxNotifications, setStep3MaxNotifications] = useState<number | undefined>(1000);
  const [step3MaxNotificationsDays, setStep3MaxNotificationsDays] = useState<number | undefined>(90);
  const [step3AutoDownloadEnabled, setStep3AutoDownloadEnabled] = useState<boolean>(false);
  const [step3WifiOnlyDownload, setStep3WifiOnlyDownload] = useState<boolean>(true);
  
  // Step 4: Messaging Setup
  const [deviceRegistered] = useState(true);
  const [bucketCreated] = useState(false);
  const [tokenCreated] = useState(false);
  const [step4Buckets, setStep4Buckets] = useState<BucketFragment[]>([]);
  const [step4SelectedBucketId, setStep4SelectedBucketId] = useState<string>("");
  const [step4BucketName, setStep4BucketName] = useState("");
  const [step4TokenName, setStep4TokenName] = useState("");
  const [step4TokenCreated, setStep4TokenCreated] = useState(false);
  const [step4GeneratedToken, setStep4GeneratedToken] = useState<string | null>(null);
  
  // Step 6: API Integration
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  
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
        message: i18nService.t("onboardingV2.step1.enterServerUrl"),
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
          message: i18nService.t("onboardingV2.step1.connectionSuccessful"),
        });
      } else {
        setTestResult({
          success: false,
          message: i18nService.t("onboardingV2.step1.serverNotResponding"),
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: i18nService.t("onboardingV2.step1.connectionFailed"),
      });
    } finally {
      setTestingServer(false);
    }
  }, [customServerUrl]);
  
  const sendTestNotification = useCallback(() => {
    // TODO: Implement test notification logic
    console.log("Sending test notification...");
  }, []);

  const isStep4Complete = useCallback(() => {
    // Step4 è completo se:
    // 1. C'è almeno un bucket (caricato o creato)
    // 2. C'è un bucket selezionato
    // 3. Il token è stato creato
    return (
      step4Buckets.length > 0 &&
      step4SelectedBucketId !== "" &&
      step4TokenCreated &&
      step4GeneratedToken !== null
    );
  }, [step4Buckets, step4SelectedBucketId, step4TokenCreated, step4GeneratedToken]);

  const applySettings = useCallback(async () => {
    try {
      console.log("[Onboarding] Applying all settings...");
      
      // Apply custom server URL if configured
      if (useCustomServer && customServerUrl.trim()) {
        console.log("[Onboarding] Setting custom API URL:", customServerUrl);
        await ApiConfigService.setCustomApiUrl(customServerUrl.trim());
      } else if (!useCustomServer) {
        // Clear custom URL if user disabled it
        console.log("[Onboarding] Clearing custom API URL");
        await ApiConfigService.clearCustomApiUrl();
      }

      // Apply Step 3 retention and auto-download settings
      console.log("[Onboarding] Applying retention policies:", {
        maxCacheSizeMB: step3MaxCacheSizeMB,
        maxCageAgeDays: step3MaxCacheAgeDays,
        maxNotifications: step3MaxNotifications,
        maxNotificationsDays: step3MaxNotificationsDays,
      });
      await userSettings.updateMediaCacheRetentionPolicies({
        maxCacheSizeMB: step3MaxCacheSizeMB,
        maxCageAgeDays: step3MaxCacheAgeDays,
      });
      await userSettings.setMaxCachedNotifications(step3MaxNotifications);
      await userSettings.setMaxCachedNotificationsDay(step3MaxNotificationsDays);

      console.log("[Onboarding] Applying auto-download settings:", {
        autoDownloadEnabled: step3AutoDownloadEnabled,
        wifiOnlyDownload: step3WifiOnlyDownload,
      });
      await userSettings.updateMediaCacheDownloadSettings({
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
    bucketCreated,
    tokenCreated,
    step4Buckets,
    step4SelectedBucketId,
    step4BucketName,
    step4TokenName,
    step4TokenCreated,
    step4GeneratedToken,
    setStep4Buckets,
    setStep4SelectedBucketId,
    setStep4BucketName,
    setStep4TokenName,
    setStep4TokenCreated,
    setStep4GeneratedToken,
    isStep4Complete,
    sendTestNotification,
    generatedToken,
    bucketId: selectedBucketId,
    setGeneratedToken,
    setSelectedBucketId,
    push,
    applySettings,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};
