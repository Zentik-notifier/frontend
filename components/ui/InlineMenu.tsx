import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import {
  Text,
  TouchableRipple,
  useTheme,
  Surface,
  Divider,
  Icon,
  Portal,
} from "react-native-paper";
import { Image } from "expo-image";

export interface InlineMenuItem {
  id: string;
  label: string;
  icon?: string; // MaterialCommunityIcons name
  imageUrl?: string;
  emoji?: string;
  color?: string;
  subtitle?: string;
  onPress: () => void;
  type?: "normal" | "destructive";
  disabled?: boolean;
  keepOpen?: boolean; // Don't close menu automatically on press
}

interface InlineMenuProps {
  anchor: React.ReactNode;
  items: InlineMenuItem[];
  searchable?: boolean;
  searchPlaceholder?: string;
  maxHeight?: number;
  anchorPosition?: "top" | "bottom";
  position?: "horizontally" | "vertically";
  header?: React.ReactNode;
  onOpen?: () => void;
  onClose?: () => void;
}

export default function InlineMenu({
  anchor,
  items,
  searchable = false,
  searchPlaceholder = "Search items...",
  maxHeight = 300,
  anchorPosition = "bottom",
  position = "horizontally",
  header,
  onOpen,
  onClose,
}: InlineMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [anchorLayout, setAnchorLayout] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const anchorRef = useRef<View>(null);
  const menuRef = useRef<View>(null);
  const theme = useTheme();
  const screenDimensions = Dimensions.get("window");

  const filteredItems = useMemo(() => {
    if (!searchable || !searchQuery.trim()) {
      return items;
    }
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.subtitle &&
          item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [items, searchQuery, searchable]);

  const handleOpen = () => {
    // Measure anchor position
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setAnchorLayout({ x, y, width, height });
      setIsOpen(true);
      onOpen?.();
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchQuery("");
    onClose?.();
  };


  const getMenuPosition = () => {
    const menuWidth = 250;
    const menuHeight = Math.min(
      maxHeight,
      filteredItems.length * 48 + (searchable ? 60 : 0) + (header ? 60 : 0)
    );

    let top = anchorLayout.y;
    let left = anchorLayout.x;

    if (position === "horizontally") {
      // Calculate available space above and below the anchor
      const spaceAbove = anchorLayout.y;
      const spaceBelow = screenDimensions.height - (anchorLayout.y + anchorLayout.height);
      
      // Determine if menu should open above or below based on available space
      const shouldOpenAbove = spaceAbove > spaceBelow && spaceAbove >= menuHeight;
      const shouldOpenBelow = spaceBelow >= menuHeight || !shouldOpenAbove;

      if (shouldOpenAbove) {
        // Open above the anchor: align bottom edge of menu with bottom edge of anchor
        top = anchorLayout.y + anchorLayout.height - menuHeight;
      } else {
        // Open below the anchor: align top edge of menu with top edge of anchor
        top = anchorLayout.y;
      }

      // Align horizontally with the anchor's left edge
      left = anchorLayout.x;

      // Ensure menu stays within screen bounds
      if (left + menuWidth > screenDimensions.width) {
        // If doesn't fit, align with the right edge of the anchor
        left = anchorLayout.x + anchorLayout.width - menuWidth;
      }
      if (left < 16) {
        // If still doesn't fit, position at screen edge
        left = 16;
      }
      if (left + menuWidth > screenDimensions.width) {
        // Final fallback
        left = screenDimensions.width - menuWidth - 16;
      }
      
      // Vertical bounds - ensure menu doesn't go off screen
      if (top < 16) {
        top = 16;
      }
      if (top + menuHeight > screenDimensions.height - 16) {
        top = screenDimensions.height - menuHeight - 16;
      }
    } else {
      // position === "vertically"
      // Calculate available space above and below the anchor
      const spaceAbove = anchorLayout.y;
      const spaceBelow = screenDimensions.height - (anchorLayout.y + anchorLayout.height);
      
      // Determine if menu should open above or below based on available space
      const shouldOpenAbove = spaceAbove > spaceBelow && spaceAbove >= menuHeight;
      const shouldOpenBelow = spaceBelow >= menuHeight || !shouldOpenAbove;

      if (shouldOpenAbove) {
        // Open above the anchor: align bottom edge of menu with top edge of anchor
        top = anchorLayout.y - menuHeight;
      } else {
        // Open below the anchor: align top edge of menu with bottom edge of anchor
        top = anchorLayout.y + anchorLayout.height;
      }

      // Align right edge of menu with right edge of anchor
      left = anchorLayout.x + anchorLayout.width - menuWidth;

      // Ensure menu stays within screen bounds
      if (top < 16) {
        top = 16;
      }
      if (top + menuHeight > screenDimensions.height - 16) {
        top = screenDimensions.height - menuHeight - 16;
      }
      
      // Horizontal bounds - ensure menu doesn't go off screen
      if (left < 16) {
        left = 16;
      }
      if (left + menuWidth > screenDimensions.width - 16) {
        left = screenDimensions.width - menuWidth - 16;
      }
    }

    return { top, left };
  };

  const handleItemPress = (item: InlineMenuItem) => {
    if (!item.disabled) {
      item.onPress();
      if (!item.keepOpen) {
        handleClose();
      }
    }
  };

  const renderItemIcon = (item: InlineMenuItem) => {
    if (item.imageUrl) {
      return (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.itemImage}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      );
    }

    if (item.emoji) {
      return (
        <View style={styles.emojiContainer}>
          <Text style={styles.emojiText}>{item.emoji}</Text>
        </View>
      );
    }

    if (item.color) {
      return (
        <View style={[styles.colorCircle, { backgroundColor: item.color }]} />
      );
    }

    if (item.icon) {
      return (
        <Icon
          source={item.icon}
          size={20}
          color={
            item.type === "destructive"
              ? theme.colors.error
              : item.disabled
              ? theme.colors.onSurfaceVariant
              : theme.colors.onSurface
          }
        />
      );
    }

    return null;
  };

  const menuPosition = getMenuPosition();

  return (
    <>
      {/* Anchor */}
      <TouchableRipple onPress={handleOpen}>
        <View ref={anchorRef}>{anchor}</View>
      </TouchableRipple>

      {/* Menu */}
      {isOpen && (
        <Portal>
          {/* Overlay trasparente */}
          <View style={styles.overlay}>
            {/* Backdrop che intercetta touch esterni */}
            <TouchableWithoutFeedback onPress={handleClose}>
              <View style={styles.backdrop} />
            </TouchableWithoutFeedback>

            {/* Menu */}
            <Surface
              ref={menuRef}
              style={[
                styles.menuContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outline,
                  maxHeight,
                  top: menuPosition.top,
                  left: menuPosition.left,
                },
              ]}
              elevation={3}
            >
            {/* Header */}
            {header && (
              <>
                <View style={styles.headerContainer}>{header}</View>
                <Divider />
              </>
            )}

            {/* Search */}
            {searchable && (
              <>
                <View style={styles.searchContainer}>
                  <TextInput
                    style={[
                      styles.searchInput,
                      {
                        backgroundColor: theme.colors.surfaceVariant,
                        color: theme.colors.onSurface,
                        borderColor: theme.colors.outline,
                      },
                    ]}
                    placeholder={searchPlaceholder}
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                  />
                </View>
                <Divider />
              </>
            )}

            {/* Items */}
            <View style={styles.itemsContainer}>
              {filteredItems.map((item, index) => (
                <React.Fragment key={item.id}>
                  <TouchableOpacity
                    onPress={() => handleItemPress(item)}
                    disabled={item.disabled}
                    style={[
                      styles.menuItem,
                      {
                        backgroundColor: item.disabled
                          ? theme.colors.surfaceVariant
                          : "transparent",
                      },
                    ]}
                  >
                    <View style={styles.menuItemContent}>
                      {renderItemIcon(item)}
                      <View style={styles.menuItemText}>
                        <Text
                          style={[
                            styles.menuItemLabel,
                            {
                              color:
                                item.type === "destructive"
                                  ? theme.colors.error
                                  : item.disabled
                                  ? theme.colors.onSurfaceVariant
                                  : theme.colors.onSurface,
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                        {item.subtitle && (
                          <Text
                            style={[
                              styles.menuItemSubtitle,
                              {
                                color: item.disabled
                                  ? theme.colors.onSurfaceVariant
                                  : theme.colors.onSurfaceVariant,
                              },
                            ]}
                          >
                            {item.subtitle}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                  {index < filteredItems.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </View>
            </Surface>
          </View>
        </Portal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  menuContainer: {
    position: "absolute",
    minWidth: 200,
    maxWidth: 300,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 1001,
  },
  headerContainer: {
    padding: 8,
  },
  searchContainer: {
    padding: 12,
  },
  searchInput: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  itemsContainer: {
    maxHeight: 250,
  },
  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  menuItemSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  itemImage: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  emojiContainer: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  emojiText: {
    fontSize: 16,
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});
