import { readFile, writeFile } from 'node:fs/promises';

const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);
const marker = '/* Receipt import operations: never overlap the delete action. */';
const longLabelMarker = '/* Receipt import operations: long actions wrap without clipping. */';
let css = await readFile(cssUrl, 'utf8');
let changed = false;

if (!css.includes(marker)) {
  css += `\n\n${marker}\n@media (min-width: 901px) {\n  .rec-import-table td[data-label="Операции"] {\n    min-width: 0;\n  }\n\n  .rec-import-actions {\n    width: 100%;\n    min-width: 0;\n    max-width: 100%;\n    flex-wrap: wrap !important;\n    align-items: center;\n    overflow: hidden;\n  }\n\n  .rec-import-actions .btn {\n    flex: 0 1 auto;\n    max-width: 100%;\n  }\n\n  .rec-import-table tr.rec-import-row > td:last-child,\n  .rec-import-table tr.rec-import-subrow > td:last-child {\n    width: 48px !important;\n    min-width: 48px;\n    padding-left: 4px;\n    padding-right: 8px;\n    position: relative;\n    z-index: 2;\n  }\n\n  .rec-import-remove {\n    width: 34px;\n    min-width: 34px;\n    flex: 0 0 34px;\n  }\n}\n`;
  changed = true;
}

// Long workflow actions such as «Проверить бланки по очереди» can take two
// lines in the operations column. The previous overlap guard hid overflow on
// the whole action wrapper while generic button styles kept a one-line height,
// so the second line was physically present but visually cut off. Keep the
// delete column reserved, but let action buttons grow naturally and wrap text.
if (!css.includes(longLabelMarker)) {
  css += `\n\n${longLabelMarker}\n.rec-import-actions {\n  overflow: visible !important;\n}\n\n.rec-import-actions .btn {\n  min-width: 0;\n  max-width: 100%;\n  height: auto !important;\n  min-height: 32px;\n  white-space: normal !important;\n  overflow: visible !important;\n  text-overflow: clip !important;\n  overflow-wrap: anywhere;\n  line-height: 1.25;\n}\n`;
  changed = true;
}

for (const token of [
  marker,
  longLabelMarker,
  'flex-wrap: wrap !important;',
  'overflow: visible !important;',
  'white-space: normal !important;',
  'height: auto !important;',
  'text-overflow: clip !important;',
]) {
  if (!css.includes(token)) throw new Error(`Не подтверждён layout операций импорта: ${token}`);
}

if (changed) {
  await writeFile(cssUrl, css, 'utf8');
  console.log('Операции импорта не перекрывают удаление, а длинные подписи показываются полностью.');
} else {
  console.log('Разметка операций импорта уже показывает длинные подписи полностью.');
}
