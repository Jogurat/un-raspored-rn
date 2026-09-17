/**
 * The app's colour and spacing tokens.
 *
 * The Kotlin app used Material 3 with Android 12+ dynamic colour, which has no
 * React Native equivalent; this is the static fallback palette (the same
 * purple-family scheme) expressed as light and dark variants. [useTheme] picks
 * between them from the OS setting.
 */

import { useColorScheme } from 'react-native';

export interface Theme {
  background: string;
  surface: string;
  surfaceVariant: string;
  onBackground: string;
  onSurfaceVariant: string;
  primary: string;
  onPrimary: string;
  outline: string;
  error: string;
  scrim: string;
}

const light: Theme = {
  background: '#FFFBFE',
  surface: '#FFFFFF',
  surfaceVariant: '#E7E0EC',
  onBackground: '#1C1B1F',
  onSurfaceVariant: '#49454F',
  primary: '#6650A4',
  onPrimary: '#FFFFFF',
  outline: '#79747E',
  error: '#B3261E',
  scrim: 'rgba(0, 0, 0, 0.4)',
};

const dark: Theme = {
  background: '#1C1B1F',
  surface: '#2B2930',
  surfaceVariant: '#49454F',
  onBackground: '#E6E1E5',
  onSurfaceVariant: '#CAC4D0',
  primary: '#D0BCFF',
  onPrimary: '#381E72',
  outline: '#938F99',
  error: '#F2B8B5',
  scrim: 'rgba(0, 0, 0, 0.6)',
};

/** Resolves the palette for the current OS colour scheme. */
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Shared spacing scale, in density-independent pixels. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
