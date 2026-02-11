import { useEffect, useState } from "react";
import enTranslations from "./en-EN.json";
import { shareExtensionService } from "./share-extension-service";

type ShareLocale = "en-EN" | "it-IT";

const shareTranslationsCache: Record<ShareLocale, Record<string, string> | null> = {
  "en-EN": enTranslations as Record<string, string>,
  "it-IT": null,
};

let loadShareLocalePromise: Promise<void> | null = null;

function loadShareLocale(locale: ShareLocale): Promise<void> {
  if (shareTranslationsCache[locale]) return Promise.resolve();
  if (locale === "en-EN") return Promise.resolve();

  if (loadShareLocalePromise) return loadShareLocalePromise;

  loadShareLocalePromise = import("./it-IT.json").then((mod) => {
    shareTranslationsCache["it-IT"] = mod.default as Record<string, string>;
    loadShareLocalePromise = null;
  });

  return loadShareLocalePromise;
}

export function useShareI18n(): { t: (key: string) => string } {
  const [locale, setLocale] = useState<ShareLocale>("en-EN");
  const [, setLocaleReady] = useState(false);

  useEffect(() => {
    shareExtensionService.waitInitialized().then(() => {
      setLocale(shareExtensionService.getLocale());
    });
  }, []);

  useEffect(() => {
    if (locale === "en-EN") {
      setLocaleReady(true);
      return;
    }
    loadShareLocale(locale).then(() => setLocaleReady(true));
  }, [locale]);

  const dict = shareTranslationsCache[locale] ?? shareTranslationsCache["en-EN"]!;

  return {
    t: (key: string) => dict[key] ?? key,
  };
}
