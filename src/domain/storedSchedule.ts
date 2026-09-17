/**
 * Persistence models for the school timetable, plus the seed values used on a
 * fresh install.
 *
 * The Kotlin original leaned on kotlinx.serialization with a custom
 * `DayOfWeekSerializer` to encode `java.time.DayOfWeek` map keys by name. Here
 * the weekday is already a number (its ISO value), so a stored schedule is
 * plain JSON — but object keys are strings in JSON, which is why
 * [parsePersistedState] re-keys the decoded maps back to numbers.
 */

import { DayOfWeek, WEEKDAYS } from './dates';
import { DayGroup, DAY_GROUP, Lesson } from './models';
import { LESSONS } from './timetableData';

/** A persistable snapshot of a full weekly schedule. */
export interface StoredSchedule {
  /** Keyed by weekday. A [Lesson] with a `null` classCode denotes a pause. */
  lessonsByDay: Partial<Record<DayOfWeek, Lesson[]>>;
  /** The [DayGroup] each weekday belongs to. */
  groupByDay: Partial<Record<DayOfWeek, DayGroup>>;
}

/** The complete persisted application state. */
export interface PersistedState {
  /** The schedule owner's name. */
  owner: string;
  /** The active schedule. */
  current: StoredSchedule;
  /** The prior schedule, if any (used to revert an edit). */
  previous: StoredSchedule | null;
}

/** The seed owner name for a fresh install. */
export const DEFAULT_OWNER = 'Olivera';

/**
 * The seed schedule for a fresh install, built from [LESSONS] (weekends
 * excluded) and the fixed [DAY_GROUP] membership map.
 */
export const DEFAULT_SCHEDULE: StoredSchedule = {
  lessonsByDay: Object.fromEntries(
    WEEKDAYS.map((day) => [day, LESSONS[day]]),
  ) as Partial<Record<DayOfWeek, Lesson[]>>,
  groupByDay: { ...DAY_GROUP },
};

/** Deep-copies a schedule so edits to a working copy never alias stored state. */
export function cloneSchedule(schedule: StoredSchedule): StoredSchedule {
  return {
    lessonsByDay: Object.fromEntries(
      Object.entries(schedule.lessonsByDay).map(([day, lessons]) => [
        day,
        (lessons ?? []).map((l) => ({ ...l })),
      ]),
    ) as Partial<Record<DayOfWeek, Lesson[]>>,
    groupByDay: { ...schedule.groupByDay },
  };
}

const VALID_GROUPS: readonly string[] = ['PARNA', 'NEPARNA'];

/**
 * Decodes a [PersistedState] from its stored JSON text.
 *
 * Returns `null` for anything that is not a structurally valid state, which the
 * repository treats as "nothing readable stored" and reseeds from. The Kotlin
 * version got this for free from kotlinx.serialization's strict decoding; in
 * JSON-land `JSON.parse` accepts any shape, so the validation is explicit here.
 * Being strict matters: a half-decoded schedule would render as a silently
 * wrong timetable rather than an obvious failure.
 */
export function parsePersistedState(raw: string): PersistedState | null {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof decoded !== 'object' || decoded === null) return null;

  const obj = decoded as Record<string, unknown>;
  if (typeof obj.owner !== 'string') return null;

  const current = parseSchedule(obj.current);
  if (current === null) return null;

  const previous = obj.previous == null ? null : parseSchedule(obj.previous);
  if (obj.previous != null && previous === null) return null;

  return { owner: obj.owner, current, previous };
}

function parseSchedule(value: unknown): StoredSchedule | null {
  if (typeof value !== 'object' || value === null) return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.lessonsByDay !== 'object' || obj.lessonsByDay === null) return null;
  if (typeof obj.groupByDay !== 'object' || obj.groupByDay === null) return null;

  const lessonsByDay: Partial<Record<DayOfWeek, Lesson[]>> = {};
  for (const [key, value] of Object.entries(obj.lessonsByDay as object)) {
    const day = parseDay(key);
    if (day === null || !Array.isArray(value)) return null;
    const lessons: Lesson[] = [];
    for (const entry of value) {
      if (typeof entry !== 'object' || entry === null) return null;
      const { period, classCode } = entry as Record<string, unknown>;
      if (typeof period !== 'number' || !Number.isInteger(period)) return null;
      if (classCode !== null && typeof classCode !== 'string') return null;
      lessons.push({ period, classCode });
    }
    lessonsByDay[day] = lessons;
  }

  const groupByDay: Partial<Record<DayOfWeek, DayGroup>> = {};
  for (const [key, value] of Object.entries(obj.groupByDay as object)) {
    const day = parseDay(key);
    if (day === null || typeof value !== 'string' || !VALID_GROUPS.includes(value)) {
      return null;
    }
    groupByDay[day] = value as DayGroup;
  }

  return { lessonsByDay, groupByDay };
}

/** JSON object keys are strings, so weekday keys come back as e.g. `"1"`. */
function parseDay(key: string): DayOfWeek | null {
  const day = Number(key);
  return Number.isInteger(day) && day >= 1 && day <= 7 ? (day as DayOfWeek) : null;
}
