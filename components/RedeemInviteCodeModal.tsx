import { useI18n } from "@/hooks/useI18n";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import {
  Button,
  Surface,
  Text,
  TextInput,
  useTheme,
  Icon,
} from "react-native-paper";
import { useRedeemInviteCodeMutation } from "@/generated/gql-operations-generated";

interface RedeemInviteCodeModalProps {
  onSuccess?: (resourceType: string, resourceId: string) => void;
  onCancel?: () => void;
  initialCode?: string;
}

export default function RedeemInviteCodeModal({
  onSuccess,
  onCancel,
  initialCode,
}: RedeemInviteCodeModalProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const [code, setCode] = useState("");

  const [redeemInviteCode, { loading: isRedeeming }] = useRedeemInviteCodeMutation();

  // Set initial code if provided (from deep link)
  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
    }
  }, [initialCode]);

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

  const handleCancel = () => {
    setCode("");
    onCancel?.();
  };

  return (
    <Surface style={[styles.surface, { backgroundColor: theme.colors.surface }]} elevation={2}>
      <Text variant="headlineSmall" style={styles.title}>
        {t("buckets.inviteCodes.redeemTitle")}
      </Text>

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

      <View style={[styles.infoBox, { backgroundColor: theme.colors.surfaceVariant }]}>
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

      <View style={styles.actions}>
        {onCancel && (
          <Button 
            onPress={handleCancel} 
            disabled={isRedeeming}
            style={styles.button}
          >
            {t("common.cancel")}
          </Button>
        )}
        <Button
          onPress={handleRedeem}
          loading={isRedeeming}
          disabled={isRedeeming || !code.trim()}
          mode="contained"
          style={styles.button}
        >
          {t("buckets.inviteCodes.redeem")}
        </Button>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  surface: {
    padding: 24,
    borderRadius: 12,
  },
  title: {
    marginBottom: 8,
  },
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
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  button: {
    minWidth: 100,
  },
});

