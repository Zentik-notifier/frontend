import { AuthUserIdProvider } from "@/contexts/AuthUserIdContext";
import { ChangelogUpdatesModal } from "@/components/ChangelogUpdatesModal";
import { DatabaseRecoveryModal } from "@/components/DatabaseRecoveryModal";
import FeedbackModal from "@/components/FeedbackModal";
import OnboardingModal from "@/components/Onboarding/OnboardingModal";
import {
  ChangelogForModalFragment,
  DeviceInfoDto,
  LoginDto,
  RegisterDto,
  useGetMeLazyQuery,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
} from "@/generated/gql-operations-generated";
import { useMarkAllAsRead } from "@/hooks/notifications/useNotificationMutations";
import { useSegments } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAppLog } from "@/hooks/useAppLog";
import { useChangelogs } from "@/hooks/useChangelogs";
import { useCleanup } from "@/hooks/useCleanup";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { Locale, localeToDatePickerLocale, useI18n } from "@/hooks/useI18n";
import { useMemoryLogging } from "@/hooks/useMemoryLogging";
import { usePendingNotificationIntents } from "@/hooks/usePendingNotificationIntents";
import {
  UsePushNotifications,
  usePushNotifications,
} from "@/hooks/usePushNotifications";
import { initializeBackgroundTasks } from "@/services/background-tasks";
import { closeSharedCacheDb, openSharedCacheDb } from "@/services/db-setup";
import { logger } from "@/services/logger";
import * as Localization from "expo-localization";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert, AppState, Platform } from "react-native";
import { registerTranslation } from "react-native-paper-dates";
import { useSettings } from "../hooks/useSettings";
import { settingsRepository } from "../services/settings-repository";
import { applyStoredAppIcon } from "../services/app-icon-service";
import {
  settingsService,
} from "../services/settings-service";
import { mediaCache } from "../services/media-cache-service";

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

export const AppContext = createContext<AppContextProps | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [lastUserId, setLastUserId] = useState<string | null>(null);
  const { t } = useI18n();
  const { logAppEvent } = useAppLog();
  const [fetchMe] = useGetMeLazyQuery();
  const [logoutMutation] = useLogoutMutation();
  const [loginMutation] = useLoginMutation();
  const [registerMutation] = useRegisterMutation();
  const userSettings = useSettings();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const { mutateAsync: markAllAsRead } = useMarkAllAsRead();
  const { cleanup } = useCleanup();
  const { processPendingNavigationIntent } = usePendingNotificationIntents();
  const {
    changelogsForModal,
    latestChangelog,
    needsChangelogAppUpdateNotice,
    needsChangelogBackendBehindNotice,
    unreadChangelogIds,
    shouldOpenChangelogModal,
    refetchChangelogs,
    versions,
  } = useChangelogs();
  const push = usePushNotifications(versions);
  const connectionStatus = useConnectionStatus(push);
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const segments = useSegments() as string[];
  // useMemoryLogging(5000);

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
    // Best-effort: iOS/Android scheduling is OS-controlled; interval is a minimum hint.
    initializeBackgroundTasks();
  }, []);

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
    const isPrivateRoute = segments[0] !== "(common)";
    if (shouldOpenChangelogModal && lastUserId && isPrivateRoute) {
      setIsChangelogModalOpen(true);
    }
  }, [shouldOpenChangelogModal, lastUserId, segments]);

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

      // Ensure tokens are available in the BehaviorSubject before making API calls
      // The authLink reads from settingsService.getAuthData(), so we need to ensure
      // the BehaviorSubject has been updated
      let savedAuthData = settingsService.getAuthData();
      if (!savedAuthData.accessToken || savedAuthData.accessToken !== accessToken) {
        // Wait a tick to ensure BehaviorSubject is updated
        await new Promise(resolve => setTimeout(resolve, 0));
        savedAuthData = settingsService.getAuthData();
        if (!savedAuthData.accessToken || savedAuthData.accessToken !== accessToken) {
          console.error('[completeAuth] Tokens not properly saved, retrying...');
          await settingsService.saveTokens(accessToken, refreshToken);
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

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
      cleanup({ onRotateDeviceKeys: push.registerDevice }).catch((e) => {
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

        // subscriptionsEnabledVar(true);
        const [accessToken, refreshToken, storedLastUserId] = await Promise.all(
          [
            Promise.resolve(settingsService.getAuthData().accessToken),
            Promise.resolve(settingsService.getAuthData().refreshToken),
            Promise.resolve(settingsService.getAuthData().lastUserId),
          ]
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
    if (
      userSettings.isInitialized &&
      (Platform.OS === "ios" || Platform.OS === "android")
    ) {
      applyStoredAppIcon().catch(() => {});
    }
  }, [userSettings.isInitialized]);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === "active") {
        const authData = settingsService.getAuthData();
        const hasAuth = !!authData.accessToken;
        const shouldSkipNetwork = !hasAuth;

        console.log(
          `[AppContext] App is active, cleaning up and syncing (skipNetwork=${shouldSkipNetwork})`
        );
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

        await cleanup({
          skipNetwork: shouldSkipNetwork,
          onRotateDeviceKeys: hasAuth ? push.registerDevice : undefined,
        });

        // Retry any notifications that failed to send to CloudKit from NSE
        if (hasAuth && Platform.OS === 'ios') {
          const iosBridgeService = (await import('@/services/ios-bridge')).default;
          iosBridgeService.retryNSENotificationsToCloudKit().catch((error: unknown) => {
            console.warn('[AppContext] Failed to retry NSE notifications to CloudKit:', error);
          });
        }

        // Invalidate app-state cache to force refetch and ensure unread count is correct
        queryClient.invalidateQueries({ queryKey: ['app-state'] });
        console.log('[AppContext] Invalidated app-state cache to refresh unread count');

        refetchChangelogs().catch(() => {});

        if (hasAuth && userId) {
          await connectionStatus.checkForUpdates();
        }
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
          await logger.flush();
          await closeSharedCacheDb();
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
  }, [userId, refetchChangelogs]);

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
    if (latestChangelog?.id) {
      await settingsService.setLastSeenChangelogId(latestChangelog.id);
    }
    setIsChangelogModalOpen(false);
  };


  const openLoginModal = useCallback(() => setIsLoginModalOpen(true), []);
  const closeLoginModal = useCallback(() => setIsLoginModalOpen(false), []);
  const hideOnboarding = useCallback(() => setIsOnboardingOpen(false), []);
  const openFeedbackModal = useCallback(() => setIsFeedbackModalOpen(true), []);
  const closeFeedbackModal = useCallback(() => setIsFeedbackModalOpen(false), []);

  const contextValue = useMemo<AppContextProps>(() => ({
    logout,
    login,
    completeAuth,
    register,
    userId,
    setUserId,
    refreshUserData,
    openLoginModal,
    isLoginModalOpen,
    closeLoginModal,
    showOnboarding,
    isOnboardingOpen,
    hideOnboarding,
    openFeedbackModal,
    closeFeedbackModal,
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
  }), [
    logout,
    login,
    completeAuth,
    register,
    userId,
    setUserId,
    refreshUserData,
    openLoginModal,
    isLoginModalOpen,
    closeLoginModal,
    showOnboarding,
    isOnboardingOpen,
    hideOnboarding,
    openFeedbackModal,
    closeFeedbackModal,
    isFeedbackModalOpen,
    userSettings,
    connectionStatus,
    push.deviceToken,
    isInitializing,
    lastUserId,
    push,
    isChangelogModalOpen,
    openChangelogModal,
    closeChangelogModal,
    latestChangelog,
    needsChangelogAppUpdateNotice,
    needsChangelogBackendBehindNotice,
  ]);

  return (
    <AuthUserIdProvider value={lastUserId}>
    <AppContext.Provider
      value={contextValue}
    >
      {children}
      <DatabaseRecoveryModal />
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
      {isChangelogModalOpen &&
        lastUserId &&
        segments[0] !== "(common)" && (
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
    </AuthUserIdProvider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
