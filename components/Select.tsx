"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

export type SelectOption = { value: string; label: string; hint?: string; group?: string };

type Props = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  label?: string;          // visible label id target
  id?: string;
  ariaLabel?: string;
  placeholder?: string;
  searchable?: boolean;
  size?: "md" | "sm";
  disabled?: boolean;
};

/** A styled listbox that replaces the native <select>: same chevron, popover and keyboard rules everywhere. */
export function Select({ value, options, onChange, id, ariaLabel, placeholder = "Choose", searchable, size = "md", disabled }: Props) {
  const auto = useId();
  const baseId = id ?? auto;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const selected = options.find((o) => o.value === value);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => `${o.label} ${o.hint ?? ""} ${o.group ?? ""}`.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function openList() {
    if (disabled) return;
    setQuery("");
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
    if (searchable) setTimeout(() => search.current?.focus(), 0);
  }

  function choose(i: number) {
    const o = shown[i];
    if (!o) return;
    onChange(o.value);
    setOpen(false);
    root.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }

  function onKey(e: KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); openList(); }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(shown.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(shown.length - 1); }
    else if (e.key === "Enter") { e.preventDefault(); choose(active); }
    else if (e.key === "Escape" || e.key === "Tab") { setOpen(false); }
    else if (!searchable && e.key.length === 1) {
      // Typeahead: jump to the first option starting with what was typed.
      const now = e.timeStamp;
      typed.current = { text: (now - typed.current.at < 600 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
      const i = shown.findIndex((o) => o.label.toLowerCase().replace(/^#/, "").startsWith(typed.current.text));
      if (i >= 0) setActive(i);
    }
  }

  return (
    <div className={`ex-select-root ${size === "sm" ? "sm" : ""}`} ref={root} onKeyDown={onKey}>
      <button
        type="button" id={baseId} className="ex-select-trigger" disabled={disabled}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={`${baseId}-list`} aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openList())}
      >
        <span className="ex-select-value">
          {selected ? <>{selected.label}{selected.hint ? <span className="ex-select-hint">{selected.hint}</span> : null}</> : <span className="ex-select-placeholder">{placeholder}</span>}
        </span>
        <svg className="ex-select-chevron" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div className="ex-select-pop">
          {searchable ? (
            <input
              ref={search} className="ex-select-search" placeholder="Search" value={query} aria-label="Search options"
              aria-controls={`${baseId}-list`} aria-activedescendant={shown[active] ? `${baseId}-opt-${active}` : undefined}
              onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            />
          ) : null}
          <ul className="ex-select-list" role="listbox" id={`${baseId}-list`} ref={list} tabIndex={-1} aria-labelledby={baseId}>
            {shown.length === 0 ? <li className="ex-select-empty">No matches</li> : null}
            {shown.map((o, i) => {
              const header = o.group && o.group !== shown[i - 1]?.group ? o.group : null;
              return (
                <li key={o.value} role="presentation">
                  {header ? <div className="ex-select-group">{header}</div> : null}
                  <div
                    role="option" id={`${baseId}-opt-${i}`} data-index={i} aria-selected={o.value === value}
                    className={`ex-select-opt ${i === active ? "active" : ""}`}
                    onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(i)}
                  >
                    <span className="ex-select-opt-text">
                      <span>{o.label}</span>
                      {o.hint && !o.group ? <span className="ex-select-hint">{o.hint}</span> : null}
                    </span>
                    {o.value === value ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
