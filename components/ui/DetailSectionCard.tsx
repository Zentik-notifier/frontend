import React, { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Icon,
  IconButton,
  Text,
  useTheme,
} from "react-native-paper";

interface DetailSectionCardProps<T> {
  title?: string;
  description?: string;
  actionButton?: {
    label?: string;
    icon: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
  };
  actionButtons?: Array<{
    label?: string;
    icon: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
  }>;
  headerRight?: ReactNode;
  loading?: boolean;
  emptyState?: {
    icon?: string;
    text: string;
  };
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  maxHeight?: number;
}

export default function DetailSectionCard<T>({
  title,
  description,
  actionButton,
  actionButtons,
  headerRight,
  loading = false,
  emptyState,
  items,
  renderItem,
  maxHeight = 500,
}: DetailSectionCardProps<T>) {
  const theme = useTheme();

  return (
    <Card style={styles.container}>
      <Card.Content>
        <View style={[styles.header, !description && styles.headerNoDesc]}>
          {title || description ? (
            <View style={styles.headerText}>
              {title ? (
                <Text
                  style={[
                    styles.title,
                    {
                      color: theme.colors.onSurface,
                      marginBottom: description ? 4 : 0,
                    },
                  ]}
                >
                  {title}
                </Text>
              ) : null}
              {description ? (
                <Text
                  style={[
                    styles.description,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {description}
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {headerRight || (
            <View style={styles.actionButtonsContainer}>
              {actionButtons?.map((btn, idx) => (
                <IconButton
                  key={idx}
                  icon={btn.icon}
                  size={20}
                  onPress={btn.onPress}
                  disabled={btn.disabled || btn.loading}
                />
              ))}
              {actionButton &&
                (actionButton.label ? (
                  <Button
                    mode="contained-tonal"
                    compact
                    icon={actionButton.icon}
                    onPress={actionButton.onPress}
                    loading={actionButton.loading}
                    disabled={actionButton.disabled || actionButton.loading}
                  >
                    {actionButton.label}
                  </Button>
                ) : (
                  <IconButton
                    icon={actionButton.icon}
                    size={20}
                    onPress={actionButton.onPress}
                    disabled={actionButton.disabled || actionButton.loading}
                  />
                ))}
            </View>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : items.length === 0 && emptyState ? (
          <View style={styles.emptyContainer}>
            {emptyState.icon && (
              <Icon
                source={emptyState.icon}
                size={48}
                color={theme.colors.onSurfaceVariant}
              />
            )}
            <Text
              variant="titleMedium"
              style={[
                styles.emptyText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {emptyState.text}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ maxHeight }}
            contentContainerStyle={styles.itemsList}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {items.map((item, index) => (
              <View key={index}>{renderItem(item, index)}</View>
            ))}
          </ScrollView>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerNoDesc: {
    alignItems: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    opacity: 0.7,
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    opacity: 0.7,
  },
  itemsList: {
    gap: 12,
    // paddingBottom: 16,
  },
});
