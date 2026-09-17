# Raspored

A React Native / Expo rewrite of the [Android Kotlin app](https://github.com/rostojic/un-raspored):
an offline school timetable for a teacher working a two-week alternating shift
rotation. No account, no network, no backend.

## Running it

```bash
npm install
npm start          # then press a / i, or scan the QR code
npm run typecheck  # tsc --noEmit
```

Requires Node 20.19.4+ (Expo SDK 57). The repo was developed on Node 24.12.0.

## What the app does

The week is split into two groups of days — **ПАРНА** (Mon, Thu, Fri) and
**НЕПАРНА** (Tue, Wed) — which sit on opposite shifts and swap every week. A
week is type **A** or **B** depending on its whole-week distance from an anchor
Monday (2026-08-31, defined as A). The class codes taught on a given weekday
never change; only the bell times move, between the morning and afternoon
schedules.

Four screens:

| Screen | Purpose |
| --- | --- |
| **Daily** | The selected date's periods, with group, shift and bell times. Prev / calendar / next controls. |
| **Calendar** | A month grid to jump to any date. |
| **Settings** | Edits the schedule owner's name (1–50 characters). |
| **Editor** | Edits the whole week: a group toggle plus seven class-code fields per weekday. Save keeps one previous schedule, which Revert restores. |

A blank class-code field means a **pause** (no class that period). Pauses only
render between classes — see "Ported bug fix" below.

## Layout

```
src/
  domain/      Pure rules, no React: dates, week type, shift, schedule assembly
  data/        Persistence (AsyncStorage) and the observable state container
  state/       React bindings: the dependency graph and three controller hooks
  ui/          Screens, strings (Serbian Cyrillic) and the colour palette
```

`domain/` and `data/` have no React or React Native imports, so the business
rules stay testable in isolation — the same separation the Kotlin version kept
for its JVM unit tests.

## How the port maps to the original

| Kotlin / Android | Here |
| --- | --- |
| `java.time.LocalDate` | `IsoDate`, a `YYYY-MM-DD` string with UTC epoch-day arithmetic (`domain/dates.ts`) |
| `java.time.DayOfWeek` | `DayOfWeek` enum with the same ISO numbering (1 = Monday) |
| Jetpack Compose | React Native components |
| `ViewModel` + `StateFlow` | Controller hooks over a small `Store<T>` (`data/store.ts`), read via `useSyncExternalStore` |
| Jetpack DataStore | `AsyncStorage`, one JSON string under one key |
| kotlinx.serialization | `JSON.stringify` + an explicit validating decoder (`parsePersistedState`) |
| Navigation Compose | `@react-navigation/native-stack` |
| `res/values/strings.xml` | `ui/strings.ts` |
| Material 3 + dynamic colour | A static light/dark palette (`ui/theme.ts`) |

### Deliberate differences

- **Calendar.** The original used Material 3's `DatePickerDialog`. React Native
  has no built-in equivalent, and the community picker delegates to each
  platform's native dialog, which won't render a Cyrillic month header
  consistently. This is a self-contained month grid instead.
- **Dynamic colour.** Android 12+ dynamic theming has no React Native
  counterpart, so the app always uses the static palette that the Kotlin version
  fell back to on older devices.
- **Shift icons.** The sun/moon vector drawables are `☀` / `☾` glyphs.
- **Strict decoding.** kotlinx.serialization rejected malformed stored JSON for
  free; `JSON.parse` accepts any shape, so `parsePersistedState` validates
  explicitly. A half-decoded schedule would otherwise render as a silently wrong
  timetable rather than triggering the reseed path.

## Ported bug fix

[Issue #1](https://github.com/rostojic/un-raspored/issues/1) on the Kotlin repo:
the editor normalizes every weekday to all seven periods, padding untaught ones
with pauses. Saving persisted that padding, so Monday — which only has periods 6
and 7 — rendered five leading "Пауза (нема часа)" rows before its first real
slot.

`trimEdgePauses` in `domain/scheduleService.ts` drops pauses before the first and
after the last taught period when assembling a day. Interior pauses (Wednesday's
period 4, Thursday's period 5) are kept. A day that is all pauses collapses to an
empty list, which the Daily view reports as "no classes".
