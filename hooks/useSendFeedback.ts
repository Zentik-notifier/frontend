import {
  useCreateUserLogMutation,
  UserLogType,
  useGetMeQuery,
} from "@/generated/gql-operations-generated";

export function useSendFeedback() {
  const { data: meData } = useGetMeQuery({
    fetchPolicy: "cache-first",
  });
  const [mutate, { loading, error }] = useCreateUserLogMutation();

  /**
   * Send a feedback entry as a UserLog of type FEEDBACK.
   * The only control flag is whether it should be anonymous; user data is resolved via GetMe.
   */
  const sendFeedback = async (
    text: string,
    isAnonymous: boolean = false,
  ): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    const me = meData?.me;
    const effectiveAnonymous = isAnonymous || !me;
    const userId = effectiveAnonymous ? null : me?.id ?? null;

    const payload: Record<string, any> = {
      text: trimmed,
    };

    if (!effectiveAnonymous && me?.email) {
      payload.userEmail = me.email;
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
  };

  return {
    sendFeedback,
    loading,
    error,
  };
}



