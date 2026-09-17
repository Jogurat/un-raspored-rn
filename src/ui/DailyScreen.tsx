/**
 * Daily view: the app's home screen.
 *
 * Rendering rules, carried over from the Compose original:
 * - The header shows the abbreviated Cyrillic weekday, the group when present,
 *   and the selected date in short numeric form, e.g. "ЧЕТ Парна 17.09.26".
 * - A shift label is shown when a shift applies, preceded by a sun (morning) or
 *   moon (afternoon) glyph.
 * - When a message applies it replaces the period list entirely.
 * - Otherwise the resolved lessons render in ascending period order, each with
 *   its period number, class code and start–end times; a pause shows the
 *   "no class" label in place of a code.
 */

import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatHeaderDate } from '../domain/dates';
import type { ResolvedLesson } from '../domain/models';
import type { DailyUiState } from '../state/useSchedule';
import {
  DAILY_MESSAGES,
  DAY_ABBR,
  GROUP_LABELS,
  SHIFT_ICONS,
  SHIFT_ICON_LABELS,
  SHIFT_LABELS,
  strings,
} from './strings';
import { spacing, useTheme, type Theme } from './theme';

export interface DailyScreenProps {
  state: DailyUiState;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onOpenCalendar: () => void;
  onOpenSettings: () => void;
  onOpenEditor: () => void;
}

export function DailyScreen({
  state,
  onPreviousDay,
  onNextDay,
  onOpenCalendar,
  onOpenSettings,
  onOpenEditor,
}: DailyScreenProps) {
  const theme = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const title = state.owner.trim().length > 0
    ? strings.appBarTitleOwner(state.owner)
    : strings.appBarTitle;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={styles.appBar}>
        <Text style={[styles.appBarTitle, { color: theme.onBackground }]} numberOfLines={1}>
          {title}
        </Text>
        <Pressable
          onPress={() => setMenuOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={strings.menu}
          hitSlop={8}
          style={styles.menuButton}
        >
          <Text style={[styles.menuGlyph, { color: theme.onBackground }]}>⋮</Text>
        </Pressable>
      </View>

      <OverflowMenu
        visible={menuOpen}
        theme={theme}
        onClose={() => setMenuOpen(false)}
        onOpenSettings={onOpenSettings}
        onOpenEditor={onOpenEditor}
      />

      <View style={styles.body}>
        <Header state={state} theme={theme} />

        {state.message !== null ? (
          <View style={styles.messageWrap}>
            <Text style={[styles.message, { color: theme.onBackground }]}>
              {DAILY_MESSAGES[state.message]}
            </Text>
          </View>
        ) : (
          <FlatList
            style={styles.list}
            data={state.lessons}
            keyExtractor={(lesson) => String(lesson.period)}
            renderItem={({ item }) => <LessonRow lesson={item} theme={theme} />}
            ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
          />
        )}
      </View>

      <View style={[styles.nav, { borderTopColor: theme.surfaceVariant }]}>
        <NavButton label={strings.actionPreviousDay} glyph="‹" onPress={onPreviousDay} theme={theme} />
        <NavButton label={strings.actionOpenCalendar} glyph="▦" onPress={onOpenCalendar} theme={theme} />
        <NavButton label={strings.actionNextDay} glyph="›" onPress={onNextDay} theme={theme} />
      </View>
    </SafeAreaView>
  );
}

/** Weekday, optional group and date, plus the optional shift row. */
function Header({ state, theme }: { state: DailyUiState; theme: Theme }) {
  const parts = [DAY_ABBR[state.dayOfWeek]];
  if (state.group !== null) parts.push(GROUP_LABELS[state.group]);
  parts.push(formatHeaderDate(state.date));

  return (
    <View>
      <Text style={[styles.header, { color: theme.onBackground }]}>{parts.join(' ')}</Text>
      {state.shift !== null && (
        <View style={styles.shiftRow} accessibilityLabel={SHIFT_ICON_LABELS[state.shift]}>
          <Text style={[styles.shiftIcon, { color: theme.primary }]}>
            {SHIFT_ICONS[state.shift]}
          </Text>
          <Text style={[styles.shiftLabel, { color: theme.primary }]}>
            {SHIFT_LABELS[state.shift]}
          </Text>
        </View>
      )}
    </View>
  );
}

/** A single period row: number, class code (or pause label), and times. */
function LessonRow({ lesson, theme }: { lesson: ResolvedLesson; theme: Theme }) {
  const isPause = lesson.classCode === null;
  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <Text style={[styles.period, { color: theme.onBackground }]}>{lesson.period}</Text>
      <Text
        style={[
          styles.classCode,
          isPause
            ? { color: theme.onSurfaceVariant, fontStyle: 'italic' }
            : { color: theme.onBackground },
        ]}
      >
        {isPause ? strings.pauseLabel : lesson.classCode}
      </Text>
      <Text style={[styles.time, { color: theme.onSurfaceVariant }]}>
        {lesson.start}–{lesson.end}
      </Text>
    </View>
  );
}

function NavButton({
  label,
  glyph,
  onPress,
  theme,
}: {
  label: string;
  glyph: string;
  onPress: () => void;
  theme: Theme;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.5 }]}
    >
      <Text style={[styles.navGlyph, { color: theme.primary }]}>{glyph}</Text>
    </Pressable>
  );
}

/** The ⋮ overflow menu, as a tap-outside-to-dismiss sheet. */
function OverflowMenu({
  visible,
  theme,
  onClose,
  onOpenSettings,
  onOpenEditor,
}: {
  visible: boolean;
  theme: Theme;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenEditor: () => void;
}) {
  const choose = (action: () => void) => () => {
    onClose();
    action();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.menuScrim, { backgroundColor: theme.scrim }]} onPress={onClose}>
        <View style={[styles.menuSheet, { backgroundColor: theme.surface }]}>
          <Pressable style={styles.menuItem} onPress={choose(onOpenSettings)}>
            <Text style={[styles.menuItemText, { color: theme.onBackground }]}>
              {strings.menuSettings}
            </Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={choose(onOpenEditor)}>
            <Text style={[styles.menuItemText, { color: theme.onBackground }]}>
              {strings.menuEditSchedule}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 56,
  },
  appBarTitle: { flex: 1, fontSize: 20, fontWeight: '500' },
  menuButton: { padding: spacing.sm },
  menuGlyph: { fontSize: 22 },
  body: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  header: { fontSize: 24, fontWeight: '400' },
  shiftRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  shiftIcon: { fontSize: 18, marginRight: spacing.sm },
  shiftLabel: { fontSize: 16, fontWeight: '500' },
  list: { flex: 1, marginTop: spacing.sm },
  messageWrap: { flex: 1, paddingTop: spacing.xl },
  message: { fontSize: 16, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  period: { width: 28, fontSize: 16, fontWeight: '600' },
  classCode: { flex: 1, fontSize: 16, marginLeft: 12 },
  time: { fontSize: 14 },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  navButton: { width: 56, height: 40, alignItems: 'center', justifyContent: 'center' },
  navGlyph: { fontSize: 28, lineHeight: 32 },
  menuScrim: { flex: 1, alignItems: 'flex-end', paddingTop: 56, paddingRight: spacing.sm },
  menuSheet: { borderRadius: 8, paddingVertical: spacing.xs, minWidth: 200, elevation: 8 },
  menuItem: { paddingHorizontal: spacing.md, paddingVertical: 12 },
  menuItemText: { fontSize: 16 },
});
