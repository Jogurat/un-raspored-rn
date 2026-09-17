/**
 * Holds the selected date and derives the Daily view state.
 *
 * Port of `ScheduleViewModel`. The selected date lives in React state, and the
 * Daily state is recomputed on every render from the current persisted state —
 * subscribing via [usePersistedState] means a save or revert in the editor
 * re-renders this automatically, which is what the Kotlin version achieved by
 * collecting `SettingsRepository.state`.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  DayOfWeek,
  IsoDate,
  dayOfWeek as dowOf,
  plusDays,
  today as todayOf,
} from '../domain/dates';
import type { DailyMessage, DayGroup, ResolvedLesson, Shift } from '../domain/models';
import { useAppGraph } from './AppContext';
import { usePersistedState } from './usePersistedState';

/** UI-facing state for the Daily view. */
export interface DailyUiState {
  date: IsoDate;
  dayOfWeek: DayOfWeek;
  /** null on weekends / when no group applies. */
  group: DayGroup | null;
  /** null on weekends / when no shift applies. */
  shift: Shift | null;
  /** Empty on weekends, on weekdays with no periods, and when data is unavailable. */
  lessons: ResolvedLesson[];
  /** Non-null when a message replaces the period list. */
  message: DailyMessage | null;
  /** The owner's name, used to compose the Daily title. */
  owner: string;
}

export interface ScheduleController {
  state: DailyUiState;
  previousDay: () => void;
  nextDay: () => void;
  selectDate: (date: IsoDate) => void;
  goToToday: () => void;
}

export function useSchedule(): ScheduleController {
  const { service, repository } = useAppGraph();
  const persisted = usePersistedState();

  // Reading the clock can in principle fail; the Kotlin version modelled that
  // as DATE_UNDETERMINED, so the same fallback is preserved here.
  const [{ date, undetermined }, setDateState] = useState(() => initialDate());

  const setDate = useCallback((next: IsoDate) => {
    setDateState({ date: next, undetermined: false });
  }, []);

  const previousDay = useCallback(() => {
    setDateState((cur) => ({ date: plusDays(cur.date, -1), undetermined: false }));
  }, []);

  const nextDay = useCallback(() => {
    setDateState((cur) => ({ date: plusDays(cur.date, 1), undetermined: false }));
  }, []);

  const goToToday = useCallback(() => setDateState(initialDate()), []);

  /**
   * Message precedence, preserved from the original:
   * 1. DATA_UNAVAILABLE when the self-check fails;
   * 2. DATE_UNDETERMINED when the clock could not be read;
   * 3. WEEKEND for Saturday/Sunday;
   * 4. NO_CLASSES for a weekday with no periods.
   */
  const state = useMemo<DailyUiState>(() => {
    const owner = persisted.owner;

    if (repository.load().kind === 'Unavailable') {
      return {
        date,
        dayOfWeek: dowOf(date),
        group: null,
        shift: null,
        lessons: [],
        message: 'DATA_UNAVAILABLE',
        owner,
      };
    }

    const schedule = service.scheduleFor(date);

    if (undetermined) {
      return { ...schedule, message: 'DATE_UNDETERMINED', owner };
    }
    if (schedule.isWeekend) {
      return {
        date,
        dayOfWeek: schedule.dayOfWeek,
        group: null,
        shift: null,
        lessons: [],
        message: 'WEEKEND',
        owner,
      };
    }
    if (schedule.lessons.length === 0) {
      return { ...schedule, lessons: [], message: 'NO_CLASSES', owner };
    }
    return { ...schedule, message: null, owner };
    // `persisted` participates so an edit elsewhere recomputes the view: the
    // repository snapshot it drives is mutable and invisible to React.
  }, [date, undetermined, service, repository, persisted]);

  return { state, previousDay, nextDay, selectDate: setDate, goToToday };
}

/**
 * Today's date, falling back to the most recent weekday with an
 * `undetermined` flag if the clock cannot be read.
 */
function initialDate(): { date: IsoDate; undetermined: boolean } {
  try {
    return { date: todayOf(), undetermined: false };
  } catch {
    // Snap to the most recent weekday so the view still shows a real schedule.
    const fallback = '1970-01-01';
    return { date: mostRecentWeekday(fallback), undetermined: true };
  }
}

/** The most recent Monday–Friday on or before [date]. */
function mostRecentWeekday(date: IsoDate): IsoDate {
  const dow = dowOf(date);
  if (dow === DayOfWeek.SATURDAY) return plusDays(date, -1);
  if (dow === DayOfWeek.SUNDAY) return plusDays(date, -2);
  return date;
}
