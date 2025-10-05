import { useI18n } from "@/hooks/useI18n";
import React, { forwardRef, useImperativeHandle, useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import ReanimatedColorPicker, {
  Panel1,
  Preview,
} from "reanimated-color-picker";
import {
  Button,
  Card,
  Icon,
  Modal,
  Portal,
  Surface,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

interface ColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  disabled?: boolean;
}

export interface ColorPickerRef {
  openModal: () => void;
}

const colorPalette = [
  "#0a7ea4", // Blue
  "#dc3545", // Red
  "#6c757d", // Gray
  "#343a40", // Dark
  "#ffc107", // Yellow
  "#17a2b8", // Info
  "#fd7e14", // Warning
  "#6f42c1", // Indigo
  "#e83e8c", // Rose
  "#20c997", // Cyan
  "#28a745", // Success
  "#8B4513", // Brown
];

const ColorPicker = forwardRef<ColorPickerRef, ColorPickerProps>(
  ({ selectedColor, onColorChange, disabled = false }, ref) => {
    const { t } = useI18n();
    const theme = useTheme();
    const [showModal, setShowModal] = useState(false);
    const [baseColor, setBaseColor] = useState<string>();
    const [hexInput, setHexInput] = useState("");

    const handleColorSelect = (color: string) => {
      if (!disabled) {
        onColorChange(color);
      }
    };

    const openModal = () => {
      if (!disabled) {
        setHexInput(selectedColor);
        setShowModal(true);
      }
    };

    useImperativeHandle(ref, () => ({
      openModal,
    }));

    const handleCustomColorChange = async (colors: any) => {
      const hexColor = colors.hex;
      if (hexColor) {
        onColorChange(hexColor);
        setHexInput(hexColor);
      }
    };

    const handleHexInputChange = (text: string) => {
      setHexInput(text);
      // Validate hex color format
      const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (hexRegex.test(text)) {
        onColorChange(text);
      }
    };

    const openModalWithHexInit = () => {
      setHexInput(selectedColor);
      setShowModal(true);
    };

    const deviceHeight = Dimensions.get("window").height;
    const containerStyle = {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      marginHorizontal: 16,
      marginVertical: 24,
      maxHeight: deviceHeight * 0.8,
    } as const;

    return (
      <Portal>
        <Modal
          visible={showModal}
          onDismiss={() => setShowModal(false)}
          contentContainerStyle={containerStyle}
          dismissableBackButton
        >
          <View style={{ borderRadius: 12 }}>
            <View
              style={[
                styles.modalHeader,
                {
                  borderBottomColor: theme.colors.outline,
                  backgroundColor: "transparent",
                },
              ]}
            >
              <View style={styles.headerLeft}>
                <Icon source="palette" size={24} color={theme.colors.primary} />
                <Text style={styles.modalTitle}>
                  {t("buckets.form.chooseColor")}
                </Text>
              </View>
              <TouchableRipple
                style={[styles.closeButton]}
                onPress={() => setShowModal(false)}
                borderless
              >
                <Icon source="close" size={20} color={theme.colors.onSurface} />
              </TouchableRipple>
            </View>

            <View style={{ padding: 20 }}>
              {/* Color Palette Section */}
              <View style={styles.paletteSection}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  {t("common.colorPalette")}
                </Text>
                <View style={styles.colorPalette}>
                  {colorPalette.map((color) => (
                    <TouchableRipple
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        baseColor === color && styles.selectedColorOption,
                      ]}
                      onPress={() => {
                        handleColorSelect(color);
                        setBaseColor(color);
                      }}
                      borderless
                    >
                      <View style={styles.colorOptionContent}>
                        {baseColor === color && (
                          <Icon source="check" size={20} color="white" />
                        )}
                      </View>
                    </TouchableRipple>
                  ))}
                </View>
              </View>

              {/* Custom Color Picker Section */}
              <View style={styles.customSection}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  {t("common.customColor")}
                </Text>
                <View style={styles.colorPickerContainer}>
                  <ReanimatedColorPicker
                    value={selectedColor}
                    onCompleteJS={handleCustomColorChange}
                    style={styles.colorPicker}
                    thumbStyle={[
                      styles.colorPickerThumb,
                      { borderColor: theme.colors.outline },
                    ]}
                    sliderThickness={25}
                    thumbSize={24}
                    thumbShape="circle"
                  >
                    <Preview />
                    <Panel1 />
                  </ReanimatedColorPicker>
                </View>
              </View>

              {/* Hex Input Section */}
              <View style={styles.hexInputSection}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  {t("common.hexColorCode")}
                </Text>
                <TextInput
                  mode="outlined"
                  value={hexInput}
                  onChangeText={handleHexInputChange}
                  placeholder="#0a7ea4"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={7}
                  style={styles.hexInput}
                  contentStyle={styles.hexInputContent}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Button
                mode="outlined"
                onPress={() => setShowModal(false)}
                style={styles.footerButton}
              >
                {t("common.cancel")}
              </Button>
              <Button
                mode="contained"
                onPress={() => setShowModal(false)}
                style={styles.footerButton}
              >
                {t("common.apply")}
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>
    );
  }
);

ColorPicker.displayName = "ColorPicker";

export default ColorPicker;

const styles = StyleSheet.create({
  triggerButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  disabledTrigger: {
    opacity: 0.5,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  triggerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 60,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  paletteSection: {
    marginBottom: 24,
  },
  colorPalette: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorOptionContent: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedColorOption: {
    borderColor: "#333",
    borderWidth: 3,
  },
  customSection: {
    marginBottom: 20,
  },
  colorPickerContainer: {
    alignItems: "center",
  },
  colorPicker: {
    width: "100%",
    height: 200,
  },
  colorPickerThumb: {
    borderWidth: 2,
  },
  hexInputSection: {
    marginTop: 12,
    marginBottom: 24,
  },
  hexInput: {
    height: 48,
  },
  hexInputContent: {
    textAlign: "center",
    fontFamily: "monospace",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  footerButton: {
    flex: 1,
  },
});
