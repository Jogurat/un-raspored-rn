/**
 * Holds and validates the editable owner name for the Settings view.
 *
 * Port of `SettingsViewModel`. The stored owner comes straight from the
 * repository subscription; the in-progress text is local React state, left
 * alone until a successful save re-syncs it.
 */

import { useCallback, useState } from 'react';
import type { OwnerSaveResult } from '../data/settingsRepository';
import { useAppGraph } from './AppContext';
import { usePersistedState } from './usePersistedState';

/** UI-facing owner validation error. */
export type OwnerError = 'EMPTY' | 'TOO_LONG';

export interface SettingsController {
  /** The owner currently persisted. */
  storedOwner: string;
  /** The in-progress text in the field. */
  editingText: string;
  /** The last validation failure, or null when valid / untouched. */
  error: OwnerError | null;
  onOwnerTextChanged: (text: string) => void;
  /** Persists the in-progress text; resolves true only when it was saved. */
  saveOwner: () => Promise<boolean>;
}

export function useSettings(): SettingsController {
  const { settingsRepository } = useAppGraph();
  const storedOwner = usePersistedState().owner;

  const [editingText, setEditingText] = useState(storedOwner);
  const [error, setError] = useState<OwnerError | null>(null);

  const onOwnerTextChanged = useCallback((text: string) => {
    setEditingText(text);
    setError(null);
  }, []);

  const saveOwner = useCallback(async () => {
    let result: OwnerSaveResult;
    try {
      result = await settingsRepository.saveOwner(editingText);
    } catch {
      // A write failure leaves the stored owner untouched; surfacing it as a
      // validation error would be misleading, so the field simply keeps its
      // in-progress value.
      return false;
    }
    if (result === 'Saved') {
      setEditingText(settingsRepository.state.value.owner);
      setError(null);
      return true;
    }
    setError(result === 'Empty' ? 'EMPTY' : 'TOO_LONG');
    return false;
  }, [settingsRepository, editingText]);

  return { storedOwner, editingText, error, onOwnerTextChanged, saveOwner };
}
