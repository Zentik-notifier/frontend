import { useSegments } from "expo-router";
import { useDeviceType } from "@/hooks/useDeviceType";
import { TranslationKeyPath, useI18n } from "@/hooks/useI18n";
import React from "react";
import NotificationsHelp from "./NotificationsHelp";

export type HelpContentComponent = React.ComponentType;

interface HelpContentConfig {
  component: HelpContentComponent;
  title: string;
  icon?: string;
}

const HELP_ROUTE_MAP: Record<string, HelpContentConfig> = {
  // Notifications routes (home)
  "/(phone)/(home)/(tabs)/notifications": {
    component: NotificationsHelp,
    title: "notificationsHelp.title",
    icon: "information",
  },
  "/(desktop)/(home)/notifications": {
    component: NotificationsHelp,
    title: "notificationsHelp.title",
    icon: "information",
  },
  "/(desktop)/(home)/": {
    component: NotificationsHelp,
    title: "notificationsHelp.title",
    icon: "information",
  },
};

export function useHelpContent(): HelpContentConfig | null {
  const segments = useSegments() as string[];
  const { t } = useI18n();

  // Determine current route
  const currentRoute = `/${segments.join("/")}`;

  // Find matching help content
  for (const [route, config] of Object.entries(HELP_ROUTE_MAP)) {
    if (currentRoute.startsWith(route)) {
      const titleKey = config.title;
      return {
        ...config,
        title: t(titleKey as any),
      };
    }
  }

  // Default to notifications help if on home route but no exact match
  const isHomeRoute = currentRoute.startsWith("/(phone)/(home)") || 
                     currentRoute.startsWith("/(desktop)/(home)");
  
  if (isHomeRoute) {
    return {
      component: NotificationsHelp,
      title: t("notificationsHelp.title"),
      icon: "information",
    };
  }

  return null;
}

