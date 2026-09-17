/**
 * Schedule Editor: edits the whole week's layout and group assignments.
 *
 * For each weekday Monday–Friday it renders a section with a ПАРНА/НЕПАРНА group
 * toggle followed by seven editable period rows for periods 1..7, each bound to
 * the current class code (empty for a pause). A cell over the length limit shows
 * an error. Save persists the working copy and Revert restores the previous
 * schedule; Revert is disabled when there is no previous schedule. Only the
 * working copy is edited until Save.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WEEKDAYS } from '../domain/dates';
import type { DayGroup } from '../domain/models';
import { PERIODS } from '../domain/timetableData';
import {
  cellKey,
  type EditorController,
  type EditorNotice,
} from '../state/useScheduleEditor';
import { DAY_NAMES, GROUP_LABELS_UPPER, strings } from './strings';
import { spacing, useTheme, type Theme } from './theme';

export interface ScheduleEditorScreenProps {
  controller: EditorController;
  onBack: () => void;
}

const NOTICE_TEXT: Record<EditorNotice, string> = {
  SAVED: strings.noticeSaved,
  REVERTED: strings.noticeReverted,
  NO_PREVIOUS: strings.noticeNoPrevious,
};

export function ScheduleEditorScreen({ controller, onBack }: ScheduleEditorScreenProps) {
  const theme = useTheme();
  const {
    working,
    hasPrevious,
    classCodeErrors,
    saveError,
    notice,
    onClassCodeChanged,
    onGroupToggled,
    save,
    revert,
    consumeNotice,
  } = controller;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={styles.appBar}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={strings.actionBack}
          hitSlop={8}
          style={styles.backButton}
        >
          <Text style={[styles.backGlyph, { color: theme.onBackground }]}>‹</Text>
        </Pressable>
        <Text style={[styles.appBarTitle, { color: theme.onBackground }]}>
          {strings.editorTitle}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {WEEKDAYS.map((day) => (
            <View key={day} style={styles.section}>
              <Text style={[styles.dayName, { color: theme.onBackground }]}>
                {DAY_NAMES[day]}
              </Text>

              <GroupToggle
                selected={working.groupByDay[day] ?? null}
                onSelect={(group) => onGroupToggled(day, group)}
                theme={theme}
              />

              {PERIODS.map((period) => (
                <PeriodRow
                  key={period}
                  period={period}
                  classCode={
                    (working.lessonsByDay[day] ?? []).find((l) => l.period === period)
                      ?.classCode ?? ''
                  }
                  hasError={classCodeErrors[cellKey(day, period)] !== undefined}
                  onChangeText={(text) => onClassCodeChanged(day, period, text)}
                  theme={theme}
                />
              ))}

              <View style={[styles.divider, { backgroundColor: theme.surfaceVariant }]} />
            </View>
          ))}

          {saveError !== null && (
            <Text style={[styles.saveError, { color: theme.error }]}>
              {strings.saveFailed}: {saveError}
            </Text>
          )}

          <View style={styles.actions}>
            <Pressable
              onPress={save}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.primary },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[styles.buttonLabel, { color: theme.onPrimary }]}>
                {strings.actionSave}
              </Text>
            </Pressable>

            <Pressable
              onPress={revert}
              disabled={!hasPrevious}
              accessibilityRole="button"
              accessibilityState={{ disabled: !hasPrevious }}
              style={({ pressed }) => [
                styles.button,
                styles.outlinedButton,
                { borderColor: hasPrevious ? theme.primary : theme.outline },
                !hasPrevious && styles.disabled,
                pressed && hasPrevious && { opacity: 0.8 },
              ]}
            >
              <Text
                style={[
                  styles.buttonLabel,
                  { color: hasPrevious ? theme.primary : theme.outline },
                ]}
              >
                {strings.actionRevert}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        message={notice === null ? null : NOTICE_TEXT[notice]}
        onDismiss={consumeNotice}
        theme={theme}
      />
    </SafeAreaView>
  );
}

/** ПАРНА / НЕПАРНА group selector for a weekday. */
function GroupToggle({
  selected,
  onSelect,
  theme,
}: {
  selected: DayGroup | null;
  onSelect: (group: DayGroup) => void;
  theme: Theme;
}) {
  const options: DayGroup[] = ['PARNA', 'NEPARNA'];
  return (
    <View style={styles.toggleRow}>
      {options.map((group) => {
        const isSelected = selected === group;
        return (
          <Pressable
            key={group}
            onPress={() => onSelect(group)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            style={[
              styles.toggleChip,
              {
                borderColor: isSelected ? theme.primary : theme.outline,
                backgroundColor: isSelected ? theme.primary : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.toggleLabel,
                { color: isSelected ? theme.onPrimary : theme.onSurfaceVariant },
              ]}
            >
              {GROUP_LABELS_UPPER[group]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** One editable period: its number and a class-code field (blank = pause). */
function PeriodRow({
  period,
  classCode,
  hasError,
  onChangeText,
  theme,
}: {
  period: number;
  classCode: string;
  hasError: boolean;
  onChangeText: (text: string) => void;
  theme: Theme;
}) {
  return (
    <View style={styles.periodRow}>
      <Text style={[styles.periodNumber, { color: theme.onBackground }]}>{period}</Text>
      <View style={styles.flex}>
        <TextInput
          value={classCode}
          onChangeText={onChangeText}
          placeholder={strings.editorClassCodeLabel}
          placeholderTextColor={theme.onSurfaceVariant}
          accessibilityLabel={`${strings.editorClassCodeLabel} ${period}`}
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.periodInput,
            {
              color: theme.onBackground,
              backgroundColor: theme.surface,
              borderColor: hasError ? theme.error : theme.outline,
            },
          ]}
        />
        {hasError && (
          <Text style={[styles.cellError, { color: theme.error }]}>
            {strings.classCodeErrorTooLong}
          </Text>
        )}
      </View>
    </View>
  );
}

/**
 * A transient message strip, standing in for Material's Snackbar: it fades in
 * when a notice arrives and clears it after a few seconds.
 */
function Snackbar({
  message,
  onDismiss,
  theme,
}: {
  message: string | null;
  onDismiss: () => void;
  theme: Theme;
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (message === null) return;
    Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(
        () => onDismiss(),
      );
    }, 2500);
    return () => clearTimeout(timer);
  }, [message, opacity, onDismiss]);

  if (message === null) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.snackbar, { backgroundColor: theme.onBackground, opacity }]}
    >
      <Text style={[styles.snackbarText, { color: theme.background }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  appBar: { flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: spacing.sm },
  backButton: { padding: spacing.sm, width: 40, alignItems: 'center' },
  backGlyph: { fontSize: 28, lineHeight: 30 },
  appBarTitle: { fontSize: 20, fontWeight: '500', marginLeft: spacing.xs },
  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  section: { paddingTop: spacing.sm },
  dayName: { fontSize: 20, fontWeight: '500', marginBottom: spacing.xs },
  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  toggleChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: spacing.md, paddingVertical: 6 },
  toggleLabel: { fontSize: 13, fontWeight: '500' },
  periodRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.xs },
  periodNumber: { width: 24, fontSize: 15, paddingTop: 12 },
  periodInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15 },
  cellError: { fontSize: 11, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginTop: spacing.sm },
  saveError: { fontSize: 14, paddingVertical: spacing.sm },
  actions: { paddingTop: spacing.md, gap: spacing.sm },
  button: { borderRadius: 20, paddingVertical: 12, alignItems: 'center' },
  outlinedButton: { borderWidth: 1, backgroundColor: 'transparent' },
  disabled: { opacity: 0.6 },
  buttonLabel: { fontSize: 15, fontWeight: '500' },
  snackbar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  snackbarText: { fontSize: 14 },
});
