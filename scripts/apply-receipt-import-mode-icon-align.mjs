import { readFile, writeFile } from 'node:fs/promises';

const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);
let css = await readFile(cssUrl, 'utf8');
let changed = false;

const oldButton = `.receipt-import-mode-options button {\n  display: grid;\n  grid-template-columns: 28px minmax(0, 1fr);\n  gap: 2px 9px;\n  align-items: baseline;`;
const newButton = `.receipt-import-mode-options button {\n  display: grid;\n  grid-template-columns: 28px minmax(0, 1fr);\n  gap: 2px 9px;\n  align-items: center;`;

if (css.includes(oldButton)) {
  css = css.replace(oldButton, newButton);
  changed = true;
}

const marker = '/* Receipt import mode: icon tiles align to the full two-line text block. */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n.receipt-import-mode-options button {\n  align-items: center !important;\n}\n\n.receipt-import-mode-options button > span {\n  align-self: center;\n  display: grid;\n  place-items: center;\n  line-height: 0;\n}\n\n.receipt-import-mode-options button > span svg {\n  display: block;\n}\n\n.receipt-import-mode-options button > b,\n.receipt-import-mode-options button > small {\n  align-self: center;\n}\n`;
  changed = true;
}

for (const token of [
  '.receipt-import-mode-options button {\n  align-items: center !important;',
  '.receipt-import-mode-options button > span {\n  align-self: center;',
  'place-items: center;',
  '.receipt-import-mode-options button > span svg {\n  display: block;',
]) {
  if (!css.includes(token)) throw new Error(`Не подтверждено выравнивание режима импорта: ${token}`);
}

if (changed) {
  await writeFile(cssUrl, css, 'utf8');
  console.log('Иконки режимов обработки бланков выровнены по центру карточек.');
} else {
  console.log('Иконки режимов обработки бланков уже выровнены.');
}
