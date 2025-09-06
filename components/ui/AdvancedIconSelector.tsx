import { IconSets } from "@/constants/Icons";
import {
  AntDesign
} from '@expo/vector-icons';
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Common icon names for each icon set (subset of popular icons)
const ICON_COLLECTIONS = {
  'SF Symbols': [
    // Navigation & System (using Ionicons equivalents for cross-platform)
    'home', 'home-outline', 'settings', 'settings-outline', 'cog', 'cog-outline',
    'person', 'person-outline', 'person-circle', 'person-circle-outline',
    'search', 'search-outline', 'heart', 'heart-outline',
    'star', 'star-outline', 'add', 'add-outline', 'remove', 'remove-outline',
    'checkmark', 'checkmark-outline', 'close', 'close-outline',
    'chevron-up', 'chevron-down', 'chevron-back', 'chevron-forward',
    'arrow-up', 'arrow-down', 'arrow-back', 'arrow-forward',
    'play', 'play-outline', 'pause', 'pause-outline', 'stop', 'stop-outline',
    'share', 'share-outline', 'download', 'download-outline', 'refresh', 'refresh-outline',
    
    // Communication & Media
    'mail', 'mail-outline', 'call', 'call-outline', 'chatbubble', 'chatbubble-outline',
    'camera', 'camera-outline', 'image', 'images', 'videocam', 'videocam-outline',
    'mic', 'mic-outline', 'volume-high', 'volume-medium', 'volume-low', 'volume-mute',
    'notifications', 'notifications-outline', 'notifications-off', 'notifications-off-outline',
    
    // System & Security
    'lock-closed', 'lock-closed-outline', 'lock-open', 'lock-open-outline', 
    'key', 'key-outline', 'shield', 'shield-outline', 'warning', 'warning-outline',
    'information', 'information-circle', 'help', 'help-circle',
    'bulb', 'bulb-outline', 'flash', 'flash-outline',
    
    // Files & Documents
    'folder', 'folder-outline', 'folder-open', 'folder-open-outline',
    'document', 'document-outline', 'document-text', 'document-text-outline',
    'clipboard', 'clipboard-outline', 'trash', 'trash-outline',
    'attach', 'link', 'copy', 'copy-outline',
    
    // Time & Calendar
    'time', 'time-outline', 'calendar', 'calendar-outline', 
    'alarm', 'alarm-outline', 'timer', 'timer-outline',
    'stopwatch', 'stopwatch-outline', 'hourglass', 'hourglass-outline',
    
    // Location & Maps
    'location', 'location-outline', 'map', 'map-outline', 
    'compass', 'compass-outline', 'navigate', 'navigate-outline',
    'globe', 'globe-outline', 'earth', 'earth-outline',
    
    // Transportation
    'car', 'car-outline', 'car-sport', 'car-sport-outline',
    'airplane', 'airplane-outline', 'bicycle', 'bus', 'bus-outline',
    'boat', 'boat-outline', 'train', 'train-outline',
    
    // Weather & Nature
    'sunny', 'sunny-outline', 'moon', 'moon-outline', 
    'cloud', 'cloud-outline', 'rainy', 'rainy-outline',
    'snow', 'snow-outline', 'thunderstorm', 'thunderstorm-outline',
    'leaf', 'leaf-outline', 'flower', 'flower-outline',
    
    // Health & Body
    'heart-dislike', 'heart-dislike-outline', 'medical', 'medical-outline',
    'fitness', 'fitness-outline', 'pulse', 'thermometer', 'thermometer-outline',
    'bandage', 'glasses', 'glasses-outline',
    
    // Business & Shopping
    'bag', 'bag-outline', 'bag-handle', 'bag-handle-outline',
    'basket', 'basket-outline', 'card', 'card-outline',
    'cash', 'cash-outline', 'storefront', 'storefront-outline',
    'business', 'business-outline', 'briefcase', 'briefcase-outline',
    
    // Technology & Devices
    'phone-portrait', 'phone-portrait-outline', 'tablet-portrait', 'tablet-portrait-outline',
    'laptop', 'laptop-outline', 'desktop', 'desktop-outline',
    'tv', 'tv-outline', 'headset', 'headset-outline',
    'wifi', 'wifi-outline', 'bluetooth', 'cellular',
    'battery-full', 'battery-half', 'battery-dead', 'battery-charging',
    
    // Food & Drink
    'restaurant', 'restaurant-outline', 'fast-food', 'fast-food-outline',
    'cafe', 'cafe-outline', 'wine', 'wine-outline',
    'pizza', 'pizza-outline', 'ice-cream', 'ice-cream-outline'
  ],
  Ionicons: [
    'home', 'home-outline', 'settings', 'settings-outline', 'notifications', 'notifications-outline',
    'person', 'person-outline', 'search', 'search-outline', 'heart', 'heart-outline',
    'star', 'star-outline', 'add', 'add-outline', 'remove', 'remove-outline',
    'checkmark', 'checkmark-outline', 'close', 'close-outline', 'menu', 'menu-outline',
    'chevron-up', 'chevron-down', 'chevron-back', 'chevron-forward',
    'arrow-up', 'arrow-down', 'arrow-back', 'arrow-forward',
    'play', 'pause', 'stop', 'refresh', 'reload', 'sync',
    'camera', 'camera-outline', 'image', 'images', 'document', 'document-text',
    'folder', 'folder-open', 'download', 'cloud-download', 'share', 'share-outline',
    'trash', 'trash-outline', 'create', 'create-outline', 'copy', 'copy-outline',
    'cut', 'cut-outline', 'clipboard', 'clipboard-outline',
    'mail', 'mail-outline', 'call', 'call-outline', 'chatbubble', 'chatbubble-outline',
    'location', 'location-outline', 'map', 'map-outline', 'compass', 'compass-outline',
    'time', 'time-outline', 'calendar', 'calendar-outline', 'alarm', 'alarm-outline',
    'bulb', 'bulb-outline', 'flash', 'flash-outline', 'warning', 'warning-outline',
    'information', 'information-circle', 'help', 'help-circle',
    'eye', 'eye-outline', 'eye-off', 'eye-off-outline',
    'lock-closed', 'lock-open', 'key', 'key-outline',
    'wifi', 'wifi-outline', 'bluetooth', 'cellular',
    'battery-full', 'battery-half', 'battery-dead',
    'volume-high', 'volume-medium', 'volume-low', 'volume-mute',
    'videocam', 'videocam-outline', 'mic', 'mic-outline', 'mic-off',
    'desktop', 'laptop', 'tablet-portrait', 'phone-portrait',
    'car', 'car-outline', 'airplane', 'boat', 'bicycle',
    'storefront', 'storefront-outline', 'business', 'business-outline',
    'restaurant', 'restaurant-outline', 'fast-food', 'fast-food-outline',
    'fitness', 'fitness-outline', 'medical', 'medical-outline',
    'school', 'school-outline', 'library', 'library-outline'
  ],
  MaterialIcons: [
    'home', 'settings', 'account-circle', 'search', 'favorite', 'star',
    'add', 'remove', 'check', 'close', 'menu', 'more-vert', 'more-horiz',
    'expand-more', 'expand-less', 'chevron-left', 'chevron-right',
    'arrow-upward', 'arrow-downward', 'arrow-back', 'arrow-forward',
    'play-arrow', 'pause', 'stop', 'refresh', 'sync', 'update',
    'camera', 'photo', 'image', 'folder', 'insert-drive-file',
    'download', 'upload', 'share', 'delete', 'edit', 'content-copy',
    'content-cut', 'content-paste',
    'email', 'phone', 'chat', 'message',
    'location-on', 'map', 'navigation', 'explore',
    'access-time', 'schedule', 'event', 'alarm',
    'lightbulb', 'flash-on', 'warning', 'info', 'help',
    'visibility', 'visibility-off', 'lock', 'lock-open', 'vpn-key',
    'wifi', 'bluetooth', 'signal-cellular-4-bar',
    'battery-full', 'battery-alert', 'volume-up', 'volume-down', 'volume-off',
    'videocam', 'mic', 'mic-off',
    'computer', 'laptop', 'tablet', 'smartphone',
    'directions-car', 'flight', 'directions-boat', 'directions-bike',
    'store', 'business', 'restaurant', 'local-dining',
    'fitness-center', 'local-hospital', 'school', 'local-library'
  ],
  MaterialCommunityIcons: [
    'home', 'home-outline', 'cog', 'cog-outline', 'account', 'account-outline',
    'magnify', 'heart', 'heart-outline', 'star', 'star-outline',
    'plus', 'minus', 'check', 'close', 'menu', 'dots-vertical', 'dots-horizontal',
    'chevron-up', 'chevron-down', 'chevron-left', 'chevron-right',
    'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right',
    'play', 'pause', 'stop', 'refresh', 'sync', 'update',
    'camera', 'camera-outline', 'image', 'image-outline', 'folder', 'folder-outline',
    'download', 'upload', 'share', 'delete', 'delete-outline', 'pencil', 'pencil-outline',
    'content-copy', 'content-cut', 'content-paste',
    'email', 'email-outline', 'phone', 'phone-outline', 'chat', 'chat-outline',
    'map-marker', 'map-marker-outline', 'compass', 'compass-outline',
    'clock', 'clock-outline', 'calendar', 'calendar-outline', 'alarm', 'alarm-multiple',
    'lightbulb', 'lightbulb-outline', 'flash', 'alert', 'alert-outline', 'information', 'help-circle',
    'eye', 'eye-outline', 'eye-off', 'eye-off-outline', 'lock', 'lock-outline', 'key', 'key-outline',
    'wifi', 'bluetooth', 'signal',
    'battery', 'battery-alert', 'volume-high', 'volume-medium', 'volume-low', 'volume-off',
    'video', 'video-outline', 'microphone', 'microphone-outline', 'microphone-off',
    'monitor', 'laptop', 'tablet', 'cellphone',
    'car', 'car-outline', 'airplane', 'ship', 'bike',
    'store', 'store-outline', 'office-building', 'food', 'silverware',
    'dumbbell', 'hospital', 'school', 'library'
  ],
  Feather: [
    'home', 'settings', 'user', 'search', 'heart', 'star',
    'plus', 'minus', 'check', 'x', 'menu', 'more-vertical', 'more-horizontal',
    'chevron-up', 'chevron-down', 'chevron-left', 'chevron-right',
    'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right',
    'play', 'pause', 'square', 'refresh-cw', 'rotate-cw',
    'camera', 'image', 'folder', 'file', 'file-text',
    'download', 'upload', 'share', 'trash', 'trash-2', 'edit', 'edit-2',
    'copy', 'scissors', 'clipboard',
    'mail', 'phone', 'message-circle', 'message-square',
    'map-pin', 'map', 'navigation', 'compass',
    'clock', 'calendar', 'bell', 'bell-off',
    'zap', 'sun', 'moon', 'alert-triangle', 'info', 'help-circle',
    'eye', 'eye-off', 'lock', 'unlock', 'key',
    'wifi', 'bluetooth', 'signal',
    'battery', 'battery-charging', 'volume', 'volume-1', 'volume-2', 'volume-x',
    'video', 'video-off', 'mic', 'mic-off',
    'monitor', 'smartphone', 'tablet', 'tv',
    'truck', 'car', 'plane', 'anchor', 'bicycle'
  ],
  FontAwesome5: [
    'home', 'cog', 'user', 'search', 'heart', 'star',
    'plus', 'minus', 'check', 'times', 'bars', 'ellipsis-v', 'ellipsis-h',
    'chevron-up', 'chevron-down', 'chevron-left', 'chevron-right',
    'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right',
    'play', 'pause', 'stop', 'sync-alt', 'redo',
    'camera', 'image', 'folder', 'file', 'file-alt',
    'download', 'upload', 'share', 'trash', 'trash-alt', 'edit', 'pen',
    'copy', 'cut', 'clipboard',
    'envelope', 'phone', 'comment', 'comments',
    'map-marker-alt', 'map', 'route', 'compass',
    'clock', 'calendar', 'bell', 'volume-up', 'volume-down', 'volume-off',
    'lightbulb', 'sun', 'moon', 'exclamation-triangle', 'info-circle', 'question-circle',
    'eye', 'eye-slash', 'lock', 'unlock', 'key',
    'wifi', 'bluetooth-b', 'signal',
    'battery-full', 'battery-half', 'battery-empty',
    'video', 'microphone', 'microphone-slash',
    'desktop', 'laptop', 'mobile-alt', 'tv',
    'car', 'plane', 'ship', 'bicycle'
  ],
  AntDesign: [
    'home', 'setting', 'user', 'search1', 'heart', 'star',
    'plus', 'minus', 'check', 'close', 'menu-fold', 'menu-unfold',
    'up', 'down', 'left', 'right',
    'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
    'caretup', 'caretdown', 'caretleft', 'caretright',
    'playcircleo', 'pausecircleo', 'stop', 'reload1', 'sync',
    'camera', 'picture', 'folder1', 'file1', 'filetext1',
    'download', 'upload', 'sharealt', 'delete', 'edit',
    'copy1', 'scissor', 'clipboard1',
    'mail', 'phone', 'message1', 'contacts',
    'enviromento', 'notification', 'bells',
    'bulb1', 'sun', 'warning', 'infocirlce', 'questioncircle',
    'eye', 'eyeo', 'lock', 'unlock', 'key',
    'wifi', 'sound', 'notification',
    'videocamera', 'customerservice',
    'car', 'earth'
  ],
};

export interface IconInfo {
  name: string;
  set: keyof typeof IconSets;
}

interface AdvancedIconSelectorProps {
  label?: string;
  selectedIcon: IconInfo | null;
  onIconChange: (icon: IconInfo | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function AdvancedIconSelector({
  label,
  selectedIcon,
  onIconChange,
  placeholder = "Select an icon",
  disabled = false,
}: AdvancedIconSelectorProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSet, setSelectedSet] = useState<keyof typeof IconSets | 'all'>('all');

  const screenWidth = Dimensions.get('window').width;
  const iconSize = (screenWidth - 80) / 6; // 6 icons per row with padding

  // Get all available icons from selected set
  const availableIcons = useMemo(() => {
    const icons: IconInfo[] = [];
    
    if (selectedSet === 'all') {
      Object.entries(ICON_COLLECTIONS).forEach(([setName, iconNames]) => {
        iconNames.forEach(iconName => {
          icons.push({ name: iconName, set: setName as keyof typeof IconSets });
        });
      });
    } else {
      const iconNames = ICON_COLLECTIONS[selectedSet] || [];
      iconNames.forEach(iconName => {
        icons.push({ name: iconName, set: selectedSet });
      });
    }
    
    return icons;
  }, [selectedSet]);

  // Filter icons based on search query
  const filteredIcons = useMemo(() => {
    if (!searchQuery.trim()) {
      return availableIcons;
    }
    return availableIcons.filter(icon =>
      icon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      icon.set.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, availableIcons]);

  const handleIconSelect = (icon: IconInfo) => {
    onIconChange(icon);
    setIsModalVisible(false);
    setSearchQuery("");
  };

  const renderIcon = (iconInfo: IconInfo) => {
    const IconComponent = IconSets[iconInfo.set];
    return (
      <IconComponent
        name={iconInfo.name as any}
        size={24}
        color="#666"
      />
    );
  };

  const renderIconItem = ({ item }: { item: IconInfo }) => (
    <TouchableOpacity
      style={[
        styles.iconItem,
        { width: iconSize },
        selectedIcon && selectedIcon.name === item.name && selectedIcon.set === item.set && styles.iconItemSelected,
      ]}
      onPress={() => handleIconSelect(item)}
    >
      {renderIcon(item)}
      <Text
        style={[
          styles.iconName,
          selectedIcon && selectedIcon.name === item.name && selectedIcon.set === item.set && styles.iconNameSelected,
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {item.name}
      </Text>
      <Text style={styles.iconSet}>{item.set}</Text>
    </TouchableOpacity>
  );

  const iconSetOptions = [
    { key: 'all', label: 'All Icons' },
    { key: 'SF Symbols', label: 'SF Symbols' },
    { key: 'Ionicons', label: 'Ionicons' },
    { key: 'MaterialIcons', label: 'Material' },
    { key: 'MaterialCommunityIcons', label: 'Material Community' },
    { key: 'Feather', label: 'Feather' },
    { key: 'FontAwesome5', label: 'FontAwesome' },
    { key: 'AntDesign', label: 'Ant Design' },
  ];

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity
        style={[styles.selector, disabled && styles.selectorDisabled]}
        onPress={() => !disabled && setIsModalVisible(true)}
        disabled={disabled}
      >
        <View style={styles.selectedIconContainer}>
          {selectedIcon ? (
            <>
              {renderIcon(selectedIcon)}
              <View style={styles.selectedIconText}>
                <Text style={[styles.selectedIconName, disabled && styles.disabledText]}>
                  {selectedIcon.name}
                </Text>
                <Text style={[styles.selectedIconSet, disabled && styles.disabledText]}>
                  {selectedIcon.set}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.placeholderContainer}>
              <AntDesign name="question" size={24} color={disabled ? "#ccc" : "#999"} />
              <Text style={[styles.placeholderText, disabled && styles.disabledText]}>
                {placeholder}
              </Text>
            </View>
          )}
        </View>
        <AntDesign
          name="down"
          size={16}
          color={disabled ? "#ccc" : "#666"}
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
            <View style={styles.headerButtons}>
              {selectedIcon && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    onIconChange(null);
                    setIsModalVisible(false);
                  }}
                >
                  <AntDesign name="delete" size={20} color="#ff4444" />
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsModalVisible(false)}
              >
                <AntDesign name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Icon Set Filter */}
          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Icon Set:</Text>
            <View style={styles.filterButtons}>
              {iconSetOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.filterButton,
                    selectedSet === option.key && styles.filterButtonActive,
                  ]}
                  onPress={() => setSelectedSet(option.key as any)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      selectedSet === option.key && styles.filterButtonTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <AntDesign
              name="search1"
              size={20}
              color="#666"
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
                <AntDesign name="close" size={16} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              Showing {filteredIcons.length} icons
              {selectedSet !== 'all' && ` from ${selectedSet}`}
            </Text>
          </View>

          <FlatList
            style={styles.iconsList}
            data={filteredIcons}
            renderItem={renderIconItem}
            keyExtractor={(item) => `${item.set}-${item.name}`}
            numColumns={6}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.noResultsContainer}>
                <AntDesign name="search1" size={48} color="#ccc" />
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
  selectedIconText: {
    marginLeft: 8,
  },
  selectedIconName: {
    fontSize: 16,
    color: "#333",
  },
  selectedIconSet: {
    fontSize: 12,
    color: "#666",
    marginTop: 1,
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
  filterContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 10,
  },
  filterButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  filterButtonActive: {
    backgroundColor: "#0a7ea4",
    borderColor: "#0a7ea4",
  },
  filterButtonText: {
    fontSize: 12,
    color: "#666",
  },
  filterButtonTextActive: {
    color: "#fff",
    fontWeight: "500",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 20,
    marginBottom: 10,
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
  statsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  statsText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  iconsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  iconItem: {
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    margin: 2,
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
  iconSet: {
    fontSize: 8,
    color: "#999",
    marginTop: 1,
    textAlign: "center",
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
  placeholderContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  placeholderText: {
    fontSize: 16,
    color: "#999",
    marginLeft: 8,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "#fff0f0",
    borderWidth: 1,
    borderColor: "#ffcccc",
  },
  clearButtonText: {
    fontSize: 12,
    color: "#ff4444",
    marginLeft: 4,
    fontWeight: "500",
  },
});
