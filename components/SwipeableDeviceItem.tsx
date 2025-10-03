import {
  GetUserDevicesDocument,
  UserDeviceFragment,
  useRemoveDeviceMutation,
  useUpdateUserDeviceMutation,
} from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/contexts/AppContext";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Pressable, View } from "react-native";
import SwipeableItem, { SwipeAction, MenuItem } from "./SwipeableItem";
import { Icon } from "react-native-paper";
import {
  Button,
  Card,
  Dialog,
  IconButton,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

interface SwipeableDeviceItemProps {
  device: UserDeviceFragment;
  isCurrentDevice?: boolean;
}

const SwipeableDeviceItem: React.FC<SwipeableDeviceItemProps> = ({
  device,
  isCurrentDevice = false,
}) => {
  const theme = useTheme();
  const { t } = useI18n();
  const { formatDate: formatDateService } = useDateFormat();
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

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
        return "apple";
      case "android":
        return "android";
      case "web":
        return "web";
      default:
        return "cellphone";
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
      setErrorMessage(t("devices.removeErrorMessage"));
      setShowErrorDialog(true);
    }
  };

  const handleEditName = () => {
    setEditingName(device.deviceName || "");
    setShowEditModal(true);
  };

  const handleSaveName = async () => {
    if (!editingName.trim()) {
      setErrorMessage(t("devices.editName.nameRequired"));
      setShowErrorDialog(true);
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

      setSuccessMessage(t("devices.editName.successMessage"));
      setShowSuccessDialog(true);
      setShowEditModal(false);
    } catch (error: any) {
      console.error("Error updating device name:", error);
      setErrorMessage(t("devices.editName.errorMessage"));
      setShowErrorDialog(true);
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

  const menuItems = useMemo((): MenuItem[] => {
    const items: MenuItem[] = [];

    if (!(isOfflineAuth || isBackendUnreachable)) {
      items.push({
        id: "edit",
        label: t("devices.editName.title"),
        icon: "pencil",
        onPress: handleEditName,
      });
    }

    return items;
  }, [isOfflineAuth, isBackendUnreachable, t, handleEditName]);

  return (
    <SwipeableItem
      rightAction={deleteAction}
      menuItems={menuItems}
      showMenu={!(isOfflineAuth || isBackendUnreachable)}
    >
      <Pressable>
        <View style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              <Icon
                source={getDeviceTypeIcon(device.platform)}
                size={24}
                color={theme.colors.primary}
              />
              <View style={styles.deviceTextInfo}>
                <View style={styles.deviceNameRow}>
                  <Text variant="titleMedium" style={styles.itemName}>
                    {device.deviceName || `${device.platform} Device`}
                  </Text>
                  {isCurrentDevice && (
                    <View
                      style={[
                        styles.currentDeviceBadge,
                        { backgroundColor: theme.colors.primary },
                      ]}
                    >
                      <Text
                        variant="bodySmall"
                        style={styles.currentDeviceText}
                      >
                        {t("devices.item.thisDevice")}
                      </Text>
                    </View>
                  )}
                </View>
                <Text variant="bodySmall" style={styles.devicePlatform}>
                  {device.platform} • {t("devices.item.registered")}:{" "}
                  {formatDeviceDate(device.createdAt)}
                </Text>
                {device.deviceModel && (
                  <Text variant="bodySmall" style={styles.deviceModel}>
                    {t("devices.item.model")}: {device.deviceModel}
                    {device.osVersion && ` (${device.osVersion})`}
                  </Text>
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
              <Text variant="bodySmall" style={styles.statusText}>
                {isDeviceActive()
                  ? t("devices.item.active")
                  : t("devices.item.inactive")}
              </Text>
              <Text variant="bodySmall" style={styles.lastUsedText}>
                {" "}
                • {t("devices.item.lastUsed")}:{" "}
                {device.lastUsed
                  ? formatDeviceDate(device.lastUsed)
                  : t("devices.item.never")}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>

      {/* Edit Device Name Dialog */}
      <Portal>
        <Dialog visible={showEditModal} onDismiss={handleCancelEdit}>
          <Dialog.Title>{t("devices.editName.title")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.modalDescription}>
              {t("devices.editName.description")}
            </Text>
            <TextInput
              mode="outlined"
              label={t("devices.editName.namePlaceholder")}
              value={editingName}
              onChangeText={setEditingName}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              multiline
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCancelEdit} disabled={isUpdating}>
              {t("devices.editName.cancel")}
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveName}
              disabled={
                isUpdating || editingName.trim() === (device.deviceName || "")
              }
            >
              {isUpdating
                ? t("devices.editName.saving")
                : t("devices.editName.save")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Success Dialog */}
      <Portal>
        <Dialog
          visible={showSuccessDialog}
          onDismiss={() => setShowSuccessDialog(false)}
        >
          <Dialog.Title>{t("common.success")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{successMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowSuccessDialog(false)}>
              {t("common.ok")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Error Dialog */}
      <Portal>
        <Dialog
          visible={showErrorDialog}
          onDismiss={() => setShowErrorDialog(false)}
        >
          <Dialog.Title>{t("common.error")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{errorMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowErrorDialog(false)}>
              {t("common.ok")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SwipeableItem>
  );
};

const styles = StyleSheet.create({
  swipeContent: {
    borderRadius: 12,
  },
  itemCard: {
    padding: 16,
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
    maxWidth: "70%",
  },
  editButton: {
    margin: 0,
    padding: 0,
  },
  itemName: {
    flexShrink: 1,
  },
  currentDeviceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
    flexShrink: 0,
  },
  currentDeviceText: {
    color: "#FFFFFF",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  devicePlatform: {
    marginBottom: 2,
  },
  deviceModel: {
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
    fontWeight: "500",
  },
  lastUsedText: {
    fontWeight: "400",
  },
  modalDescription: {
    marginBottom: 16,
  },
  input: {
    marginTop: 8,
  },
});

export default SwipeableDeviceItem;
