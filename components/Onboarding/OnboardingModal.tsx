import React, { memo, useCallback, useMemo, useState, useEffect } from "react";
import { Platform, StyleSheet, View, Keyboard } from "react-native";
import { Button, Modal, Portal, Text, useTheme } from "react-native-paper";
import { OnboardingProvider, useOnboarding } from "./OnboardingContext";
import { UsePushNotifications } from "@/hooks/usePushNotifications";
import { useAppLog } from "@/hooks/useAppLog";
import { useSettings } from "@/hooks/useSettings";
import Step1 from "./Step1";
import Step2 from "./Step2";
import Step3 from "./Step3";
import Step4 from "./Step4";
import Step5 from "./Step5";
import Step6 from "./Step6";

interface OnboardingModalProps {
  onClose: () => void;
  push: UsePushNotifications;
}

// Modal Header Component
interface ModalHeaderProps {
  onSkip: () => void;
}

const ModalHeader = memo<ModalHeaderProps>(({ onSkip }) => (
  <View style={styles.modalHeader}>
    <Text variant="titleLarge">Setup Wizard</Text>
    <Button mode="text" onPress={onSkip}>
      Skip
    </Button>
  </View>
));

ModalHeader.displayName = "ModalHeader";

// Progress Indicator Component
const ProgressIndicator = memo(() => {
  const theme = useTheme();
  const { currentStep } = useOnboarding();

  return (
    <View style={styles.progressContainer}>
      {[1, 2, 3, 4, 5, 6].map((step) => (
        <View
          key={step}
          style={[
            styles.progressDot,
            {
              backgroundColor:
                step <= currentStep
                  ? theme.colors.primary
                  : theme.colors.surfaceVariant,
            },
          ]}
        />
      ))}
    </View>
  );
});

ProgressIndicator.displayName = "ProgressIndicator";

// Navigation Buttons Component
interface NavigationButtonsProps {
  onClose: () => void;
}

const NavigationButtons = memo<NavigationButtonsProps>(({ onClose }) => {
  const {
    currentStep,
    goToPreviousStep,
    goToNextStep,
    applySettings,
    createStep4Resources,
    isStep4Complete,
    resetOnboarding,
  } = useOnboarding();
  const { completeOnboarding, skipOnboarding } = useSettings();
  const [isApplying, setIsApplying] = React.useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const { logAppEvent } = useAppLog();

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleNext = useCallback(async () => {
    if (currentStep === 4) {
      // Create bucket and token for Step 4 before proceeding
      setIsApplying(true);
      try {
        await createStep4Resources();
        console.log("[Onboarding] Step 4 resources created successfully");
        goToNextStep();
      } catch (error) {
        console.error("[Onboarding] Error creating Step 4 resources:", error);
        // Don't proceed to next step if creation failed
      } finally {
        setIsApplying(false);
      }
    } else if (currentStep === 6) {
      // Apply all settings before closing
      setIsApplying(true);
      try {
        await applySettings();
        // Mark onboarding as completed
        await completeOnboarding();
        console.log("[Onboarding] Completed successfully");
        logAppEvent({
          event: "onboarding_completed",
          level: "info",
          message: "Onboarding completed successfully with all settings",
          context: "OnboardingModal.NavigationButtons.handleNext",
        }).catch(() => {});
        resetOnboarding(); // Reset to step 1 for next time
        onClose();
      } catch (error) {
        console.error("[Onboarding] Error applying settings:", error);
        logAppEvent({
          event: "onboarding_complete_error",
          level: "error",
          message: "Error while completing onboarding",
          context: "OnboardingModal.NavigationButtons.handleNext",
          error,
          data: { currentStep },
        }).catch(() => {});
        // Still close and mark as completed even if there's an error
        await completeOnboarding();
        resetOnboarding(); // Reset to step 1 for next time
        onClose();
      } finally {
        setIsApplying(false);
      }
    } else {
      goToNextStep();
    }
  }, [
    currentStep,
    goToNextStep,
    onClose,
    applySettings,
    createStep4Resources,
    completeOnboarding,
    resetOnboarding,
  ]);

  // Disabilita Next in Step4 se non è completo
  const isNextDisabled =
    isApplying || (currentStep === 4 && !isStep4Complete());

  return (
    <View
      style={[
        styles.navigationButtons,
        keyboardVisible && styles.navigationButtonsWithKeyboard,
      ]}
    >
      {currentStep > 1 && (
        <Button
          mode="outlined"
          onPress={goToPreviousStep}
          style={styles.navButton}
          disabled={isApplying}
        >
          Back
        </Button>
      )}
      <Button
        mode="contained"
        onPress={handleNext}
        style={styles.navButton}
        loading={isApplying}
        disabled={isNextDisabled}
      >
        {currentStep === 6 ? "Finish" : "Next"}
      </Button>
    </View>
  );
});

NavigationButtons.displayName = "NavigationButtons";

// Step Renderer Component
const StepRenderer = memo(({ push }: { push: UsePushNotifications }) => {
  const { currentStep } = useOnboarding();

  const currentStepComponent = useMemo(() => {
    switch (currentStep) {
      case 1:
        return <Step1 />;
      case 2:
        return <Step2 />;
      case 3:
        return <Step3 />;
      case 4:
        return <Step4 push={push} />;
      case 5:
        return <Step5 />;
      case 6:
        return <Step6 />;
      default:
        return null;
    }
  }, [currentStep]);

  return <View style={styles.stepWrapper}>{currentStepComponent}</View>;
});

StepRenderer.displayName = "StepRenderer";

// Main Modal Component with Content
const OnboardingModalV2Content: React.FC<OnboardingModalProps> = memo(
  ({ onClose, push }) => {
    const theme = useTheme();
    const { skipOnboarding } = useSettings();
    const { currentStep } = useOnboarding();
    const { logAppEvent } = useAppLog();

    const handleSkip = useCallback(async () => {
      console.log("[Onboarding] Skipped by user");
      logAppEvent({
        event: "onboarding_skipped",
        level: "info",
        message: "User skipped onboarding",
        context: "OnboardingModal.OnboardingModalV2Content.handleSkip",
        data: { currentStep },
      }).catch(() => {});
      await skipOnboarding();
      onClose();
    }, [onClose, skipOnboarding, logAppEvent, currentStep]);

    return (
      <Modal visible onDismiss={handleSkip}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <ModalHeader onSkip={handleSkip} />
          <ProgressIndicator />
          <StepRenderer push={push} />
          <NavigationButtons onClose={onClose} />
        </View>
      </Modal>
    );
  }
);

OnboardingModalV2Content.displayName = "OnboardingModalV2Content";

// Wrapper with Provider and Portal
const OnboardingModal: React.FC<OnboardingModalProps> = ({ onClose, push }) => {
  return (
    <Portal>
      <OnboardingProvider push={push}>
        <OnboardingModalV2Content onClose={onClose} push={push} />
      </OnboardingProvider>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    margin: 20,
    borderRadius: 16,
    ...Platform.select({
      web: {
        maxWidth: 600,
        maxHeight: 600,
        alignSelf: "center",
        width: "100%",
      },
      default: {
        height: "90%",
      },
    }),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepWrapper: {
    flex: 1,
  },
  navigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    gap: 12,
  },
  navigationButtonsWithKeyboard: {
    ...Platform.select({
      ios: {
        paddingBottom: 16,
      },
      android: {
        paddingBottom: 8,
      },
      default: {},
    }),
  },
  navButton: {
    flex: 1,
  },
});

export default OnboardingModal;
