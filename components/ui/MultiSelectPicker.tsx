import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { Text } from "react-native-paper";

export interface MultiSelectOption {
  value: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  subtitle?: string;
}

interface MultiSelectPickerProps {
  label: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onSelectionChange: (selectedValues: string[]) => void;
  placeholder?: string;
  showSelectAll?: boolean;
  selectAllLabel?: string;
  deselectAllLabel?: string;
}

export default function MultiSelectPicker({
  label,
  options,
  selectedValues,
  onSelectionChange,
  placeholder = "Select items",
  showSelectAll = true,
  selectAllLabel = "Select All",
  deselectAllLabel = "Deselect All",
}: MultiSelectPickerProps) {
  const colorScheme = useColorScheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const allSelected = options.length > 0 && selectedValues.length === options.length;
  const someSelected = selectedValues.length > 0;

  const handleToggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onSelectionChange(selectedValues.filter(v => v !== value));
    } else {
      onSelectionChange([...selectedValues, value]);
    }
  };

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(options.map(option => option.value));
    }
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return placeholder;
    } else if (selectedValues.length === options.length) {
      return selectAllLabel;
    } else if (selectedValues.length === 1) {
      const selectedOption = options.find(opt => opt.value === selectedValues[0]);
      return selectedOption?.label || `${selectedValues.length} selected`;
    } else {
      return `${selectedValues.length} selected`;
    }
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      
      <TouchableOpacity
        style={[
          styles.selector,
          {
            backgroundColor: Colors[colorScheme ?? 'light'].background,
            borderColor: Colors[colorScheme ?? 'light'].border,
          },
          isExpanded && styles.selectorExpanded,
        ]}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.selectorContent}>
          <View style={styles.textContainer}>
            <Text
              style={[
                styles.selectorText,
                { color: Colors[colorScheme ?? 'light'].text },
                selectedValues.length === 0 && { 
                  color: Colors[colorScheme ?? 'light'].tabIconDefault 
                },
              ]}
            >
              {getDisplayText()}
            </Text>
            {someSelected && (
              <View style={[
                styles.badge,
                { backgroundColor: Colors[colorScheme ?? 'light'].tint }
              ]}>
                <Text style={styles.badgeText}>{selectedValues.length}</Text>
              </View>
            )}
          </View>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={Colors[colorScheme ?? 'light'].text}
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={[
          styles.dropdown,
          {
            backgroundColor: Colors[colorScheme ?? 'light'].background,
            borderColor: Colors[colorScheme ?? 'light'].border,
          },
        ]}>
          {showSelectAll && options.length > 1 && (
            <>
              <TouchableOpacity
                style={[
                  styles.option,
                  styles.selectAllOption,
                  {
                    backgroundColor: Colors[colorScheme ?? 'light'].backgroundSecondary,
                  },
                ]}
                onPress={handleSelectAll}
              >
                <View style={styles.optionContent}>
                  <View style={styles.checkboxContainer}>
                    <View style={[
                      styles.checkbox,
                      {
                        borderColor: Colors[colorScheme ?? 'light'].border,
                        backgroundColor: allSelected 
                          ? Colors[colorScheme ?? 'light'].tint 
                          : 'transparent',
                      },
                    ]}>
                      {allSelected && (
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color="white"
                        />
                      )}
                    </View>
                  </View>
                  <View style={styles.labelContainer}>
                    <Text style={[
                      styles.optionText,
                      { color: Colors[colorScheme ?? 'light'].text },
                      styles.selectAllText,
                    ]}>
                      {allSelected ? deselectAllLabel : selectAllLabel}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              <View style={[
                styles.separator,
                { backgroundColor: Colors[colorScheme ?? 'light'].border }
              ]} />
            </>
          )}

          {options.map((option) => {
            const isSelected = selectedValues.includes(option.value);
            
            return (
              <TouchableOpacity
                key={option.value}
                style={styles.option}
                onPress={() => handleToggleOption(option.value)}
              >
                <View style={styles.optionContent}>
                  <View style={styles.checkboxContainer}>
                    <View style={[
                      styles.checkbox,
                      {
                        borderColor: Colors[colorScheme ?? 'light'].border,
                        backgroundColor: isSelected 
                          ? Colors[colorScheme ?? 'light'].tint 
                          : 'transparent',
                      },
                    ]}>
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color="white"
                        />
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.labelContainer}>
                    {option.icon && (
                      <Ionicons
                        name={option.icon}
                        size={20}
                        color={Colors[colorScheme ?? 'light'].text}
                        style={styles.optionIcon}
                      />
                    )}
                    <View style={styles.textColumn}>
                      <Text style={[
                        styles.optionText,
                        { color: Colors[colorScheme ?? 'light'].text },
                      ]}>
                        {option.label}
                      </Text>
                      {option.subtitle && (
                        <Text style={[
                          styles.optionSubtitle,
                          { color: Colors[colorScheme ?? 'light'].tabIconDefault },
                        ]}>
                          {option.subtitle}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  selector: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
  },
  selectorExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  selectorContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  textContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  selectorText: {
    fontSize: 16,
    flex: 1,
  },
  badge: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  dropdown: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 250,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  selectAllOption: {
    borderRadius: 4,
    marginHorizontal: 8,
    marginTop: 8,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  labelContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  optionIcon: {
    marginRight: 12,
  },
  textColumn: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
  },
  selectAllText: {
    fontWeight: "600",
  },
  optionSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  separator: {
    height: 1,
    marginVertical: 4,
    marginHorizontal: 8,
  },
});
