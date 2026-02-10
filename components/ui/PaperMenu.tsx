import React, { useCallback, useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import {
  Icon,
  Menu,
  Surface,
  useTheme,
} from "react-native-paper";

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
  /** Simple items mode */
  items?: PaperMenuItem[];
  onMenuItemPress?: (item: PaperMenuItem) => void;
  /** Custom content mode (alternative to items) */
  children?: React.ReactNode;
  /** Controlled mode */
  opened?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Custom trigger as render prop (receives openMenu) */
  renderTrigger?: (openMenu: () => void) => React.ReactNode;
  /** Simple trigger content (wrapped in TouchableOpacity) */
  customTrigger?: React.ReactNode;
  triggerIcon?: string;
  triggerSize?: number;
  triggerStyle?: any;
  /** Appearance */
  size?: "small" | "medium" | "large";
  menuStyle?: any;
  anchorPosition?: "top" | "bottom";
}

export default function PaperMenu({
  items,
  children,
  opened,
  onOpenChange,
  renderTrigger,
  customTrigger,
  triggerIcon = "dots-vertical",
  triggerSize = 18,
  size = "medium",
  onMenuItemPress,
  triggerStyle,
  menuStyle,
  anchorPosition = "bottom",
}: PaperMenuProps) {
  const theme = useTheme();
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = opened !== undefined;
  const menuVisible = isControlled ? opened : internalOpen;

  const openMenu = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(true);
    } else {
      setInternalOpen(true);
    }
  }, [isControlled, onOpenChange]);

  const closeMenu = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(false);
    } else {
      setInternalOpen(false);
    }
  }, [isControlled, onOpenChange]);

  const handleMenuItemPress = useCallback(
    (item: PaperMenuItem) => {
      if (onMenuItemPress) {
        onMenuItemPress(item);
      } else {
        item.onPress();
      }
      closeMenu();
    },
    [onMenuItemPress, closeMenu]
  );

  const getTextSize = () => ({ small: 14, medium: 16, large: 18 })[size];
  const getTriggerSize = () => ({ small: 24, medium: 32, large: 40 })[size];

  const defaultTriggerContent = (
    <Surface
      style={[
        styles.trigger,
        {
          backgroundColor: theme.colors.surface,
          borderWidth: 0,
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

  const anchor = renderTrigger
    ? renderTrigger(openMenu)
    : (
        <TouchableOpacity activeOpacity={0.7} onPress={openMenu}>
          {customTrigger || defaultTriggerContent}
        </TouchableOpacity>
      );

  return (
    <Menu
      key={Number(menuVisible)}
      visible={menuVisible}
      onDismiss={closeMenu}
      anchor={anchor}
      anchorPosition={anchorPosition}
      contentStyle={[
        styles.menuContainer,
        {
          backgroundColor: theme.colors.surface,
        },
        menuStyle,
      ]}
    >
      {children
        ? children
        : items?.map((item) => (
            <Menu.Item
              key={item.id}
              onPress={() => handleMenuItemPress(item)}
              title={item.label}
              leadingIcon={item.icon}
              titleStyle={{
                color:
                  item.type === "destructive"
                    ? theme.colors.error
                    : theme.colors.onSurface,
                fontSize: getTextSize(),
              }}
            />
          ))}
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
    paddingVertical: 0,
  },
});
