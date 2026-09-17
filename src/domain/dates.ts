/**
 * A minimal, timezone-safe calendar-date layer.
 *
 * The Kotlin app leaned on `java.time.LocalDate` / `LocalTime`, which have no
 * JS equivalent: a JS `Date` is an instant, so arithmetic on it silently drifts
 * across DST boundaries and timezones. Instead a date is represented as a plain
 * `YYYY-MM-DD` string and all arithmetic goes through the UTC epoch-day helpers
 * below, which are exact for every timezone. Times are `HH:mm` strings, only
 * ever displayed, never computed with.
 */

/** A calendar date as `YYYY-MM-DD`. The port's equivalent of `LocalDate`. */
export type IsoDate = string;

/** A wall-clock time as `HH:mm`. The port's equivalent of `LocalTime`. */
export type IsoTime = string;

/**
 * ISO-8601 weekday numbers, matching `java.time.DayOfWeek.value` so the ported
 * rules (DAY_GROUP, the timetable map, the anchor-Monday maths) keep the same
 * shape as the Kotlin original.
 */
export enum DayOfWeek {
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
  SUNDAY = 7,
}

/** Monday–Friday, in display order. */
export const WEEKDAYS: readonly DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
];

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Builds an [IsoDate] from a 1-based month and day. */
export function isoDate(year: number, month: number, day: number): IsoDate {
  return `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`;
}

/** Splits an [IsoDate] into its numeric parts (month is 1-based). */
export function dateParts(date: IsoDate): { year: number; month: number; day: number } {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}

/**
 * Days since 1970-01-01. Uses `Date.UTC` so the result is independent of the
 * device timezone — the whole point of this module.
 */
export function toEpochDay(date: IsoDate): number {
  const { year, month, day } = dateParts(date);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

/** Inverse of [toEpochDay]. */
export function fromEpochDay(epochDay: number): IsoDate {
  const d = new Date(epochDay * 86_400_000);
  return isoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Returns [date] shifted by [days] (negative moves backwards). */
export function plusDays(date: IsoDate, days: number): IsoDate {
  return fromEpochDay(toEpochDay(date) + days);
}

/** The ISO weekday of [date]. 1970-01-01 was a Thursday, hence the +3 offset. */
export function dayOfWeek(date: IsoDate): DayOfWeek {
  return (((toEpochDay(date) + 3) % 7 + 7) % 7 + 1) as DayOfWeek;
}

/** Whether [date] falls on a Saturday or Sunday. */
export function isWeekend(date: IsoDate): boolean {
  const dow = dayOfWeek(date);
  return dow === DayOfWeek.SATURDAY || dow === DayOfWeek.SUNDAY;
}

/** The Monday of [date]'s week; returns [date] unchanged when it is a Monday. */
export function mondayOfWeek(date: IsoDate): IsoDate {
  return plusDays(date, -(dayOfWeek(date) - DayOfWeek.MONDAY));
}

/** Today's date in the device's local timezone. */
export function today(now: Date = new Date()): IsoDate {
  return isoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Number of days in [month] (1-based) of [year]. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Formats a date as the Daily header's short numeric form, e.g. `17.09.26`. */
export function formatHeaderDate(date: IsoDate): string {
  const { year, month, day } = dateParts(date);
  return `${pad2(day)}.${pad2(month)}.${pad2(year % 100)}`;
}
