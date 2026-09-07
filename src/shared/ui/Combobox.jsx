import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Icon } from '../icons/index.jsx';

// Выпадающий список с поиском: элементы можно листать скроллом, а можно
// сузить набор, набрав первые буквы кода или названия. Поддерживает группы,
// стрелки/Enter и Escape, который закрывает только сам список — окно под ним
// остаётся открытым.
function Combobox({
  options, value, onChange, placeholder = 'Начните вводить…', error,
  autoOpen = false, emptyText = 'Ничего не найдено', searchPlaceholder = 'Поиск…', size,
}) {
  const [open, setOpen] = useState(!!autoOpen);
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const opts = (options || []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setQ(''); } };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? opts.filter((o) => `${o.value} ${o.label} ${o.keywords || ''}`.toLowerCase().includes(needle))
    : opts;
  // Совпадение по началу кода поднимается наверх: набрал «yq» — сразу YQ.
  const ranked = needle
    ? [...shown].sort((a, b) => {
      const rank = (o) => (String(o.value).toLowerCase().startsWith(needle) ? 0
        : String(o.label).toLowerCase().startsWith(needle) ? 1 : 2);
      return rank(a) - rank(b);
    })
    : shown;
  const cur = opts.find((o) => o.value === value);
  const safeCursor = ranked.length ? Math.min(cursor, ranked.length - 1) : 0;
  useEffect(() => { setCursor(0); }, [q, open]);
  useEffect(() => {
    if (!open || !listRef.current) return;
    const node = listRef.current.querySelector('[data-cursor="1"]');
    node?.scrollIntoView({ block: 'nearest' });
  }, [open, safeCursor, q]);
  const pick = (option) => { onChange(option.value); setOpen(false); setQ(''); };
  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setQ('');
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!ranked.length) return;
      const shift = event.key === 'ArrowDown' ? 1 : -1;
      setCursor((index) => (Math.min(index, ranked.length - 1) + shift + ranked.length) % ranked.length);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (ranked[safeCursor]) pick(ranked[safeCursor]);
    }
  };
  let lastGroup = null;
  return (
    <div className={'combobox' + (size === 'sm' ? ' combobox-sm' : '')} ref={wrapRef} style={{ position: 'relative' }}>
      <div className={'select combobox-field' + (error ? ' err' : '')} role="button" tabIndex={0}
        aria-haspopup="listbox" aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); }
        }}
        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
        <span style={{ flex: 1, color: cur ? 'var(--ink)' : 'var(--muted-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cur ? cur.label : placeholder}</span>
        <Icon name="chevDown" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />
      </div>
      {open && (
        <div className="dropdown combobox-dropdown" role="listbox" ref={listRef}
          style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 60, maxHeight: 320, overflowY: 'auto', padding: 6 }}>
          <div className="search" style={{ margin: '2px 2px 6px', position: 'sticky', top: 0, zIndex: 1 }}>
            <Icon name="search" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder}
              onClick={(e) => e.stopPropagation()} onKeyDown={onKeyDown} />
          </div>
          {ranked.length === 0 && <div style={{ padding: '8px 10px', fontSize: 13, color: 'var(--muted)' }}>{emptyText}</div>}
          {ranked.map((o, index) => {
            const groupHead = !needle && o.group && o.group !== lastGroup ? o.group : null;
            lastGroup = o.group || lastGroup;
            return (
              <React.Fragment key={o.value}>
                {groupHead && <div className="combobox-group">{groupHead}</div>}
                <div role="option" aria-selected={o.value === value}
                  data-cursor={index === safeCursor ? '1' : '0'}
                  className={'dropdown-item' + (o.value === value ? ' active' : '') + (index === safeCursor ? ' is-cursor' : '')}
                  onMouseEnter={() => setCursor(index)}
                  onClick={() => pick(o)}>
                  {o.value === value && <Icon name="check" style={{ width: 15, height: 15, color: 'var(--blue)' }} />}{o.label}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { Combobox };
