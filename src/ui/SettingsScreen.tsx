/**
 * Settings view: edits the schedule owner's name.
 *
 * The field is bound to the in-progress text and reports every edit. When a
 * validation error is set the field shows an error state and an inline message;
 * with no error, the supporting text shows the currently stored owner.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { SettingsController } from '../state/useSettings';
import { strings } from './strings';
import { spacing, useTheme } from './theme';

export interface SettingsScreenProps {
  controller: SettingsController;
  onBack: () => void;
}

export function SettingsScreen({ controller, onBack }: SettingsScreenProps) {
  const theme = useTheme();
  const { storedOwner, editingText, error, onOwnerTextChanged, saveOwner } = controller;

  const supporting =
    error === 'EMPTY'
      ? strings.ownerErrorEmpty
      : error === 'TOO_LONG'
        ? strings.ownerErrorTooLong
        : strings.settingsOwnerCurrent(storedOwner);

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
          {strings.menuSettings}
        </Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>
          {strings.settingsOwnerLabel}
        </Text>
        <TextInput
          value={editingText}
          onChangeText={onOwnerTextChanged}
          style={[
            styles.input,
            {
              color: theme.onBackground,
              borderColor: error !== null ? theme.error : theme.outline,
              backgroundColor: theme.surface,
            },
          ]}
          accessibilityLabel={strings.settingsOwnerLabel}
          autoCorrect={false}
        />
        <Text
          style={[
            styles.supporting,
            { color: error !== null ? theme.error : theme.onSurfaceVariant },
          ]}
        >
          {supporting}
        </Text>

        <Pressable
          onPress={saveOwner}
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  appBar: { flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: spacing.sm },
  backButton: { padding: spacing.sm, width: 40, alignItems: 'center' },
  backGlyph: { fontSize: 28, lineHeight: 30 },
  appBarTitle: { fontSize: 20, fontWeight: '500', marginLeft: spacing.xs },
  body: { padding: spacing.md, gap: spacing.sm },
  label: { fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  supporting: { fontSize: 12 },
  button: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  buttonLabel: { fontSize: 15, fontWeight: '500' },
});
