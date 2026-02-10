import { useCallback } from "react";
import {
  useCreateUserLogMutation,
  UserLogType,
  useGetMeQuery,
} from "@/generated/gql-operations-generated";
import Constants from "expo-constants";
import { Platform } from "react-native";
import packageJson from "../package.json";
import { useSettings } from "./useSettings";

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
 * Get app version info for logs. Logs are sent to the same backend the app is
 * configured with (createUserLog mutation on the active API URL).
 * dockerVersion is from package.json at build time; isSelfHostedBuild indicates
 * the build variant (EXPO_PUBLIC_SELFHOSTED), not which server the app is connected to.
 */
function getAppVersions() {
  const versions: Record<string, any> = {
    appVersion: packageJson.version || null,
    dockerVersion: packageJson.dockerVersion || null,
    platform: Platform.OS,
    isSelfHostedBuild: process.env.EXPO_PUBLIC_SELFHOSTED === "true",
  };

  if (Constants.expoConfig?.version) {
    versions.expoVersion = Constants.expoConfig.version;
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
  const { settings } = useSettings();

  const logAppEvent = useCallback(
    async ({
      event,
      message,
      level = "error",
      context,
      error,
      data,
    }: AppLogPayload) => {
      // Check if user tracking is disabled
      if (settings.disableUserTracking) {
        return;
      }

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
          username: me?.username ?? null,
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
    [meData, mutate, settings.disableUserTracking]
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
