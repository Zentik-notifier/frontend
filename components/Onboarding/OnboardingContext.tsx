import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

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
  selectedLanguage: "en" | "it";
  selectedTheme: "light" | "dark" | "auto";
  selectedMarkAsReadMode: "manual" | "onOpen" | "onClose";
  setSelectedLanguage: (lang: "en" | "it") => void;
  setSelectedTheme: (theme: "light" | "dark" | "auto") => void;
  setSelectedMarkAsReadMode: (mode: "manual" | "onOpen" | "onClose") => void;
  
  // Step 3: Data Retention
  selectedRetentionLevel: "minimal" | "balanced" | "maximum";
  autoDownloadImages: boolean;
  autoDownloadVideos: boolean;
  autoDownloadAudio: boolean;
  setSelectedRetentionLevel: (level: "minimal" | "balanced" | "maximum") => void;
  setAutoDownloadImages: (value: boolean) => void;
  setAutoDownloadVideos: (value: boolean) => void;
  setAutoDownloadAudio: (value: boolean) => void;
  
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
  
  // Step 2: UI Preferences
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "it">("en");
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark" | "auto">("auto");
  const [selectedMarkAsReadMode, setSelectedMarkAsReadMode] = useState<"manual" | "onOpen" | "onClose">("manual");
  
  // Step 3: Data Retention
  const [selectedRetentionLevel, setSelectedRetentionLevel] = useState<"minimal" | "balanced" | "maximum">("balanced");
  const [autoDownloadImages, setAutoDownloadImages] = useState(true);
  const [autoDownloadVideos, setAutoDownloadVideos] = useState(false);
  const [autoDownloadAudio, setAutoDownloadAudio] = useState(true);
  
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
          message: "Server connection successful!",
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
        message: "Connection failed. Please check the URL",
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
    selectedTheme,
    selectedMarkAsReadMode,
    setSelectedLanguage,
    setSelectedTheme,
    setSelectedMarkAsReadMode,
    selectedRetentionLevel,
    autoDownloadImages,
    autoDownloadVideos,
    autoDownloadAudio,
    setSelectedRetentionLevel,
    setAutoDownloadImages,
    setAutoDownloadVideos,
    setAutoDownloadAudio,
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
