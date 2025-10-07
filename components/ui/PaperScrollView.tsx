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
  IconButton,
  Text,
  useTheme,
} from "react-native-paper";
import { useI18n } from "../../hooks/useI18n";

interface PaperScrollViewProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
  refetch?: () => Promise<void>;
  onAdd?: () => void;
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

  const showFab = (onRefresh && Platform.OS === "web") || (refetch && Platform.OS === "web") || onAdd;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        style,
      ]}
    >
      {!loading && scrollViewContent}

      {/* FAB buttons in bottom right corner (Web only) */}
      {showFab && !error && (
        <View style={styles.fabContainer}>
          {onAdd && (
            <IconButton
              icon="plus"
              size={24}
              onPress={onAdd}
              mode="contained"
              containerColor={theme.colors.primary}
              iconColor={theme.colors.onPrimary}
              style={styles.fabButton}
            />
          )}
          {onRefresh && Platform.OS === "web" && (
            <IconButton
              icon="refresh"
              size={24}
              onPress={handleRefresh}
              disabled={refreshing}
              loading={refreshing}
              mode="contained"
              containerColor={theme.colors.secondaryContainer}
              iconColor={theme.colors.secondary}
              style={styles.fabButton}
            />
          )}
          {refetch && Platform.OS === "web" && (
            <IconButton
              icon="refresh"
              size={24}
              onPress={refetch}
              mode="contained"
              containerColor={theme.colors.tertiaryContainer}
              iconColor={theme.colors.tertiary}
              style={styles.fabButton}
            />
          )}
        </View>
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
  fabContainer: {
    position: "absolute",
    bottom: 24,
    right: 24,
    flexDirection: "row",
    gap: 12,
    zIndex: 1000,
  },
  fabButton: {
    margin: 0,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
