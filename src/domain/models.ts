/**
 * Pure domain layer for the school timetable.
 *
 * Direct port of the Kotlin `domain` package. These types have no React or
 * React Native dependency so the business rules (WeekType calculation, shift
 * resolution, schedule assembly) stay unit-testable in isolation.
 */

import { DayOfWeek, IsoDate, IsoTime } from './dates';

/** Which of the two alternating weekly rotations a given week falls in. */
export type WeekType = 'A' | 'B';

/**
 * Fixed partition of the weekdays into two groups.
 *
 * PARNA = Monday, Thursday, Friday. NEPARNA = Tuesday, Wednesday.
 */
export type DayGroup = 'PARNA' | 'NEPARNA';

/** The daily shift a group is on for a given week. */
export type Shift = 'MORNING' | 'AFTERNOON';

/**
 * A single teaching period as stored in the weekly layout.
 *
 * `classCode` is the class/group code taught (e.g. "5/4"); `null` denotes a
 * pause (no class that period).
 */
export interface Lesson {
  /** 1..7 */
  period: number;
  /** e.g. "5/4"; null => Pause */
  classCode: string | null;
}

/** The clock start/end times for a period within a particular shift. */
export interface BellTime {
  period: number;
  start: IsoTime;
  end: IsoTime;
}

/** A period after its shift-specific bell times have been applied. */
export interface ResolvedLesson {
  period: number;
  /** null => Pause */
  classCode: string | null;
  start: IsoTime;
  end: IsoTime;
}

/** The fully resolved schedule for one calendar date. */
export interface DaySchedule {
  date: IsoDate;
  dayOfWeek: DayOfWeek;
  isWeekend: boolean;
  /** null on weekends. */
  group: DayGroup | null;
  weekType: WeekType;
  /** null on weekends. */
  shift: Shift | null;
  /** Empty on weekends and on weekdays with no periods. */
  lessons: ResolvedLesson[];
}

/** Non-error messages shown in place of a period list. */
export type DailyMessage =
  | 'WEEKEND'
  | 'NO_CLASSES'
  | 'DATA_UNAVAILABLE'
  | 'DATE_UNDETERMINED';

/** True when the lesson is a pause rather than a taught period. */
export function isPause(lesson: Lesson | ResolvedLesson): boolean {
  return lesson.classCode === null;
}

/**
 * Fixed membership of each weekday in a [DayGroup].
 *
 * Monday, Thursday and Friday are PARNA; Tuesday and Wednesday are NEPARNA.
 * Weekends are intentionally absent.
 */
export const DAY_GROUP: Readonly<Partial<Record<DayOfWeek, DayGroup>>> = {
  [DayOfWeek.MONDAY]: 'PARNA',
  [DayOfWeek.THURSDAY]: 'PARNA',
  [DayOfWeek.FRIDAY]: 'PARNA',
  [DayOfWeek.TUESDAY]: 'NEPARNA',
  [DayOfWeek.WEDNESDAY]: 'NEPARNA',
};
