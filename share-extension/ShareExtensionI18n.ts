import enTranslations from "./en-EN.json";
import itTranslations from "./it-IT.json";

type ShareLocale = "en-EN" | "it-IT";

const SHARE_TRANSLATIONS: Record<ShareLocale, Record<string, string>> = {
  "en-EN": enTranslations as Record<string, string>,
  "it-IT": itTranslations as Record<string, string>,
};

export function useShareI18n(): { t: (key: string) => string } {
  const locale = getShareLocale();
  const dict = SHARE_TRANSLATIONS[locale] ?? SHARE_TRANSLATIONS["en-EN"];
  return {
    t: (key: string) => dict[key] ?? key,
  };
}

function getShareLocale(): ShareLocale {
  try {
    const { settingsService } = require("@/services/settings-service");
    const locale = settingsService.getSettings?.()?.locale;
    if (locale === "it-IT" || locale === "en-EN") return locale;
  } catch {
    // ignore
  }
  return "en-EN";
}
