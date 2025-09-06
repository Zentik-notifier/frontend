import * as Clipboard from 'expo-clipboard';
import React, { useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "./ui/Icon";

interface BucketActionsMenuProps {
  bucketId: string;
  bucketName: string;
  onDelete: (bucketId: string, bucketName: string) => void;
  onEdit?: (bucketId: string) => void;
}

export default function BucketActionsMenu({
  bucketId,
  bucketName,
  onDelete,
  onEdit,
}: BucketActionsMenuProps) {
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const copyIdToClipboard = async () => {
    await Clipboard.setStringAsync(bucketId);
    Alert.alert("Copied!", "Bucket ID copied to clipboard");
    setIsMenuVisible(false);
  };

  const handleEdit = () => {
    setIsMenuVisible(false);
    onEdit?.(bucketId);
  };

  const handleDelete = () => {
    setIsMenuVisible(false);
    onDelete(bucketId, bucketName);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setIsMenuVisible(true)}
      >
        <Text style={styles.menuIcon}>⋮</Text>
      </TouchableOpacity>

      <Modal
        visible={isMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>{bucketName}</Text>
            
            <TouchableOpacity style={styles.menuItem} onPress={copyIdToClipboard}>
              <Icon name="copy" size="md" color="primary" />
              <Text style={styles.menuItemText}>Copy ID</Text>
            </TouchableOpacity>

            {onEdit && (
              <TouchableOpacity style={styles.menuItem} onPress={handleEdit}>
                <Icon name="edit" size="md" color="primary" />
                <Text style={styles.menuItemText}>Edit Bucket</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.menuItem, styles.deleteMenuItem]}
              onPress={handleDelete}
            >
              <Icon name="delete" size="md" color="error" />
              <Text style={[styles.menuItemText, styles.deleteText]}>
                Delete Bucket
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsMenuVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 36,
    minHeight: 36,
  },
  menuIcon: {
    fontSize: 20,
    color: "#666",
    fontWeight: "bold",
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    minWidth: 250,
    maxWidth: 300,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  deleteMenuItem: {
    backgroundColor: "#fff5f5",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  menuItemText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
    marginLeft: 12,
  },
  deleteText: {
    color: "#dc3545",
    fontWeight: "500",
  },
  cancelButton: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
  },
  cancelText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
});
