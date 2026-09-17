/**
 * The seed weekly timetable data and the bell (clock) times for both shifts.
 *
 * The lesson layout here is only the *seed*: once the user edits the schedule,
 * the stored copy takes over (see `StoredSchedule` / `SettingsRepository`). The
 * bell times, by contrast, are always read from here and are not user-editable.
 */

import { DayOfWeek } from './dates';
import { BellTime, Lesson } from './models';

/**
 * The seed weekly lesson layout keyed by weekday.
 *
 * A [Lesson] with a `null` classCode denotes a pause. Weekends map to empty
 * lists.
 */
export const LESSONS: Readonly<Record<DayOfWeek, Lesson[]>> = {
  [DayOfWeek.MONDAY]: [
    { period: 6, classCode: '5/4' },
    { period: 7, classCode: '5/2' },
  ],
  [DayOfWeek.TUESDAY]: [
    { period: 2, classCode: '6/1' },
    { period: 3, classCode: '8/5' },
    { period: 4, classCode: '6/3' },
    { period: 5, classCode: '6/5' },
    { period: 6, classCode: '7/1' },
    { period: 7, classCode: '7/5' },
  ],
  [DayOfWeek.WEDNESDAY]: [
    { period: 1, classCode: '7/3' },
    { period: 2, classCode: '5/3' },
    { period: 3, classCode: '8/1' },
    { period: 4, classCode: null }, // period 4 = Pause
    { period: 5, classCode: '6/7' },
    { period: 6, classCode: '8/7' },
  ],
  [DayOfWeek.THURSDAY]: [
    { period: 1, classCode: '6/4' },
    { period: 2, classCode: '6/2' },
    { period: 3, classCode: '6/6' },
    { period: 4, classCode: '8/4' },
    { period: 5, classCode: null }, // period 5 = Pause
    { period: 6, classCode: '7/4' },
    { period: 7, classCode: '7/2' },
  ],
  [DayOfWeek.FRIDAY]: [
    { period: 4, classCode: '7/6' },
    { period: 5, classCode: '8/2' },
    { period: 6, classCode: '8/6' },
    { period: 7, classCode: '7/7' },
  ],
  [DayOfWeek.SATURDAY]: [],
  [DayOfWeek.SUNDAY]: [],
};

/** Morning shift bell times, keyed by period number. */
export const MORNING_BELLS: Readonly<Record<number, BellTime>> = {
  1: { period: 1, start: '08:00', end: '08:45' },
  2: { period: 2, start: '08:50', end: '09:35' },
  3: { period: 3, start: '09:55', end: '10:40' },
  4: { period: 4, start: '10:45', end: '11:30' },
  5: { period: 5, start: '11:35', end: '12:20' },
  6: { period: 6, start: '12:25', end: '13:10' },
  7: { period: 7, start: '13:15', end: '14:00' },
};

/** Afternoon shift bell times, keyed by period number. */
export const AFTERNOON_BELLS: Readonly<Record<number, BellTime>> = {
  1: { period: 1, start: '14:00', end: '14:45' },
  2: { period: 2, start: '14:50', end: '15:35' },
  3: { period: 3, start: '15:55', end: '16:40' },
  4: { period: 4, start: '16:45', end: '17:30' },
  5: { period: 5, start: '17:35', end: '18:20' },
  6: { period: 6, start: '18:25', end: '19:10' },
  7: { period: 7, start: '19:15', end: '20:00' },
};

/** The valid period numbers, in display order. */
export const PERIODS: readonly number[] = [1, 2, 3, 4, 5, 6, 7];
