/**
 * Root of the app: owns the dependency graph and the navigation graph.
 *
 * Port of `MainActivity` + `RasporedApp`. The Daily, Calendar, Settings and
 * Editor destinations all read through the single shared [AppProvider] graph, so
 * a date change or a schedule edit made on any screen is reflected on the
 * others. The app is fully offline and requires no account or sign-in.
 */

import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { IsoDate } from './domain/dates';
import { AppProvider } from './state/AppContext';
import { useAppUpdate } from './state/useAppUpdate';
import { useSchedule, type ScheduleController } from './state/useSchedule';
import { useScheduleEditor } from './state/useScheduleEditor';
import { useSettings } from './state/useSettings';
import { CalendarScreen } from './ui/CalendarScreen';
import { DailyScreen } from './ui/DailyScreen';
import { ScheduleEditorScreen } from './ui/ScheduleEditorScreen';
import { SettingsScreen } from './ui/SettingsScreen';

export type RootStackParamList = {
  Daily: undefined;
  Calendar: undefined;
  Settings: undefined;
  Editor: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const scheme = useColorScheme();
  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
          <StatusBar style="auto" />
          <RootNavigator />
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}

/**
 * The selected date lives here rather than in the Daily screen, so navigating to
 * the Calendar and back does not reset it — the Compose original got the same
 * effect by hoisting it into a ViewModel scoped above the nav graph.
 */
function RootNavigator() {
  const schedule = useSchedule();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Daily">
        {({ navigation }) => (
          <DailyRoute
            schedule={schedule}
            onOpenCalendar={() => navigation.navigate('Calendar')}
            onOpenSettings={() => navigation.navigate('Settings')}
            onOpenEditor={() => navigation.navigate('Editor')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Calendar" options={{ presentation: 'modal' }}>
        {({ navigation }) => (
          <CalendarScreen
            selectedDate={schedule.state.date}
            onDateSelected={(date: IsoDate) => {
              // Update the shared state, then return to the Daily view.
              schedule.selectDate(date);
              navigation.goBack();
            }}
            onDismiss={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Settings">
        {({ navigation }) => <SettingsRoute onBack={() => navigation.goBack()} />}
      </Stack.Screen>

      <Stack.Screen name="Editor">
        {({ navigation }) => <EditorRoute onBack={() => navigation.goBack()} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

/**
 * The update banner is driven from here rather than from the navigator, so the
 * hook runs inside a component of its own — the screen callbacks above are
 * render functions, not components, and cannot hold hooks.
 */
function DailyRoute({
  schedule,
  onOpenCalendar,
  onOpenSettings,
  onOpenEditor,
}: {
  schedule: ScheduleController;
  onOpenCalendar: () => void;
  onOpenSettings: () => void;
  onOpenEditor: () => void;
}) {
  return (
    <DailyScreen
      state={schedule.state}
      update={useAppUpdate()}
      onPreviousDay={schedule.previousDay}
      onNextDay={schedule.nextDay}
      onOpenCalendar={onOpenCalendar}
      onOpenSettings={onOpenSettings}
      onOpenEditor={onOpenEditor}
    />
  );
}

/**
 * The Settings and Editor controllers are created inside their own routes so
 * their working state is torn down when the screen is popped — matching the
 * Kotlin ViewModels' navigation-scoped lifetime.
 */
function SettingsRoute({ onBack }: { onBack: () => void }) {
  return <SettingsScreen controller={useSettings()} onBack={onBack} />;
}

function EditorRoute({ onBack }: { onBack: () => void }) {
  return <ScheduleEditorScreen controller={useScheduleEditor()} onBack={onBack} />;
}
