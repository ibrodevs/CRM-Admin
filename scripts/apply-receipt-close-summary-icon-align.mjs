import { readFile, writeFile } from 'node:fs/promises';

const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);
let css = await readFile(cssUrl, 'utf8');

const marker = '/* Close-import summary icons: center SVGs inside their tiles. */';
const styles = `

${marker}
.receipt-close-section-head > span,
.receipt-close-file-icon {
  align-items: center !important;
  justify-content: center !important;
  line-height: 1 !important;
}

.receipt-close-section-head > span > svg,
.receipt-close-file-icon > svg {
  display: block;
  margin: 0 !important;
  flex: 0 0 auto;
  align-self: center;
}
`;

if (!css.includes(marker)) {
  css += styles;
  await writeFile(cssUrl, css, 'utf8');
  console.log('Иконки в окне закрытия импорта выровнены по центру.');
} else {
  console.log('Иконки окна закрытия импорта уже выровнены.');
}

for (const token of [
  '.receipt-close-section-head > span,',
  '.receipt-close-file-icon {',
  'align-items: center !important;',
  'align-self: center;',
]) {
  if (!css.includes(token)) throw new Error(`Не подтверждено выравнивание иконок: ${token}`);
}
