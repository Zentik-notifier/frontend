import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { usePublicAppConfigQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { Button, Menu, useTheme, Divider } from "react-native-paper";
import { Image } from "expo-image";

type Props = {
  onProviderSelect: (providerId: string) => void;
  disabled?: boolean;
};

export function OAuthSelector({ onProviderSelect, disabled }: Props) {
  const { t } = useI18n();
  const theme = useTheme();
  const { data } = usePublicAppConfigQuery({ fetchPolicy: "network-only" });
  const providers = data?.publicAppConfig.oauthProviders || [];
  const [visible, setVisible] = useState(false);
  const [anchorWidth, setAnchorWidth] = useState(0);

  return (
    <View style={styles.container} onLayout={(e) => setAnchorWidth(e.nativeEvent.layout.width)}>
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setVisible(true)}
            disabled={disabled || providers.length === 0}
            style={styles.fullWidth}
          >
            {t("login.orContinueWith")}
          </Button>
        }
        anchorPosition="bottom"
        contentStyle={{ width: anchorWidth || undefined, paddingVertical: 0, paddingHorizontal: 0, borderRadius: 0 }}
      >
        <View style={styles.menuContent}>
          {providers.map((p: any, idx: number) => (
            <React.Fragment key={p.id}>
              <Button
                mode="contained"
                onPress={() => {
                  setVisible(false);
                  onProviderSelect(p.providerId);
                }}
                style={[styles.oauthMenuButton, { backgroundColor: p.color || theme.colors.primary }]}
                contentStyle={styles.oauthMenuButtonContent}
                labelStyle={{ color: p.textColor || theme.colors.onPrimary }}
                icon={p.iconUrl ? () => (
                  <Image
                    cachePolicy="memory-disk"
                    source={{ uri: p.iconUrl }}
                    style={{ width: 20, height: 20, marginRight: 8 }}
                  />
                ) : undefined}
              >
                {p.name}
              </Button>
              {idx < providers.length - 1 && <Divider style={styles.menuDivider} />}
            </React.Fragment>
          ))}
        </View>
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  fullWidth: {
    width: "100%",
  },
  menuContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  oauthMenuButton: {
    width: "100%",
    borderRadius: 0,
    marginVertical: 0,
  },
  oauthMenuButtonContent: {
    height: 48,
    paddingVertical: 0,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#00000022",
  },
});
