import { ChangelogUpdatesModal } from "@/components/ChangelogUpdatesModal";
import FeedbackModal from "@/components/FeedbackModal";
import OnboardingModal from "@/components/Onboarding/OnboardingModal";
import {
  ChangelogForModalFragment,
  DeviceInfoDto,
  LoginDto,
  RegisterDto,
  useChangelogsForModalQuery,
  useGetMeLazyQuery,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
} from "@/generated/gql-operations-generated";
import { useMarkAllAsRead } from "@/hooks/notifications/useNotificationMutations";
import { useAppLog } from "@/hooks/useAppLog";
import { useCleanup } from "@/hooks/useCleanup";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { useGetVersionsInfo } from "@/hooks/useGetVersionsInfo";
import { Locale, localeToDatePickerLocale, useI18n } from "@/hooks/useI18n";
import { usePendingNotificationIntents } from "@/hooks/usePendingNotificationIntents";
import {
  UsePushNotifications,
  usePushNotifications,
} from "@/hooks/usePushNotifications";
import { openSharedCacheDb } from "@/services/db-setup";
import { logger } from "@/services/logger";
import { mediaCache } from "@/services/media-cache-service";
import * as Localization from "expo-localization";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Alert, AppState, Platform } from "react-native";
import { registerTranslation } from "react-native-paper-dates";
import { useSettings } from "../hooks/useSettings";
import { settingsRepository } from "../services/settings-repository";
import {
  ChangelogSeenVersions,
  settingsService,
} from "../services/settings-service";

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
  openFeedbackModal: () => void;
  closeFeedbackModal: () => void;
  isFeedbackModalOpen: boolean;
  userSettings: ReturnType<typeof useSettings>;
  connectionStatus: ReturnType<typeof useConnectionStatus>;
  deviceToken: string | null;
  isInitializing: boolean;
  push: UsePushNotifications;
  isChangelogModalOpen: boolean;
  openChangelogModal: () => void;
  closeChangelogModal: () => void;
  latestChangelog: ChangelogForModalFragment | null;
  needsChangelogAppUpdateNotice: boolean;
  needsChangelogBackendBehindNotice: boolean;
}

const parseVersion = (v?: string | null): number[] => {
  if (!v) return [];
  return v
    .split(".")
    .map((part) => parseInt(part, 10))
    .map((n) => (Number.isNaN(n) ? 0 : n));
};

const isVersionLess = (a?: string | null, b?: string | null): boolean => {
  if (!a || !b) return false;
  const av = parseVersion(a);
  const bv = parseVersion(b);
  const len = Math.max(av.length, bv.length);
  for (let i = 0; i < len; i++) {
    const ai = av[i] ?? 0;
    const bi = bv[i] ?? 0;
    if (ai < bi) return true;
    if (ai > bi) return false;
  }
  return false;
};

const AppContext = createContext<AppContextProps | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [lastUserId, setLastUserId] = useState<string | null>(null);
  const push = usePushNotifications();
  const { t } = useI18n();
  const { logAppEvent } = useAppLog();
  const [fetchMe] = useGetMeLazyQuery();
  const [logoutMutation] = useLogoutMutation();
  const [loginMutation] = useLoginMutation();
  const [registerMutation] = useRegisterMutation();
  const connectionStatus = useConnectionStatus(push);
  const userSettings = useSettings();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const { mutateAsync: markAllAsRead } = useMarkAllAsRead();
  const { cleanup } = useCleanup();
  const { processPendingNavigationIntent } = usePendingNotificationIntents();
  const { versions } = useGetVersionsInfo();
  const { data: changelogData, refetch: refetchChangelogs } =
    useChangelogsForModalQuery({
      fetchPolicy: "cache-and-network",
    });
  const { appVersion, backendVersion, nativeVersion } = versions;
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
  const [latestChangelog, setLatestChangelog] =
    useState<ChangelogForModalFragment | null>(null);
  const [changelogsForModal, setChangelogsForModal] = useState<
    ChangelogForModalFragment[]
  >([]);
  const [unreadChangelogIds, setUnreadChangelogIds] = useState<string[]>([]);
  const [needsChangelogAppUpdateNotice, setNeedsChangelogAppUpdateNotice] =
    useState(false);
  const [needsChangelogBackendBehindNotice, setNeedsChangelogBackendBehindNotice] =
    useState(false);

  useEffect(() => {
    const checkAndSetLocale = async () => {
      const currentLocale = userSettings.settings.locale;
      if (!currentLocale) {
        const deviceLocale = getDeviceLocale();
        console.log(
          "[AppContext] Setting initial locale to device locale:",
          deviceLocale
        );
        try {
          await userSettings.setLocale(deviceLocale);
        } catch (e) {
          console.error("Error setting locale:", e);
        }
      }
    };
    checkAndSetLocale();
  }, [userSettings]);

  useEffect(() => {
    const registerDatePickerTranslations = async () => {
      const appLocale = userSettings.settings.locale as Locale;
      const datePickerLocale = localeToDatePickerLocale[appLocale] || "en";

      registerTranslation(datePickerLocale, {
        save: t("dateTime.save"),
        selectSingle: t("dateTime.selectSingle"),
        selectMultiple: t("dateTime.selectMultiple"),
        selectRange: t("dateTime.selectRange"),
        notAccordingToDateFormat: (inputFormat: string) =>
          t("dateTime.notAccordingToDateFormat").replace(
            "{format}",
            inputFormat
          ),
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
    };
    registerDatePickerTranslations();
  }, [userSettings, t]);

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
    await settingsService.clearTokens();
    // Clear any stored redirect intent
    try {
      await settingsRepository.removeSetting("auth_redirectAfterLogin");
    } catch {}
    await settingsService.savePushNotificationsInitialized(false);
    await settingsService.saveLastUserId("");
    setUserId(null);
    setLastUserId(null);
    console.log("✅ Logout completed");
  };

  useEffect(() => {
    if (!changelogData || !changelogData.changelogs.length) {
      return;
    }

    const allEntries = changelogData.changelogs;
    setChangelogsForModal(allEntries);

    const latestEntry = allEntries[0];
    setLatestChangelog(latestEntry);

    const seen: ChangelogSeenVersions | undefined =
      settingsService.getChangelogSeenVersions();

    let shouldShow = false;

    // UI / web app version
    if (
      appVersion &&
      (!seen || isVersionLess(appVersion, latestEntry.uiVersion))
    ) {
      shouldShow = true;
    }
    console.log(appVersion, latestEntry.uiVersion);

    // Backend version
    if (
      backendVersion &&
      (!seen || isVersionLess(seen.backendVersion, latestEntry.backendVersion))
    ) {
      shouldShow = true;
    }

    // Native versions per platform
    if (Platform.OS === "ios") {
      if (
        nativeVersion &&
        (!seen ||
          isVersionLess(seen.iosVersion, latestEntry.iosVersion) ||
          isVersionLess(nativeVersion, latestEntry.iosVersion))
      ) {
        shouldShow = true;
      }
    } else if (Platform.OS === "android") {
      if (
        nativeVersion &&
        isVersionLess(nativeVersion, latestEntry.androidVersion) &&
        (!seen ||
          isVersionLess(seen.androidVersion, latestEntry.androidVersion))
      ) {
        shouldShow = true;
      }
    }

    if (shouldShow) {
      setIsChangelogModalOpen(true);
    }

    // Calcola quali changelog sono "non letti" rispetto alle versioni viste finora
    const nextUnreadIds: string[] = [];
    for (const entry of allEntries) {
      let isUnread = false;

      if (!seen) {
        isUnread = true;
      } else {
        if (isVersionLess(seen.uiVersion, entry.uiVersion)) {
          isUnread = true;
        }
        if (isVersionLess(seen.backendVersion, entry.backendVersion)) {
          isUnread = true;
        }

        if (Platform.OS === "ios") {
          if (isVersionLess(seen.iosVersion, entry.iosVersion)) {
            isUnread = true;
          }
        } else if (Platform.OS === "android") {
          if (isVersionLess(seen.androidVersion, entry.androidVersion)) {
            isUnread = true;
          }
        }
      }

      if (isUnread) {
        nextUnreadIds.push(entry.id);
      }
    }
    setUnreadChangelogIds(nextUnreadIds);

    const latestNativeVersion =
      Platform.OS === "ios"
        ? latestEntry.iosVersion
        : Platform.OS === "android"
        ? latestEntry.androidVersion
        : null;

    const needsNotice =
      (Platform.OS === "macos" || Platform.OS === "ios") &&
      !!nativeVersion &&
      !!latestNativeVersion &&
      isVersionLess(nativeVersion, latestNativeVersion);
    setNeedsChangelogAppUpdateNotice(needsNotice);

    const isSelfHosted = process.env.EXPO_PUBLIC_SELFHOSTED === "true";
    const needsBackendBehindNotice =
      isSelfHosted &&
      !!backendVersion &&
      !!latestEntry.backendVersion &&
      isVersionLess(backendVersion, latestEntry.backendVersion);
    setNeedsChangelogBackendBehindNotice(needsBackendBehindNotice);
  }, [changelogData, appVersion, backendVersion, nativeVersion]);

  const login = async (
    emailOrUsername: string,
    password: string
  ): Promise<boolean> => {
    const inputNormalized = emailOrUsername.toLowerCase().trim();
    const isEmail = /\S+@\S+\.\S+/.test(inputNormalized);
    try {
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

      // Send app log for failed login
      logAppEvent({
        event: "auth_login_failed",
        level: "error",
        message: errorMessage,
        context: "AppContext.login",
        error: e,
        data: {
          inputType: isEmail ? "email" : "username",
        },
      }).catch(() => {});

      throw e;
    }
  };

  const completeAuth = async (accessToken: string, refreshToken: string) => {
    try {
      await settingsService.saveTokens(accessToken, refreshToken);

      const newUserId = await refreshUserData();
      if (!newUserId) {
        setIsInitializing(false);
        return false;
      }

      setUserId(newUserId);

      const previousUserId = settingsService.getAuthData().lastUserId;
      if (previousUserId && previousUserId !== newUserId) {
        await settingsService.savePushNotificationsInitialized(false);
      }
      await settingsService.saveLastUserId(newUserId);
      setLastUserId(newUserId);

      await push.initialize();

      setIsInitializing(false);
      cleanup().catch((e) => {
        console.error(
          "Error during cleanup after completeAuth:",
          JSON.stringify(e)
        );
      });
      return true;
    } catch (e) {
      console.error("Error during completeAuth:", e);

      if (e instanceof Error) {
        const msg = e.message || "";
        // If the error is just a local SQLite "database is locked" issue,
        // avoid showing an alert to the user and log only to console.
        if (
          msg.includes("database is locked") ||
          msg.includes("finalizeAsync")
        ) {
          setIsInitializing(false);
          return false;
        }
      }

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
    const locale = userSettings.settings.locale;

    const gqlInput: RegisterDto = {
      email: inputNormalized,
      username,
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      locale,
    };

    const response = await registerMutation({
      variables: { input: gqlInput },
    });

    try {
      const registerRes = response.data?.register;
      if (!registerRes) {
        await logAppEvent({
          event: "auth_register_failed",
          level: "error",
          message: "Missing register response",
          context: "AppContext.register",
          data: { email: inputNormalized },
        }).catch(() => {});
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
          await logAppEvent({
            event: "auth_register_complete_failed",
            level: "error",
            message: "completeAuth returned false after register",
            context: "AppContext.register",
            data: { email: inputNormalized },
          }).catch(() => {});
          return "error";
        }
      }
    } catch (e) {
      // Network / GraphQL or unexpected errors during registration
      await logAppEvent({
        event: "auth_register_error",
        level: "error",
        message: (e as any)?.message,
        context: "AppContext.register",
        error: e,
        data: { email: inputNormalized },
      }).catch(() => {});
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
          [
            Promise.resolve(settingsService.getAuthData().accessToken),
            Promise.resolve(settingsService.getAuthData().refreshToken),
            Promise.resolve(settingsService.getAuthData().lastUserId),
          ]
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

  // Log when app is opened (initialization complete)
  useEffect(() => {
    if (!isInitializing) {
      logAppEvent({
        event: "app_opened",
        level: "info",
        message: "App opened and initialized",
        context: "AppContext.useEffect.isInitializing",
        data: {
          userId: userId || null,
        },
      }).catch(() => {});
    }
  }, [isInitializing, logAppEvent, userId]);

  // Auto-show onboarding for first-time users
  useEffect(() => {
    const checkOnboarding = async () => {
      // Wait for initialization to complete
      if (isInitializing) return;

      // Only show onboarding if user is logged in
      if (!userId) return;

      // Wait for user settings to be loaded from storage to avoid race condition
      if (!userSettings.isInitialized) return;

      const onboardingSettings = userSettings.settings.onboarding;

      if (!onboardingSettings.hasCompletedOnboarding) {
        console.log("[AppContext] Auto-showing onboarding for first-time user");
        setIsOnboardingOpen(true);
        logAppEvent({
          event: "onboarding_opened",
          level: "info",
          message: "Onboarding modal opened",
          context: "AppContext.checkOnboarding",
        }).catch(() => {});
      }
    };

    checkOnboarding();
  }, [
    isInitializing,
    userId,
    userSettings.isInitialized,
    userSettings.settings.onboarding,
  ]);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === "active" && userId) {
        console.log("[AppContext] App is active, cleaning up and syncing");
        logAppEvent({
          event: "app_opened",
          level: "info",
          message: "App opened or returned to foreground",
          context: "AppContext.handleAppStateChange",
          data: {
            appState: nextAppState,
            userId: userId || null,
          },
        }).catch(() => {});
        await processPendingNavigationIntent();
        await openSharedCacheDb();

        await cleanup();

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
        logAppEvent({
          event: "app_closed",
          level: "info",
          message: "App closed or sent to background",
          context: "AppContext.handleAppStateChange",
          data: {
            appState: nextAppState,
            userId: userId || null,
          },
        }).catch(() => {});
        try {
          // Flush pending logs before closing database
          await logger.flush();
          // console.log("[AppContext] Logs flushed successfully");

          // Close database connection
          // await closeSharedCacheDb();
          // console.log("[AppContext] Database closed successfully");

          // Notify all repositories that database is closed
          // This prevents race conditions and allows automatic reopening on next operation
          mediaCache.notifyDatabaseClosed();
          settingsRepository.notifyDatabaseClosed();
        } catch (error) {
          console.error("[AppContext] Error during background cleanup:", error);
        }
        return;
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

  const showOnboarding = () => {
    setIsOnboardingOpen(true);
    logAppEvent({
      event: "onboarding_opened",
      level: "info",
      message: "Onboarding modal opened",
      context: "AppContext.showOnboarding",
    }).catch(() => {});
  };

  const openChangelogModal = async () => {
    setIsChangelogModalOpen(true);
    await refetchChangelogs();
  };

  const closeChangelogModal = async () => {
    if (latestChangelog) {
      const previous = settingsService.getChangelogSeenVersions() || {};
      const updated: ChangelogSeenVersions = {
        ...previous,
        iosVersion: latestChangelog.iosVersion,
        androidVersion: latestChangelog.androidVersion,
        uiVersion: latestChangelog.uiVersion,
        backendVersion: latestChangelog.backendVersion,
      };

      await settingsService.setChangelogSeenVersions(updated);
    }
    setIsChangelogModalOpen(false);
  };

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
        showOnboarding,
        isOnboardingOpen,
        hideOnboarding: () => setIsOnboardingOpen(false),
        openFeedbackModal: () => setIsFeedbackModalOpen(true),
        closeFeedbackModal: () => setIsFeedbackModalOpen(false),
        isFeedbackModalOpen,
        userSettings,
        connectionStatus,
        deviceToken: push.deviceToken,
        isInitializing,
        lastUserId,
        push,
        isChangelogModalOpen,
        openChangelogModal,
        closeChangelogModal,
        latestChangelog,
        needsChangelogAppUpdateNotice,
        needsChangelogBackendBehindNotice,
      }}
    >
      {children}
      {isOnboardingOpen && (
        <OnboardingModal
          onClose={() => setIsOnboardingOpen(false)}
          push={push}
        />
      )}
      <FeedbackModal
        visible={isFeedbackModalOpen}
        onDismiss={() => setIsFeedbackModalOpen(false)}
      />
      {isChangelogModalOpen && (
        <ChangelogUpdatesModal
          latest={latestChangelog}
          changelogs={changelogsForModal}
          unreadIds={unreadChangelogIds}
          needsAppUpdateNotice={needsChangelogAppUpdateNotice}
          needsBackendBehindNotice={needsChangelogBackendBehindNotice}
          onClose={closeChangelogModal}
        />
      )}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
