/**
 * Daily view: the app's home screen.
 *
 * Rendering rules, carried over from the Compose original:
 * - The header shows the abbreviated Cyrillic weekday, the group when present,
 *   and the selected date in short numeric form, e.g. "ЧЕТ Парна 17.09.26".
 * - A shift label is shown when a shift applies, preceded by a sun (morning) or
 *   moon (afternoon) glyph, and followed by the start time of the day's first
 *   period when the day has any.
 * - When a message applies it replaces the period list entirely.
 * - Otherwise the resolved lessons render in ascending period order, each with
 *   its period number, class code and start–end times; a pause shows the
 *   "no class" label in place of a code.
 *
 * The day body can also be dragged horizontally to move between days, mirroring
 * the ‹ / › buttons: drag left for the next day, right for the previous one.
 * The drag is deliberately understated: the body follows the finger at a heavy
 * damping ratio and only a few dp at most, and the day change itself is a short
 * crossfade rather than a full-width slide, so no blank screen ever passes
 * between the two days.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatHeaderDate } from '../domain/dates';
import type { ResolvedLesson } from '../domain/models';
import type { AppUpdateController } from '../state/useAppUpdate';
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
import { UpdateBanner } from './UpdateBanner';

/** Horizontal travel, in dp, past which releasing commits the day change. */
const SWIPE_DISTANCE = 64;
/** Fling speed, in dp/ms, that commits regardless of distance travelled. */
const SWIPE_VELOCITY = 0.4;
/** Travel before a drag is treated as horizontal rather than a list scroll. */
const SWIPE_CLAIM = 12;
/** Fraction of the finger's travel the body actually moves. */
const DRAG_DAMPING = 0.18;
/** Hard cap, in dp, on how far the body can be nudged while dragging. */
const DRAG_MAX = 20;
/** Offset, in dp, the outgoing day leaves at and the incoming day enters from. */
const SWAP_OFFSET = 14;
/** Duration, in ms, of each half of the crossfade. */
const SWAP_MS = 110;

export interface DailyScreenProps {
  state: DailyUiState;
  update: AppUpdateController;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onOpenCalendar: () => void;
  onOpenSettings: () => void;
  onOpenEditor: () => void;
}

export function DailyScreen({
  state,
  update,
  onPreviousDay,
  onNextDay,
  onOpenCalendar,
  onOpenSettings,
  onOpenEditor,
}: DailyScreenProps) {
  const theme = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const settle = () =>
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 18,
    });

  // `direction` is the sign of the drag: -1 (dragged left) advances a day.
  // The outgoing day fades out over a short nudge in the drag's direction, the
  // new day is swapped in at the mirrored offset, and fades back to centre.
  // Neither day ever travels far enough to leave a gap on screen.
  const commit = (direction: -1 | 1) => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: direction * SWAP_OFFSET,
        duration: SWAP_MS,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, { toValue: 0, duration: SWAP_MS, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (!finished) return;
      if (direction < 0) onNextDay();
      else onPreviousDay();
      translateX.setValue(-direction * SWAP_OFFSET);
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: SWAP_MS, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: SWAP_MS, useNativeDriver: true }),
      ]).start();
    });
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        // Claimed on the capture phase so a horizontal drag that starts on the
        // period list is taken from the FlatList, while vertical drags fall
        // through to it and scroll as usual.
        onMoveShouldSetPanResponderCapture: (_event, gesture) =>
          Math.abs(gesture.dx) > SWIPE_CLAIM && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
        // The body trails the finger only faintly, so the gesture reads as a
        // hint that the day will change rather than as dragging a page.
        onPanResponderMove: (_event, gesture) => {
          const damped = gesture.dx * DRAG_DAMPING;
          translateX.setValue(Math.max(-DRAG_MAX, Math.min(DRAG_MAX, damped)));
        },
        onPanResponderRelease: (_event, gesture) => {
          const far = Math.abs(gesture.dx) > SWIPE_DISTANCE;
          const fast = Math.abs(gesture.vx) > SWIPE_VELOCITY;
          if (far || fast) commit(gesture.dx < 0 ? -1 : 1);
          else settle().start();
        },
        onPanResponderTerminate: () => settle().start(),
      }),
    // Recreated when the day callbacks change; `translateX` and `opacity` are
    // refs and stable across renders.
    [onNextDay, onPreviousDay],
  );

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

      <UpdateBanner controller={update} />

      <Animated.View
        style={[styles.body, { opacity, transform: [{ translateX }] }]}
        {...pan.panHandlers}
      >
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
      </Animated.View>

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

  // ScheduleService sorts ascending by period and trims leading pauses, so the
  // head of the list is the day's earliest scheduled period. Its `start` is
  // already an IsoTime in HH:mm, the same value the rows render.
  const firstStart = state.lessons.length > 0 ? state.lessons[0].start : null;

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
          {firstStart !== null && (
            <Text
              style={[styles.firstStart, { color: theme.primary }]}
              accessibilityLabel={strings.firstPeriodStart(firstStart)}
            >
              {firstStart}
            </Text>
          )}
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
  // Clipped so a day sliding in or out never shows past the screen edge on iOS,
  // where views do not clip their children by default.
  root: { flex: 1, overflow: 'hidden' },
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
  // Sized up from the 16pt label so the glyph reads as an icon rather than
  // punctuation; lineHeight is pinned to stop Android clipping the ascender.
  shiftIcon: { fontSize: 24, lineHeight: 28, marginRight: spacing.sm },
  shiftLabel: { fontSize: 16, fontWeight: '500' },
  firstStart: { fontSize: 16, fontWeight: '500', marginLeft: spacing.md },
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
