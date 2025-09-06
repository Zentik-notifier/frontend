import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect } from "react";

const ONBOARDING_COMPLETED_KEY = "onboarding_completed";

export function useOnboarding() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      setHasCompletedOnboarding(completed === "true");
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      setHasCompletedOnboarding(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
      setHasCompletedOnboarding(true);
      setShowOnboarding(false);
    } catch (error) {
      console.error("Error completing onboarding:", error);
    }
  };

  const startOnboarding = () => {
    setShowOnboarding(true);
  };

  const skipOnboarding = () => {
    setShowOnboarding(false);
  };

  const resetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
      setHasCompletedOnboarding(false);
      setShowOnboarding(false);
    } catch (error) {
      console.error("Error resetting onboarding:", error);
    }
  };

  return {
    hasCompletedOnboarding,
    showOnboarding,
    startOnboarding,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
  };
}
