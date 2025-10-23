import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import {
  Icon,
  List,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import {
  Menu,
  MenuTrigger,
  MenuOptions,
  MenuOption,
} from "react-native-popup-menu";

export interface PaperMenuItem {
  id: string;
  label: string;
  icon: string;
  onPress: () => Promise<void> | void;
  type?: "normal" | "destructive";
  showAlert?: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
  };
}

interface PaperMenuProps {
  items: PaperMenuItem[];
  opened?: boolean;
  onBackdropPress?: () => void;
  triggerIcon?: string;
  triggerSize?: number;
  size?: "small" | "medium" | "large";
  onMenuItemPress?: (item: PaperMenuItem) => void;
  customTrigger?: React.ReactNode;
  triggerStyle?: any;
  menuStyle?: any;
  menuOffset?: number; // ✅ Offset personalizzato per il posizionamento del menu
  width?: number; // ✅ Width fissa del menu controllata dal parent
}

export default function PaperMenu({
  items,
  opened,
  onBackdropPress,
  triggerIcon = "dots-vertical",
  triggerSize = 18,
  size = "medium",
  onMenuItemPress,
  customTrigger,
  triggerStyle,
  menuStyle,
  menuOffset = 0, // ✅ Default offset 0
  width, // ✅ Width controllata dal parent
}: PaperMenuProps) {
  const theme = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ✅ Usa stato interno se non fornito dall'esterno
  const menuOpened = opened !== undefined ? opened : isMenuOpen;
  const handleBackdropPress = () => {
    if (onBackdropPress) {
      onBackdropPress();
    } else {
      setIsMenuOpen(false);
    }
  };

  const handleTriggerPress = () => {
    if (opened === undefined) {
      // ✅ Gestisci stato interno
      setIsMenuOpen(!isMenuOpen);
    }
    // Se opened è fornito dall'esterno, il parent gestisce lo stato
  };

  const handleMenuItemPress = (item: PaperMenuItem) => {
    if (onMenuItemPress) {
      onMenuItemPress(item);
    } else {
      item.onPress();
    }

    // ✅ Chiudi il menu dopo aver premuto un item
    if (opened === undefined) {
      setIsMenuOpen(false);
    }
  };

  // ✅ Usa width dal parent se fornita, altrimenti calcola automaticamente
  const getMenuWidth = () => {
    if (width !== undefined) {
      return width; // ✅ Width controllata dal parent
    }

    // ✅ Fallback: calcolo automatico
    const longestItem = items.reduce((longest, item) =>
      item.label.length > longest.label.length ? item : longest
    );

    // ✅ Calcolo più preciso della width
    const iconWidth = 24; // spazio per icona
    const padding = 16; // padding orizzontale totale
    const charWidth = 10; // larghezza media carattere (più precisa)
    const textWidth = longestItem.label.length * charWidth;

    const calculatedWidth = iconWidth + padding + textWidth;

    // ✅ Size scaling più conservativo
    const sizeMultiplier = {
      small: 0.9,
      medium: 1.0,
      large: 1.1,
    }[size];

    return Math.max(calculatedWidth * sizeMultiplier, 100); // minimo 100px
  };

  const getTextSize = () => {
    const sizeMap = {
      small: 14,
      medium: 16,
      large: 18,
    };
    return sizeMap[size];
  };

  const getPadding = () => {
    const sizeMap = {
      small: 2,
      medium: 4,
      large: 6,
    };
    return sizeMap[size];
  };

  const getTriggerSize = () => {
    const sizeMap = {
      small: 24,
      medium: 32,
      large: 40,
    };
    return sizeMap[size];
  };

  const defaultTrigger = (
    <Surface
      style={[
        styles.trigger,
        {
          backgroundColor: theme.colors.surface,
          borderWidth: 0, // ✅ Rimuove completamente il bordo
          width: getTriggerSize(),
          height: getTriggerSize(),
          borderRadius: getTriggerSize() / 2,
        },
        triggerStyle,
      ]}
      elevation={1}
    >
      <Icon
        source={triggerIcon}
        size={triggerSize}
        color={theme.colors.onSurface}
      />
    </Surface>
  );

  return (
    <Menu opened={menuOpened} onBackdropPress={handleBackdropPress}>
      <MenuTrigger
        customStyles={{
          TriggerTouchableComponent: TouchableOpacity,
          triggerTouchable: {
            activeOpacity: 0.7,
          },
        }}
        onPress={handleTriggerPress}
      >
        {customTrigger || defaultTrigger}
      </MenuTrigger>
      <MenuOptions
        customStyles={{
          optionsContainer: [
            styles.menuContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
              padding: getPadding(),
              width: getMenuWidth(),
              marginLeft: width !== undefined 
                ? -(width / 2) + (getTriggerSize() / 2) + menuOffset
                : -(getMenuWidth() / 2) + (getTriggerSize() / 2) + 20 + menuOffset,
            },
            menuStyle,
          ],
        }}
      >
        {items.map((item) => (
          <MenuOption key={item.id} onSelect={() => handleMenuItemPress(item)}>
            <Surface style={styles.menuItem} elevation={0}>
              <TouchableRipple
                onPress={() => handleMenuItemPress(item)}
                style={styles.menuItemContent}
              >
                <View style={styles.menuItemInner}>
                  <List.Icon
                    icon={item.icon}
                    color={
                      item.type === "destructive"
                        ? theme.colors.error
                        : theme.colors.onSurface
                    }
                  />
                  <Text
                    style={[
                      styles.menuItemText,
                      {
                        color:
                          item.type === "destructive"
                            ? theme.colors.error
                            : theme.colors.onSurface,
                        fontSize: getTextSize(),
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
              </TouchableRipple>
            </Surface>
          </MenuOption>
        ))}
      </MenuOptions>
    </Menu>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignItems: "center",
    justifyContent: "center",
  },
  menuContainer: {
    borderRadius: 8,
    borderWidth: 1,
  },
  menuItem: {
    backgroundColor: "transparent",
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  menuItemText: {
    flex: 1,
    marginLeft: 12,
  },
});
