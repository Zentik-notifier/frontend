import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Divider,
  Icon,
  List,
  Menu,
  Text,
  useTheme,
} from "react-native-paper";

interface InlinePickerOption {
  value: string;
  label: string;
}

interface InlinePickerProps {
  label: string;
  value: string;
  options: InlinePickerOption[];
  onValueChange: (value: string) => void;
  icon?: string;
  description?: string;
}

export default function InlinePicker({
  label,
  value,
  options,
  onValueChange,
  icon = "chevron-down",
  description,
}: InlinePickerProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  const selectedOption = options.find(option => option.value === value);
  const displayValue = selectedOption?.label || value;

  const handleSelect = (newValue: string) => {
    onValueChange(newValue);
    setVisible(false);
  };

  return (
    <View style={styles.container}>
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchor={
          <List.Item
            title={label}
            description={description || displayValue}
            left={(props) => (
              <List.Icon {...props} icon={icon} />
            )}
            right={() => (
              <Icon source="chevron-down" size={20} color={theme.colors.onSurfaceVariant} />
            )}
            onPress={() => setVisible(true)}
            style={styles.listItem}
          />
        }
        contentStyle={[
          styles.menuContent,
          { backgroundColor: theme.colors.surface }
        ]}
      >
        {options.map((option, index) => (
          <View key={option.value}>
            <Menu.Item
              onPress={() => handleSelect(option.value)}
              title={option.label}
              titleStyle={{
                color: option.value === value ? theme.colors.primary : theme.colors.onSurface
              }}
              leadingIcon={option.value === value ? "check" : undefined}
            />
            {index < options.length - 1 && <Divider />}
          </View>
        ))}
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  listItem: {
    paddingVertical: 4,
  },
  menuContent: {
    borderRadius: 8,
    elevation: 4,
  },
});