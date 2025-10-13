import React, { memo, useCallback, useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Button, Modal, Portal, Text, useTheme } from "react-native-paper";
import { OnboardingProvider, useOnboarding } from "./OnboardingContext";
import Step1 from "./Step1";
import Step2 from "./Step2";
import Step3 from "./Step3";
import Step4 from "./Step4";
import Step5 from "./Step5";
import Step6 from "./Step6";

interface OnboardingModalV2Props {
  visible: boolean;
  onClose: () => void;
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
  const { currentStep, goToPreviousStep, goToNextStep } = useOnboarding();

  const handleNext = useCallback(() => {
    if (currentStep === 6) {
      onClose();
    } else {
      goToNextStep();
    }
  }, [currentStep, goToNextStep, onClose]);

  return (
    <View style={styles.navigationButtons}>
      {currentStep > 1 && (
        <Button
          mode="outlined"
          onPress={goToPreviousStep}
          style={styles.navButton}
        >
          Back
        </Button>
      )}
      <Button mode="contained" onPress={handleNext} style={styles.navButton}>
        {currentStep === 6 ? "Finish" : "Next"}
      </Button>
    </View>
  );
});

NavigationButtons.displayName = "NavigationButtons";

// Step Renderer Component
const StepRenderer = memo(() => {
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
        return <Step4 />;
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
const OnboardingModalV2Content: React.FC<OnboardingModalV2Props> = memo(
  ({ visible, onClose }) => {
    const theme = useTheme();

    return (
      <Modal visible={visible} onDismiss={onClose}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <ModalHeader onSkip={onClose} />
          <ProgressIndicator />
          <StepRenderer />
          <NavigationButtons onClose={onClose} />
        </View>
      </Modal>
    );
  }
);

OnboardingModalV2Content.displayName = "OnboardingModalV2Content";

// Wrapper with Provider and Portal
const OnboardingModalV2: React.FC<OnboardingModalV2Props> = ({
  visible,
  onClose,
}) => {
  return (
    <Portal>
      <OnboardingProvider>
        <OnboardingModalV2Content visible={visible} onClose={onClose} />
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
  navButton: {
    flex: 1,
  },
});

export default OnboardingModalV2;
