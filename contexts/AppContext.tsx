import OnboardingModal from "@/components/Onboarding";
import {
  DeviceInfoDto,
  LoginDto,
  RegisterDto,
  useGetMeLazyQuery,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
} from "@/generated/gql-operations-generated";
import { useMarkAllAsRead } from "@/hooks/notifications/useNotificationMutations";
import { useCleanup } from "@/hooks/useCleanup";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { Locale, localeToDatePickerLocale, useI18n } from "@/hooks/useI18n";
import {
  UsePushNotifications,
  usePushNotifications,
} from "@/hooks/usePushNotifications";
import { i18nService } from "@/services/i18n";
import * as Localization from "expo-localization";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Alert, AppState } from "react-native";
import { registerTranslation } from "react-native-paper-dates";
import {
  clearLastUserId,
  clearTokens,
  getAccessToken,
  getLastUserId,
  getRefreshToken,
  saveLastUserId,
  savePushNotificationsInitialized,
  saveTokens,
} from "../services/auth-storage";
import { useUserSettings } from "../services/user-settings";
import { closeSharedCacheDb, openSharedCacheDb } from "@/services/db-setup";
import { logger } from "@/services/logger";

type RegisterResult = "ok" | "emailConfirmationRequired" | "error";

export const getDeviceLocale = (): Locale => {
  try {
    const deviceLocale = Localization.getLocales()[0].languageTag;
    console.log("🌍 Detected device locale:", deviceLocale);
    if (deviceLocale.startsWith("it")) {
      return "it-IT";
    } else if (deviceLocale.startsWith("en")) {
      return "en-EN";
    }
    return "en-EN";
  } catch {
    return "en-EN";
  }
};

interface AppContextProps {
  logout: () => Promise<void>;
  login: (emailOrUsername: string, password: string) => Promise<boolean>;
  register: (
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ) => Promise<RegisterResult>;
  completeAuth: (accessToken: string, refreshToken: string) => Promise<boolean>;
  userId: string | null;
  lastUserId: string | null;
  setUserId: (user: string | null) => void;
  refreshUserData: () => Promise<string | null>;
  openLoginModal: () => void;
  isLoginModalOpen: boolean;
  closeLoginModal: () => void;
  showOnboarding: () => void;
  isOnboardingOpen: boolean;
  hideOnboarding: () => void;
  setMainLoading: (loading: boolean) => void;
  isMainLoading: boolean;
  userSettings: ReturnType<typeof useUserSettings>;
  connectionStatus: ReturnType<typeof useConnectionStatus>;
  deviceToken: string | null;
  isInitializing: boolean;
  push: UsePushNotifications;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [lastUserId, setLastUserId] = useState<string | null>(null);
  const push = usePushNotifications();
  const { t } = useI18n();
  const [fetchMe] = useGetMeLazyQuery();
  const [logoutMutation] = useLogoutMutation();
  const [loginMutation] = useLoginMutation();
  const [registerMutation] = useRegisterMutation();
  const connectionStatus = useConnectionStatus(push);
  const userSettings = useUserSettings();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isMainLoading, setIsLoading] = useState(false);
  const { mutateAsync: markAllAsRead } = useMarkAllAsRead();
  const { cleanup } = useCleanup();

  useEffect(() => {
    if (!userSettings.settings.locale) {
      const deviceLocale = getDeviceLocale();
      console.log(
        "[AppContext] Setting initial locale to device locale:",
        deviceLocale
      );
      i18nService.setLocale(deviceLocale).catch((e) => {
        console.error("Error setting locale:", e);
      });
      userSettings.setLocale(deviceLocale).catch((e) => {
        console.error("Error setting userSettings locale:", e);
      });
    }
  }, [userSettings.settings.locale]);

  useEffect(() => {
    const appLocale = userSettings.settings.locale as Locale;
    const datePickerLocale = localeToDatePickerLocale[appLocale] || "en";

    registerTranslation(datePickerLocale, {
      save: t("dateTime.save"),
      selectSingle: t("dateTime.selectSingle"),
      selectMultiple: t("dateTime.selectMultiple"),
      selectRange: t("dateTime.selectRange"),
      notAccordingToDateFormat: (inputFormat: string) =>
        t("dateTime.notAccordingToDateFormat").replace("{format}", inputFormat),
      mustBeHigherThan: (date: string) =>
        t("dateTime.mustBeHigherThan").replace("{date}", date),
      mustBeLowerThan: (date: string) =>
        t("dateTime.mustBeLowerThan").replace("{date}", date),
      mustBeBetween: (startDate: string, endDate: string) =>
        t("dateTime.mustBeBetween")
          .replace("{startDate}", startDate)
          .replace("{endDate}", endDate),
      dateIsDisabled: t("dateTime.dateIsDisabled"),
      previous: t("dateTime.previous"),
      next: t("dateTime.next"),
      typeInDate: t("dateTime.typeInDate"),
      pickDateFromCalendar: t("dateTime.pickDateFromCalendar"),
      close: t("dateTime.close"),
      hour: t("dateTime.hour"),
      minute: t("dateTime.minute"),
    });
  }, [userSettings.settings.locale, t]);

  const logout = async () => {
    try {
      const result = await push.unregisterDevice();
      console.debug(`✅ Device unregistration result: ${result}`);
    } catch (error: any) {
      console.debug("❌ Device unregistration error details:", {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        message: error?.message,
        url: error?.config?.url,
      });
    }

    try {
      await logoutMutation();
      console.debug("✅ Logout successful");
    } catch (error: any) {
      console.debug("❌ Logout error:", error?.message);
    }

    console.debug("🧹 Clearing tokens and setting logout state...");
    await clearTokens();
    await savePushNotificationsInitialized(false);
    await clearLastUserId();
    setUserId(null);
    setLastUserId(null);
    console.debug("✅ Logout completed");
  };

  const login = async (
    emailOrUsername: string,
    password: string
  ): Promise<boolean> => {
    try {
      const inputNormalized = emailOrUsername.toLowerCase().trim();
      const isEmail = /\S+@\S+\.\S+/.test(inputNormalized);
      const deviceInfo: DeviceInfoDto = push.getBasicDeviceInfo();
      const gqlInput: LoginDto = isEmail
        ? { email: inputNormalized, password, deviceInfo }
        : { username: inputNormalized, password, deviceInfo };

      const response = await loginMutation({ variables: { input: gqlInput } });
      const loginRes = response.data?.login;
      if (loginRes?.accessToken && loginRes?.refreshToken) {
        setIsInitializing(true);
        return completeAuth(loginRes.accessToken, loginRes.refreshToken);
      } else {
        Alert.alert(
          t("login.errors.loginFailed"),
          t("login.errors.invalidCredentials")
        );
        return false;
      }
    } catch (e) {
      console.error("Error during login:", e);

      // Show appropriate error message based on error type
      let errorMessage = t("login.errors.unexpectedError");

      if (e instanceof Error) {
        if (e.message.includes("Network") || e.message.includes("fetch")) {
          errorMessage = t("login.errors.networkError");
        } else if (
          e.message.includes("Invalid credentials") ||
          e.message.includes("Unauthorized")
        ) {
          errorMessage = t("login.errors.invalidCredentials");
        } else {
          errorMessage = e.message;
        }
      }

      throw e;
    }
  };

  const completeAuth = async (accessToken: string, refreshToken: string) => {
    try {
      await saveTokens(accessToken, refreshToken);

      const newUserId = await refreshUserData();
      if (!newUserId) {
        setIsInitializing(false);
        return false;
      }

      setUserId(newUserId);

      const previousUserId = await getLastUserId();
      if (previousUserId && previousUserId !== newUserId) {
        await savePushNotificationsInitialized(false);
      }
      await saveLastUserId(newUserId);
      setLastUserId(newUserId);

      await push.initialize();

      setIsInitializing(false);
      cleanup({ immediate: true }).catch((e) => {
        console.error(
          "Error during cleanup after completeAuth:",
          JSON.stringify(e)
        );
      });
      return true;
    } catch (e) {
      console.error("Error during completeAuth:", e);

      // Show appropriate error message based on error type
      let errorMessage = t("login.errors.unexpectedError");

      if (e instanceof Error) {
        if (e.message.includes("Network") || e.message.includes("fetch")) {
          errorMessage = t("login.errors.networkError");
        } else if (
          e.message.includes("Invalid credentials") ||
          e.message.includes("Invalid credentials") ||
          e.message.includes("Unauthorized")
        ) {
          errorMessage = t("login.errors.invalidCredentials");
        } else {
          errorMessage = e.message;
        }
      }

      Alert.alert(t("login.errors.loginFailed"), errorMessage);
      setIsInitializing(false);
      return false;
    }
  };

  const register = async (
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ): Promise<RegisterResult> => {
    const inputNormalized = email.toLowerCase().trim();
    const username = (firstName + lastName).replace(/\s+/g, "").toLowerCase();

    const gqlInput: RegisterDto = {
      email: inputNormalized,
      username,
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      locale: userSettings.settings.locale,
    };

    const response = await registerMutation({
      variables: { input: gqlInput },
    });

    try {
      const registerRes = response.data?.register;
      if (!registerRes) {
        return "error";
      }

      if (registerRes.emailConfirmationRequired) {
        return "emailConfirmationRequired";
      } else {
        const ok = await completeAuth(
          registerRes.accessToken!,
          registerRes.refreshToken!
        );

        if (ok) {
          return "ok";
        } else {
          return "error";
        }
      }
    } catch {
      return "error";
    }
  };

  const refreshUserData = async (): Promise<string | null> => {
    try {
      const result = await fetchMe({ fetchPolicy: "network-only" });

      if (result.data?.me) {
        const newUserId = result.data.me.id;
        setUserId(newUserId);

        return newUserId;
      }

      return null;
    } catch (error) {
      console.error("Error refreshing user data:", error);
      return null;
    }
  };

  useEffect(() => {
    const funct = async () => {
      try {
        console.log("[AppInit] started");

        // subscriptionsEnabledVar(true);
        const [accessToken, refreshToken, storedLastUserId] = await Promise.all(
          [getAccessToken(), getRefreshToken(), getLastUserId()]
        );
        console.log(
          `[AppInit] tokens found: accessToken: ${
            !accessToken ? "false" : "true"
          } refreshToken: ${
            !refreshToken ? "false" : "true"
          } storedLastUserId: ${!storedLastUserId ? "false" : "true"}`
        );
        setLastUserId(storedLastUserId);
        if (accessToken && refreshToken) {
          await completeAuth(accessToken, refreshToken);
        } else {
          setIsInitializing(false);
        }
      } catch (error) {
        console.error("❌ App initialization failed:", error);
        setIsInitializing(false);
      }
    };

    funct().catch((e) => {
      console.error("❌ App initialization error:", e);
      setIsInitializing(false);
    });
  }, []);

  // Auto-show onboarding for first-time users
  useEffect(() => {
    const checkOnboarding = async () => {
      // Wait for initialization to complete
      if (isInitializing) return;

      // Only show onboarding if user is logged in
      if (!userId) return;

      const onboardingSettings = userSettings.getOnboardingSettings();

      if (
        !onboardingSettings.hasCompletedOnboarding &&
        onboardingSettings.showOnboardingV2
      ) {
        console.log("[AppContext] Auto-showing onboarding for first-time user");
        setIsOnboardingOpen(true);
      }
    };

    checkOnboarding();
  }, [isInitializing, userId, userSettings.settings.onboarding]);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === "active" && userId) {
        console.log("[AppContext] App is active, cleaning up");
        await openSharedCacheDb();
        await cleanup({ immediate: true });
        await connectionStatus.checkForUpdates();
      } else if (
        nextAppState === "inactive" &&
        userSettings.settings.notificationsPreferences?.markAsReadMode ===
          "on-app-close"
      ) {
        console.log(
          "[AppContext] App is inactive, marking all notifications as read"
        );
        await markAllAsRead();
      } else if (nextAppState === "background") {
        console.log(
          "[AppContext] App going to background, flushing logs and closing database..."
        );
        try {
          // Flush pending logs before closing database
          await logger.flush();
          console.log("[AppContext] Logs flushed successfully");

          await closeSharedCacheDb();
          console.log("[AppContext] Database closed successfully");
        } catch (error) {
          console.error("[AppContext] Error during background cleanup:", error);
        }
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, [userId]);

  // // Debounced refetch to avoid excessive requests from multiple subscription events
  // const debouncedRefetchBuckets = useDebounce(() => {
  //   apolloClient.refetchQueries({
  //     include: [GetBucketsDocument],
  //   });
  // }, 2000);

  // // Unified subscription handler for bucket events
  // const handleBucketSubscriptionEvent = async (
  //   eventType: string,
  //   data: any
  // ) => {
  //   console.log(`🔄 Bucket ${eventType} via subscription:`, data);
  //   debouncedRefetchBuckets();
  // };
  return (
    <AppContext.Provider
      value={{
        logout,
        login,
        completeAuth,
        register,
        userId,
        setUserId,
        refreshUserData,
        openLoginModal: () => setIsLoginModalOpen(true),
        isLoginModalOpen,
        closeLoginModal: () => setIsLoginModalOpen(false),
        showOnboarding: () => setIsOnboardingOpen(true),
        isOnboardingOpen,
        hideOnboarding: () => setIsOnboardingOpen(false),
        setMainLoading: setIsLoading,
        isMainLoading,
        userSettings,
        connectionStatus,
        deviceToken: push.deviceToken,
        isInitializing,
        lastUserId,
        push,
      }}
    >
      {children}
      <OnboardingModal
        visible={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        push={push}
      />
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
