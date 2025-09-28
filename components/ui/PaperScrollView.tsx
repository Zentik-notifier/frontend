import React from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";
import { useI18n } from "../../hooks/useI18n";

interface PaperScrollViewProps {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  showsVerticalScrollIndicator?: boolean;
  showsHorizontalScrollIndicator?: boolean;
  // Loading props
  loading?: boolean;
  showLoadingOverlay?: boolean;
}

export default function PaperScrollView({
  children,
  refreshing = false,
  onRefresh,
  style,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
  showsHorizontalScrollIndicator = false,
  // Loading props
  loading = false,
  showLoadingOverlay = false,
}: PaperScrollViewProps) {
  const theme = useTheme();
  const { t } = useI18n();

  // Se loading è true e showLoadingOverlay è false, mostra solo il loading
  if (loading && !showLoadingOverlay) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: theme.colors.background }, style]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="bodyLarge" style={[styles.loadingText, { color: theme.colors.onBackground }]}>
          {t("common.loading")}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }, style]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets={true}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
              progressBackgroundColor={theme.colors.surface}
              titleColor={theme.colors.onSurface}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
      
      {/* Loading overlay */}
      {loading && showLoadingOverlay && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingContent, { backgroundColor: theme.colors.surface }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text variant="bodyLarge" style={[styles.loadingText, { color: theme.colors.onSurface }]}>
              {t("common.loading")}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    textAlign: "center",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  loadingContent: {
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
});
