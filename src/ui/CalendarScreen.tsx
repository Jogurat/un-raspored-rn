/**
 * Calendar view: a month grid that lets the teacher jump to any date's Daily
 * view.
 *
 * The Compose original used Material 3's `DatePickerDialog`. React Native has no
 * built-in equivalent, and the community picker delegates to each platform's
 * native dialog — which cannot render a Cyrillic month header consistently and
 * adds a native dependency. This is a self-contained grid instead: it opens on
 * the month containing the selected date, marks that date, and passes any
 * choice (weekends included) straight through to the caller.
 */

import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DayOfWeek,
  daysInMonth,
  dateParts,
  dayOfWeek,
  IsoDate,
  isoDate,
  today as todayOf,
} from '../domain/dates';
import { DAY_INITIALS, MONTH_NAMES, strings } from './strings';
import { spacing, useTheme, type Theme } from './theme';

export interface CalendarScreenProps {
  selectedDate: IsoDate;
  onDateSelected: (date: IsoDate) => void;
  onDismiss: () => void;
}

export function CalendarScreen({
  selectedDate,
  onDateSelected,
  onDismiss,
}: CalendarScreenProps) {
  const theme = useTheme();
  const initial = dateParts(selectedDate);
  const [view, setView] = useState({ year: initial.year, month: initial.month });
  const todayDate = todayOf();

  /**
   * The cells of the month grid: leading nulls pad the row so the 1st lands
   * under its weekday column (the grid is Monday-first, matching the header).
   */
  const cells = useMemo<(number | null)[]>(() => {
    const firstDow = dayOfWeek(isoDate(view.year, view.month, 1));
    const leading = firstDow - DayOfWeek.MONDAY;
    const total = daysInMonth(view.year, view.month);
    return [
      ...Array<null>(leading).fill(null),
      ...Array.from({ length: total }, (_, i) => i + 1),
    ];
  }, [view]);

  const shiftMonth = (delta: number) => {
    setView((cur) => {
      const raw = cur.month - 1 + delta;
      return { year: cur.year + Math.floor(raw / 12), month: ((raw % 12) + 12) % 12 + 1 };
    });
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={styles.appBar}>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={strings.actionBack}
          hitSlop={8}
          style={styles.backButton}
        >
          <Text style={[styles.backGlyph, { color: theme.onBackground }]}>‹</Text>
        </Pressable>
        <Text style={[styles.appBarTitle, { color: theme.onBackground }]}>
          {strings.calendarTitle}
        </Text>
      </View>

      <View style={styles.monthBar}>
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={8} style={styles.monthButton}>
          <Text style={[styles.monthGlyph, { color: theme.primary }]}>‹</Text>
        </Pressable>
        <Text style={[styles.monthLabel, { color: theme.onBackground }]}>
          {MONTH_NAMES[view.month - 1]} {view.year}
        </Text>
        <Pressable onPress={() => shiftMonth(1)} hitSlop={8} style={styles.monthButton}>
          <Text style={[styles.monthGlyph, { color: theme.primary }]}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekHeader}>
        {DAY_INITIALS.map((initial, index) => (
          <Text
            key={index}
            style={[styles.weekHeaderCell, { color: theme.onSurfaceVariant }]}
          >
            {initial}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) return <View key={`pad-${index}`} style={styles.cell} />;
          const date = isoDate(view.year, view.month, day);
          return (
            <DayCell
              key={date}
              day={day}
              isSelected={date === selectedDate}
              isToday={date === todayDate}
              theme={theme}
              onPress={() => onDateSelected(date)}
            />
          );
        })}
      </View>

      <View style={styles.actions}>
        <Pressable onPress={() => onDateSelected(todayDate)} style={styles.textButton}>
          <Text style={[styles.textButtonLabel, { color: theme.primary }]}>
            {strings.actionToday}
          </Text>
        </Pressable>
        <Pressable onPress={onDismiss} style={styles.textButton}>
          <Text style={[styles.textButtonLabel, { color: theme.primary }]}>
            {strings.actionCancel}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function DayCell({
  day,
  isSelected,
  isToday,
  theme,
  onPress,
}: {
  day: number;
  isSelected: boolean;
  isToday: boolean;
  theme: Theme;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      style={({ pressed }) => [styles.cell, pressed && { opacity: 0.6 }]}
    >
      <View
        style={[
          styles.cellInner,
          isSelected && { backgroundColor: theme.primary },
          !isSelected && isToday && { borderWidth: 1, borderColor: theme.primary },
        ]}
      >
        <Text
          style={[
            styles.cellLabel,
            { color: isSelected ? theme.onPrimary : theme.onBackground },
          ]}
        >
          {day}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  appBar: { flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: spacing.sm },
  backButton: { padding: spacing.sm, width: 40, alignItems: 'center' },
  backGlyph: { fontSize: 28, lineHeight: 30 },
  appBarTitle: { fontSize: 20, fontWeight: '500', marginLeft: spacing.xs },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  monthButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  monthGlyph: { fontSize: 28, lineHeight: 32 },
  monthLabel: { fontSize: 18, fontWeight: '500' },
  weekHeader: { flexDirection: 'row', paddingHorizontal: spacing.sm },
  weekHeaderCell: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 12, paddingVertical: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.sm },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  cellInner: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cellLabel: { fontSize: 15 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', padding: spacing.md, gap: spacing.sm },
  textButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  textButtonLabel: { fontSize: 15, fontWeight: '500' },
});
