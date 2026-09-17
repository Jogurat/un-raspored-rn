/**
 * A minimal observable value — the port's stand-in for Kotlin's `StateFlow`.
 *
 * It holds a current value, notifies subscribers on change, and exposes the
 * exact pair (`subscribe` + `getSnapshot`) that React's `useSyncExternalStore`
 * wants, so a repository can drive React state without any of the ViewModels
 * needing to know about React.
 */
export class Store<T> {
  private listeners = new Set<() => void>();

  constructor(private current: T) {}

  /** The current value. Stable identity between changes. */
  get value(): T {
    return this.current;
  }

  /** Replaces the value and notifies subscribers. */
  set(next: T): void {
    if (Object.is(next, this.current)) return;
    this.current = next;
    this.listeners.forEach((listener) => listener());
  }

  /** Applies [update] to the current value. */
  update(updater: (current: T) => T): void {
    this.set(updater(this.current));
  }

  /** Registers [listener]; returns the unsubscribe function. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Reads the current value; paired with [subscribe] for useSyncExternalStore. */
  getSnapshot = (): T => this.current;
}
