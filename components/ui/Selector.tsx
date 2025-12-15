import { useI18n } from "@/hooks/useI18n";
import { Image } from "expo-image";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Icon, Portal, useTheme } from "react-native-paper";
import { IconSource } from "react-native-paper/lib/typescript/components/Icon";
import ThemedBottomSheet, { ThemedBottomSheetRef } from "./ThemedBottomSheet";

export interface SelectorOption {
  id: any;
  name: string;
  description?: string;
  iconName?: IconSource;
  iconColor?: string;
  iconUrl?: string;
  iconElement?: React.ReactNode;
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
  preferredDropdownDirection?: "up" | "down";
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
  preferredDropdownDirection = "down",
}: SelectorProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const [isInlineDropdownOpen, setIsInlineDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 300,
    isOpeningUpward: false,
  });
  const containerRef = useRef<View>(null);
  const sheetRef = useRef<ThemedBottomSheetRef>(null);

  const selectedOption = selectedValue
    ? options.find((option) => option.id === selectedValue)
    : undefined;

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
      // Calculate the position of the dropdown with preferred direction when possible
      (containerRef.current as any)?.measureInWindow?.(
        (pageX: number, pageY: number, width: number, height: number) => {
          const { width: screenWidth, height: screenHeight } =
            Dimensions.get("window");

          const verticalMargin = 8;
          const horizontalMargin = 8;

          const spaceBelow = screenHeight - verticalMargin - (pageY + height);
          const spaceAbove = pageY - verticalMargin;

          const maxDropdownHeight = 350;
          const minDropdownHeight = 120;
          const downThreshold = minDropdownHeight * 1.5;

          const estimatedHeader = isSearchable ? 56 : 0;
          const estimatedItemHeight = 48;
          const estimatedItems = Math.max(1, Math.min(options.length, 7));
          const estimatedHeight =
            estimatedHeader + estimatedItems * estimatedItemHeight + 8;

          const canOpenDown = spaceBelow >= downThreshold;
          const canOpenUp = spaceAbove >= minDropdownHeight;

          let shouldOpenUpward: boolean;

          if (canOpenDown && canOpenUp) {
            shouldOpenUpward = preferredDropdownDirection === "up";
          } else if (canOpenUp) {
            shouldOpenUpward = true;
          } else if (canOpenDown) {
            shouldOpenUpward = false;
          } else {
            // If neither side has enough space, choose the side with more space
            shouldOpenUpward = spaceAbove > spaceBelow;
          }

          let availableHeight: number;
          let desiredHeight: number;

          if (shouldOpenUpward) {
            // For upward opening, allow the dropdown to shrink to fit the
            // available space so that its bottom can align with the trigger.
            const upAvailable = Math.max(0, spaceAbove);
            availableHeight = Math.min(maxDropdownHeight, upAvailable);
            const baseHeight = Math.min(maxDropdownHeight, estimatedHeight);
            desiredHeight = Math.max(0, Math.min(availableHeight, baseHeight));
          } else {
            // For downward opening, keep a minimum height and use the
            // 1.5x-threshold logic already enforced by canOpenDown.
            const downAvailable = Math.max(0, spaceBelow);
            availableHeight = Math.max(
              minDropdownHeight,
              Math.min(maxDropdownHeight, downAvailable)
            );
            const baseHeight = Math.max(
              minDropdownHeight,
              Math.min(maxDropdownHeight, estimatedHeight)
            );
            desiredHeight = Math.min(availableHeight, baseHeight);
          }

          let top: number;

          if (shouldOpenUpward) {
            // Align dropdown bottom to the trigger when opening upward
            top = pageY - desiredHeight;
            const topMin = verticalMargin;
            top = Math.max(topMin, top);
          } else {
            // Align dropdown top to the trigger when opening downward,
            // clamping so it doesn't overflow the bottom of the screen
            top = pageY + height;
            const topMin = verticalMargin;
            const topMax = screenHeight - verticalMargin - desiredHeight;
            top = Math.max(topMin, Math.min(top, topMax));
          }

          let left = Math.min(
            Math.max(horizontalMargin, pageX),
            Math.max(horizontalMargin, screenWidth - horizontalMargin - width)
          );

          setDropdownPosition({
            top,
            left,
            width,
            maxHeight: desiredHeight,
            isOpeningUpward: shouldOpenUpward,
          });
        }
      );
    }
    setIsInlineDropdownOpen(!isInlineDropdownOpen);
    if (!isInlineDropdownOpen) {
      setSearchQuery("");
    }
  };

  const handleSelectOption = (option: SelectorOption) => {
    // Toggle selection: deselect if already selected, otherwise select
    const newValue = option.id === selectedValue ? null : option.id;
    onValueChange(newValue);
    if (mode === "modal") {
      sheetRef.current?.hide();
    } else {
      setIsInlineDropdownOpen(false);
    }
  };

  const styles = StyleSheet.create({
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
      // When opening upward, fix the container height so that its bottom
      // edge aligns with the trigger; when opening downward, let content
      // define the height up to maxHeight.
      height: dropdownPosition.isOpeningUpward
        ? dropdownPosition.maxHeight
        : undefined,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 8,
      maxHeight: dropdownPosition.maxHeight,
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
      maxHeight: dropdownPosition.maxHeight,
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
    inlineDescriptionText: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
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
    descriptionText: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
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
    <View style={{ flex: 1 }}>
      <View style={styles.valueRow}>
        {item?.iconElement ? (
          <View style={{ marginRight: 8 }}>{item.iconElement}</View>
        ) : item?.iconUrl ? (
          <Image
            source={item.iconUrl}
            cachePolicy="memory-disk"
            style={{ width: 24, height: 24, marginRight: 8, borderRadius: 12 }}
            contentFit="fill"
          />
        ) : item?.iconName ? (
          <View style={{ marginRight: 8 }}>
            <Icon
              source={item.iconName}
              size={16}
              color={item.iconColor || theme.colors.onSurfaceVariant}
            />
          </View>
        ) : null}
        <Text
          style={[styles.inputText, !item && styles.placeholder]}
          numberOfLines={1}
        >
          {item ? item.name : placeholder || t("common.selectOption")}
        </Text>
      </View>
      {!!item?.description && (
        <Text style={styles.descriptionText} numberOfLines={2}>
          {item.description}
        </Text>
      )}
    </View>
  );

  const selectedItem = renderItem(selectedOption);

  const renderInlineMode = () => (
    <View ref={containerRef}>
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
      <View>
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
          <View style={styles.valueRow}>{renderItem(selectedOption)}</View>
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
