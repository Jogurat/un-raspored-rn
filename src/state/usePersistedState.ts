/**
 * Subscribes a component to the repository's persisted state.
 *
 * `useSyncExternalStore` is the React-correct way to read an external mutable
 * source: it re-renders on every notification and stays consistent under
 * concurrent rendering, which a `useEffect` + `useState` mirror would not.
 */

import { useSyncExternalStore } from 'react';
import type { PersistedState } from '../domain/storedSchedule';
import { useAppGraph } from './AppContext';

export function usePersistedState(): PersistedState {
  const { settingsRepository } = useAppGraph();
  return useSyncExternalStore(
    settingsRepository.state.subscribe,
    settingsRepository.state.getSnapshot,
  );
}
