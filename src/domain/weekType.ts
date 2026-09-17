/**
 * Computes the alternating [WeekType] (A/B) for any calendar date.
 *
 * Weeks are anchored to [ANCHOR_MONDAY], which is defined as an `A` week. Every
 * date in the same Monday–Sunday week shares one WeekType, and consecutive
 * weeks alternate.
 */

import { IsoDate, isoDate, mondayOfWeek, toEpochDay } from './dates';
import { WeekType } from './models';

/** Monday of the anchor week; defined as WeekType `A`. */
export const ANCHOR_MONDAY: IsoDate = isoDate(2026, 8, 31);

/**
 * Absolute count of whole Mon–Sun weeks between [date]'s Monday and the anchor
 * Monday. Dates before the anchor yield a negative raw distance, which the
 * absolute value folds back — matching the Kotlin `Math.abs(Math.floorDiv(..))`.
 */
export function weeksFromAnchor(date: IsoDate): number {
  const days = toEpochDay(mondayOfWeek(date)) - toEpochDay(ANCHOR_MONDAY);
  return Math.abs(Math.floor(days / 7));
}

/**
 * The [WeekType] for [date]: `A` for an even whole-week distance from the
 * anchor, `B` for an odd distance.
 */
export function weekTypeFor(date: IsoDate): WeekType {
  return weeksFromAnchor(date) % 2 === 0 ? 'A' : 'B';
}
