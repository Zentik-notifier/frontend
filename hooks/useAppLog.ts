import { useCallback } from "react";
import {
  useCreateUserLogMutation,
  UserLogType,
  useGetMeQuery,
} from "@/generated/gql-operations-generated";

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

        const payload: Record<string, any> = {
          event,
          level,
          message,
          context,
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
