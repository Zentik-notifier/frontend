import { apolloClient } from "@/config/apollo-client";
import { Colors } from "@/constants/Colors";
import { GetNotificationsDocument, useGetNotificationsQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { userSettings } from "@/services/user-settings";
import React, { useMemo, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { ThemedText } from "./ThemedText";

export default function GqlCacheSettings() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { data } = useGetNotificationsQuery();
  const [maxCount, setMaxCount] = useState<string>((userSettings.getMaxCachedNotifications() ?? 500).toString());

  const cachedCount = useMemo(() => {
    try {
      const res: any = apolloClient?.readQuery({ query: GetNotificationsDocument });
      return res?.notifications?.length ?? 0;
    } catch {
      return data?.notifications?.length ?? 0;
    }
  }, [data]);

  const onChangeMax = async (text: string) => {
    setMaxCount(text);
    if (text.trim() === "") {
      await userSettings.setMaxCachedNotifications(undefined);
      return;
    }
    const parsed = parseInt(text, 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 100000) {
      await userSettings.setMaxCachedNotifications(parsed);
    }
  };

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}> 
          {t('appSettings.gqlCache.title')}
        </ThemedText>
        <ThemedText style={[styles.sectionDescription, { color: Colors[colorScheme].textSecondary }]}>
          {t('appSettings.gqlCache.notificationsCount')}: {cachedCount}
        </ThemedText>
      </View>

      <View style={[styles.settingRow, { backgroundColor: Colors[colorScheme].backgroundCard }]}> 
        <View style={styles.settingInfo}>
          <View style={styles.settingTextContainer}>
            <ThemedText style={[styles.settingTitle, { color: Colors[colorScheme].text }]}> 
              {t('appSettings.gqlCache.maxStoredTitle')}
            </ThemedText>
            <ThemedText style={[styles.settingDescription, { color: Colors[colorScheme].textSecondary }]}> 
              {t('appSettings.gqlCache.maxStoredDescription')}
            </ThemedText>
          </View>
        </View>
        <TextInput
          style={[styles.settingInput, { color: Colors[colorScheme].text, backgroundColor: Colors[colorScheme].background, borderColor: Colors[colorScheme].border }]}
          value={maxCount}
          onChangeText={onChangeMax}
          keyboardType="numeric"
          maxLength={6}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    marginRight: 16,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  settingInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    minWidth: 80,
  },
});


