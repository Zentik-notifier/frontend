import { useI18n } from "@/hooks/useI18n";
import React, { useEffect, useState } from "react";
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
import { useRedeemInviteCodeMutation } from "@/generated/gql-operations-generated";

interface RedeemInviteCodeModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess?: (resourceType: string, resourceId: string) => void;
  initialCode?: string;
}

export default function RedeemInviteCodeModal({
  visible,
  onDismiss,
  onSuccess,
  initialCode,
}: RedeemInviteCodeModalProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const [code, setCode] = useState("");

  const [redeemInviteCode, { loading: isRedeeming }] = useRedeemInviteCodeMutation();

  // Set initial code if provided (from deep link)
  useEffect(() => {
    if (initialCode && visible) {
      setCode(initialCode);
    }
  }, [initialCode, visible]);

  const handleRedeem = async () => {
    if (!code.trim()) {
      Alert.alert(
        t("common.error"),
        t("buckets.inviteCodes.enterCode")
      );
      return;
    }

    try {
      const result = await redeemInviteCode({
        variables: {
          input: {
            code: code.trim(),
          },
        },
      });

      const redemptionResult = result.data?.redeemInviteCode;

      if (redemptionResult?.success) {
        Alert.alert(
          t("common.success"),
          t("buckets.inviteCodes.redeemSuccess"),
          [
            {
              text: "OK",
              onPress: () => {
                onSuccess?.(redemptionResult.resourceType!, redemptionResult.resourceId!);
                onDismiss();
                setCode("");
              },
            },
          ]
        );
      } else {
        Alert.alert(
          t("common.error"),
          redemptionResult?.error || t("buckets.inviteCodes.redeemError")
        );
      }
    } catch (error: any) {
      console.error("Error redeeming invite code:", error);
      Alert.alert(
        t("common.error"),
        error?.message || t("buckets.inviteCodes.redeemError")
      );
    }
  };

  const handleClose = () => {
    setCode("");
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleClose}>
        <Dialog.Title>{t("buckets.inviteCodes.redeemTitle")}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={styles.description}>
            {t("buckets.inviteCodes.redeemDescription")}
          </Text>

          <TextInput
            label={t("buckets.inviteCodes.inviteCode")}
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
              {t("buckets.inviteCodes.redeemInfo")}
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
            {t("buckets.inviteCodes.redeem")}
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

