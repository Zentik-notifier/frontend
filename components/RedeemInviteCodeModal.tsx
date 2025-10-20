import { useI18n } from "@/hooks/useI18n";
import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import {
  Button,
  Dialog,
  Portal,
  Text,
  TextInput,
  useTheme,
  Icon,
} from "react-native-paper";

interface RedeemInviteCodeModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess?: (resourceType: string, resourceId: string) => void;
}

export default function RedeemInviteCodeModal({
  visible,
  onDismiss,
  onSuccess,
}: RedeemInviteCodeModalProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) {
      Alert.alert(
        t("common.error"),
        t("inviteCodes.enterCode" as any)
      );
      return;
    }

    setIsRedeeming(true);
    try {
      // TODO: Call GraphQL mutation
      console.log("Redeeming invite code:", code);
      
      // Mock success response
      const mockResponse = {
        success: true,
        resourceType: "BUCKET",
        resourceId: "mock-bucket-id",
        permissions: ["READ", "WRITE"],
      };

      if (mockResponse.success) {
        Alert.alert(
          t("common.success"),
          t("inviteCodes.redeemSuccess" as any),
          [
            {
              text: "OK",
              onPress: () => {
                onSuccess?.(mockResponse.resourceType, mockResponse.resourceId);
                onDismiss();
                setCode("");
              },
            },
          ]
        );
      } else {
        Alert.alert(
          t("common.error"),
          t("inviteCodes.redeemError" as any)
        );
      }
    } catch (error: any) {
      console.error("Error redeeming invite code:", error);
      Alert.alert(
        t("common.error"),
        error?.message || t("inviteCodes.redeemError" as any)
      );
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleClose = () => {
    setCode("");
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleClose}>
        <Dialog.Title>{t("inviteCodes.redeemTitle" as any)}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={styles.description}>
            {t("inviteCodes.redeemDescription" as any)}
          </Text>

          <TextInput
            label={t("inviteCodes.inviteCode" as any)}
            value={code}
            onChangeText={setCode}
            mode="outlined"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="ABC123XYZ..."
            style={styles.input}
            disabled={isRedeeming}
            left={
              <TextInput.Icon
                icon="ticket"
              />
            }
          />

          <View style={styles.infoBox}>
            <Icon
              source="information"
              size={20}
              color={theme.colors.primary}
            />
            <Text
              variant="bodySmall"
              style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}
            >
              {t("inviteCodes.redeemInfo" as any)}
            </Text>
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={handleClose} disabled={isRedeeming}>
            {t("common.cancel")}
          </Button>
          <Button
            onPress={handleRedeem}
            loading={isRedeeming}
            disabled={isRedeeming || !code.trim()}
            mode="contained"
          >
            {t("inviteCodes.redeem" as any)}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  description: {
    marginBottom: 16,
    opacity: 0.8,
  },
  input: {
    marginBottom: 12,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
  },
});

