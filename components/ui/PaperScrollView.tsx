import React, { useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  FAB,
  IconButton,
  Text,
  useTheme,
} from "react-native-paper";
import { useI18n } from "../../hooks/useI18n";

export interface CustomFabAction {
  icon: string;
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  style?: ViewStyle;
}

interface PaperScrollViewProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
  refetch?: () => Promise<void>;
  onAdd?: () => void;
  customActions?: CustomFabAction[];
  fabGroupIcon?: string;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  showsVerticalScrollIndicator?: boolean;
  showsHorizontalScrollIndicator?: boolean;
  loading?: boolean;
  withScroll?: boolean;
  error?: boolean;
  errorTitle?: string;
  errorMessage?: string;
  onRetry?: () => void;
}

export default function PaperScrollView({
  children,
  onRefresh,
  refetch,
  onAdd,
  customActions = [],
  fabGroupIcon = "cog",
  style,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
  showsHorizontalScrollIndicator = false,
  loading = false,
  withScroll = true,
  error = false,
  errorTitle,
  errorMessage,
  onRetry,
}: PaperScrollViewProps) {
  const theme = useTheme();
  const { t } = useI18n();

  const [refreshing, setRefreshing] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh?.();
    setRefreshing(false);
  };

  const scrollViewContent = withScroll ? (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets={true}
      refreshControl={
        onRefresh && Platform.OS !== "web" ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
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
  ) : (
    children
  );

  // Handler per wrappare le azioni e gestire il loading
  const handleActionPress = async (action: CustomFabAction) => {
    setFabOpen(false); // Chiudi il FAB group
    setActionLoading(true);
    try {
      await action.onPress();
    } finally {
      setActionLoading(false);
    }
  };

  // Build FAB actions array
  const fabActions: CustomFabAction[] = [];

  if (onAdd) {
    fabActions.push({
      icon: "plus",
      label: t("common.add"),
      onPress: onAdd,
      style: { backgroundColor: theme.colors.primary },
    });
  }

  if (onRefresh && Platform.OS === "web") {
    fabActions.push({
      icon: "refresh",
      label: t("common.refresh"),
      onPress: handleRefresh,
      style: { backgroundColor: theme.colors.secondaryContainer },
    });
  }

  if (refetch && Platform.OS === "web") {
    fabActions.push({
      icon: "refresh",
      label: t("common.refresh"),
      onPress: refetch,
      style: { backgroundColor: theme.colors.tertiaryContainer },
    });
  }

  // Add custom actions
  fabActions.push(...customActions);

  const showFab = fabActions.length > 0;
  const useFabGroup = !!customActions.length || fabActions.length > 1;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        style,
      ]}
    >
      {!loading && scrollViewContent}

      {/* FAB buttons - either as Group or single FAB */}
      {showFab && !error && !loading && (
        <>
          {useFabGroup ? (
            <FAB.Group
              open={fabOpen && !actionLoading}
              visible
              icon={
                actionLoading ? "loading" : fabOpen ? "close" : fabGroupIcon
              }
              actions={fabActions
                .filter((action) => !action.disabled)
                .map((action) => ({
                  icon: action.icon,
                  label: action.label,
                  onPress: () => handleActionPress(action),
                  style: action.style,
                }))}
              onStateChange={({ open }) => !actionLoading && setFabOpen(open)}
              style={styles.fabGroup}
              fabStyle={{
                backgroundColor: theme.colors.primaryContainer,
              }}
            />
          ) : (
            <FAB
              icon={actionLoading ? "loading" : fabActions[0].icon}
              visible
              disabled={fabActions[0].disabled}
              onPress={() => !actionLoading && !fabActions[0].disabled && handleActionPress(fabActions[0])}
              style={styles.fabSingle}
              loading={actionLoading}
            />
          )}
        </>
      )}

      {/* Loading overlay */}
      {loading && !error && (
        <View style={styles.loadingOverlay}>
          <View
            style={[
              styles.loadingContent,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text
              variant="bodyLarge"
              style={[styles.loadingText, { color: theme.colors.onSurface }]}
            >
              {t("common.loading")}
            </Text>
          </View>
        </View>
      )}

      {/* Error overlay */}
      {error && (
        <View style={styles.errorOverlay}>
          <View
            style={[
              styles.errorContent,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text
              variant="headlineSmall"
              style={[styles.errorTitle, { color: theme.colors.error }]}
            >
              {errorTitle || t("common.error")}
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.errorMessage, { color: theme.colors.onSurface }]}
            >
              {errorMessage || t("common.error")}
            </Text>
            {onRetry && (
              <Button
                mode="contained"
                onPress={onRetry}
                style={styles.retryButton}
                buttonColor={theme.colors.primary}
              >
                {t("common.retry")}
              </Button>
            )}
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
  fabGroup: {
    paddingBottom: 0,
    paddingRight: 0,
  },
  fabSingle: {
    position: "absolute",
    bottom: 16,
    right: 16,
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
  errorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  errorContent: {
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    maxWidth: 300,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  errorTitle: {
    marginBottom: 12,
    textAlign: "center",
  },
  errorMessage: {
    marginBottom: 16,
    textAlign: "center",
    opacity: 0.8,
  },
  retryButton: {
    marginTop: 8,
  },
});
