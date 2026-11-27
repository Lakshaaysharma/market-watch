import { useMediaQuery } from './useMediaQuery';

export type Layout = 'narrow' | 'phone' | 'tablet' | 'desktop';

export function useLayout(): Layout {
  const narrow = useMediaQuery('(max-width: 359px)');
  const phone = useMediaQuery('(max-width: 639px)');
  const tablet = useMediaQuery('(max-width: 1023px)');
  return narrow ? 'narrow' : phone ? 'phone' : tablet ? 'tablet' : 'desktop';
}
