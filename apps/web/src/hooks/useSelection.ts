import { DEFAULT_SYMBOLS } from '@market/shared';
import { useCallback, useState } from 'react';

const KEY = 'market-watch:selection';

function load(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value;
  } catch {
    // Storage can be unavailable (private mode); fall back to the defaults.
  }
  return [...DEFAULT_SYMBOLS];
}

/** The watched stocks, in the order chosen, remembered across reloads. */
export function useSelection(): [string[], (next: string[]) => void] {
  const [selection, setSelection] = useState(load);
  const update = useCallback((next: string[]) => {
    setSelection(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Not persisted; the app still works.
    }
  }, []);
  return [selection, update];
}
