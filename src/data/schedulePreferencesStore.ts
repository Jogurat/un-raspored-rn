/**
 * The single device-local I/O point for the persisted application state.
 *
 * Wraps AsyncStorage (the React Native counterpart of the Kotlin app's
 * DataStore), keeping the whole [PersistedState] as one JSON string under one
 * key.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { parsePersistedState, PersistedState } from '../domain/storedSchedule';

const KEY = 'persisted_state';

export class SchedulePreferencesStore {
  /**
   * Reads the decoded state, or `null` when nothing is stored, the stored value
   * cannot be decoded (corrupt/incompatible JSON), or the read itself fails.
   * Callers treat `null` as "nothing readable stored" and seed/reseed.
   */
  async read(): Promise<PersistedState | null> {
    let raw: string | null;
    try {
      raw = await AsyncStorage.getItem(KEY);
    } catch {
      // A failed read is indistinguishable from an absent value to our callers.
      return null;
    }
    if (raw === null) return null;
    return parsePersistedState(raw);
  }

  /**
   * Serializes and writes the whole state. Write failures are propagated to the
   * caller: this class never swallows them, so `SettingsRepository` can map them
   * to a WriteFailed result and leave its in-memory state untouched.
   */
  async write(state: PersistedState): Promise<void> {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  }

  /**
   * Reports whether the key is present, regardless of whether its value decodes.
   *
   * [read] maps both an absent key and an undecodable value to `null`, so it
   * cannot on its own tell a genuine first run from corruption. The repository
   * uses this to choose between seeding and reseeding-after-corruption. A failed
   * read is treated as "no key present".
   */
  async rawExists(): Promise<boolean> {
    try {
      return (await AsyncStorage.getItem(KEY)) !== null;
    } catch {
      return false;
    }
  }
}
