/**
 * Assembles the fully resolved [DaySchedule] for any calendar date.
 *
 * Composes the domain rules end to end: [weekTypeFor] fixes the week's
 * WeekType, the stored group assignment (falling back to [DAY_GROUP]) maps the
 * weekday to its DayGroup, [shiftFor] picks the Shift, and the
 * [TimetableRepository] supplies the WeekType-independent lessons plus the
 * shift-specific bell times.
 *
 * Class codes are taken solely from the repository and are WeekType-independent,
 * so only the clock times vary between WeekType A and B.
 */

import { dayOfWeek as dowOf, IsoDate, isWeekend as isWeekendDate } from './dates';
import { DaySchedule, DAY_GROUP, isPause, Lesson, ResolvedLesson } from './models';
import { shiftFor } from './shiftResolver';
import { TimetableRepository } from './timetableRepository';
import { weekTypeFor } from './weekType';

/**
 * Drops the pauses that sit before the first and after the last taught period
 * of a day.
 *
 * A pause is only meaningful as a gap *between* classes. The schedule editor
 * stores every weekday as all seven periods 1..7, padding the untaught ones
 * with pauses, so without this trim a day that starts at period 6 would render
 * five leading "no class" rows before its first actual slot. Interior pauses
 * are preserved; a day with no taught period at all collapses to an empty list,
 * which the Daily view reports as "no classes".
 *
 * [lessons] is expected to already be sorted ascending by period.
 */
export function trimEdgePauses(lessons: Lesson[]): Lesson[] {
  const first = lessons.findIndex((l) => !isPause(l));
  if (first < 0) return [];
  let last = lessons.length - 1;
  while (isPause(lessons[last])) last--;
  return lessons.slice(first, last + 1);
}

export class ScheduleService {
  constructor(private readonly repository: TimetableRepository) {}

  /**
   * Resolves the schedule for [date].
   *
   * Weekends return an empty schedule with `isWeekend = true` and null
   * group/shift. Weekdays resolve the group, shift and bell times, then map each
   * lesson (sorted ascending by period) to a [ResolvedLesson] carrying the
   * shift's start/end times. Pauses before the first and after the last taught
   * period are dropped; see [trimEdgePauses].
   */
  scheduleFor(date: IsoDate): DaySchedule {
    const dow = dowOf(date);
    const weekType = weekTypeFor(date);

    if (isWeekendDate(date)) {
      return {
        date,
        dayOfWeek: dow,
        isWeekend: true,
        group: null,
        weekType,
        shift: null,
        lessons: [],
      };
    }

    const group = this.repository.groupFor(dow) ?? DAY_GROUP[dow]!;
    const shift = shiftFor(group, weekType);
    const bells = this.repository.bellTimesFor(shift);

    const ordered = [...this.repository.lessonsFor(dow)].sort((a, b) => a.period - b.period);
    const lessons: ResolvedLesson[] = trimEdgePauses(ordered).map((lesson) => {
      const bell = bells[lesson.period];
      return {
        period: lesson.period,
        classCode: lesson.classCode,
        start: bell.start,
        end: bell.end,
      };
    });

    return { date, dayOfWeek: dow, isWeekend: false, group, weekType, shift, lessons };
  }
}
