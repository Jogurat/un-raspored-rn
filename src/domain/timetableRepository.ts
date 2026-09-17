/**
 * Provides the timetable and bell times from an in-memory snapshot.
 *
 * Lesson and group reads resolve against a mutable snapshot that defaults to
 * [DEFAULT_SCHEDULE] and is refreshed via [updateSnapshot] (the target the
 * `SettingsRepository` snapshot sink calls when persisted edits change). Bell
 * times remain sourced from the compiled-in constants. [load] runs a
 * lightweight self-check against the current snapshot and returns a result
 * rather than throwing.
 */

import { DayOfWeek, WEEKDAYS } from './dates';
import { DayGroup, BellTime, Lesson, Shift } from './models';
import { DEFAULT_SCHEDULE, StoredSchedule } from './storedSchedule';
import { AFTERNOON_BELLS, MORNING_BELLS } from './timetableData';

/** Outcome of a startup consistency check on the stored timetable data. */
export type TimetableLoadResult =
  | { kind: 'Available' }
  | { kind: 'Unavailable'; reason: string };

export interface TimetableRepository {
  /** Ordered lessons for a weekday, independent of WeekType. Empty for weekends. */
  lessonsFor(day: DayOfWeek): Lesson[];
  /** The [DayGroup] assigned to a weekday, or `null` when unassigned. */
  groupFor(day: DayOfWeek): DayGroup | null;
  /** Bell times for a shift, keyed by period number. */
  bellTimesFor(shift: Shift): Readonly<Record<number, BellTime>>;
  /** Verifies the current snapshot is loadable/consistent. */
  load(): TimetableLoadResult;
}

export class SnapshotTimetableRepository implements TimetableRepository {
  /** The current schedule snapshot; starts from the seed [DEFAULT_SCHEDULE]. */
  private snapshot: StoredSchedule = DEFAULT_SCHEDULE;

  /**
   * Replaces the in-memory snapshot, so persisted user edits become visible to
   * subsequent [lessonsFor] / [groupFor] reads.
   */
  updateSnapshot = (schedule: StoredSchedule): void => {
    this.snapshot = schedule;
  };

  lessonsFor(day: DayOfWeek): Lesson[] {
    return this.snapshot.lessonsByDay[day] ?? [];
  }

  groupFor(day: DayOfWeek): DayGroup | null {
    return this.snapshot.groupByDay[day] ?? null;
  }

  bellTimesFor(shift: Shift): Readonly<Record<number, BellTime>> {
    return shift === 'MORNING' ? MORNING_BELLS : AFTERNOON_BELLS;
  }

  /**
   * Verifies the current snapshot against two invariants, returning the first
   * failure. The valid period range is 1..7. Lesson invariants read from the
   * snapshot; bell-time invariants from the compiled-in constants.
   */
  load(): TimetableLoadResult {
    // Invariant 1: every weekday has >= 1 lesson, each within periods 1..7.
    for (const day of WEEKDAYS) {
      const lessons = this.snapshot.lessonsByDay[day] ?? [];
      if (lessons.length === 0) {
        return { kind: 'Unavailable', reason: `No lessons defined for day ${day}` };
      }
      for (const lesson of lessons) {
        if (lesson.period < 1 || lesson.period > 7) {
          return {
            kind: 'Unavailable',
            reason: `Period ${lesson.period} on day ${day} is outside the valid range 1..7`,
          };
        }
      }
    }

    // Invariant 2: every referenced period has a bell time in both shifts.
    const referenced = new Set(
      WEEKDAYS.flatMap((day) => this.snapshot.lessonsByDay[day] ?? []).map((l) => l.period),
    );
    for (const period of referenced) {
      if (!(period in MORNING_BELLS)) {
        return { kind: 'Unavailable', reason: `No morning bell time for period ${period}` };
      }
      if (!(period in AFTERNOON_BELLS)) {
        return { kind: 'Unavailable', reason: `No afternoon bell time for period ${period}` };
      }
    }

    return { kind: 'Available' };
  }
}
