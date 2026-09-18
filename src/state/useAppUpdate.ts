/**
 * Watches EAS Update for a newly published JS bundle.
 *
 * `checkAutomatically` is left at its default (`ON_LOAD`), so the bundle is
 * already fetched in the background on every cold start and would otherwise be
 * applied silently on the *next* launch. This hook surfaces that pending update
 * as a banner instead, so the user chooses when the app restarts, and adds a
 * re-check when the app returns to the foreground — a long-lived session would
 * never hit the launch-time check on its own.
 *
 * Everything is inert unless `Updates.isEnabled`: in Expo Go and debug builds
 * the check/fetch/reload calls reject, so the banner simply never appears.
 */

import * as Updates from 'expo-updates';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

/** What the banner should show, if anything. */
export type UpdateStatus = 'HIDDEN' | 'DOWNLOADING' | 'READY';

export interface AppUpdateController {
  status: UpdateStatus;
  /** Restarts into the downloaded update. */
  restart: () => Promise<void>;
  /** Hides the banner until another update is downloaded. */
  dismiss: () => void;
}

export function useAppUpdate(): AppUpdateController {
  const { isUpdatePending, isDownloading } = Updates.useUpdates();
  const [dismissed, setDismissed] = useState(false);
  // Guards against a second fetch while one is already in flight, which a
  // rapid background/foreground cycle would otherwise start.
  const busy = useRef(false);

  const checkNow = useCallback(async () => {
    if (!Updates.isEnabled || busy.current) return;
    busy.current = true;
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) await Updates.fetchUpdateAsync();
    } catch {
      // Offline, or the update server is unreachable. The app keeps running the
      // bundle it has and the banner stays hidden; the next foreground retries.
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    if (!Updates.isEnabled) return;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void checkNow();
    });
    return () => subscription.remove();
  }, [checkNow]);

  // A freshly downloaded update re-arms the banner, so dismissing one does not
  // suppress the next.
  useEffect(() => {
    if (isUpdatePending) setDismissed(false);
  }, [isUpdatePending]);

  const restart = useCallback(async () => {
    try {
      await Updates.reloadAsync();
    } catch {
      // Reload is unavailable (development build) or failed; drop the banner
      // rather than leaving a button that does nothing.
      setDismissed(true);
    }
  }, []);

  const status: UpdateStatus = dismissed
    ? 'HIDDEN'
    : isUpdatePending
      ? 'READY'
      : isDownloading
        ? 'DOWNLOADING'
        : 'HIDDEN';

  return { status, restart, dismiss: () => setDismissed(true) };
}
