/**
 * Owns the shared dependency graph and exposes it to the screens.
 *
 * The Kotlin app built this graph once in `MainActivity` with `remember` and
 * handed the same [SettingsRepository] to all three ViewModels, so an edit made
 * in the editor propagated through the repository snapshot to the Daily and
 * Calendar views. This provider is the direct equivalent: the graph is built
 * once in a ref and shared through context, so the hooks in this folder all read
 * and write the same instances.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { SchedulePreferencesStore } from '../data/schedulePreferencesStore';
import { SettingsRepository } from '../data/settingsRepository';
import { ScheduleService } from '../domain/scheduleService';
import {
  SnapshotTimetableRepository,
  type TimetableRepository,
} from '../domain/timetableRepository';

export interface AppGraph {
  repository: TimetableRepository;
  service: ScheduleService;
  settingsRepository: SettingsRepository;
}

const AppContext = createContext<AppGraph | null>(null);

/**
 * Builds the graph once and renders [children] only after
 * [SettingsRepository.initialize] has settled, so no screen ever renders against
 * the pre-seed placeholder state and then flips.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const graphRef = useRef<AppGraph | null>(null);
  if (graphRef.current === null) {
    const repository = new SnapshotTimetableRepository();
    const service = new ScheduleService(repository);
    const store = new SchedulePreferencesStore();
    const settingsRepository = new SettingsRepository(store, repository.updateSnapshot);
    graphRef.current = { repository, service, settingsRepository };
  }
  const graph = graphRef.current;

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    graph.settingsRepository.initialize().finally(() => {
      if (!cancelled) setInitialized(true);
    });
    return () => {
      cancelled = true;
    };
  }, [graph]);

  if (!initialized) return null;

  return <AppContext.Provider value={graph}>{children}</AppContext.Provider>;
}

/** Reads the shared dependency graph. Throws outside an [AppProvider]. */
export function useAppGraph(): AppGraph {
  const graph = useContext(AppContext);
  if (graph === null) {
    throw new Error('useAppGraph must be used inside an AppProvider');
  }
  return graph;
}
