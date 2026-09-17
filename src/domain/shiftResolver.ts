/**
 * Maps a [DayGroup] and [WeekType] to the [Shift] that group is on for the week.
 *
 * The two groups always sit on opposite shifts, and they swap every week: on an
 * A-week PARNA is on the morning shift and NEPARNA on the afternoon shift; on a
 * B-week the assignment is reversed.
 */

import { DayGroup, Shift, WeekType } from './models';

export function shiftFor(group: DayGroup, weekType: WeekType): Shift {
  if (weekType === 'A') {
    return group === 'PARNA' ? 'MORNING' : 'AFTERNOON';
  }
  return group === 'PARNA' ? 'AFTERNOON' : 'MORNING';
}
