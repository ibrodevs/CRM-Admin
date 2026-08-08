import { readFile, writeFile } from 'node:fs/promises';

const editorUrl = new URL('../js/features/receipts/editor.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);

let source = await readFile(editorUrl, 'utf8');
let css = await readFile(cssUrl, 'utf8');
let sourceChanged = false;
let cssChanged = false;

const labelMarker = `  const buttonLabel = blankCount > 1
    ? receiptParticipantSurname(names[0]) + ' +' + remaining + ' ' + receiptBlankWord(remaining)
    : names[0] + ' +' + remaining + ' ' + noun;`;
const labelPatch = `  const participantLabel = blankCount > 1 ? receiptParticipantSurname(names[0]) : names[0];
  const participantCountLabel = '+' + remaining + ' ' + (blankCount > 1 ? receiptBlankWord(remaining) : noun);`;

if (!source.includes('const participantCountLabel =')) {
  if (!source.includes(labelMarker)) throw new Error('Не найден текст количественного показателя участников.');
  source = source.replace(labelMarker, labelPatch);
  sourceChanged = true;
}

const triggerMarker = `      <span>{buttonLabel}</span>
      <Icon name={open ? 'chevUp' : 'chevDown'} />`;
const triggerPatch = `      <span className="receipt-participants-name">{participantLabel}</span>
      <span className="receipt-participants-count">{participantCountLabel}</span>
      <Icon name={open ? 'chevUp' : 'chevDown'} />`;

if (!source.includes('className="receipt-participants-count"')) {
  if (!source.includes(triggerMarker)) throw new Error('Не найден триггер списка участников.');
  source = source.replace(triggerMarker, triggerPatch);
  sourceChanged = true;
}

const cssMarker = '/* Receipt participant quantity: highlight the +N counter separately from the surname. */';
if (!css.includes(cssMarker)) {
  css += `

${cssMarker}
.receipt-participants-trigger > .receipt-participants-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.receipt-participants-trigger > .receipt-participants-count {
  min-width: max-content;
  flex: 0 0 auto;
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
  color: var(--blue);
  font-weight: 800;
}

.receipt-participants-trigger:hover > .receipt-participants-count {
  color: var(--blue-hover);
}
`;
  cssChanged = true;
}

for (const token of [
  'const participantCountLabel =',
  'className="receipt-participants-name"',
  'className="receipt-participants-count"',
]) {
  if (!source.includes(token)) throw new Error(`Не подтверждено выделение количества бланков: ${token}`);
}
if (!css.includes(cssMarker) || !css.includes('color: var(--blue);')) {
  throw new Error('Не подтверждён отдельный цвет количественного показателя.');
}

if (sourceChanged) await writeFile(editorUrl, source, 'utf8');
if (cssChanged) await writeFile(cssUrl, css, 'utf8');

console.log(sourceChanged || cssChanged
  ? 'Количественный показатель бланков выделен отдельным синим цветом.'
  : 'Цвет количественного показателя бланков уже настроен.');
