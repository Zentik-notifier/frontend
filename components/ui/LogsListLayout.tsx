import React, { ReactNode } from "react";
import {
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Text, useTheme } from "react-native-paper";

export type LogsListItemHeader = {
  type: "header";
  id: string;
  timeLabel: string;
};

export type LogsListItemLog<T> = {
  type: "log";
  id: string;
  log: T;
};

export type LogsListItem<T> = LogsListItemHeader | LogsListItemLog<T>;

export interface LogsListLayoutProps<T> {
  data: LogsListItem<T>[];
  renderLogRow: (item: LogsListItemLog<T>) => ReactNode;
  keyExtractor?: (item: LogsListItem<T>) => string;
  getItemType?: (item: LogsListItem<T>) => string;
  refreshControl?: ReactNode;
  onEndReached?: () => void;
  ListFooterComponent?: ReactNode;
  contentContainerStyle?: object;
  listRef?: React.RefObject<{ scrollToOffset: (params: { offset: number; animated?: boolean }) => void } | null>;
}

const defaultKeyExtractor = <T,>(item: LogsListItem<T>) => item.id;
const defaultGetItemType = <T,>(item: LogsListItem<T>) => item.type;

export function LogsListLayout<T>({
  data,
  renderLogRow,
  keyExtractor = defaultKeyExtractor,
  getItemType = defaultGetItemType,
  refreshControl,
  onEndReached,
  ListFooterComponent,
  contentContainerStyle,
  listRef,
}: LogsListLayoutProps<T>) {
  const theme = useTheme();

  const renderItem = React.useCallback(
    ({ item }: { item: LogsListItem<T> }): React.ReactElement | null => {
      if (item.type === "header") {
        return (
          <View style={styles.timeGroupLabelWrap}>
            <Text
              style={[
                styles.timeGroupLabel,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {item.timeLabel}
            </Text>
          </View>
        );
      }
      const row = renderLogRow(item as LogsListItemLog<T>);
      return <>{row}</>;
    },
    [theme.colors.onSurfaceVariant, renderLogRow]
  );

  return (
    <FlashList
      ref={listRef as any}
      data={data}
      keyExtractor={keyExtractor}
      getItemType={getItemType}
      renderItem={renderItem}
      drawDistance={400}
      refreshControl={
        refreshControl as React.ComponentProps<typeof FlashList>["refreshControl"]
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        ListFooterComponent as React.ComponentProps<
          typeof FlashList
        >["ListFooterComponent"]
      }
      contentContainerStyle={[styles.listContent, contentContainerStyle]}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: 4,
  },
  timeGroupLabelWrap: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  timeGroupLabel: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.7,
  },
});
