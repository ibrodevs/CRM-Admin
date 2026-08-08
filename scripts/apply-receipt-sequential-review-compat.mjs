import { readFile, writeFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
let source = await readFile(pageUrl, 'utf8');
let changed = false;

const oldNote = 'Текущий бланк готов к сохранению. После сохранения система откроет следующий автоматически.';
const newNote = 'Изменения применяются только к выбранному билету. Текущий бланк готов к сохранению. После сохранения система откроет следующий автоматически.';
if (!source.includes(newNote)) {
  if (!source.includes(oldNote)) throw new Error('Не найдена подсказка текущего бланка.');
  source = source.replace(oldNote, newNote);
  changed = true;
}

const previewOld = 'Предпросмотр показывает только выбранный бланк и обновляется сразу.';
const previewNew = 'Предпросмотр обновляется сразу и показывает только выбранный бланк.';
if (source.includes(previewOld) && !source.includes(previewNew)) {
  source = source.replace(previewOld, previewNew);
  changed = true;
}

const simpleAction = `                                      }}>{(r.f.subReceipts || []).length > 1 ? 'Проверить бланки по очереди' : st.action}</button>`;
const hardenedAction = `                                      }}>{(r.f.subReceipts || []).length > 1 ? 'Проверить бланки по очереди' : (displayStatus === 'Требует проверки' ? 'Проверить и заполнить' : st.action)}</button>`;
if (!source.includes(hardenedAction)) {
  if (!source.includes(simpleAction)) throw new Error('Не найден action последовательной проверки.');
  source = source.replace(simpleAction, hardenedAction);
  changed = true;
}

const updatePattern = /(const updateSubReceipt = \(fileId, subIndex, parsed\) => \{[\s\S]*?setFiles\(\(cur\) => cur\.map\(\(file\) => \{[\s\S]*?\}\)\);)\n\s*setReviewed\(\(cur\) => \(\{ \.\.\.cur, \[fileId\]: true \}\)\);(\n\s*\};\n\s*const markReviewed)/;
if (updatePattern.test(source)) {
  source = source.replace(updatePattern, '$1$2');
  changed = true;
}

const updateBlock = source.match(/const updateSubReceipt = \(fileId, subIndex, parsed\) => \{[\s\S]*?\n  \};\n  const markReviewed/);
if (!updateBlock) throw new Error('Не найден updateSubReceipt после последовательного patch.');
if (/setReviewed\(\(cur\)/.test(updateBlock[0])) throw new Error('Отдельный бланк всё ещё преждевременно помечает всю группу проверенной.');

if (changed) await writeFile(pageUrl, source, 'utf8');
console.log(changed ? 'Совместимость последовательного редактора сохранена.' : 'Совместимость последовательного редактора уже настроена.');
