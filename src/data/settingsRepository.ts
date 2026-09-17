/**
 * Owns all editable, persisted application state (owner, current schedule, and
 * the single previous schedule) and the seed/reseed/save/revert rules.
 *
 * It is the only collaborator the screens talk to for persistence. It reads and
 * writes through [SchedulePreferencesStore] (the sole device-local I/O point)
 * and keeps the [TimetableRepository] snapshot in sync by pushing each current
 * schedule through [snapshotSink] whenever it changes. Bell times are never part
 * of this repository.
 */

import {
  DEFAULT_OWNER,
  DEFAULT_SCHEDULE,
  PersistedState,
  StoredSchedule,
} from '../domain/storedSchedule';
import { SchedulePreferencesStore } from './schedulePreferencesStore';
import { Store } from './store';

/** Outcome of [SettingsRepository.initialize]. */
export type InitOutcome = 'Ok' | 'SeededDefault' | 'ReseededAfterCorruption';

/** Outcome of [SettingsRepository.saveOwner]. */
export type OwnerSaveResult = 'Saved' | 'Empty' | 'TooLong';

/** Outcome of [SettingsRepository.saveSchedule]. */
export type ScheduleSaveResult =
  | { kind: 'Saved' }
  | { kind: 'WriteFailed'; reason: string };

/** Outcome of [SettingsRepository.revert]. */
export type RevertResult =
  | { kind: 'Reverted' }
  | { kind: 'NoPrevious' }
  | { kind: 'WriteFailed'; reason: string };

/** The longest accepted owner name, in characters. */
export const MAX_OWNER_LENGTH = 50;

export class SettingsRepository {
  /**
   * Owner + current schedule + the previous schedule. Seeded with a safe
   * default until [initialize] runs, so the UI always has something to render.
   */
  readonly state: Store<PersistedState>;

  constructor(
    private readonly store: SchedulePreferencesStore,
    private readonly snapshotSink: (schedule: StoredSchedule) => void,
  ) {
    this.state = new Store<PersistedState>({
      owner: DEFAULT_OWNER,
      current: DEFAULT_SCHEDULE,
      previous: null,
    });
  }

  /**
   * Establishes the initial persisted state on startup.
   *
   * - valid state present → adopts it, returns `Ok`;
   * - nothing stored (genuine first run) → seeds the defaults, returns
   *   `SeededDefault`;
   * - stored data present but unreadable → reseeds the defaults and returns
   *   `ReseededAfterCorruption`.
   *
   * In every case it updates [state] and pushes the current schedule through
   * [snapshotSink] so the timetable snapshot is current.
   */
  async initialize(): Promise<InitOutcome> {
    const current = await this.store.read();
    if (current !== null) {
      this.state.set(current);
      this.snapshotSink(current.current);
      return 'Ok';
    }

    // null => nothing readable. Distinguish absent (first run) from corrupt
    // (a key exists but failed to parse) via the store's raw presence check.
    const hadStoredData = await this.store.rawExists();
    const seeded: PersistedState = {
      owner: DEFAULT_OWNER,
      current: DEFAULT_SCHEDULE,
      previous: null,
    };
    try {
      await this.store.write(seeded);
    } catch {
      // Even if seeding cannot be persisted, run against the defaults in memory
      // rather than leaving the app with no schedule at all.
    }
    this.state.set(seeded);
    this.snapshotSink(seeded.current);
    return hadStoredData ? 'ReseededAfterCorruption' : 'SeededDefault';
  }

  /**
   * Validates and persists the owner name.
   *
   * Trims the input; an empty result returns `Empty` and a result longer than
   * [MAX_OWNER_LENGTH] returns `TooLong`, both leaving the stored owner
   * unchanged. The current schedule is untouched, so the snapshot is not
   * refreshed.
   */
  async saveOwner(raw: string): Promise<OwnerSaveResult> {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return 'Empty';
    if (trimmed.length > MAX_OWNER_LENGTH) return 'TooLong';

    const next: PersistedState = { ...this.state.value, owner: trimmed };
    await this.store.write(next);
    this.state.set(next);
    return 'Saved';
  }

  /**
   * Replaces the current schedule with [edited], retaining exactly one previous
   * schedule (the pre-save current).
   *
   * On a write failure the stored state is left unchanged and the failure is
   * surfaced as `WriteFailed`; neither [state] nor the snapshot is updated.
   */
  async saveSchedule(edited: StoredSchedule): Promise<ScheduleSaveResult> {
    const cur = this.state.value;
    const next: PersistedState = { ...cur, current: edited, previous: cur.current };
    try {
      await this.store.write(next);
      this.state.set(next);
      this.snapshotSink(edited);
      return { kind: 'Saved' };
    } catch (e) {
      return { kind: 'WriteFailed', reason: messageOf(e) };
    }
  }

  /**
   * Restores the previous schedule and discards it in a single write, leaving
   * the owner unchanged.
   *
   * With no previous schedule it writes nothing and returns `NoPrevious`, so a
   * second consecutive revert finds none. A write failure leaves the stored
   * state unchanged.
   */
  async revert(): Promise<RevertResult> {
    const cur = this.state.value;
    const prev = cur.previous;
    if (prev === null) return { kind: 'NoPrevious' };

    const next: PersistedState = { ...cur, current: prev, previous: null };
    try {
      await this.store.write(next);
      this.state.set(next);
      this.snapshotSink(prev);
      return { kind: 'Reverted' };
    } catch (e) {
      return { kind: 'WriteFailed', reason: messageOf(e) };
    }
  }
}

function messageOf(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'write failed';
}
