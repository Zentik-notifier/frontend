// Retention Presets Configuration
export type RetentionPreset = "low" | "balanced" | "longer" | "custom";

export interface RetentionConfig {
  maxCacheSizeMB?: number;
  maxCacheAgeDays?: number;
  maxNotifications?: number;
  maxNotificationsDays?: number;
}

export const RETENTION_PRESETS: Record<Exclude<RetentionPreset, "custom">, RetentionConfig> = {
  low: {
    maxCacheSizeMB: 100,
    maxCacheAgeDays: 7,
    maxNotifications: 100,
    maxNotificationsDays: 7,
  },
  balanced: {
    maxCacheSizeMB: 500,
    maxCacheAgeDays: 30,
    maxNotifications: 500,
    maxNotificationsDays: 30,
  },
  longer: {
    maxCacheSizeMB: 2000,
    maxCacheAgeDays: 90,
    maxNotifications: 2000,
    maxNotificationsDays: 90,
  },
};

/**
 * Detects which retention preset matches the given policies
 * @param policies Current retention policies
 * @returns The matching preset name or "custom" if no match
 */
export const detectRetentionPreset = (policies: any): RetentionPreset => {
  // Check each preset
  for (const [presetName, presetValues] of Object.entries(RETENTION_PRESETS)) {
    if (
      policies.maxCacheSizeMB === presetValues.maxCacheSizeMB &&
      policies.maxCacheAgeDays === presetValues.maxCacheAgeDays &&
      policies.maxNotifications === presetValues.maxNotifications &&
      policies.maxNotificationsDays === presetValues.maxNotificationsDays
    ) {
      return presetName as RetentionPreset;
    }
  }

  // If no preset matches, return custom
  return "custom";
};
