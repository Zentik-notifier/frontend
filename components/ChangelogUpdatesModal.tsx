import React, { useEffect, useMemo, useState } from "react";
import { Linking, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Card, Icon, Text, useTheme } from "react-native-paper";
import { useI18n } from "@/hooks/useI18n";
import DetailModal from "./ui/DetailModal";

export interface ChangelogItem {
  id: string;
  iosVersion: string;
  androidVersion: string;
  uiVersion: string;
  backendVersion: string;
  description: string;
  createdAt: string;
}
interface ChangelogUpdatesModalProps {
  visible: boolean;
  latest: ChangelogItem | null;
  changelogs: ChangelogItem[];
  unreadIds: string[];
  needsAppUpdateNotice: boolean;
  onClose: () => void;
}

export const ChangelogUpdatesModal: React.FC<ChangelogUpdatesModalProps> = ({
  visible,
  latest,
  changelogs,
  unreadIds,
  needsAppUpdateNotice,
  onClose,
}) => {
  const { t } = useI18n();
  const theme = useTheme();

  const formatDate = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const formatted = date.toLocaleString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const [showOld, setShowOld] = useState(false);

  const { unreadItems, readItems } = useMemo(() => {
    const unread: ChangelogItem[] = [];
    const read: ChangelogItem[] = [];

    for (const item of changelogs) {
      if (unreadIds.includes(item.id)) {
        unread.push(item);
      } else {
        read.push(item);
      }
    }

    return { unreadItems: unread, readItems: read };
  }, [changelogs, unreadIds]);

  useEffect(() => {
    if (!unreadItems.length) {
      setShowOld(true);
    }
  }, [unreadItems]);

  const openTestflight = async () => {
    try {
      await Linking.openURL("https://testflight.apple.com/join/dFqETQEm");
    } catch (error) {
      console.warn("Failed to open TestFlight link", error);
    }
  };

  if (!visible || !latest) return null;

  return (
    <DetailModal
      visible={visible}
      onDismiss={onClose}
      title={t("changelog.modalTitle")}
      icon="history"
      actions={{
        cancel: {
          label: t("common.close"),
          onPress: onClose,
        },
      }}
    >
      <View style={styles.container}>
        {needsAppUpdateNotice && (
          <Card
            mode="contained"
            style={[
              styles.updateNoticeContainer,
              { backgroundColor: theme.colors.primaryContainer },
            ]}
          >
            <Card.Content>
              <Text
                variant="bodyMedium"
                style={[
                  styles.updateNoticeText,
                  { color: theme.colors.onPrimaryContainer },
                ]}
              >
                {Platform.OS === "ios"
                  ? t("changelog.updateNoticeIos")
                  : t("changelog.updateNotice")}
              </Text>
              {Platform.OS === "ios" && (
                <Text
                  variant="bodyMedium"
                  style={styles.updateLink}
                  onPress={openTestflight}
                >
                  {t("changelog.openTestflight")}
                </Text>
              )}
            </Card.Content>
          </Card>
        )}
        <ScrollView style={styles.changelogList}>
          {unreadItems.map((item) => {
            const isUnread = true;
            return (
              <Card
                key={item.id}
                style={[
                  styles.changelogItem,
                  isUnread && {
                    backgroundColor: theme.colors.surfaceVariant,
                  },
                ]}
                mode="contained"
              >
                <Card.Content>
                  <View style={styles.changelogHeader}>
                    <Text variant="titleSmall" style={styles.changelogTitle}>
                      {formatDate(item.createdAt)}
                    </Text>
                    {isUnread && (
                      <View style={styles.unreadBadge}>
                        <Text
                          variant="bodySmall"
                          style={styles.unreadBadgeText}
                        >
                          •
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.descriptionContainer}>
                    <Text variant="bodyLarge">{item.description}</Text>
                  </View>
                  <View style={styles.changelogVersionsRow}>
                    {Platform.OS !== "web" &&
                      (Platform.OS === "ios"
                        ? item.iosVersion
                        : item.androidVersion) && (
                        <View style={styles.versionItem}>
                          <Icon
                            source="cellphone"
                            size={16}
                            color={theme.colors.primary}
                          />
                          <Text variant="bodySmall">
                            {Platform.OS === "ios"
                              ? item.iosVersion
                              : item.androidVersion}
                          </Text>
                        </View>
                      )}
                    {item.uiVersion ? (
                      <View style={styles.versionItem}>
                        <Icon
                          source="react"
                          size={16}
                          color={theme.colors.primary}
                        />
                        <Text variant="bodySmall">{item.uiVersion}</Text>
                      </View>
                    ) : null}
                    {item.backendVersion ? (
                      <View style={styles.versionItem}>
                        <Icon
                          source="server"
                          size={16}
                          color={theme.colors.primary}
                        />
                        <Text variant="bodySmall">{item.backendVersion}</Text>
                      </View>
                    ) : null}
                  </View>
                </Card.Content>
              </Card>
            );
          })}

          {readItems.length > 0 && !!unreadItems.length && (
            <View style={styles.oldToggleContainer}>
              <Text
                variant="bodyMedium"
                style={styles.oldToggleText}
                onPress={() => setShowOld((prev) => !prev)}
              >
                {showOld
                  ? t("changelog.hideOldChangelogs")
                  : t("changelog.showOldChangelogs")}
              </Text>
            </View>
          )}

          {showOld &&
            readItems.map((item) => (
              <Card key={item.id} style={styles.changelogItem} mode="contained">
                <Card.Content>
                  <View style={styles.changelogHeader}>
                    <Text variant="titleSmall" style={styles.changelogTitle}>
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.descriptionContainer}>
                    <Text variant="bodyLarge">{item.description}</Text>
                  </View>
                  <View style={styles.changelogVersionsRow}>
                    {Platform.OS !== "web" &&
                      (Platform.OS === "ios"
                        ? item.iosVersion
                        : item.androidVersion) && (
                        <View style={styles.versionItem}>
                          <Icon
                            source="cellphone"
                            size={16}
                            color={theme.colors.primary}
                          />
                          <Text variant="bodySmall">
                            {Platform.OS === "ios"
                              ? item.iosVersion
                              : item.androidVersion}
                          </Text>
                        </View>
                      )}
                    {item.uiVersion ? (
                      <View style={styles.versionItem}>
                        <Icon
                          source="react"
                          size={16}
                          color={theme.colors.primary}
                        />
                        <Text variant="bodySmall">{item.uiVersion}</Text>
                      </View>
                    ) : null}
                    {item.backendVersion ? (
                      <View style={styles.versionItem}>
                        <Icon
                          source="server"
                          size={16}
                          color={theme.colors.primary}
                        />
                        <Text variant="bodySmall">{item.backendVersion}</Text>
                      </View>
                    ) : null}
                  </View>
                </Card.Content>
              </Card>
            ))}
        </ScrollView>
      </View>
    </DetailModal>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  versionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  updateNoticeContainer: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  updateNoticeText: {
    fontWeight: "500",
  },
  updateLink: {
    marginTop: 8,
    textDecorationLine: "underline",
  },
  versionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: 8,
  },
  descriptionContainer: {
    marginTop: 4,
  },
  changelogList: {
    marginTop: 8,
    maxHeight: 320,
  },
  changelogItem: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  oldToggleContainer: {
    alignItems: "center",
    marginVertical: 4,
  },
  oldToggleText: {
    textDecorationLine: "underline",
  },
  changelogItemUnread: {},
  changelogHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  changelogTitle: {
    fontWeight: "500",
  },
  unreadBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ff6b6b",
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: {
    color: "white",
    fontSize: 10,
    lineHeight: 10,
  },
  changelogVersionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
});

export default ChangelogUpdatesModal;
