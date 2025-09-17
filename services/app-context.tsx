import { subscriptionsEnabledVar } from "@/config/apollo-client";
import {
  DeviceInfoDto,
  GetBucketsDocument,
  LoginDto,
  NotificationFragment,
  RegisterDto,
  useBucketCreatedSubscription,
  useBucketDeletedSubscription,
  useBucketUpdatedSubscription,
  useNotificationCreatedSubscription,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
  useGetMeLazyQuery,
} from "@/generated/gql-operations-generated";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { useDebounce } from "@/hooks/useDebounce";
import { useI18n } from "@/hooks/useI18n";
import { useFetchNotifications } from "@/hooks/useNotifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useApolloClient } from "@apollo/client";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  Alert,
  AppState,
  ActivityIndicator,
  View,
  StyleSheet,
} from "react-native";
import {
  clearLastUserId,
  clearTokens,
  getAccessToken,
  getLastUserId,
  getRefreshToken,
  saveLastUserId,
  savePushNotificationsInitialized,
  saveTokens,
} from "./auth-storage";
import { useUserSettings } from "./user-settings";
import OnboardingModal from "../components/OnboardingModal";
import { mediaCache } from "./media-cache";

type RegisterResult = "ok" | "emailConfirmationRequired" | "error";

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
  setLoading: (loading: boolean) => void;
  isLoading: boolean;
  userSettings: ReturnType<typeof useUserSettings>;
  connectionStatus: ReturnType<typeof useConnectionStatus>;
  deviceToken: string | null;
  refetchNotifications: () => Promise<void>;
  notifications: NotificationFragment[];
  notificationsLoading: boolean;
  isInitializing: boolean;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [lastUserId, setLastUserId] = useState<string | null>(null);
  const apolloClient = useApolloClient();
  const push = usePushNotifications();
  const { t } = useI18n();
  const [fetchMe] = useGetMeLazyQuery();
  const [logoutMutation] = useLogoutMutation();
  const [loginMutation] = useLoginMutation();
  const [registerMutation] = useRegisterMutation();

  const connectionStatus = useConnectionStatus(!userId);
  const userSettings = useUserSettings();

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    subscriptionsEnabledVar(true);
  }, []);

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
    push.clearBadge();
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
        // await resetApolloCache();
        // await mediaCache.clearCache();
        await savePushNotificationsInitialized(false);
      }
      await saveLastUserId(newUserId);
      setLastUserId(newUserId);

      await push.initialize();
      connectionStatus.refreshDeviceRegistration();

      setIsInitializing(false);
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
        const [accessToken, refreshToken, storedLastUserId] = await Promise.all(
          [getAccessToken(), getRefreshToken(), getLastUserId()]
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

  const {
    fetchNotifications: refetchNotifications,
    notifications,
    loading: notificationsLoading,
  } = useFetchNotifications();

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === "active" && userId) {
        console.log("📱 App became active - scheduling refresh");
        await mediaCache.reloadMetadata();
        await refetchNotifications();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, [userId, refetchNotifications]);

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

  // GraphQL Subscriptions
  // const notificationCreatedSubscription = useNotificationCreatedSubscription({
  //   skip: !userId,
  //   onData: async ({ data }) => {
  //     if (data?.data?.notificationCreated) {
  //       await refetchNotifications();
  //     }
  //   },
  //   onError: (error) => {
  //     console.error("❌ Notification created subscription error:", error);
  //   },
  // });

  // const bucketUpdatedSubscription = useBucketUpdatedSubscription({
  //   skip: !userId,
  //   onData: async ({ data }) => {
  //     if (data?.data?.bucketUpdated) {
  //       await handleBucketSubscriptionEvent("updated", data.data.bucketUpdated);
  //     }
  //   },
  //   onError: (error) => {
  //     console.error("❌ Bucket updated subscription error:", error);
  //   },
  // });

  // const bucketCreatedSubscription = useBucketCreatedSubscription({
  //   skip: !userId,
  //   onData: async ({ data }) => {
  //     if (data?.data?.bucketCreated) {
  //       await handleBucketSubscriptionEvent("created", data.data.bucketCreated);
  //     }
  //   },
  //   onError: (error) => {
  //     console.error("❌ Bucket created subscription error:", error);
  //   },
  // });

  // const bucketDeletedSubscription = useBucketDeletedSubscription({
  //   skip: !userId,
  //   onData: async ({ data }) => {
  //     if (data?.data?.bucketDeleted) {
  //       await handleBucketSubscriptionEvent("deleted", data.data.bucketDeleted);
  //     }
  //   },
  //   onError: (error) => {
  //     console.error("❌ Bucket deleted subscription error:", error);
  //   },
  // });

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
        setLoading: setIsLoading,
        isLoading,
        userSettings,
        connectionStatus,
        deviceToken: push.deviceToken,
        refetchNotifications,
        notifications,
        notificationsLoading,
        isInitializing,
        lastUserId,
      }}
    >
      {children}
      <OnboardingModal
        visible={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />

      {/* Global Loading Indicator - Bottom Left */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#0a7ea4" />
        </View>
      )}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}

const styles = StyleSheet.create({
  loadingOverlay: {
    position: "absolute",
    bottom: 20,
    left: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
