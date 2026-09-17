/**
 * All user-visible strings, in Serbian Cyrillic.
 *
 * The port's replacement for `res/values/strings.xml`. Kept as one flat object
 * so a future translation layer can swap it wholesale; the launcher label stays
 * Latin ("Raspored") in app.json, matching the original.
 */

import { DayOfWeek } from '../domain/dates';
import { DailyMessage, DayGroup, Shift } from '../domain/models';

export const strings = {
  appBarTitle: 'Распоред',
  /** Composed with the owner name, e.g. "Распоред Оливера". */
  appBarTitleOwner: (owner: string) => `Распоред ${owner}`,

  menu: 'Мени',
  menuSettings: 'Подешавања',
  menuEditSchedule: 'Измени распоред',
  actionBack: 'Назад',
  actionSave: 'Сачувај',
  actionCancel: 'Откажи',
  actionOk: 'У реду',

  actionPreviousDay: 'Претходни дан',
  actionNextDay: 'Следећи дан',
  actionOpenCalendar: 'Календар',

  /** Screen-reader label for the first period's start time in the Daily header. */
  firstPeriodStart: (time: string) => `Почетак првог часа у ${time}`,

  pauseLabel: 'Пауза (нема часа)',

  messageWeekend: 'Нема наставе (викенд).',
  messageNoClasses: 'Нема заказане наставе за овај дан.',
  messageDataUnavailable: 'Подаци распореда нису доступни.',
  messageDateUndetermined: 'Тренутни датум није могуће одредити.',

  settingsOwnerLabel: 'Име (власник распореда)',
  settingsOwnerCurrent: (owner: string) => `Тренутно: ${owner}`,
  ownerErrorEmpty: 'Име не може бити празно',
  ownerErrorTooLong: 'Име сме имати највише 50 карактера',

  editorTitle: 'Измени распоред',
  editorClassCodeLabel: 'Одељење',
  classCodeErrorTooLong: 'Највише 20 карактера',
  actionRevert: 'Врати претходни',
  saveFailed: 'Чување није успело',
  noticeSaved: 'Распоред је сачуван',
  noticeReverted: 'Враћен претходни распоред',
  noticeNoPrevious: 'Нема претходног распореда',

  calendarTitle: 'Изабери датум',
  actionToday: 'Данас',
} as const;

/** Full Cyrillic weekday names, used as editor section headers. */
export const DAY_NAMES: Readonly<Record<DayOfWeek, string>> = {
  [DayOfWeek.MONDAY]: 'Понедељак',
  [DayOfWeek.TUESDAY]: 'Уторак',
  [DayOfWeek.WEDNESDAY]: 'Среда',
  [DayOfWeek.THURSDAY]: 'Четвртак',
  [DayOfWeek.FRIDAY]: 'Петак',
  [DayOfWeek.SATURDAY]: 'Субота',
  [DayOfWeek.SUNDAY]: 'Недеља',
};

/** Abbreviated Cyrillic weekday names, used in the Daily header. */
export const DAY_ABBR: Readonly<Record<DayOfWeek, string>> = {
  [DayOfWeek.MONDAY]: 'ПОН',
  [DayOfWeek.TUESDAY]: 'УТО',
  [DayOfWeek.WEDNESDAY]: 'СРЕ',
  [DayOfWeek.THURSDAY]: 'ЧЕТ',
  [DayOfWeek.FRIDAY]: 'ПЕТ',
  [DayOfWeek.SATURDAY]: 'СУБ',
  [DayOfWeek.SUNDAY]: 'НЕД',
};

/** Single-letter weekday headers for the calendar grid, Monday first. */
export const DAY_INITIALS: readonly string[] = ['П', 'У', 'С', 'Ч', 'П', 'С', 'Н'];

/** Cyrillic month names in the nominative, for the calendar header. */
export const MONTH_NAMES: readonly string[] = [
  'Јануар', 'Фебруар', 'Март', 'Април', 'Мај', 'Јун',
  'Јул', 'Август', 'Септембар', 'Октобар', 'Новембар', 'Децембар',
];

export const GROUP_LABELS: Readonly<Record<DayGroup, string>> = {
  PARNA: 'Парна',
  NEPARNA: 'Непарна',
};

/** Uppercase group labels, used on the editor's group toggle. */
export const GROUP_LABELS_UPPER: Readonly<Record<DayGroup, string>> = {
  PARNA: 'ПАРНА',
  NEPARNA: 'НЕПАРНА',
};

export const SHIFT_LABELS: Readonly<Record<Shift, string>> = {
  MORNING: 'ПРЕПОДНЕ',
  AFTERNOON: 'ПОПОДНЕ',
};

/** Sun / moon glyphs standing in for the original's vector drawables. */
export const SHIFT_ICONS: Readonly<Record<Shift, string>> = {
  MORNING: '☀',
  AFTERNOON: '☾',
};

export const SHIFT_ICON_LABELS: Readonly<Record<Shift, string>> = {
  MORNING: 'Преподневна смена',
  AFTERNOON: 'Поподневна смена',
};

export const DAILY_MESSAGES: Readonly<Record<DailyMessage, string>> = {
  WEEKEND: strings.messageWeekend,
  NO_CLASSES: strings.messageNoClasses,
  DATA_UNAVAILABLE: strings.messageDataUnavailable,
  DATE_UNDETERMINED: strings.messageDateUndetermined,
};
