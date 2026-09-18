/**
 * Inline notice that a new JS bundle is downloading or ready to be applied.
 *
 * Sits under the app bar rather than over the content: the Daily view is a
 * glanceable screen, and covering the period list to advertise an update would
 * be worse than waiting. While downloading it is informational only; once ready
 * it offers the restart, plus a dismiss for people who are mid-look.
 */

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppUpdateController } from '../state/useAppUpdate';
import { strings } from './strings';
import { spacing, useTheme } from './theme';

export function UpdateBanner({ controller }: { controller: AppUpdateController }) {
  const theme = useTheme();
  const { status, restart, dismiss } = controller;

  if (status === 'HIDDEN') return null;
  const downloading = status === 'DOWNLOADING';

  return (
    <View
      style={[styles.root, { backgroundColor: theme.surfaceVariant }]}
      accessibilityRole="alert"
    >
      {downloading && (
        <ActivityIndicator size="small" color={theme.primary} style={styles.spinner} />
      )}
      <Text style={[styles.message, { color: theme.onBackground }]} numberOfLines={2}>
        {downloading ? strings.updateDownloading : strings.updateReady}
      </Text>

      {!downloading && (
        <>
          <Pressable
            onPress={restart}
            accessibilityRole="button"
            accessibilityLabel={strings.actionRestart}
            hitSlop={8}
            style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}
          >
            <Text style={[styles.actionLabel, { color: theme.primary }]}>
              {strings.actionRestart}
            </Text>
          </Pressable>
          <Pressable
            onPress={dismiss}
            accessibilityRole="button"
            accessibilityLabel={strings.actionDismissUpdate}
            hitSlop={8}
            style={({ pressed }) => [styles.dismiss, pressed && { opacity: 0.6 }]}
          >
            <Text style={[styles.dismissGlyph, { color: theme.onSurfaceVariant }]}>✕</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: 10,
    borderRadius: 12,
  },
  spinner: { marginRight: spacing.sm },
  message: { flex: 1, fontSize: 14 },
  action: { paddingHorizontal: spacing.sm, paddingVertical: 4 },
  actionLabel: { fontSize: 14, fontWeight: '600' },
  dismiss: { paddingHorizontal: spacing.xs, paddingVertical: 4 },
  dismissGlyph: { fontSize: 14 },
});
