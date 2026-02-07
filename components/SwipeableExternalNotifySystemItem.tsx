import { useAppContext } from "@/contexts/AppContext";
import {
  ExternalNotifySystemFragment,
  useDeleteExternalNotifySystemMutation,
} from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Dialog, Portal, Text, useTheme } from "react-native-paper";
import SwipeableItem, { MenuItem } from "./SwipeableItem";

interface SwipeableExternalNotifySystemItemProps {
  system: ExternalNotifySystemFragment;
}

export default function SwipeableExternalNotifySystemItem({
  system,
}: SwipeableExternalNotifySystemItemProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const { formatDate } = useDateFormat();
  const { navigateToEditExternalNotifySystem } = useNavigationUtils();
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const isOffline = isOfflineAuth || isBackendUnreachable;
  const [deleteMutation] = useDeleteExternalNotifySystemMutation();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");

  const handleEdit = () => {
    navigateToEditExternalNotifySystem(system.id);
  };

  const deleteServer = async () => {
    try {
      await deleteMutation({
        variables: { id: system.id },
        refetchQueries: ["GetExternalNotifySystems"],
      });
      setDialogMessage(t("externalServers.deleteSuccessMessage"));
      setShowSuccessDialog(true);
    } catch (err) {
      console.error("Error deleting external notify system:", err);
      setDialogMessage(t("externalServers.deleteErrorMessage"));
      setShowErrorDialog(true);
    }
  };

  const deleteAction = !isOffline && system.userPermissions?.isOwner
    ? {
        icon: "delete" as const,
        label: t("externalServers.delete"),
        destructive: true,
        onPress: () => deleteServer(),
        showAlert: {
          title: t("externalServers.deleteConfirmTitle"),
          message: t("externalServers.deleteConfirmMessage"),
          confirmText: t("externalServers.delete"),
          cancelText: t("common.cancel"),
        },
      }
    : undefined;

  const menuItems = useMemo((): MenuItem[] => {
    const items: MenuItem[] = [];
    if (!isOffline && system.userPermissions?.canWrite) {
      items.push({
        id: "edit",
        label: t("externalServers.edit"),
        icon: "pencil",
        onPress: handleEdit,
      });
    }
    return items;
  }, [isOffline, system.userPermissions?.canWrite, t]);

  const typeLabel = system.type === "NTFY" ? t("externalServers.form.typeNtfy") : t("externalServers.form.typeGotify");

  return (
    <SwipeableItem
      copyId={system.id}
      rightAction={deleteAction}
      menuItems={menuItems}
      showMenu={!isOffline}
    >
      <Pressable onPress={handleEdit}>
        <View style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <Text variant="titleMedium" style={styles.itemName}>
              {system.name}
            </Text>
            <View style={[styles.typeBadge, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer }}>
                {typeLabel}
              </Text>
            </View>
          </View>
          <Text variant="bodySmall" style={styles.itemUrl} numberOfLines={1}>
            {system.baseUrl}
          </Text>
          {system.userPermissions?.isSharedWithMe && (
            <Text variant="labelSmall" style={styles.sharedLabel}>
              {t("common.shared")}
            </Text>
          )}
          <Text variant="bodySmall" style={styles.itemDetail}>
            {formatDate(system.createdAt)}
          </Text>
        </View>
      </Pressable>

      <Portal>
        <Dialog visible={showSuccessDialog} onDismiss={() => setShowSuccessDialog(false)}>
          <Dialog.Title>{t("common.success")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{dialogMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Text onPress={() => setShowSuccessDialog(false)}>{t("common.ok")}</Text>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={showErrorDialog} onDismiss={() => setShowErrorDialog(false)}>
          <Dialog.Title>{t("common.error")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{dialogMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Text onPress={() => setShowErrorDialog(false)}>{t("common.ok")}</Text>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SwipeableItem>
  );
}

const styles = StyleSheet.create({
  itemCard: {
    padding: 16,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  itemName: {
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemUrl: {
    opacity: 0.7,
    marginBottom: 4,
  },
  sharedLabel: {
    opacity: 0.8,
    marginBottom: 4,
  },
  itemDetail: {
    opacity: 0.6,
  },
});
