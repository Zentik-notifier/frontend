import { Colors } from "@/constants/Colors";
import { AppIcons } from "@/constants/Icons";
import { useColorScheme } from "@/hooks/useTheme";
import React, { useMemo, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Icon from "./Icon";

export interface InlinePickerOption<T = string> {
  value: T;
  label: string;
  icon?: keyof typeof AppIcons; // Use the proper type for icons
  imageUrl?: string; // URL for bucket images
  emoji?: string; // Emoji or text character
  color?: string; // Hex color code for displaying a colored circle when no icon is provided
  subtitle?: string; // Optional subtitle for additional context
}

interface InlinePickerProps<T = string> {
  label?: string;
  selectedValue: T;
  options: InlinePickerOption<T>[];
  onValueChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean; // New property for search functionality
  searchPlaceholder?: string; // New property for search placeholder
}

export default function InlinePicker<T = string>({
  label,
  selectedValue,
  options,
  onValueChange,
  placeholder = "Select an option",
  disabled = false,
  searchable = false,
  searchPlaceholder = "Search options...",
}: InlinePickerProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const colorScheme = useColorScheme();

  const selectedOption = options.find(
    (option) => option.value === selectedValue
  );

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) {
      return options;
    }
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery, searchable]);

  const displayText = selectedOption?.label || placeholder;

  const handleOptionSelect = (value: T) => {
    onValueChange(value);
    setIsOpen(false);
    setSearchQuery(""); // Reset search when option is selected
  };

  const togglePicker = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchQuery(""); // Reset search when opening
      }
    }
  };

  return (
    <>
      <View style={styles.container}>
        {label && (
          <Text style={[styles.label, { color: Colors[colorScheme].text }]}>
            {label}
          </Text>
        )}

        <View
          style={[styles.pickerWrapper, isOpen && styles.pickerWrapperOpen]}
        >
          <TouchableOpacity
            style={[
              styles.pickerTouchable,
              {
                borderColor: Colors[colorScheme].border,
                backgroundColor: Colors[colorScheme].inputBackground,
              },
              disabled && styles.pickerDisabled,
            ]}
            onPress={togglePicker}
            disabled={disabled}
          >
            <View style={styles.selectedOptionContainer}>
              {selectedOption?.icon ? (
                <Icon
                  name={selectedOption.icon}
                  size="sm"
                  color="secondary"
                  style={styles.selectedOptionIcon}
                />
              ) : selectedOption?.imageUrl ? (
                <Image
                  source={{ uri: selectedOption.imageUrl }}
                  style={styles.selectedOptionImage}
                  resizeMode="contain"
                />
              ) : selectedOption?.emoji ? (
                <Text style={styles.selectedOptionEmoji}>
                  {selectedOption.emoji}
                </Text>
              ) : selectedOption?.color ? (
                <View
                  style={[
                    styles.colorCircle,
                    { backgroundColor: selectedOption.color },
                  ]}
                />
              ) : null}
              <Text
                style={[
                  styles.pickerText,
                  { color: Colors[colorScheme].text },
                  !selectedOption && {
                    color: Colors[colorScheme].inputPlaceholder,
                  },
                  disabled && { color: Colors[colorScheme].textSecondary },
                ]}
              >
                {displayText}
              </Text>
            </View>
            <Icon
              name={isOpen ? "collapse" : "dropdown"}
              size="sm"
              color={disabled ? "disabled" : "secondary"}
            />
          </TouchableOpacity>

          {/* Overlay Options - positioned absolutely */}
          {isOpen && (
            <View
              style={[
                styles.optionsList,
                {
                  borderColor: Colors[colorScheme].border,
                  backgroundColor: Colors[colorScheme].backgroundCard,
                },
              ]}
            >
              {/* Search Input */}
              {searchable && (
                <View
                  style={[
                    styles.searchContainer,
                    {
                      borderBottomColor: Colors[colorScheme].border,
                      backgroundColor: Colors[colorScheme].backgroundSecondary,
                    },
                  ]}
                >
                  <Icon
                    name="search"
                    size="sm"
                    color="secondary"
                    style={styles.searchIcon}
                  />
                  <TextInput
                    style={[
                      styles.searchInput,
                      { color: Colors[colorScheme].text },
                    ]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={searchPlaceholder}
                    placeholderTextColor={Colors[colorScheme].inputPlaceholder}
                    autoFocus={false}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearchQuery("")}
                      style={styles.clearSearchButton}
                    >
                      <Icon name="cancel" size="xs" color="secondary" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Options List */}
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <TouchableOpacity
                    key={`${option.value}`}
                    style={[
                      styles.option,
                      {
                        borderBottomColor: Colors[colorScheme].border,
                        backgroundColor:
                          selectedValue === option.value
                            ? Colors[colorScheme].selected
                            : "transparent",
                      },
                      index === filteredOptions.length - 1 && {
                        borderBottomWidth: 0,
                      },
                    ]}
                    onPress={() => handleOptionSelect(option.value)}
                  >
                    <View style={styles.optionContent}>
                      {option.icon ? (
                        <Icon
                          name={option.icon}
                          size="sm"
                          color={
                            selectedValue === option.value
                              ? "primary"
                              : "secondary"
                          }
                          style={styles.optionIcon}
                        />
                      ) : option.imageUrl ? (
                        <Image
                          source={{ uri: option.imageUrl }}
                          style={styles.optionImage}
                          resizeMode="contain"
                        />
                      ) : option.emoji ? (
                        <Text style={styles.optionEmoji}>{option.emoji}</Text>
                      ) : option.color ? (
                        <View
                          style={[
                            styles.colorCircle,
                            { backgroundColor: option.color },
                          ]}
                        />
                      ) : null}
                      <View style={styles.optionTextContainer}>
                        <Text
                          style={[
                            styles.optionText,
                            { color: Colors[colorScheme].text },
                            selectedValue === option.value && {
                              color: Colors[colorScheme].tint,
                              fontWeight: "600",
                            },
                          ]}
                        >
                          {option.label}
                        </Text>
                        {option.subtitle && (
                          <Text
                            style={[
                              styles.optionSubtitle,
                              { color: Colors[colorScheme].textSecondary },
                              selectedValue === option.value && {
                                color: Colors[colorScheme].tint,
                              },
                            ]}
                          >
                            {option.subtitle}
                          </Text>
                        )}
                      </View>
                    </View>
                    {selectedValue === option.value && (
                      <Icon name="confirm" size="sm" color="primary" />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noResultsContainer}>
                  <Icon name="search" size="md" color="disabled" />
                  <Text
                    style={[
                      styles.noResultsText,
                      { color: Colors[colorScheme].textSecondary },
                    ]}
                  >
                    No options found for "{searchQuery}"
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Overlay to close picker when tapping outside */}
      {isOpen && (
        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 5,
  },
  pickerWrapper: {
    position: "relative",
    zIndex: 1000,
  },
  pickerWrapperOpen: {
    zIndex: 10000, // Higher z-index when open to ensure it's above other pickers
  },
  pickerTouchable: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 50,
  },
  pickerDisabled: {
    opacity: 0.6,
  },
  pickerText: {
    fontSize: 16,
  },
  selectedOptionContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  selectedOptionIcon: {
    marginRight: 8,
  },
  selectedOptionImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  selectedOptionEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  optionsList: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    overflow: "hidden",
    zIndex: 10001, // Always higher than the picker wrapper when open
    // Add shadow for better visibility
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5, // For Android shadow
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  option: {
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  optionIcon: {
    marginRight: 8,
  },
  optionImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  optionEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  optionText: {
    fontSize: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  colorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  noResultsContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  noResultsText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999, // Below the open picker but above other elements
  },
});
