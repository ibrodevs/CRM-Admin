import { readFile, writeFile } from 'node:fs/promises';

const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);
const marker = '/* Receipt import operations: never overlap the delete action. */';
let css = await readFile(cssUrl, 'utf8');

if (!css.includes(marker)) {
  css += `\n\n${marker}\n@media (min-width: 901px) {\n  .rec-import-table td[data-label="Операции"] {\n    min-width: 0;\n  }\n\n  .rec-import-actions {\n    width: 100%;\n    min-width: 0;\n    max-width: 100%;\n    flex-wrap: wrap !important;\n    align-items: center;\n    overflow: hidden;\n  }\n\n  .rec-import-actions .btn {\n    flex: 0 1 auto;\n    max-width: 100%;\n  }\n\n  .rec-import-table td:last-child {\n    width: 48px !important;\n    min-width: 48px;\n    padding-left: 4px;\n    padding-right: 8px;\n    position: relative;\n    z-index: 2;\n  }\n\n  .rec-import-remove {\n    width: 34px;\n    min-width: 34px;\n    flex: 0 0 34px;\n  }\n}\n`;
  await writeFile(cssUrl, css, 'utf8');
  console.log('Операции импорта больше не перекрывают кнопку удаления.');
} else {
  console.log('Разметка операций импорта уже защищает кнопку удаления.');
}
