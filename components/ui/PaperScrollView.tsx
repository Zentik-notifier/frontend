import React from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { useTheme } from "react-native-paper";

interface PaperScrollViewProps {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  showsVerticalScrollIndicator?: boolean;
  showsHorizontalScrollIndicator?: boolean;
}

export default function PaperScrollView({
  children,
  refreshing = false,
  onRefresh,
  style,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
  showsHorizontalScrollIndicator = false,
}: PaperScrollViewProps) {
  const theme = useTheme();

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        style,
      ]}
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
            colors={[theme.colors.onSurface]}
            tintColor={theme.colors.onSurface}
            progressBackgroundColor={theme.colors.surface}
            titleColor={theme.colors.onSurface}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});
