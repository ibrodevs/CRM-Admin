import { readFile, writeFile } from 'node:fs/promises';

const editorUrl = new URL('../js/features/receipts/editor.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);
let source = await readFile(editorUrl, 'utf8');
let css = await readFile(cssUrl, 'utf8');
let sourceChanged = false;
let cssChanged = false;

const reactImport = "import React, { useEffect, useMemo, useState } from 'react';";
const reactImportNext = "import React, { useEffect, useMemo, useState, useRef } from 'react';";
if (!source.includes(reactImportNext)) {
  if (!source.includes(reactImport)) throw new Error('Не найден React import редактора квитанций.');
  source = source.replace(reactImport, reactImportNext);
  sourceChanged = true;
}

const portalImport = "import ReactDOM from 'react-dom';";
if (!source.includes(portalImport)) {
  source = source.replace(reactImportNext, `${reactImportNext}\n${portalImport}`);
  sourceChanged = true;
}

const oldComponent = `export function ReceiptParticipantSummary({ draft, noun = 'пассажиров' }) {
  const [open, setOpen] = useState(false);
  const names = receiptParticipantNames(draft);
  const blankCount = receiptBlankCount(draft);
  if (!names.length) return <span>Участники не распознаны</span>;
  if (blankCount > 1) {
    const remaining = blankCount - 1;
    return <span className="receipt-participants">
      <button type="button" onClick={() => setOpen((value) => !value)}>
        {receiptParticipantSurname(names[0])} +{remaining} {receiptBlankWord(remaining)} <Icon name={open ? 'chevUp' : 'chevDown'} />
      </button>
      {open && <span className="receipt-participant-list">{names.map((name) => <span key={name}>{name}</span>)}</span>}
    </span>;
  }
  if (names.length === 1) return <span>{names[0]}</span>;
  return <span className="receipt-participants">
    <button type="button" onClick={() => setOpen((value) => !value)}>{names[0]} +{names.length - 1} {noun} <Icon name={open ? 'chevUp' : 'chevDown'} /></button>
    {open && <span className="receipt-participant-list">{names.map((name) => <span key={name}>{name}</span>)}</span>}
  </span>;
}`;

const newComponent = `export function ReceiptParticipantSummary({ draft, noun = 'пассажиров' }) {
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState({});
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);
  const names = receiptParticipantNames(draft);
  const blankCount = receiptBlankCount(draft);

  const updatePopoverPosition = () => {
    const button = buttonRef.current;
    if (!button || typeof window === 'undefined') return;
    const rect = button.getBoundingClientRect();
    const margin = 12;
    const gap = 6;
    const width = Math.min(320, Math.max(240, window.innerWidth - margin * 2));
    const left = Math.min(Math.max(margin, rect.left), Math.max(margin, window.innerWidth - width - margin));
    const estimatedHeight = Math.min(310, 58 + names.length * 38);
    const hasRoomBelow = window.innerHeight - rect.bottom >= Math.min(estimatedHeight, 220);
    if (hasRoomBelow || rect.top < estimatedHeight) {
      setPopoverStyle({ left, top: rect.bottom + gap, width });
    } else {
      setPopoverStyle({ left, bottom: window.innerHeight - rect.top + gap, width });
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    updatePopoverPosition();
    const closeOutside = (event) => {
      if (buttonRef.current?.contains(event.target) || popoverRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const closeEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const reposition = () => updatePopoverPosition();
    document.addEventListener('mousedown', closeOutside);
    window.addEventListener('keydown', closeEscape);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      window.removeEventListener('keydown', closeEscape);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, names.length]);

  if (!names.length) return <span>Участники не распознаны</span>;
  if (blankCount <= 1 && names.length === 1) return <span>{names[0]}</span>;

  const remaining = blankCount > 1 ? blankCount - 1 : names.length - 1;
  const buttonLabel = blankCount > 1
    ? receiptParticipantSurname(names[0]) + ' +' + remaining + ' ' + receiptBlankWord(remaining)
    : names[0] + ' +' + remaining + ' ' + noun;
  const summary = blankCount > 1
    ? blankCount + ' ' + receiptBlankWord(blankCount)
    : names.length + ' ' + noun;

  return <span className="receipt-participants">
    <button ref={buttonRef} type="button" className="receipt-participants-trigger"
      aria-haspopup="dialog" aria-expanded={open}
      onClick={() => {
        if (!open) requestAnimationFrame(updatePopoverPosition);
        setOpen((value) => !value);
      }}>
      <span>{buttonLabel}</span>
      <Icon name={open ? 'chevUp' : 'chevDown'} />
    </button>
    {open && typeof document !== 'undefined' && ReactDOM.createPortal(
      <div ref={popoverRef} className="receipt-participant-popover" role="dialog"
        aria-label="Участники документа" style={popoverStyle}>
        <div className="receipt-participant-popover-head">
          <span><b>Участники документа</b><small>{summary}</small></span>
          <button type="button" aria-label="Закрыть список участников" onClick={() => setOpen(false)}><Icon name="x" /></button>
        </div>
        <div className="receipt-participant-popover-list">
          {names.map((name, index) => (
            <div className="receipt-participant-popover-item" key={name + '-' + index}>
              <span>{index + 1}</span><b>{name}</b>
            </div>
          ))}
        </div>
      </div>,
      document.body,
    )}
  </span>;
}`;

if (!source.includes('className="receipt-participant-popover"')) {
  if (!source.includes(oldComponent)) throw new Error('Не найден текущий ReceiptParticipantSummary.');
  source = source.replace(oldComponent, newComponent);
  sourceChanged = true;
}

const marker = '/* Receipt participants: portal popover prevents table clipping. */';
if (!css.includes(marker)) {
  css += `

${marker}
.receipt-participants {
  min-width: 0;
  max-width: 100%;
  display: inline-flex;
  align-items: center;
}

.receipt-participants-trigger {
  min-width: 0;
  max-width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font: inherit;
  font-weight: 700;
  line-height: 1.25;
  cursor: pointer;
  text-align: left;
}

.receipt-participants-trigger > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.receipt-participants-trigger > svg {
  width: 13px;
  height: 13px;
  flex: 0 0 13px;
  color: var(--muted);
}

.receipt-participants-trigger:hover {
  color: var(--blue);
}

.receipt-participant-popover {
  position: fixed;
  z-index: 100000;
  max-width: calc(100vw - 24px);
  max-height: min(360px, calc(100vh - 24px));
  overflow: hidden;
  border: 1px solid #dbe3ef;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 14px 38px rgba(15, 23, 42, .16), 0 3px 10px rgba(15, 23, 42, .08);
  color: var(--ink);
}

.receipt-participant-popover-head {
  min-height: 50px;
  padding: 9px 10px 9px 12px;
  border-bottom: 1px solid #edf1f6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: #fbfcfe;
}

.receipt-participant-popover-head > span {
  min-width: 0;
  display: grid;
  gap: 1px;
}

.receipt-participant-popover-head b {
  font-size: 12.5px;
  line-height: 1.25;
}

.receipt-participant-popover-head small {
  color: var(--muted);
  font-size: 10.5px;
  line-height: 1.25;
}

.receipt-participant-popover-head > button {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.receipt-participant-popover-head > button:hover {
  background: #f0f3f8;
  color: var(--ink);
}

.receipt-participant-popover-head > button svg {
  width: 15px;
  height: 15px;
}

.receipt-participant-popover-list {
  max-height: min(280px, calc(100vh - 96px));
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 6px;
}

.receipt-participant-popover-item {
  min-width: 0;
  min-height: 36px;
  padding: 7px 8px;
  border-radius: 8px;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.receipt-participant-popover-item:hover {
  background: #f6f8fb;
}

.receipt-participant-popover-item > span {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: #eef3ff;
  color: #3568d4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10.5px;
  font-weight: 800;
}

.receipt-participant-popover-item b {
  min-width: 0;
  color: #202a3b;
  font-size: 11.5px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

@media (max-width: 520px) {
  .receipt-participant-popover {
    max-width: calc(100vw - 16px);
  }
}
`;
  cssChanged = true;
}

for (const token of [
  "import ReactDOM from 'react-dom';",
  'const buttonRef = useRef(null);',
  'ReactDOM.createPortal(',
  'className="receipt-participant-popover"',
  "window.addEventListener('scroll', reposition, true);",
]) {
  if (!source.includes(token)) throw new Error(`Не подтверждён popover участников: ${token}`);
}

if (!css.includes(marker) || !css.includes('position: fixed;') || !css.includes('z-index: 100000;')) {
  throw new Error('Не подтверждены стили popover участников.');
}

if (sourceChanged) await writeFile(editorUrl, source, 'utf8');
if (cssChanged) await writeFile(cssUrl, css, 'utf8');
console.log(sourceChanged || cssChanged
  ? 'Список участников вынесен в portal popover и больше не обрезается таблицей.'
  : 'Popover участников уже настроен.');
