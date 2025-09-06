import { Colors } from "@/constants/Colors";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import React, { forwardRef, useImperativeHandle, useState } from "react";
import { Modal, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import ReanimatedColorPicker, {
  Panel1,
  Preview,
} from "reanimated-color-picker";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

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
         const colorScheme = useColorScheme();
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

    return (
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {t("buckets.form.chooseColor")}
              </ThemedText>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={Colors[colorScheme ?? "light"].text}
                />
              </TouchableOpacity>
            </View>

            {/* Color Palette Section */}
            <View style={styles.paletteSection}>
              <ThemedText style={styles.sectionTitle}>
                {t("common.colorPalette")}
              </ThemedText>
              <View style={styles.colorPalette}>
                {colorPalette.map((color) => (
                  <TouchableOpacity
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
                  >
                    {baseColor === color && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        style={styles.checkmark}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Custom Color Picker Section */}
            <View style={styles.customSection}>
              <ThemedText style={styles.sectionTitle}>
                {t("common.customColor")}
              </ThemedText>
              <View style={styles.colorPickerContainer}>
                <ReanimatedColorPicker
                  value={selectedColor}
                  onCompleteJS={handleCustomColorChange}
                  style={styles.colorPicker}
                  thumbStyle={[
                    styles.colorPickerThumb,
                    { borderColor: Colors[colorScheme ?? "light"].border },
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
              <ThemedText style={styles.sectionTitle}>
                {t("common.hexColorCode")}
              </ThemedText>
              <TextInput
                style={[
                  styles.hexInput,
                  {
                    backgroundColor: Colors[colorScheme ?? "light"].background,
                    borderColor: Colors[colorScheme ?? "light"].border,
                    color: Colors[colorScheme ?? "light"].text,
                  },
                ]}
                value={hexInput}
                onChangeText={handleHexInputChange}
                placeholder="#0a7ea4"
                placeholderTextColor={Colors[colorScheme ?? "light"].textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={7}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  {
                    backgroundColor:
                      Colors[colorScheme ?? "light"].backgroundSecondary,
                    borderColor: Colors[colorScheme ?? "light"].border,
                  },
                ]}
                onPress={() => setShowModal(false)}
              >
                <ThemedText style={styles.cancelButtonText}>
                  {t("common.cancel")}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.applyButton,
                  { backgroundColor: selectedColor },
                ]}
                onPress={() => setShowModal(false)}
              >
                <ThemedText style={styles.applyButtonText}>
                  {t("common.apply")}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
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
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedColorOption: {
    borderColor: "#333",
    borderWidth: 3,
  },
  checkmark: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
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
    marginBottom: 24,
  },
  hexInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: "monospace",
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  applyButton: {
    borderWidth: 1,
    borderColor: "transparent",
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
