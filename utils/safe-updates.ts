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

export interface SafeFetchUpdateResult {
  /** true when the fetched bundle is a new update ready to be loaded. */
  isNew: boolean;
}

export interface SafeDownloadAndReloadResult {
  /** true when a new update was fetched AND reloadAsync was invoked. */
  reloaded: boolean;
  /** true when fetchUpdateAsync ran but produced no new bundle. */
  fetchedButNotNew: boolean;
  error?: string;
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
   * Safe wrapper for `Updates.fetchUpdateAsync`.
   * Downloads the available update to local storage (required before reloadAsync).
   */
  async fetchUpdateAsync(): Promise<SafeFetchUpdateResult> {
    if (!Updates?.fetchUpdateAsync) {
      return { isNew: false };
    }

    try {
      const result = await Updates.fetchUpdateAsync();
      return { isNew: !!result?.isNew };
    } catch (error) {
      console.error('[safe-updates] Error fetching update:', error);
      return { isNew: false };
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

  /**
   * Full apply flow for a pending OTA update:
   *   fetchUpdateAsync → reloadAsync
   *
   * `reloadAsync` alone is NOT enough: it reloads the bundle currently in
   * local storage. Without a prior `fetchUpdateAsync`, the new bundle is
   * never downloaded and the user sees nothing change.
   *
   * `fetchUpdateAsync` is idempotent: if the update has already been
   * downloaded (e.g. by the native launcher with `checkAutomatically=ON_LOAD`)
   * it returns `isNew: true` without re-downloading.
   */
  async downloadAndReload(): Promise<SafeDownloadAndReloadResult> {
    if (!Updates) {
      return {
        reloaded: false,
        fetchedButNotNew: false,
        error: 'expo-updates not available',
      };
    }

    try {
      const fetched = await this.fetchUpdateAsync();
      if (!fetched.isNew) {
        return { reloaded: false, fetchedButNotNew: true };
      }

      await Updates.reloadAsync();
      return { reloaded: true, fetchedButNotNew: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[safe-updates] downloadAndReload failed:', message);
      return { reloaded: false, fetchedButNotNew: false, error: message };
    }
  }
}

export const safeUpdates = new SafeUpdates();

