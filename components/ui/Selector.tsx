import { useI18n } from "@/hooks";
import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Dimensions,
  StyleSheet,
} from "react-native";
import { useTheme, Icon, Portal } from "react-native-paper";
import ThemedBottomSheet, { ThemedBottomSheetRef } from "./ThemedBottomSheet";
import { IconSource } from "react-native-paper/lib/typescript/components/Icon";

export interface SelectorOption {
  id: any;
  name: string;
  iconName?: IconSource;
  iconColor?: string;
}

interface SelectorProps {
  label?: string;
  placeholder?: string;
  options: SelectorOption[];
  selectedValue?: any;
  onValueChange: (value: any) => void;
  isSearchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  helperText?: string;
  error?: boolean;
  errorText?: string;
  mode?: "modal" | "inline";
}

const { height: screenHeight } = Dimensions.get("window");

export default function Selector({
  label,
  placeholder,
  options,
  selectedValue,
  onValueChange,
  isSearchable = false,
  searchPlaceholder,
  disabled = false,
  helperText,
  error = false,
  errorText,
  mode = "modal",
}: SelectorProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const [isInlineDropdownOpen, setIsInlineDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const containerRef = useRef<View>(null);
  const sheetRef = useRef<ThemedBottomSheetRef>(null);

  const selectedOption = options.find((option) => option.id === selectedValue);

  const filteredOptions = useMemo(() => {
    if (!isSearchable || !searchQuery.trim()) {
      return options;
    }

    return options.filter((option) =>
      option.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery, isSearchable]);

  const toggleInlineDropdown = () => {
    if (!isInlineDropdownOpen) {
      // Calculate the position of the dropdown
      containerRef.current?.measure((x, y, width, height, pageX, pageY) => {
        setDropdownPosition({
          top: pageY + height,
          left: pageX,
          width: width,
        });
      });
    }
    setIsInlineDropdownOpen(!isInlineDropdownOpen);
    if (!isInlineDropdownOpen) {
      setSearchQuery("");
    }
  };

  const handleSelectOption = (option: SelectorOption) => {
    onValueChange(option.id);
    if (mode === "modal") {
      sheetRef.current?.hide();
    } else {
      setIsInlineDropdownOpen(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: 16,
      position: "relative",
      zIndex: 1,
    },
    label: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.colors.onSurface,
      marginBottom: 8,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: error ? theme.colors.error : theme.colors.outline,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 48,
    },
    valueRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexShrink: 1,
    },
    disabledInput: {
      backgroundColor: theme.colors.surfaceDisabled,
      borderColor: theme.colors.outlineVariant,
    },
    errorInput: {
      borderColor: theme.colors.error,
    },
    inputText: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.onSurface,
    },
    placeholder: {
      color: theme.colors.onSurfaceVariant,
    },
    helperText: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      marginTop: 4,
    },
    errorText: {
      fontSize: 12,
      color: theme.colors.error,
      marginTop: 4,
    },

    inlineOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "transparent",
      zIndex: 9998,
    },
    inlineDropdown: {
      position: "absolute",
      top: dropdownPosition.top,
      left: dropdownPosition.left,
      width: dropdownPosition.width,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 8,
      maxHeight: 200,
      zIndex: 9999,
      elevation: 10,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
    },
    inlineSearchContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    inlineSearchInput: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      color: theme.colors.onSurface,
    },
    inlineOptionsList: {
      maxHeight: 150,
    },
    inlineOptionItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    inlineSelectedOption: {
      backgroundColor: theme.colors.primaryContainer,
    },
    inlineOptionText: {
      fontSize: 16,
      color: theme.colors.onSurface,
    },
    inlineSelectedOptionText: {
      color: theme.colors.onPrimaryContainer,
      fontWeight: "500",
    },
    inlineEmptyState: {
      padding: 16,
      alignItems: "center",
    },
    inlineEmptyStateText: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      textAlign: "center",
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContainer: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: screenHeight * 0.7,
      paddingTop: 20,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.onSurface,
    },
    closeButton: {
      padding: 8,
    },
    searchContainer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    searchInput: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.colors.onSurface,
    },
    optionsList: {
      maxHeight: 300,
    },
    optionItem: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    selectedOption: {
      backgroundColor: theme.colors.primaryContainer,
    },
    optionText: {
      fontSize: 16,
      color: theme.colors.onSurface,
    },
    selectedOptionText: {
      color: theme.colors.onPrimaryContainer,
      fontWeight: "500",
    },
    emptyState: {
      padding: 20,
      alignItems: "center",
    },
    emptyStateText: {
      fontSize: 16,
      color: theme.colors.onSurfaceVariant,
      textAlign: "center",
    },
  });

  const renderItem = (item?: SelectorOption) => (
    <View style={styles.valueRow}>
      {item?.iconName && (
        <View style={{ marginRight: 8 }}>
          <Icon
            source={item.iconName as any}
            size={16}
            color={item.iconColor || theme.colors.onSurfaceVariant}
          />
        </View>
      )}
      <Text style={[styles.inputText, !item && styles.placeholder]}>
        {item ? item.name : placeholder || t("common.selectOption")}
      </Text>
    </View>
  );

  const selectedItem = renderItem(selectedOption);

  const renderInlineMode = () => (
    <View style={styles.container} ref={containerRef}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[
          styles.inputContainer,
          disabled && styles.disabledInput,
          error && styles.errorInput,
        ]}
        onPress={toggleInlineDropdown}
        disabled={disabled}
      >
        {selectedItem}
        <Icon
          source={isInlineDropdownOpen ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.colors.onSurfaceVariant}
        />
      </TouchableOpacity>

      {helperText && !error && (
        <Text style={styles.helperText}>{helperText}</Text>
      )}

      {errorText && error && <Text style={styles.errorText}>{errorText}</Text>}

      {isInlineDropdownOpen && (
        <Portal>
          {/* Overlay per click esterno */}
          <TouchableOpacity
            style={styles.inlineOverlay}
            activeOpacity={1}
            onPress={() => setIsInlineDropdownOpen(false)}
          />

          <View style={styles.inlineDropdown}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              {isSearchable && (
                <View style={styles.inlineSearchContainer}>
                  <TextInput
                    style={styles.inlineSearchInput}
                    placeholder={searchPlaceholder || t("common.search")}
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
              )}

              <FlatList
                style={styles.inlineOptionsList}
                data={filteredOptions}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => {
                  const isSelected = item.id === selectedValue;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.inlineOptionItem,
                        isSelected && styles.inlineSelectedOption,
                      ]}
                      onPress={() => handleSelectOption(item)}
                    >
                      {renderItem(item)}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.inlineEmptyState}>
                    <Text style={styles.inlineEmptyStateText}>
                      {searchQuery.trim()
                        ? t("common.noResults")
                        : t("common.noOptions")}
                    </Text>
                  </View>
                }
              />
            </TouchableOpacity>
          </View>
        </Portal>
      )}
    </View>
  );

  const trigger = useCallback(
    (show: () => void) => (
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}

        <TouchableOpacity
          style={[
            styles.inputContainer,
            disabled && styles.disabledInput,
            error && styles.errorInput,
          ]}
          onPress={show}
          disabled={disabled}
        >
          <View style={styles.valueRow}>
            {selectedOption?.iconName && (
              <View style={{ marginRight: 8 }}>
                <Icon
                  source={selectedOption.iconName}
                  size={16}
                  color={
                    selectedOption.iconColor || theme.colors.onSurfaceVariant
                  }
                />
              </View>
            )}
            <Text
              style={[styles.inputText, !selectedOption && styles.placeholder]}
            >
              {selectedOption
                ? selectedOption.name
                : placeholder || t("common.selectOption")}
            </Text>
          </View>
          <Icon
            source="chevron-down"
            size={20}
            color={theme.colors.onSurfaceVariant}
          />
        </TouchableOpacity>
        {helperText && !error && (
          <Text style={styles.helperText}>{helperText}</Text>
        )}
        {errorText && error && (
          <Text style={styles.errorText}>{errorText}</Text>
        )}
      </View>
    ),
    [errorText, error, label, placeholder, selectedOption, t]
  );

  const renderModalMode = () => {
    return (
      <ThemedBottomSheet
        ref={sheetRef}
        title={label || t("common.selectOption")}
        trigger={trigger}
      >
        {isSearchable && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder={searchPlaceholder || t("common.search")}
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        )}

        <FlatList
          style={styles.optionsList}
          data={filteredOptions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const isSelected = item.id === selectedValue;
            return (
              <TouchableOpacity
                style={[styles.optionItem, isSelected && styles.selectedOption]}
                onPress={() => handleSelectOption(item)}
              >
                {renderItem(item)}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery.trim()
                  ? t("common.noResults")
                  : t("common.noOptions")}
              </Text>
            </View>
          }
        />
      </ThemedBottomSheet>
    );
  };

  return mode === "inline" ? renderInlineMode() : renderModalMode();
}
