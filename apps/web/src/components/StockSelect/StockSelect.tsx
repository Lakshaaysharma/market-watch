import { StockInfo } from '@market/shared';
import { KeyboardEvent, memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import styles from './StockSelect.module.css';

/** Upper bound on rendered options; searching narrows a longer list. */
const MAX_OPTIONS = 100;

interface Props {
  stocks: readonly StockInfo[];
  selected: readonly string[];
  onChange: (selected: string[]) => void;
  max: number;
  /** How many chips to show before collapsing into "+N". */
  chipLimit: number;
}

export const StockSelect = memo(function StockSelect({ stocks, selected, onChange, max, chipLimit }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const toggleButton = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const chosen = useMemo(() => new Set(selected), [selected]);
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return stocks;
    return stocks.filter((s) => s.symbol.toLowerCase().includes(needle) || s.name.toLowerCase().includes(needle));
  }, [stocks, query]);
  const options = matches.slice(0, MAX_OPTIONS);
  const full = selected.length >= max;

  const close = (restoreFocus = false) => {
    setOpen(false);
    setQuery('');
    setActive(0);
    if (restoreFocus) toggleButton.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    // Opening the keyboard immediately would cover the list on touch screens.
    if (window.matchMedia('(pointer: fine)').matches) search.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, listId]);

  const toggle = (symbol: string) => {
    if (chosen.has(symbol)) onChange(selected.filter((s) => s !== symbol));
    else if (!full) onChange([...selected, symbol]);
  };

  const selectAll = () => {
    const additions = matches.map((s) => s.symbol).filter((symbol) => !chosen.has(symbol));
    onChange([...selected, ...additions].slice(0, max));
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      close(true);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) return setOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => Math.max(0, Math.min(options.length - 1, i + step)));
    } else if (event.key === 'Enter' && open && event.target === search.current) {
      event.preventDefault();
      const option = options[active];
      if (option) toggle(option.symbol);
    }
  };

  const hidden = selected.length - chipLimit;

  return (
    <div className={styles.toolbar}>
      <span className={styles.label} id={`${listId}-label`}>
        Select Stocks
      </span>
      <div className={styles.select} ref={root} onKeyDown={onKeyDown}>
        <div className={styles.control} data-open={open} onClick={() => (open ? close() : setOpen(true))}>
          <div className={styles.chips}>
            {selected.slice(0, chipLimit).map((symbol) => (
              <span key={symbol} className={styles.chip}>
                {symbol}
                <button
                  type="button"
                  aria-label={`Remove ${symbol}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggle(symbol);
                  }}
                >
                  <svg viewBox="0 0 12 12" aria-hidden="true">
                    <path d="m1.5 1.5 9 9m0-9-9 9" />
                  </svg>
                </button>
              </span>
            ))}
            {hidden > 0 && <span className={styles.chip}>+{hidden}</span>}
            {selected.length === 0 && <span className={styles.placeholder}>Choose stocks…</span>}
          </div>
          <button
            type="button"
            ref={toggleButton}
            className={styles.chevron}
            aria-label="Open stock list"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m5 8.5 7 7 7-7" />
            </svg>
          </button>
        </div>

        {open && (
          <>
            <div className={styles.backdrop} onClick={() => close()} />
            <div className={styles.panel}>
              <input
                ref={search}
                className={styles.search}
                type="search"
                placeholder="Search symbol or company"
                aria-label="Search stocks"
                aria-controls={listId}
                aria-activedescendant={options.length ? `${listId}-${active}` : undefined}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
              />
              <div className={styles.actions}>
                <span>{selected.length} selected</span>
                <button type="button" onClick={selectAll} disabled={full || matches.every((s) => chosen.has(s.symbol))}>
                  Select all
                </button>
                <button type="button" onClick={() => onChange([])} disabled={selected.length === 0}>
                  Clear
                </button>
              </div>
              <ul className={styles.list} id={listId} role="listbox" aria-multiselectable="true" aria-labelledby={`${listId}-label`}>
                {options.map((stock, index) => (
                  <li
                    key={stock.symbol}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={chosen.has(stock.symbol)}
                    aria-disabled={full && !chosen.has(stock.symbol)}
                    data-active={index === active}
                    onPointerMove={() => setActive(index)}
                    onClick={() => toggle(stock.symbol)}
                  >
                    <i aria-hidden="true" />
                    <b>{stock.symbol}</b>
                    <span>{stock.name}</span>
                  </li>
                ))}
                {options.length === 0 && <li className={styles.note}>{stocks.length ? 'No matching stocks' : 'Waiting for the stock list…'}</li>}
                {matches.length > options.length && <li className={styles.note}>Showing {options.length} of {matches.length}. Search to narrow the list.</li>}
              </ul>
              {full && <p className={styles.note}>Limit of {max} stocks reached.</p>}
              <button type="button" className={styles.done} onClick={() => close(true)}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
});
