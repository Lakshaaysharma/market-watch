import { RefObject, useLayoutEffect } from 'react';

export type RenderKind = 'table' | 'row' | 'cell';

/** Counts committed renders. Off by default; enabled by `?debug` and in tests. */
export const renderStats = {
  enabled: false,
  counts: { table: 0, row: 0, cell: 0 } as Record<RenderKind, number>,
  reset(): void {
    this.counts = { table: 0, row: 0, cell: 0 };
  },
};

export function useRenderCount(kind: RenderKind, flash?: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    if (!renderStats.enabled) return;
    renderStats.counts[kind] += 1;
    // Outline the cell that just re-rendered.
    flash?.current?.animate?.([{ boxShadow: 'inset 0 0 0 2px #7c5cff' }, { boxShadow: 'inset 0 0 0 2px transparent' }], 450);
  });
}
