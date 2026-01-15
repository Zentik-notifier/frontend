// Safe wrapper around expo-updates so that features depending on it
// can run in environments where the native ExpoUpdates module
// is not available (e.g. share extensions, some runtimes).

// We deliberately avoid a static import here and use require
// so that bundlers / runtimes that don't ship expo-updates
// don't crash at module-evaluation time.
let Updates: typeof import('expo-updates') | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Updates = require('expo-updates');
} catch (error) {
  // In environments without expo-updates this is expected.
  // Keep the warning generic and lightweight.
  // eslint-disable-next-line no-console
  console.warn(
    '[safe-updates] expo-updates not available in this runtime:',
    (error as Error)?.message
  );
}

export interface SafeCheckForUpdateResult {
  isAvailable: boolean;
}

class SafeUpdates {
  /**
   * Indicates if OTA updates are logically enabled for this runtime.
   * This mirrors the common pattern `!__DEV__ && Updates.isEnabled`,
   * but is resilient when Updates is missing.
   */
  get isOtaUpdatesEnabled(): boolean {
    return !__DEV__ && !!Updates?.isEnabled;
  }

  /**
   * Safe wrapper for `Updates.checkForUpdateAsync`.
   * Returns `{ isAvailable: false }` when the module is unavailable.
   */
  async checkForUpdateAsync(): Promise<SafeCheckForUpdateResult> {
    if (!Updates?.checkForUpdateAsync) {
      return { isAvailable: false };
    }

    try {
      const result = await Updates.checkForUpdateAsync();
      return { isAvailable: !!result?.isAvailable };
    } catch (error) {
      console.error('[safe-updates] Error checking for updates:', error);
      return { isAvailable: false };
    }
  }

  /**
   * Safe wrapper for `Updates.reloadAsync`.
   * No-op when the module is unavailable.
   */
  async reloadAsync(): Promise<void> {
    if (!Updates?.reloadAsync) {
      return;
    }

    try {
      await Updates.reloadAsync();
    } catch (error) {
      console.error('[safe-updates] Error reloading update:', error);
    }
  }
}

export const safeUpdates = new SafeUpdates();

