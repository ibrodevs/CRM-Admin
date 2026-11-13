import React, { useEffect, useId, useRef, useState } from 'react';
import { translate } from '../preferences/translations.js';
import { FloatingPanel } from './FloatingPanel.jsx';
import { Icon } from '../icons/index.jsx';
import { scrollPopoverOption } from './scroll-popover-option.js';

function childOptions(children, groupDisabled = false) {
  return React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement(child)) return [];
    if (child.type === 'optgroup') return childOptions(child.props.children, groupDisabled || child.props.disabled);
    return child.type === 'option' ? [{ value: child.props.value ?? child.props.children, label: child.props.children, disabled: groupDisabled || child.props.disabled }] : [];
  });
}

function Select({ options, error, placeholder, menuMinWidth = 0, menuClassName = '', className = '', children, onChange, onKeyDown, onMouseDown, onClick, onBlur, ...rest }) {
  const ref = useRef(null);
  const panelRef = useRef(null);
  const keyboardCursor = useRef(true);
  const id = useId();
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const typed = useRef({ text: '', at: 0 });
  useEffect(() => {
    if (!open || !keyboardCursor.current) return undefined;
    // Wait for the portal's viewport position and height before revealing the
    // selected year. Scrolling an unpositioned panel has no effect.
    const frame = requestAnimationFrame(() => {
      if (keyboardCursor.current) scrollPopoverOption(panelRef.current, document.getElementById(`${id}-${cursor}`));
    });
    return () => cancelAnimationFrame(frame);
  }, [open, cursor, id]);
  const rows = [...(placeholder ? [{ value: '', label: placeholder }] : []), ...(options ? options.map((option) => typeof option === 'object' ? option : { value: option, label: option }) : childOptions(children))];
  const enabled = rows.map((row, index) => !row.disabled ? index : -1).filter((index) => index >= 0);
  const show = () => { if (rest.disabled) return; keyboardCursor.current = true; setCursor(Math.max(0, rows.findIndex((row) => String(row.value) === ref.current?.value))); setOpen(true); };
  const pick = (index) => {
    const row = rows[index];
    if (!row || row.disabled || !ref.current) return;
    const node = ref.current;
    if (node.value !== String(row.value)) {
      node.value = String(row.value);
      node.dispatchEvent(new Event('change', { bubbles: true }));
    }
    setOpen(false); node.focus();
  };
  const keys = (event) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || rest.disabled || rest.multiple || rest.size > 1) return;
    if (event.key === 'Tab') { setOpen(false); return; }
    if (event.key === 'Escape') { if (open) { event.preventDefault(); event.stopPropagation(); setOpen(false); } return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      if (!open) { show(); return; }
      if (event.key === 'Enter' || event.key === ' ') { pick(cursor); return; }
      const step = event.key === 'ArrowUp' ? -1 : 1;
      const at = enabled.indexOf(cursor);
      const next = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1) : enabled[(at + step + enabled.length) % enabled.length];
      if (next !== undefined) { keyboardCursor.current = true; setCursor(next); }
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : '') + event.key.toLocaleLowerCase(), at: now };
      const next = rows.findIndex((row) => !row.disabled && String(translate(row.label)).toLocaleLowerCase().startsWith(typed.current.text));
      if (next >= 0) { if (open) { keyboardCursor.current = true; setCursor(next); } else pick(next); }
    }
  };
  return <>
    <select {...rest} ref={ref} className={'select' + (error ? ' err' : '') + (className ? ' ' + className : '')}
      aria-expanded={open} aria-controls={open ? id : undefined} aria-activedescendant={open ? `${id}-${cursor}` : undefined}
      onChange={onChange} onKeyDown={keys}
      onMouseDown={(event) => { onMouseDown?.(event); if (!event.defaultPrevented && !rest.disabled && !rest.multiple && !(rest.size > 1)) event.preventDefault(); }}
      onClick={(event) => { onClick?.(event); if (!event.defaultPrevented && !rest.multiple && !(rest.size > 1)) { if (open) setOpen(false); else show(); ref.current?.focus(); } }}
      onBlur={(event) => { onBlur?.(event); setOpen(false); }}>
      {rows.map((row, index) => <option key={index} value={row.value} disabled={row.disabled}>{translate(row.label)}</option>)}
    </select>
    {open && !rest.disabled && <FloatingPanel anchorRef={ref} panelRef={panelRef} onClose={() => setOpen(false)} minWidth={menuMinWidth} className={'dropdown select-dropdown' + (menuClassName ? ' ' + menuClassName : '')} role="listbox" id={id} aria-label={rest['aria-label'] || 'Варианты выбора'}>
      {rows.map((row, index) => <div key={index} id={`${id}-${index}`} role="option" aria-disabled={row.disabled || undefined} aria-selected={String(row.value) === ref.current?.value}
        className={'dropdown-item' + (String(row.value) === ref.current?.value ? ' is-selected' : '') + (cursor === index ? ' is-cursor' : '') + (row.disabled ? ' is-disabled' : '')}
        onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => { keyboardCursor.current = false; if (!row.disabled) setCursor(index); }} onClick={() => pick(index)}>
        {translate(row.label)}{String(row.value) === ref.current?.value && <Icon name="check" className="dropdown-item-mark" />}
      </div>)}
    </FloatingPanel>}
  </>;
}

export { Select };
