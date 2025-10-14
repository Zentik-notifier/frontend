import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { i18nService } from "@/services/i18n";
import { DateFormatStyle, MarkAsReadMode } from "@/services/user-settings";
import { ThemePreset } from "@/services/theme-presets";
import { Locale } from "@/hooks/useI18n";

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
  
  // Step 4: Messaging Setup
  deviceRegistered: boolean;
  bucketCreated: boolean;
  tokenCreated: boolean;
  
  // Step 5: Test Notification
  sendTestNotification: () => void;
  
  // Step 6: API Integration
  generatedToken: string | null;
  bucketId: string | null;
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
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
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
  
  // Step 4: Messaging Setup
  const [deviceRegistered] = useState(true);
  const [bucketCreated] = useState(false);
  const [tokenCreated] = useState(false);
  
  // Step 6: API Integration
  const [generatedToken] = useState<string | null>(null);
  const [bucketId] = useState<string | null>(null);
  
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
    deviceRegistered,
    bucketCreated,
    tokenCreated,
    sendTestNotification,
    generatedToken,
    bucketId,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};
