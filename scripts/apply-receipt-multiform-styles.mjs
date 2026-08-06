import { readFile, writeFile } from 'node:fs/promises';

const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);
let css = await readFile(cssUrl, 'utf8');

const marker = '/* Multi-form receipt preview: each supplier blank stays independent. */';
const styles = `

${marker}
.receipt-edit-preview-head {
  min-width: 0;
  gap: 12px;
}

.receipt-edit-preview-head > div:first-child {
  min-width: 0;
  flex: 1 1 auto;
}

.receipt-edit-preview-head > button {
  flex: 0 0 auto !important;
  white-space: nowrap;
  min-width: max-content;
}

.receipt-multiform-preview {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.receipt-blank-strip {
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface-2);
  overflow: hidden;
}

.receipt-blank-strip-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 12px;
  border-bottom: 1px solid var(--line);
  background: #fff;
}

.receipt-blank-strip-title > div {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
}

.receipt-blank-strip-title svg {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  color: var(--blue);
}

.receipt-blank-strip-title span {
  min-width: 0;
  display: grid;
  gap: 1px;
}

.receipt-blank-strip-title b {
  color: var(--ink);
  font-size: 13px;
}

.receipt-blank-strip-title small {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.35;
}

.receipt-blank-strip-title strong {
  flex: 0 0 auto;
  color: var(--ink);
  font-size: 13px;
  white-space: nowrap;
}

.receipt-blank-strip-scroll {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(260px, 1fr);
  gap: 8px;
  padding: 8px;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scroll-snap-type: inline proximity;
}

.receipt-blank-chip {
  min-width: 0;
  min-height: 88px;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  grid-template-rows: auto auto;
  column-gap: 8px;
  row-gap: 5px;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #fff;
  color: var(--body);
  cursor: pointer;
  text-align: left;
  font: inherit;
  scroll-snap-align: start;
  transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
}

.receipt-blank-chip:hover {
  border-color: var(--blue);
}

.receipt-blank-chip.is-active {
  border-color: var(--blue);
  background: var(--blue-soft);
  box-shadow: 0 0 0 2px rgba(37, 102, 255, .12);
}

.receipt-blank-chip-number {
  grid-row: 1 / -1;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.receipt-blank-chip.is-active .receipt-blank-chip-number {
  background: var(--blue);
  color: #fff;
}

.receipt-blank-chip-main,
.receipt-blank-chip-side {
  min-width: 0;
  display: grid;
  gap: 1px;
}

.receipt-blank-chip-main b,
.receipt-blank-chip-side b {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink);
  font-size: 12px;
}

.receipt-blank-chip-main small,
.receipt-blank-chip-side small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--muted);
  font-size: 10.5px;
}

.receipt-blank-chip-side {
  grid-column: 2;
  grid-template-columns: minmax(0, auto) minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.receipt-blank-chip-side small {
  text-align: right;
}

.receipt-active-blank {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.receipt-active-blank-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--green);
  font-size: 11.5px;
  font-weight: 600;
}

.receipt-active-blank-label svg {
  width: 15px;
  height: 15px;
  flex: 0 0 15px;
}

.receipt-hotel-preview {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
  box-shadow: var(--shadow-card);
}

.receipt-hotel-preview > header {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) minmax(140px, auto);
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--line);
}

.receipt-hotel-preview > header > span {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--green-bg-2);
  color: var(--green);
}

.receipt-hotel-preview > header svg {
  width: 20px;
  height: 20px;
}

.receipt-hotel-preview > header > div {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.receipt-hotel-preview > header > div:last-child {
  text-align: right;
}

.receipt-hotel-preview > header b {
  color: var(--ink);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.receipt-hotel-preview small {
  color: var(--muted);
  font-size: 10.5px;
  line-height: 1.35;
}

.receipt-hotel-preview-address {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 9px 14px;
  border-bottom: 1px solid var(--line);
  color: var(--body);
  font-size: 11px;
  line-height: 1.4;
}

.receipt-hotel-preview-address svg {
  width: 15px;
  height: 15px;
  flex: 0 0 15px;
  color: var(--green);
}

.receipt-hotel-preview-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  background: var(--line);
  border-bottom: 1px solid var(--line);
}

.receipt-hotel-preview-summary > div {
  min-width: 0;
  display: grid;
  gap: 2px;
  padding: 9px 10px;
  background: var(--surface-2);
}

.receipt-hotel-preview-summary b {
  color: var(--ink);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.receipt-hotel-preview > h4 {
  margin: 0;
  padding: 11px 14px 7px;
  color: var(--ink);
  font-size: 12px;
}

.receipt-hotel-preview-rooms {
  display: grid;
  gap: 8px;
  padding: 0 10px 10px;
}

.receipt-hotel-preview-room {
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #fff;
}

.receipt-hotel-preview-room-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.receipt-hotel-preview-room-head > span {
  width: 25px;
  height: 25px;
  flex: 0 0 25px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--green-bg-2);
  color: var(--green);
  font-size: 11px;
  font-weight: 800;
}

.receipt-hotel-preview-room-head > div {
  min-width: 0;
  display: grid;
  gap: 1px;
}

.receipt-hotel-preview-room-head b {
  color: var(--ink);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.receipt-hotel-preview-room-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px 12px;
}

.receipt-hotel-preview-room-grid > div {
  min-width: 0;
  display: grid;
  gap: 1px;
}

.receipt-hotel-preview-room-grid b {
  color: var(--body);
  font-size: 11px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

@media (max-width: 760px) {
  .receipt-blank-strip-title,
  .receipt-hotel-preview > header {
    align-items: flex-start;
  }

  .receipt-blank-strip-title {
    flex-direction: column;
  }

  .receipt-blank-strip-scroll {
    grid-auto-columns: minmax(235px, 86vw);
  }

  .receipt-hotel-preview > header {
    grid-template-columns: 38px minmax(0, 1fr);
  }

  .receipt-hotel-preview > header > div:last-child {
    grid-column: 2;
    text-align: left;
  }

  .receipt-hotel-preview-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .receipt-edit-preview-head {
    align-items: flex-start;
  }

  .receipt-edit-preview-head > button {
    padding-inline: 9px;
  }

  .receipt-hotel-preview-room-grid {
    grid-template-columns: 1fr;
  }
}
`;

if (!css.includes(marker)) {
  css += styles;
  await writeFile(cssUrl, css, 'utf8');
  console.log('Добавлены стили отдельных ЖД-бланков и отельных размещений.');
} else {
  console.log('Стили многоформатного предпросмотра уже подключены.');
}
