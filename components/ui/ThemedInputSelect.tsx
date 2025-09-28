import { useI18n } from "@/hooks";
import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  ScrollView,
  TextInput,
  Animated,
  Dimensions,
  StyleSheet,
} from "react-native";
import { useTheme, Icon } from "react-native-paper";
import ThemedBottomSheet from "./ThemedBottomSheet";

interface ThemedInputSelectProps {
  label?: string;
  placeholder?: string;
  options: any[];
  optionLabel: string;
  optionValue: string;
  selectedValue?: any;
  onValueChange: (value: any) => void;
  isSearchable?: boolean;
  disabled?: boolean;
  helperText?: string;
  error?: boolean;
  errorText?: string;
  mode?: "modal" | "inline"; // Nuova prop per la modalità
}

const { height: screenHeight } = Dimensions.get("window");

export default function ThemedInputSelect({
  label,
  placeholder,
  options,
  optionLabel,
  optionValue,
  selectedValue,
  onValueChange,
  isSearchable = false,
  disabled = false,
  helperText,
  error = false,
  errorText,
  mode = "modal", // Default alla modalità modal
}: ThemedInputSelectProps) {
  const theme = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isInlineDropdownOpen, setIsInlineDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<View>(null);
  const { t } = useI18n();

  const selectedOption = options.find(
    (option) => option[optionValue] === selectedValue
  );

  const filteredOptions = useMemo(() => {
    if (!isSearchable || !searchQuery.trim()) {
      return options;
    }

    return options.filter((option) =>
      option[optionLabel].toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery, optionLabel, isSearchable]);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const hideModal = () => {
    setIsModalVisible(false);
  };

  const handleSelectOption = (option: any) => {
    onValueChange(option[optionValue]);
    if (mode === "modal") {
      hideModal();
    } else {
      setIsInlineDropdownOpen(false);
    }
  };

  const toggleInlineDropdown = () => {
    setIsInlineDropdownOpen(!isInlineDropdownOpen);
    setSearchQuery("");
  };

  const closeInlineDropdown = () => {
    setIsInlineDropdownOpen(false);
    setSearchQuery("");
  };

  // Gestione semplice per chiudere il dropdown quando si clicca fuori
  useEffect(() => {
    if (mode === "inline" && isInlineDropdownOpen) {
      const timer = setTimeout(() => {
        // Chiudi automaticamente dopo 5 secondi se non viene interagito
        closeInlineDropdown();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [mode, isInlineDropdownOpen]);

  const styles = StyleSheet.create({
    container: {
      marginVertical: 8,
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
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: error ? theme.colors.error : theme.colors.outlineVariant,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 56,
    },
    inputText: {
      flex: 1,
      fontSize: 16,
      color: selectedOption
        ? theme.colors.onSurface
        : theme.colors.onSurfaceVariant,
    },
    placeholder: {
      color: theme.colors.onSurfaceVariant,
    },
    chevronIcon: {
      marginLeft: 8,
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
      borderColor: theme.colors.outlineVariant,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.colors.onSurface,
    },
    optionsList: {
      flexGrow: 1,
    },
    optionItem: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    optionText: {
      fontSize: 16,
      color: theme.colors.onSurface,
    },
    selectedOption: {
      backgroundColor: theme.colors.primaryContainer,
    },
    selectedOptionText: {
      color: theme.colors.onPrimaryContainer,
      fontWeight: "500",
    },
    emptyState: {
      padding: 40,
      alignItems: "center",
    },
    emptyStateText: {
      fontSize: 16,
      color: theme.colors.onSurfaceVariant,
      textAlign: "center",
    },
    inlineDropdownContainer: {
      position: "relative",
      zIndex: 1000,
    },
    inlineDropdown: {
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      borderRadius: 12,
      marginTop: 4,
      maxHeight: 200,
      zIndex: 1001,
      elevation: 1000,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      overflow: "hidden",
    },
    inlineDropdownItem: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    inlineDropdownItemLast: {
      borderBottomWidth: 0,
    },
    inlineDropdownItemText: {
      fontSize: 16,
      color: theme.colors.onSurface,
    },
    inlineDropdownItemSelected: {
      backgroundColor: theme.colors.primaryContainer,
    },
    inlineDropdownItemTextSelected: {
      color: theme.colors.onPrimaryContainer,
      fontWeight: "500",
    },
    inlineSearchContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
    },
    inlineSearchInput: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      color: theme.colors.onSurface,
    },
    inlineEmptyState: {
      padding: 20,
      alignItems: "center",
    },
    inlineEmptyStateText: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      textAlign: "center",
    },
  });

  const renderInlineDropdown = () => {
    if (!isInlineDropdownOpen) return null;

    return (
      <View style={styles.inlineDropdown}>
        {isSearchable && (
          <View style={styles.inlineSearchContainer}>
            <TextInput
              style={styles.inlineSearchInput}
              placeholder={t("bucketSelector.searchBuckets")}
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        )}

        <ScrollView
          style={{ maxHeight: 200 }}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          {filteredOptions.length === 0 ? (
            <View style={styles.inlineEmptyState}>
              <Text style={styles.inlineEmptyStateText}>
                {searchQuery.trim()
                  ? "Nessun risultato trovato"
                  : "Nessuna opzione disponibile"}
              </Text>
            </View>
          ) : (
            filteredOptions.map((item, index) => {
              const isSelected = item[optionValue] === selectedValue;
              const isLast = index === filteredOptions.length - 1;

              return (
                <TouchableOpacity
                  key={item[optionValue].toString()}
                  style={[
                    styles.inlineDropdownItem,
                    isLast && styles.inlineDropdownItemLast,
                    isSelected && styles.inlineDropdownItemSelected,
                  ]}
                  onPress={() => handleSelectOption(item)}
                >
                  <Text
                    style={[
                      styles.inlineDropdownItemText,
                      isSelected && styles.inlineDropdownItemTextSelected,
                    ]}
                  >
                    {item[optionLabel]}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    );
  };

  if (mode === "inline") {
    return (
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}

        <View ref={containerRef} style={styles.inlineDropdownContainer}>
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={toggleInlineDropdown}
            disabled={disabled}
          >
            <Text
              style={[styles.inputText, !selectedOption && styles.placeholder]}
            >
              {selectedOption
                ? selectedOption[optionLabel]
                : placeholder || "Seleziona un'opzione"}
            </Text>
            <Icon
              source={isInlineDropdownOpen ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>

          {renderInlineDropdown()}
        </View>

        {helperText && !error && (
          <Text style={styles.helperText}>{helperText}</Text>
        )}

        {errorText && error && (
          <Text style={styles.errorText}>{errorText}</Text>
        )}
      </View>
    );
  }

  const trigger = (
    <>
      <TouchableOpacity
        style={styles.inputContainer}
        onPress={showModal}
        disabled={disabled}
      >
        <Text style={[styles.inputText, !selectedOption && styles.placeholder]}>
          {selectedOption ? selectedOption[optionLabel] : placeholder}
        </Text>
        <Icon
          source="chevron-down"
          size={20}
          color={theme.colors.onSurfaceVariant}
        />
      </TouchableOpacity>
      {helperText && !error && (
        <Text style={styles.helperText}>{helperText}</Text>
      )}
      {errorText && error && <Text style={styles.errorText}>{errorText}</Text>}
    </>
  );

  return (
    <ThemedBottomSheet
      title={label}
      trigger={trigger}
      onShown={showModal}
      onHidden={hideModal}
      isVisible={isModalVisible}
    >
      {isSearchable && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={t("bucketSelector.searchBuckets")}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      <FlatList
        style={styles.optionsList}
        data={filteredOptions}
        keyExtractor={(item) => item[optionValue].toString()}
        renderItem={({ item }) => {
          const isSelected = item[optionValue] === selectedValue;
          return (
            <TouchableOpacity
              style={[styles.optionItem, isSelected && styles.selectedOption]}
              onPress={() => handleSelectOption(item)}
            >
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.selectedOptionText,
                ]}
              >
                {item[optionLabel]}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {searchQuery.trim()
                ? "Nessun risultato trovato"
                : "Nessuna opzione disponibile"}
            </Text>
          </View>
        }
      />
    </ThemedBottomSheet>
  );
}
