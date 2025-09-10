import { Colors } from "@/constants/Colors";
import { useGetBucketsQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useGetCacheStats } from "@/hooks/useMediaCache";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "./ThemedText";

export type HomeSection = "all" | "buckets" | "gallery";

const showTexts = false;

interface FooterItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route?: string;
  section?: HomeSection;
  badge?: number;
}
 
interface HomeHeaderProps {
  currentRoute?: string;
  currentSection?: HomeSection;
  onSectionChange?: (section: HomeSection) => void;
}

const HomeHeader: React.FC<HomeHeaderProps> = ({
  currentRoute = "/",
  currentSection = "all",
  onSectionChange,
}) => {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const router = useRouter();
  const { notifications } = useAppContext();
  const { data: bucketsData } = useGetBucketsQuery();
  const notifCount = notifications.length;
  const bucketsCount = bucketsData?.buckets?.length ?? 0;
  const { cacheStats } = useGetCacheStats();
  const galleryCount = cacheStats?.totalItems ?? 0;

  const isHomePage = currentRoute === "/";

  const footerItems: FooterItem[] = isHomePage
    ? [
        {
          icon: "notifications-outline",
          label: t("navigation.sections.all"),
          section: "all",
        },
        {
          icon: "folder-outline",
          label: t("navigation.sections.buckets"),
          section: "buckets",
        },
        {
          icon: "images-outline",
          label: t("navigation.sections.gallery"),
          section: "gallery",
        },
      ]
    : [
        {
          icon: "notifications-outline",
          label: t("navigation.notifications"),
          route: "/",
        },
        {
          icon: "settings-outline",
          label: t("navigation.settings"),
          route: "/(mobile)/private/(settings)",
        },
        {
          icon: "help-circle-outline",
          label: t("navigation.help"),
          route: "/(mobile)/private/admin/help",
        },
      ];

  const handleItemPress = (item: FooterItem) => {
    if (item.route && item.route !== currentRoute) {
      router.push(item.route as any);
    } else if (item.section && onSectionChange) {
      onSectionChange(item.section);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: Colors[colorScheme].background,
          borderBottomColor: Colors[colorScheme].border,
        },
      ]}
    >
      {footerItems.map((item, index) => {
        let isActive = false;

        if (isHomePage && item.section) {
          isActive = currentSection === item.section;
        } else if (item.route) {
          isActive = currentRoute === item.route;
        }

        return (
          <TouchableOpacity
            key={index}
            style={styles.footerItem}
            onPress={() => handleItemPress(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={item.icon}
              size={24}
              color={
                isActive
                  ? Colors[colorScheme].tint
                  : Colors[colorScheme].textSecondary
              }
            />
            <View style={styles.labelBlock}>
              <ThemedText
                style={[
                  styles.footerLabel,
                  {
                    color: isActive
                      ? Colors[colorScheme].tint
                      : Colors[colorScheme].textSecondary,
                    fontWeight: isActive ? "600" : "400",
                  },
                ]}
              >
                {item.label}
              </ThemedText>
              {showTexts &&
                (() => {
                  // Show count for 'all', 'buckets' and 'gallery' on home
                  const isAll = item.section === "all";
                  const isBuckets = item.section === "buckets";
                  const isGallery = item.section === "gallery";
                  const showCount =
                    isHomePage && (isAll || isBuckets || isGallery);
                  const countValue = isBuckets
                    ? bucketsCount
                    : isGallery
                    ? galleryCount
                    : notifCount;
                  return (
                    <ThemedText
                      style={[
                        styles.footerCount,
                        { color: Colors[colorScheme].textSecondary },
                        !showCount && styles.footerCountPlaceholder,
                      ]}
                    >
                      ({countValue})
                    </ThemedText>
                  );
                })()}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  footerItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 8,
  },
  labelBlock: {
    alignItems: "center",
    justifyContent: "flex-start",
  },
  footerLabel: {
    fontSize: 12,
    marginTop: 1,
    textAlign: "center",
  },
  footerCount: {
    fontSize: 10,
    marginTop: -5,
    textAlign: "center",
  },
  footerCountPlaceholder: {
    opacity: 0,
  },
});

export default HomeHeader;
