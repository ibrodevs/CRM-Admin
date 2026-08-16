import { readFile, writeFile } from 'node:fs/promises';

const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);
let css = await readFile(cssUrl, 'utf8');
let changed = false;

const replacements = [
  {
    label: 'заголовок списка бланков',
    before: `.receipt-close-section-head {\n  display: flex;\n  align-items: baseline;`,
    after: `.receipt-close-section-head {\n  display: flex;\n  align-items: center;`,
  },
  {
    label: 'строка бланка',
    before: `.receipt-close-file {\n  display: grid;\n  grid-template-columns: 24px 38px minmax(0, 1fr) minmax(150px, auto);\n  align-items: baseline;`,
    after: `.receipt-close-file {\n  display: grid;\n  grid-template-columns: 24px 38px minmax(0, 1fr) minmax(150px, auto);\n  align-items: center;`,
  },
];

for (const { label, before, after } of replacements) {
  if (css.includes(after)) continue;
  if (!css.includes(before)) throw new Error(`Не найден блок для вертикального выравнивания: ${label}`);
  css = css.replace(before, after);
  changed = true;
}

const marker = '/* Close-import rows: align icon tiles to the complete text block, not its first baseline. */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n.receipt-close-section-head,\n.receipt-close-file {\n  align-items: center !important;\n}\n\n.receipt-close-section-head > span,\n.receipt-close-file-icon,\n.receipt-close-file-index,\n.receipt-close-file-main,\n.receipt-close-file-state {\n  align-self: center;\n}\n`;
  changed = true;
}

if (changed) {
  await writeFile(cssUrl, css, 'utf8');
  console.log('Иконки и их блоки в окне закрытия импорта выровнены по центру полной строки.');
} else {
  console.log('Вертикальное выравнивание строк закрытия импорта уже настроено.');
}

for (const token of [
  '.receipt-close-section-head,\n.receipt-close-file {\n  align-items: center !important;',
  '.receipt-close-file-icon,\n.receipt-close-file-index,',
  'align-self: center;',
]) {
  if (!css.includes(token)) throw new Error(`Не подтверждено выравнивание строки: ${token}`);
}
