import { Colors } from "@/constants/Colors";
import {
  GetUserDevicesDocument,
  UserDeviceFragment,
  useRemoveDeviceMutation,
  useUpdateUserDeviceMutation,
} from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import SwipeableItem, { SwipeAction } from "./SwipeableItem";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import Icon from "./ui/Icon";

interface SwipeableDeviceItemProps {
  device: UserDeviceFragment;
  isCurrentDevice?: boolean;
}

const SwipeableDeviceItem: React.FC<SwipeableDeviceItemProps> = ({
  device,
  isCurrentDevice = false,
}) => {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { formatDate: formatDateService } = useDateFormat();
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();

  const formatDeviceDate = (dateString: string) => {
    try {
      if (!dateString) return t("devices.item.unknown");
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return t("devices.item.unknown");
      return formatDateService(date);
    } catch (error) {
      return t("devices.item.unknown");
    }
  };

  const getDeviceTypeIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "ios":
        return "ios";
      case "android":
        return "android";
      case "web":
        return "device";
      default:
        return "mobile";
    }
  };

  const isDeviceActive = () => {
    if (!device.lastUsed) return false;
    const lastUsedDate = new Date(device.lastUsed);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return lastUsedDate > oneMonthAgo;
  };

  const [removeDeviceMutation] = useRemoveDeviceMutation();
  const [updateUserDeviceMutation] = useUpdateUserDeviceMutation();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingName, setEditingName] = useState(device.deviceName || "");
  const [isUpdating, setIsUpdating] = useState(false);

  // Update local editing name when device changes
  useEffect(() => {
    setEditingName(device.deviceName || "");
  }, [device.deviceName]);

  const handleDelete = async () => {
    try {
      await removeDeviceMutation({
        variables: { deviceId: device.id },
        refetchQueries: [{ query: GetUserDevicesDocument }],
      });
    } catch (error: any) {
      Alert.alert(t("common.error"), t("devices.removeErrorMessage"));
    }
  };

  const handleEditName = () => {
    setEditingName(device.deviceName || "");
    setShowEditModal(true);
  };

  const handleSaveName = async () => {
    if (!editingName.trim()) {
      Alert.alert(t("common.error"), t("devices.editName.nameRequired"));
      return;
    }

    // Check if the name has actually changed
    if (editingName.trim() === (device.deviceName || "")) {
      setShowEditModal(false);
      return;
    }

    setIsUpdating(true);
    try {
      await updateUserDeviceMutation({
        variables: {
          input: {
            deviceId: device.id,
            deviceName: editingName.trim(),
          },
        },
        refetchQueries: [{ query: GetUserDevicesDocument }],
      });

      Alert.alert(t("common.success"), t("devices.editName.successMessage"), [
        { text: t("common.ok"), onPress: () => {} },
      ]);
      setShowEditModal(false);
    } catch (error: any) {
      console.error("Error updating device name:", error);
      Alert.alert(t("common.error"), t("devices.editName.errorMessage"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingName(device.deviceName || "");
  };

  const deleteAction: SwipeAction | undefined = !(
    isOfflineAuth || isBackendUnreachable
  )
    ? {
        icon: "delete",
        label: t("devices.item.delete"),
        backgroundColor: "#ff4444",
        onPress: handleDelete,
        showAlert: {
          title: t("devices.item.removeDeviceTitle"),
          message: t("devices.item.removeDeviceMessage"),
          confirmText: t("devices.item.removeDeviceConfirm"),
          cancelText: t("common.cancel"),
        },
      }
    : undefined;

  return (
    <SwipeableItem
      rightAction={deleteAction}
      containerStyle={styles.swipeContainer}
      contentStyle={[
        styles.swipeContent,
        { backgroundColor: Colors[colorScheme ?? "light"].backgroundCard },
      ]}
    >
      <TouchableWithoutFeedback>
        <View
          style={[
            styles.itemCard,
            {
              borderColor: Colors[colorScheme ?? "light"].border,
              backgroundColor: Colors[colorScheme ?? "light"].backgroundCard,
            },
          ]}
        >
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              <Icon
                name={getDeviceTypeIcon(device.platform)}
                size="md"
                color={Colors[colorScheme ?? "light"].tint}
                style={styles.deviceIcon}
              />
              <View style={styles.deviceTextInfo}>
                <View style={styles.deviceNameRow}>
                  <View style={styles.nameAndEditContainer}>
                    <ThemedText style={styles.itemName}>
                      {device.deviceName || `${device.platform} Device`}
                    </ThemedText>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={handleEditName}
                    >
                      <Ionicons
                        name="create-outline"
                        size={16}
                        color={Colors[colorScheme ?? "light"].tint}
                      />
                    </TouchableOpacity>
                  </View>
                  {isCurrentDevice && (
                    <View
                      style={[
                        styles.currentDeviceBadge,
                        {
                          backgroundColor: Colors[colorScheme ?? "light"].tint,
                        },
                      ]}
                    >
                      <ThemedText style={styles.currentDeviceText}>
                        {t("devices.item.thisDevice")}
                      </ThemedText>
                    </View>
                  )}
                </View>
                <ThemedText style={styles.devicePlatform}>
                  {device.platform} • {t("devices.item.registered")}:{" "}
                  {formatDeviceDate(device.createdAt)}
                </ThemedText>
                {device.deviceModel && (
                  <ThemedText style={styles.deviceModel}>
                    {t("devices.item.model")}: {device.deviceModel}
                    {device.osVersion && ` (${device.osVersion})`}
                  </ThemedText>
                )}
              </View>
            </View>
          </View>

          <View style={styles.deviceDetails}>
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusIndicator,
                  { backgroundColor: isDeviceActive() ? "#4CAF50" : "#FF9800" },
                ]}
              />
              <ThemedText style={styles.statusText}>
                {isDeviceActive()
                  ? t("devices.item.active")
                  : t("devices.item.inactive")}
              </ThemedText>
              <ThemedText style={styles.lastUsedText}>
                {" "}• {t("devices.item.lastUsed")}:{" "}
                {device.lastUsed
                  ? formatDeviceDate(device.lastUsed)
                  : t("devices.item.never")}
              </ThemedText>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>

      {/* Edit Device Name Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.modalOverlay}>
          <ThemedView
            style={[
              styles.modalContent,
              {
                backgroundColor: Colors[colorScheme ?? "light"].backgroundCard,
              },
            ]}
          >
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: Colors[colorScheme ?? "light"].border },
              ]}
            >
              <ThemedText style={styles.modalTitle}>
                {t("devices.editName.title")}
              </ThemedText>
              <TouchableOpacity onPress={handleCancelEdit}>
                <Ionicons
                  name="close"
                  size={24}
                  color={Colors[colorScheme ?? "light"].textMuted}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <ThemedText style={styles.modalDescription}>
                {t("devices.editName.description")}
              </ThemedText>

              <ThemedText style={styles.label}>
                {t("devices.editName.namePlaceholder")}
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: Colors[colorScheme ?? "light"].background,
                    borderColor: Colors[colorScheme ?? "light"].border,
                    color: Colors[colorScheme ?? "light"].text,
                  },
                ]}
                value={editingName}
                onChangeText={setEditingName}
                placeholder={t("devices.editName.namePlaceholder")}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View
              style={[
                styles.modalFooter,
                { borderTopColor: Colors[colorScheme ?? "light"].border },
              ]}
            >
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
                onPress={handleCancelEdit}
                disabled={isUpdating}
              >
                <ThemedText
                  style={[
                    styles.cancelButtonText,
                    { color: Colors[colorScheme ?? "light"].textSecondary },
                  ]}
                >
                  {t("devices.editName.cancel")}
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  {
                    backgroundColor: Colors[colorScheme ?? "light"].tint,
                  },
                ]}
                onPress={handleSaveName}
                disabled={
                  isUpdating || editingName.trim() === (device.deviceName || "")
                }
              >
                <ThemedText style={styles.saveButtonText}>
                  {isUpdating
                    ? t("devices.editName.saving")
                    : t("devices.editName.save")}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </SwipeableItem>
  );
};

const styles = StyleSheet.create({
  swipeContainer: {
    marginVertical: 4,
  },
  swipeContent: {
    borderRadius: 12,
  },
  itemCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  itemHeader: {
    marginBottom: 12,
  },
  itemInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  deviceIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  deviceTextInfo: {
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  nameAndEditContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
    minWidth: 0,
    maxWidth: '70%',
  },
  editButton: {
    padding: 2,
    marginLeft: 6,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    flexShrink: 1,
  },
  currentDeviceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  currentDeviceText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  devicePlatform: {
    fontSize: 14,
    marginBottom: 2,
  },
  deviceModel: {
    fontSize: 12,
    marginBottom: 2,
  },
  deviceDetails: {
    paddingTop: 8,
    gap: 8,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  lastUsedText: {
    fontSize: 14,
    fontWeight: "400",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 12,
    padding: 0,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalBody: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 20,
    lineHeight: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderTopWidth: 1,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontWeight: "500",
  },
  saveButton: {
    // Background color set dynamically
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
});

export default SwipeableDeviceItem;
