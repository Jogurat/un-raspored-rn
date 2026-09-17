/**
 * Holds the editable working copy of the stored schedule and the editor rules.
 *
 * Port of `ScheduleEditorViewModel`. The working copy is initialized from the
 * persisted schedule and normalized so every weekday Monday–Friday exposes all
 * seven periods as editable rows, filling any missing period with a pause. Edits
 * mutate only this copy; the persisted schedule is untouched until [save].
 */

import { useCallback, useRef, useState } from 'react';
import type { RevertResult, ScheduleSaveResult } from '../data/settingsRepository';
import { DayOfWeek, WEEKDAYS } from '../domain/dates';
import type { DayGroup, Lesson } from '../domain/models';
import { cloneSchedule, type StoredSchedule } from '../domain/storedSchedule';
import { PERIODS } from '../domain/timetableData';
import { useAppGraph } from './AppContext';

/** The longest accepted class code, in characters. */
export const MAX_CLASS_CODE_LENGTH = 20;

/** A per-cell validation error for a class-code field. */
export type ClassCodeError = 'TOO_LONG';

/** One-shot messages surfaced after an editor action completes. */
export type EditorNotice = 'SAVED' | 'REVERTED' | 'NO_PREVIOUS';

/** Key identifying one editable cell. */
export function cellKey(day: DayOfWeek, period: number): string {
  return `${day}:${period}`;
}

export interface EditorController {
  /** The in-progress working copy; every weekday holds all seven periods. */
  working: StoredSchedule;
  /** Whether a previous schedule exists to revert to. */
  hasPrevious: boolean;
  /** Per-cell validation errors, keyed by [cellKey]. */
  classCodeErrors: Record<string, ClassCodeError>;
  /** Non-null when the last save failed. */
  saveError: string | null;
  /** A one-shot notice to display, cleared via [consumeNotice]. */
  notice: EditorNotice | null;
  onClassCodeChanged: (day: DayOfWeek, period: number, text: string) => void;
  onGroupToggled: (day: DayOfWeek, group: DayGroup) => void;
  save: () => Promise<void>;
  revert: () => Promise<void>;
  consumeNotice: () => void;
}

export function useScheduleEditor(): EditorController {
  const { settingsRepository } = useAppGraph();

  // Seeded once: the editor deliberately does NOT follow later store emissions,
  // so an unsaved working copy is never clobbered mid-edit.
  const [working, setWorking] = useState<StoredSchedule>(() =>
    normalize(settingsRepository.state.value.current),
  );
  const [hasPrevious, setHasPrevious] = useState(
    () => settingsRepository.state.value.previous !== null,
  );
  const [classCodeErrors, setClassCodeErrors] = useState<Record<string, ClassCodeError>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<EditorNotice | null>(null);

  // Guards against a double-tap firing two overlapping writes.
  const inFlight = useRef(false);

  /**
   * Applies an edit to one cell of the working copy.
   *
   * The input is trimmed. A trimmed length over [MAX_CLASS_CODE_LENGTH] flags
   * the cell and leaves its working value unchanged. Otherwise the cell is set
   * to the trimmed value, or to a pause when the input is empty, and any prior
   * error for it is cleared. Only the targeted cell changes; the per-period
   * order is preserved.
   */
  const onClassCodeChanged = useCallback(
    (day: DayOfWeek, period: number, text: string) => {
      const trimmed = text.trim();
      const key = cellKey(day, period);

      if (trimmed.length > MAX_CLASS_CODE_LENGTH) {
        setClassCodeErrors((cur) => ({ ...cur, [key]: 'TOO_LONG' }));
        return;
      }

      const classCode: string | null = trimmed.length === 0 ? null : trimmed;
      setWorking((cur) => ({
        ...cur,
        lessonsByDay: {
          ...cur.lessonsByDay,
          [day]: (cur.lessonsByDay[day] ?? []).map((lesson) =>
            lesson.period === period ? { ...lesson, classCode } : lesson,
          ),
        },
      }));
      setClassCodeErrors((cur) => {
        if (!(key in cur)) return cur;
        const { [key]: _removed, ...rest } = cur;
        return rest;
      });
    },
    [],
  );

  /** Sets the group assignment of [day] in the working copy. */
  const onGroupToggled = useCallback((day: DayOfWeek, group: DayGroup) => {
    setWorking((cur) => ({
      ...cur,
      groupByDay: { ...cur.groupByDay, [day]: group },
    }));
  }, []);

  /**
   * Persists the working copy. On success it becomes the current stored
   * schedule and the pre-save current is retained as previous; on failure the
   * stored schedule is left unchanged and an error is shown.
   */
  const save = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const result: ScheduleSaveResult = await settingsRepository.saveSchedule(
        cloneSchedule(working),
      );
      if (result.kind === 'Saved') {
        setHasPrevious(true);
        setSaveError(null);
        setNotice('SAVED');
      } else {
        setSaveError(result.reason);
      }
    } finally {
      inFlight.current = false;
    }
  }, [settingsRepository, working]);

  /**
   * Restores the previous schedule. When one existed it is restored and
   * discarded and the working copy is re-seeded from it; when none exists the
   * stored schedule is untouched and a notice says so.
   */
  const revert = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const result: RevertResult = await settingsRepository.revert();
      if (result.kind === 'Reverted') {
        setWorking(normalize(settingsRepository.state.value.current));
        setHasPrevious(false);
        setSaveError(null);
        setClassCodeErrors({});
        setNotice('REVERTED');
      } else if (result.kind === 'NoPrevious') {
        setNotice('NO_PREVIOUS');
      } else {
        setSaveError(result.reason);
      }
    } finally {
      inFlight.current = false;
    }
  }, [settingsRepository]);

  const consumeNotice = useCallback(() => setNotice(null), []);

  return {
    working,
    hasPrevious,
    classCodeErrors,
    saveError,
    notice,
    onClassCodeChanged,
    onGroupToggled,
    save,
    revert,
    consumeNotice,
  };
}

/**
 * Returns a copy of [source] where every weekday Monday–Friday maps to seven
 * lessons for periods 1..7 in ascending order. Existing lessons are preserved;
 * any missing period is filled with a pause so the editor can render all seven
 * rows. Group assignments carry over unchanged.
 */
export function normalize(source: StoredSchedule): StoredSchedule {
  const lessonsByDay: Partial<Record<DayOfWeek, Lesson[]>> = {};
  for (const day of WEEKDAYS) {
    const existing = new Map((source.lessonsByDay[day] ?? []).map((l) => [l.period, l]));
    lessonsByDay[day] = PERIODS.map(
      (period) => existing.get(period) ?? { period, classCode: null },
    );
  }
  return { lessonsByDay, groupByDay: { ...source.groupByDay } };
}
