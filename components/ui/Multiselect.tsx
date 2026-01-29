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
import { Chip, Icon, Portal, useTheme } from "react-native-paper";
import { IconSource } from "react-native-paper/lib/typescript/components/Icon";
import ThemedBottomSheet, { ThemedBottomSheetRef } from "./ThemedBottomSheet";

export interface MultiselectOption {
  id: any;
  name: string;
  description?: string;
  iconName?: IconSource;
  iconColor?: string;
  iconUrl?: string;
  iconElement?: React.ReactNode;
}

interface MultiselectProps {
  label?: string;
  placeholder?: string;
  options: MultiselectOption[];
  selectedValues?: any[];
  onValuesChange: (values: any[]) => void;
  isSearchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  helperText?: string;
  error?: boolean;
  errorText?: string;
  mode?: "modal" | "inline";
  maxChipsToShow?: number; // Number of chips to show before "+X more"
  showSelectAll?: boolean;
  preferredDropdownDirection?: "up" | "down";
}

const { height: screenHeight } = Dimensions.get("window");

export default function Multiselect({
  label,
  placeholder,
  options,
  selectedValues = [],
  onValuesChange,
  isSearchable = false,
  searchPlaceholder,
  disabled = false,
  helperText,
  error = false,
  errorText,
  mode = "modal",
  maxChipsToShow = 3,
  showSelectAll = true,
  preferredDropdownDirection = "down",
}: MultiselectProps) {
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

  const selectedOptions = options.filter((option) =>
    selectedValues.includes(option.id)
  );

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
      (containerRef.current as any)?.measureInWindow?.(
        (pageX: number, pageY: number, width: number, height: number) => {
          const { width: screenWidth, height: screenHeight } =
            Dimensions.get("window");

          // Safe area bounds (for notches/status bars on mobile)
          const verticalMargin = 8;
          const horizontalMargin = 8;

          const spaceBelow = screenHeight - verticalMargin - (pageY + height);
          const spaceAbove = pageY - verticalMargin;
          const maxDropdownHeight = 350;
          const minDropdownHeight = 120;
          const downThreshold = minDropdownHeight * 1.5;

          // Estimate dropdown content height (actions/search + items)
          const estimatedHeader =
            (showSelectAll ? 48 : 0) + (isSearchable ? 56 : 0);
          const estimatedItemHeight = 48;
          const estimatedItems = Math.max(1, Math.min(options.length, 7)); // cap estimate to avoid huge sizes
          const estimatedHeight =
            estimatedHeader + estimatedItems * estimatedItemHeight + 8;

          const canOpenDown = spaceBelow >= downThreshold;
          const canOpenUp = spaceAbove >= minDropdownHeight;

          let shouldOpenUpward: boolean;

          if (canOpenDown && canOpenUp) {
            // Both directions possible: honor preferred direction
            shouldOpenUpward = preferredDropdownDirection === "up";
          } else if (canOpenUp) {
            shouldOpenUpward = true;
          } else if (canOpenDown) {
            shouldOpenUpward = false;
          } else {
            // Neither side has enough space: choose side with more space
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

          // Compute top target edge aligned to the field
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

          // Do not add scroll offsets; measureInWindow returns viewport-relative coords across platforms

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

  const handleToggleOption = (option: MultiselectOption) => {
    const isSelected = selectedValues.includes(option.id);
    if (isSelected) {
      onValuesChange(selectedValues.filter((id) => id !== option.id));
    } else {
      onValuesChange([...selectedValues, option.id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedValues.length === options.length) {
      // Deselect all
      onValuesChange([]);
    } else {
      // Select all
      onValuesChange(options.map((option) => option.id));
    }
  };

  const handleClearSelection = () => {
    onValuesChange([]);
  };

  const allSelected = selectedValues.length === options.length;
  const someSelected = selectedValues.length > 0 && !allSelected;

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
    valueContainer: {
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 8,
    },
    chevronTouchable: {
      padding: 4,
      marginLeft: 4,
    },
    disabledInput: {
      backgroundColor: theme.colors.surfaceDisabled,
      borderColor: theme.colors.outlineVariant,
    },
    errorInput: {
      borderColor: theme.colors.error,
    },
    placeholder: {
      fontSize: 16,
      color: theme.colors.onSurfaceVariant,
    },
    chip: {
      height: 28,
    },
    moreChip: {
      height: 28,
      backgroundColor: theme.colors.secondaryContainer,
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
      maxHeight: dropdownPosition.maxHeight,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 8,
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
      maxHeight: Math.max(
        100,
        dropdownPosition.maxHeight -
          ((showSelectAll ? 48 : 0) + (isSearchable ? 56 : 0) + 24)
      ),
    },
    inlineOptionItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    inlineSelectedOption: {
      backgroundColor: theme.colors.primaryContainer,
    },
    inlineOptionContent: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    inlineOptionText: {
      fontSize: 16,
      color: theme.colors.onSurface,
      flex: 1,
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
    inlineActionsContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.elevation?.level1 || theme.colors.surface,
    },
    inlineActionButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    inlineActionButtonText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.primary,
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
    actionsContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.elevation?.level1 || theme.colors.surface,
    },
    actionButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.primary,
    },
    optionsList: {
      maxHeight: 300,
    },
    optionItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    selectedOption: {
      backgroundColor: theme.colors.primaryContainer,
    },
    optionContent: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    optionText: {
      fontSize: 16,
      color: theme.colors.onSurface,
      flex: 1,
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
  }),
    [
      theme,
      error,
      dropdownPosition.top,
      dropdownPosition.left,
      dropdownPosition.width,
      dropdownPosition.maxHeight,
      dropdownPosition.isOpeningUpward,
      showSelectAll,
      isSearchable,
    ]
  );

  const renderSelectedChips = () => {
    if (selectedOptions.length === 0) {
      return (
        <Text style={styles.placeholder}>
          {placeholder || t("common.selectOptions")}
        </Text>
      );
    }

    const visibleChips = selectedOptions.slice(0, maxChipsToShow);
    const remainingCount = selectedOptions.length - maxChipsToShow;

    return (
      <>
        {visibleChips.map((option) => (
          <Chip
            key={option.id}
            style={styles.chip}
            textStyle={{ fontSize: 12 }}
            onClose={() => handleToggleOption(option)}
          >
            {option.name}
          </Chip>
        ))}
        {remainingCount > 0 && (
          <Chip style={styles.moreChip} textStyle={{ fontSize: 12 }}>
            +{remainingCount}
          </Chip>
        )}
      </>
    );
  };

  const renderOptionItem = (item: MultiselectOption) => {
    const isSelected = selectedValues.includes(item.id);

    return (
      <View style={styles.optionContent}>
        {item.iconElement ? (
          item.iconElement
        ) : item.iconUrl ? (
          <Image
            source={item.iconUrl}
            cachePolicy="memory-disk"
            style={{ width: 24, height: 24, borderRadius: 12 }}
            contentFit="fill"
          />
        ) : item.iconName ? (
          <Icon
            source={item.iconName as any}
            size={16}
            color={item.iconColor || theme.colors.onSurfaceVariant}
          />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.optionText, isSelected && styles.selectedOptionText]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {!!item.description && (
            <Text style={styles.descriptionText} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderInlineMode = () => (
    <View ref={containerRef}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputContainer,
          disabled && styles.disabledInput,
          error && styles.errorInput,
        ]}
      >
        <View style={styles.valueContainer} pointerEvents="box-none">
          {renderSelectedChips()}
        </View>
        <TouchableOpacity
          onPress={toggleInlineDropdown}
          disabled={disabled}
          style={styles.chevronTouchable}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon
            source={isInlineDropdownOpen ? "chevron-up" : "chevron-down"}
            size={20}
            color={theme.colors.onSurfaceVariant}
          />
        </TouchableOpacity>
      </View>

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
            {/* Actions */}
            {showSelectAll && (
              <View style={styles.inlineActionsContainer}>
                <TouchableOpacity
                  style={styles.inlineActionButton}
                  onPress={handleSelectAll}
                >
                  <Text style={styles.inlineActionButtonText}>
                    {allSelected
                      ? t("common.deselectAll")
                      : t("common.selectAll")}
                  </Text>
                </TouchableOpacity>
                {someSelected && (
                  <TouchableOpacity
                    style={styles.inlineActionButton}
                    onPress={handleClearSelection}
                  >
                    <Text style={styles.inlineActionButtonText}>
                      {t("common.clear")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

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
              initialNumToRender={16}
              maxToRenderPerBatch={12}
              windowSize={8}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              renderItem={({ item }) => {
                const isSelected = selectedValues.includes(item.id);
                return (
                  <TouchableOpacity
                    style={[
                      styles.inlineOptionItem,
                      isSelected && styles.inlineSelectedOption,
                    ]}
                    onPress={() => handleToggleOption(item)}
                  >
                    {renderOptionItem(item)}
                    <Icon
                      source={
                        isSelected
                          ? "checkbox-marked"
                          : "checkbox-blank-outline"
                      }
                      size={24}
                      color={
                        isSelected
                          ? theme.colors.primary
                          : theme.colors.onSurfaceVariant
                      }
                    />
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
          </View>
        </Portal>
      )}
    </View>
  );

  const trigger = useCallback(
    (show: () => void) => (
      <View>
        {label && <Text style={styles.label}>{label}</Text>}

        <View
          style={[
            styles.inputContainer,
            disabled && styles.disabledInput,
            error && styles.errorInput,
          ]}
        >
          <View style={styles.valueContainer} pointerEvents="box-none">
            {renderSelectedChips()}
          </View>
          <TouchableOpacity
            onPress={show}
            disabled={disabled}
            style={styles.chevronTouchable}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Icon
              source="chevron-down"
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>
        {helperText && !error && (
          <Text style={styles.helperText}>{helperText}</Text>
        )}
        {errorText && error && (
          <Text style={styles.errorText}>{errorText}</Text>
        )}
      </View>
    ),
    [errorText, error, label, placeholder, selectedOptions, t]
  );

  const renderModalMode = () => {
    return (
      <ThemedBottomSheet
        ref={sheetRef}
        title={label || t("common.selectOptions")}
        trigger={trigger}
      >
        {/* Actions */}
        {showSelectAll && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSelectAll}
            >
              <Text style={styles.actionButtonText}>
                {allSelected ? t("common.deselectAll") : t("common.selectAll")}
              </Text>
            </TouchableOpacity>
            {someSelected && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleClearSelection}
              >
                <Text style={styles.actionButtonText}>{t("common.clear")}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

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
            const isSelected = selectedValues.includes(item.id);
            return (
              <TouchableOpacity
                style={[styles.optionItem, isSelected && styles.selectedOption]}
                onPress={() => handleToggleOption(item)}
              >
                {renderOptionItem(item)}
                <Icon
                  source={
                    isSelected ? "checkbox-marked" : "checkbox-blank-outline"
                  }
                  size={24}
                  color={
                    isSelected
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant
                  }
                />
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
