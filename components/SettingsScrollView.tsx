import React, { PropsWithChildren } from "react";
import { StyleSheet, ViewStyle, ScrollViewProps } from "react-native";
import RefreshableScrollView from "@/components/RefreshableScrollView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useTheme";

type SettingsScrollViewProps = PropsWithChildren<
  {
    style?: ViewStyle | ViewStyle[];
    contentContainerStyle?: ViewStyle | ViewStyle[];
    onRefresh?: () => Promise<any>;
    children: React.ReactNode | ((refreshing: boolean) => React.ReactNode);
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
      {children}
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
});
