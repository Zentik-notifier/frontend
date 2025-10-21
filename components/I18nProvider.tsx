import { Locale } from "@/hooks/useI18n";
import { useSettings } from "@/hooks/useSettings";
import React from "react";

interface I18nContextType {
  locale: Locale;
  isInitialized: boolean;
}

const I18nContext = React.createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component for internationalization context
 * Now simplified - locale is managed by settings service
 */
export function I18nProvider({ children }: I18nProviderProps) {
  const { settings, isInitialized } = useSettings();
  const locale = settings.locale as Locale;

  const contextValue: I18nContextType = {
    locale,
    isInitialized,
  };

  return (
    <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>
  );
}

/**
 * Hook to access i18n context
 * @deprecated Use useI18n hook directly instead
 */
export function useI18nContext(): I18nContextType {
  const context = React.useContext(I18nContext);

  if (context === undefined) {
    throw new Error("useI18nContext must be used within an I18nProvider");
  }

  return context;
}
