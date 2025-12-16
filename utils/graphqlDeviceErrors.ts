import { settingsService } from '@/services/settings-service';
import { bumpDeviceRegistrationInvalidated } from '@/config/apollo-vars';

function extractErrorMessages(error: any): string[] {
  if (!error) return [];

  const messages: string[] = [];

  if (typeof error.message === 'string') {
    messages.push(error.message);
  }

  const graphQLErrors = error.graphQLErrors ?? error.errors;
  if (Array.isArray(graphQLErrors)) {
    for (const gqlError of graphQLErrors) {
      if (typeof gqlError?.message === 'string') {
        messages.push(gqlError.message);
      }

      const responseMessage = (gqlError as any)?.extensions?.exception?.response?.message;
      if (typeof responseMessage === 'string') {
        messages.push(responseMessage);
      } else if (Array.isArray(responseMessage)) {
        for (const msg of responseMessage) {
          if (typeof msg === 'string') {
            messages.push(msg);
          }
        }
      }
    }
  }

  return messages;
}

export function isDeviceNotFoundGraphQLError(error: unknown): boolean {
  const messages = extractErrorMessages(error as any);
  return messages.some((msg) => typeof msg === "string" && msg.includes('Device not found'));
}

let cleanupInFlight: Promise<void> | null = null;

export async function clearLocalDeviceIdAndToken(): Promise<void> {
  if (cleanupInFlight) {
    await cleanupInFlight;
    return;
  }

  cleanupInFlight = (async () => {
    try {
      await settingsService.clearKeyPair();
    } catch (err) {
      console.warn('[graphqlDeviceErrors] Failed to clear key pair:', err);
    }

    try {
      await settingsService.saveDeviceToken('');
      await settingsService.saveDeviceId('');
    } catch (err) {
      console.warn('[graphqlDeviceErrors] Failed to clear local device identifiers:', err);
    }
  })();

  try {
    await cleanupInFlight;
  } finally {
    cleanupInFlight = null;
  }
}

export async function handleDeviceNotFoundGraphQLError(error: unknown): Promise<boolean> {
  if (!isDeviceNotFoundGraphQLError(error)) return false;

  console.warn('[graphqlDeviceErrors] Device not found, clearing local device id/token');
  await clearLocalDeviceIdAndToken();
  try {
    bumpDeviceRegistrationInvalidated();
  } catch (err) {
    console.warn('[graphqlDeviceErrors] Failed to bump deviceRegistrationInvalidatedVar:', err);
  }
  return true;
}
