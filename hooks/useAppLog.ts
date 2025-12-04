import { useCallback } from "react";
import {
  useCreateUserLogMutation,
  UserLogType,
  useGetMeQuery,
} from "@/generated/gql-operations-generated";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { Platform } from "react-native";
import packageJson from "../package.json";

export type AppLogLevel = "debug" | "info" | "warn" | "error";

export interface AppLogPayload {
  event: string;
  message?: string;
  level?: AppLogLevel;
  context?: string;
  error?: unknown;
  data?: Record<string, any>;
}

/**
 * Get all app version information
 */
function getAppVersions() {
  const versions: Record<string, any> = {
    appVersion: packageJson.version || null,
    dockerVersion: packageJson.dockerVersion || null,
    platform: Platform.OS,
  };

  // Expo version info
  if (Constants.expoConfig?.version) {
    versions.expoVersion = Constants.expoConfig.version;
  }
  if (Constants.expoConfig?.sdkVersion) {
    versions.expoSdkVersion = Constants.expoConfig.sdkVersion;
  }

  // OTA Update info
  if (Updates.updateId) {
    versions.otaUpdateId = Updates.updateId;
  }
  if (Updates.createdAt) {
    versions.otaCreatedAt = Updates.createdAt.toISOString();
  }
  if (Updates.runtimeVersion) {
    versions.otaRuntimeVersion = Updates.runtimeVersion;
  }

  // Native version (if available)
  if (Constants.nativeAppVersion) {
    versions.nativeVersion = Constants.nativeAppVersion;
  }
  if (Constants.nativeBuildVersion) {
    versions.nativeBuildVersion = Constants.nativeBuildVersion;
  }

  return versions;
}

/**
 * Unified hook for sending UserLog entries:
 * - App logs (type APP_LOG) via logAppEvent
 * - User feedback (type FEEDBACK) via sendFeedback
 */
export function useAppLog() {
  const { data: meData } = useGetMeQuery({
    fetchPolicy: "cache-first",
  });
  const [mutate, { loading, error }] = useCreateUserLogMutation();

  const logAppEvent = useCallback(
    async ({
      event,
      message,
      level = "error",
      context,
      error,
      data,
    }: AppLogPayload) => {
      try {
        const me = meData?.me;
        const userId = me?.id ?? null;

        const safeError =
          error && typeof error === "object"
            ? {
                name: (error as any)?.name,
                message: (error as any)?.message,
                stack: (error as any)?.stack,
              }
            : typeof error === "string"
            ? { message: error }
            : undefined;

        const appVersions = getAppVersions();

        const payload: Record<string, any> = {
          event,
          level,
          message,
          context,
          versions: {
            ...appVersions
          },
          ...(safeError ? { error: safeError } : {}),
          ...(data ? { data } : {}),
        };

        await mutate({
          variables: {
            input: {
              type: UserLogType.AppLog,
              payload,
              userId,
            },
          },
        });
      } catch (e) {
        // Do not break UX if logging fails
        // eslint-disable-next-line no-console
        console.debug("[AppLog] Failed to send app log", e);
      }
    },
    [meData, mutate]
  );

  const sendFeedback = useCallback(
    async (
      text: string,
      isAnonymous: boolean = false,
      emailOverride?: string,
    ): Promise<void> => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }

      const me = meData?.me;
      const includeEmail = !isAnonymous;
      const userId = !isAnonymous && me ? me.id ?? null : null;

      const payload: Record<string, any> = {
        text: trimmed,
      };

      if (includeEmail) {
        const manualEmail = emailOverride?.trim();
        if (manualEmail) {
          payload.userEmail = manualEmail;
        } else if (me?.email) {
          payload.userEmail = me.email;
        }
      }

      await mutate({
        variables: {
          input: {
            type: UserLogType.Feedback,
            payload,
            userId,
          },
        },
      });
    },
    [meData, mutate]
  );

  return { logAppEvent, sendFeedback, loading, error };
}
