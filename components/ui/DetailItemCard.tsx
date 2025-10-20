import React, { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Icon, IconButton, Surface, Text, useTheme } from "react-native-paper";

interface Action {
  icon: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
}

interface DetailItemCardProps {
  icon: string;
  title: string;
  titleRight?: ReactNode;
  details?: string[];
  actions?: Action[];
  opacity?: number;
}

export default function DetailItemCard({
  icon,
  title,
  titleRight,
  details = [],
  actions = [],
  opacity = 1,
}: DetailItemCardProps) {
  const theme = useTheme();

  return (
    <Surface
      style={[
        styles.container,
        { 
          backgroundColor: theme.colors.elevation.level2, 
          opacity,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
      elevation={2}
    >
      <View style={styles.info}>
        <View style={styles.header}>
          <Icon source={icon} size={20} color={theme.colors.primary} />
          <Text
            style={[
              styles.title,
              { color: theme.colors.onSurface },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {titleRight}
        </View>

        {details.length > 0 && (
          <View style={styles.details}>
            {details.map((detail, index) => (
              <Text
                key={index}
                style={[
                  styles.detailText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {detail}
              </Text>
            ))}
          </View>
        )}
      </View>

      {actions.length > 0 && (
        <View style={styles.actions}>
          {actions.map((action, index) => (
            <IconButton
              key={index}
              icon={action.icon}
              size={20}
              onPress={action.onPress}
              iconColor={action.color || theme.colors.onSurface}
              disabled={action.disabled}
            />
          ))}
        </View>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  details: {
    gap: 2,
  },
  detailText: {
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
});

