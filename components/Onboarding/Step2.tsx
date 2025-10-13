import React, { memo, useCallback } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Chip, Icon, Text, useTheme } from "react-native-paper";
import { useOnboarding } from "./OnboardingContext";

const Step2 = memo(() => {
  const theme = useTheme();
  const {
    selectedLanguage,
    selectedTheme,
    selectedMarkAsReadMode,
    setSelectedLanguage,
    setSelectedTheme,
    setSelectedMarkAsReadMode,
  } = useOnboarding();

  const handleLanguageSelect = useCallback((lang: "en" | "it") => {
    setSelectedLanguage(lang);
  }, [setSelectedLanguage]);

  const handleThemeSelect = useCallback((themeMode: "light" | "dark" | "auto") => {
    setSelectedTheme(themeMode);
  }, [setSelectedTheme]);

  const handleMarkAsReadModeSelect = useCallback((mode: "manual" | "onOpen" | "onClose") => {
    setSelectedMarkAsReadMode(mode);
  }, [setSelectedMarkAsReadMode]);

  return (
    <ScrollView style={styles.stepContainer}>
      <View style={styles.stepContent}>
        <Icon source="palette" size={64} color={theme.colors.primary} />
        <Text variant="headlineMedium" style={styles.stepTitle}>
          Personalize Your Experience
        </Text>
        <Text variant="bodyLarge" style={styles.stepDescription}>
          Customize the app appearance and behavior to your preferences.
        </Text>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Language
          </Text>
          <View style={styles.chipContainer}>
            <Chip
              selected={selectedLanguage === "en"}
              icon={selectedLanguage === "en" ? "check" : undefined}
              style={styles.chip}
              onPress={() => handleLanguageSelect("en")}
            >
              English
            </Chip>
            <Chip
              selected={selectedLanguage === "it"}
              icon={selectedLanguage === "it" ? "check" : undefined}
              style={styles.chip}
              onPress={() => handleLanguageSelect("it")}
            >
              Italiano
            </Chip>
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Theme
          </Text>
          <View style={styles.chipContainer}>
            <Chip
              selected={selectedTheme === "light"}
              icon="white-balance-sunny"
              style={styles.chip}
              onPress={() => handleThemeSelect("light")}
            >
              Light
            </Chip>
            <Chip
              selected={selectedTheme === "dark"}
              icon="moon-waning-crescent"
              style={styles.chip}
              onPress={() => handleThemeSelect("dark")}
            >
              Dark
            </Chip>
            <Chip
              selected={selectedTheme === "auto"}
              icon="theme-light-dark"
              style={styles.chip}
              onPress={() => handleThemeSelect("auto")}
            >
              Auto
            </Chip>
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Mark as Read
          </Text>
          <View style={styles.chipContainer}>
            <Chip
              selected={selectedMarkAsReadMode === "manual"}
              icon="hand-pointing-right"
              style={styles.chip}
              onPress={() => handleMarkAsReadModeSelect("manual")}
            >
              Manual
            </Chip>
            <Chip
              selected={selectedMarkAsReadMode === "onOpen"}
              icon="eye"
              style={styles.chip}
              onPress={() => handleMarkAsReadModeSelect("onOpen")}
            >
              On Open
            </Chip>
            <Chip
              selected={selectedMarkAsReadMode === "onClose"}
              icon="exit-to-app"
              style={styles.chip}
              onPress={() => handleMarkAsReadModeSelect("onClose")}
            >
              On Close
            </Chip>
          </View>
        </View>
      </View>
    </ScrollView>
  );
});

Step2.displayName = "Step2";

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
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    marginVertical: 4,
  },
});

export default Step2;
