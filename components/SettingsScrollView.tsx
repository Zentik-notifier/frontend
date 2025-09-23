import React, { PropsWithChildren } from "react";
import { StyleSheet, View, ViewStyle, ScrollViewProps } from "react-native";
import RefreshableScrollView from "@/components/RefreshableScrollView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";

type SettingsScrollViewProps = PropsWithChildren<
  {
    style?: ViewStyle | ViewStyle[];
    contentContainerStyle?: ViewStyle | ViewStyle[];
    onRefresh?: () => Promise<any>;
    children: React.ReactNode | ((refreshing: boolean) => React.ReactNode);
    descriptionText?: string;
    headerActions?: React.ReactNode;
  } & Pick<
    ScrollViewProps,
    | "showsVerticalScrollIndicator"
    | "keyboardShouldPersistTaps"
    | "onScroll"
    | "scrollEventThrottle"
  >
>;

export default function SettingsScrollView({
  children,
  style,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
  onRefresh,
  descriptionText,
  headerActions,
  ...rest
}: SettingsScrollViewProps) {
  const colorScheme = useColorScheme();
  return (
    <RefreshableScrollView
      style={[
        styles.scroll,
        { backgroundColor: Colors[colorScheme ?? "light"].background },
        style,
      ]}
      contentStyle={contentContainerStyle}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      onRefresh={onRefresh}
      {...rest}
    >
      {(refreshing: boolean) => (
        <>
          {(descriptionText || headerActions) && (
            <View style={styles.headerRow}>
              {!!descriptionText && (
                <View style={styles.headerLeft}>
                  <ThemedText style={styles.descriptionText}>
                    {descriptionText}
                  </ThemedText>
                </View>
              )}
              <View style={styles.headerRight}>{headerActions}</View>
            </View>
          )}
          {typeof children === "function" ? children(refreshing) : children}
        </>
      )}
    </RefreshableScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: "auto",
  },
  descriptionText: {
    fontSize: 14,
    opacity: 0.7,
  },
});
