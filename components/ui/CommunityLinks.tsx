import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Icon, Text, TouchableRipple, useTheme } from "react-native-paper";
import { Image } from "expo-image";
import { useI18n } from "@/hooks/useI18n";

interface CommunityLinksProps {
  label?: string;
  iconsOnly?: boolean;
  iconSize?: number;
}

export default function CommunityLinks({ label, iconsOnly = false, iconSize = 18 }: CommunityLinksProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const displayLabel = label ?? (t("common.communitySupport") as string);

  const buttons = (
    <>
      <TouchableRipple
        onPress={() => Linking.openURL("https://notifier-docs.zentik.app")}
        borderless
        style={styles.link}
      >
        <View style={styles.linkInner}>
          <Icon source="book-outline" size={iconSize} color={theme.colors.onSurface} />
          {!iconsOnly && (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurface, fontWeight: "600" }}
            >
              {t("common.documentation") as string}
            </Text>
          )}
        </View>
      </TouchableRipple>
      <TouchableRipple
        onPress={() => Linking.openURL("https://discord.gg/DzhJ4s7N")}
        borderless
        style={styles.link}
      >
        <View style={styles.linkInner}>
          <Image
            source={require("@/assets/icons/discord.svg")}
            style={{ width: iconSize, height: iconSize }}
            contentFit="contain"
          />
          {!iconsOnly && (
            <Text
              variant="bodySmall"
              style={{ color: "#5865F2", fontWeight: "600" }}
            >
              {t("common.discord") as string}
            </Text>
          )}
        </View>
      </TouchableRipple>
      <TouchableRipple
        onPress={() =>
          Linking.openURL(
            "https://github.com/Zentik-notifier/zentik-notifier"
          )
        }
        borderless
        style={styles.link}
      >
        <View style={styles.linkInner}>
          <Icon source="github" size={iconSize} color={theme.colors.onSurface} />
          {!iconsOnly && (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurface, fontWeight: "600" }}
            >
              {t("common.github") as string}
            </Text>
          )}
        </View>
      </TouchableRipple>
    </>
  );

  if (iconsOnly) {
    return <View style={styles.centeredRow}>{buttons}</View>;
  }

  return (
    <View style={styles.row}>
      <Text
        variant="bodySmall"
        style={{ color: theme.colors.onSurfaceVariant }}
      >
        {displayLabel}
      </Text>
      <View style={styles.links}>{buttons}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    flex: 1,
  },
  centeredRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  links: {
    flexDirection: "row",
    gap: 8,
  },
  link: {
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  linkInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
