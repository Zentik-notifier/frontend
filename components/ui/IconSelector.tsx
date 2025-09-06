import { AppIcons } from "@/constants/Icons";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "./Icon";

interface IconSelectorProps {
  label?: string;
  selectedIcon: keyof typeof AppIcons;
  onIconChange: (icon: keyof typeof AppIcons) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function IconSelector({
  label,
  selectedIcon,
  onIconChange,
  placeholder = "Select an icon",
  disabled = false,
}: IconSelectorProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Get all available icons
  const allIcons = Object.keys(AppIcons) as (keyof typeof AppIcons)[];

  // Filter icons based on search query
  const filteredIcons = useMemo(() => {
    if (!searchQuery.trim()) {
      return allIcons;
    }
    return allIcons.filter(iconName =>
      iconName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, allIcons]);

  // Group icons by category for better organization
  const iconCategories = useMemo(() => {
    const categories: { [key: string]: (keyof typeof AppIcons)[] } = {};
    
    filteredIcons.forEach(iconName => {
      let category = "Other";
      
      if (iconName.includes("priority") || iconName.includes("warning") || iconName.includes("error") || iconName.includes("success") || iconName.includes("info")) {
        category = "Status";
      } else if (iconName.includes("add") || iconName.includes("remove") || iconName.includes("edit") || iconName.includes("delete") || iconName.includes("action")) {
        category = "Actions";
      } else if (iconName.includes("push") || iconName.includes("notification") || iconName.includes("send")) {
        category = "Notifications";
      } else if (iconName.includes("home") || iconName.includes("settings") || iconName.includes("bucket") || iconName.includes("navigate")) {
        category = "Navigation";
      } else if (iconName.includes("text") || iconName.includes("image") || iconName.includes("video") || iconName.includes("sound")) {
        category = "Content";
      } else if (iconName.includes("ios") || iconName.includes("android") || iconName.includes("mobile") || iconName.includes("device")) {
        category = "Platform";
      }
      
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(iconName);
    });
    
    return categories;
  }, [filteredIcons]);

  const handleIconSelect = (icon: keyof typeof AppIcons) => {
    onIconChange(icon);
    setIsModalVisible(false);
    setSearchQuery("");
  };

  const renderIconItem = ({ item }: { item: keyof typeof AppIcons }) => (
    <TouchableOpacity
      style={[
        styles.iconItem,
        selectedIcon === item && styles.iconItemSelected,
      ]}
      onPress={() => handleIconSelect(item)}
    >
      <Icon
        name={item}
        size="lg"
        color={selectedIcon === item ? "primary" : "secondary"}
      />
      <Text
        style={[
          styles.iconName,
          selectedIcon === item && styles.iconNameSelected,
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderCategorySection = (category: string, icons: (keyof typeof AppIcons)[]) => (
    <View key={category} style={styles.categorySection}>
      <Text style={styles.categoryTitle}>{category}</Text>
      <FlatList
        data={icons}
        renderItem={renderIconItem}
        keyExtractor={(item) => item}
        numColumns={4}
        scrollEnabled={false}
        columnWrapperStyle={styles.iconRow}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity
        style={[styles.selector, disabled && styles.selectorDisabled]}
        onPress={() => !disabled && setIsModalVisible(true)}
        disabled={disabled}
      >
        <View style={styles.selectedIconContainer}>
          <Icon
            name={selectedIcon}
            size="md"
            color={disabled ? "disabled" : "secondary"}
            style={styles.selectedIcon}
          />
          <Text
            style={[
              styles.selectedIconText,
              disabled && styles.disabledText,
            ]}
          >
            {selectedIcon}
          </Text>
        </View>
        <Icon
          name="dropdown"
          size="sm"
          color={disabled ? "disabled" : "secondary"}
        />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Icon</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Icon name="cancel" size="md" color="secondary" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Icon
              name="search"
              size="sm"
              color="secondary"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search icons..."
              placeholderTextColor="#999"
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

          <FlatList
            style={styles.iconsList}
            data={Object.entries(iconCategories)}
            renderItem={({ item: [category, icons] }) => 
              renderCategorySection(category, icons)
            }
            keyExtractor={(item) => item[0]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.noResultsContainer}>
                <Icon name="search" size="lg" color="disabled" />
                <Text style={styles.noResultsText}>
                  No icons found for "{searchQuery}"
                </Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 5,
  },
  selector: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    backgroundColor: "#fff",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 50,
  },
  selectorDisabled: {
    backgroundColor: "#f5f5f5",
    borderColor: "#e0e0e0",
  },
  selectedIconContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  selectedIcon: {
    marginRight: 8,
  },
  selectedIconText: {
    fontSize: 16,
    color: "#333",
  },
  disabledText: {
    color: "#999",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#f8f8f8",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 20,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingVertical: 4,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  iconsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    paddingLeft: 4,
  },
  iconRow: {
    justifyContent: "space-between",
    marginBottom: 8,
  },
  iconItem: {
    width: "22%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "#f8f8f8",
  },
  iconItemSelected: {
    borderColor: "#0a7ea4",
    backgroundColor: "#f0f8ff",
  },
  iconName: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  iconNameSelected: {
    color: "#0a7ea4",
    fontWeight: "600",
  },
  noResultsContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  noResultsText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
    textAlign: "center",
  },
});
