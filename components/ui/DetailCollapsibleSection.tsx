import React, { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, IconButton, Text, useTheme } from "react-native-paper";

export interface ActionButton {
  label: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

interface DetailCollapsibleSectionProps {
  title: string;
  icon: string;
  subtitle: string;
  actions?: ActionButton[];
  expanded: boolean;
  onToggleExpanded: () => void;
  children: ReactNode;
}

export default function DetailCollapsibleSection({
  title,
  icon,
  subtitle,
  actions = [],
  expanded,
  onToggleExpanded,
  children,
}: DetailCollapsibleSectionProps) {
  const theme = useTheme();

  return (
    <Card style={styles.sectionCard}>
      <Card.Content>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <IconButton
              icon={icon}
              size={24}
              iconColor={theme.colors.primary}
              style={{ margin: 0 }}
            />
            <View>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                {title}
              </Text>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {subtitle}
              </Text>
            </View>
          </View>
          <IconButton
            icon={expanded ? "chevron-up" : "chevron-down"}
            size={24}
            iconColor={theme.colors.primary}
            onPress={onToggleExpanded}
          />
        </View>

        {actions.length > 0 && (
          <View style={styles.actionsColumn}>
            {actions.map((action, index) => (
              <Button
                key={index}
                mode="outlined"
                icon={action.icon}
                onPress={action.onPress}
                disabled={action.disabled}
                loading={action.loading}
                style={styles.actionButton}
              >
                {action.label}
              </Button>
            ))}
          </View>
        )}

        {expanded && <View style={styles.expandedContent}>{children}</View>}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    marginBottom: 24,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  sectionTitle: {
    fontWeight: "600",
  },
  actionsColumn: {
    flexDirection: "column",
    gap: 8,
    marginBottom: 16,
    alignItems: "stretch",
  },
  actionButton: {
    width: "100%",
  },
  expandedContent: {
    marginTop: 8,
  },
});
