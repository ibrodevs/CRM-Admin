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

const simpleAction = `                                      }}>{(r.f.subReceipts || []).length > 1 ? 'Проверить бланки по очереди' : st.action}</button>`;
const hardenedAction = `                                      }}>{(r.f.subReceipts || []).length > 1 ? 'Проверить бланки по очереди' : (displayStatus === 'Требует проверки' ? 'Проверить и заполнить' : st.action)}</button>`;
if (!source.includes(hardenedAction)) {
  if (!source.includes(simpleAction)) throw new Error('Не найден action последовательной проверки.');
  source = source.replace(simpleAction, hardenedAction);
  changed = true;
}

if (changed) await writeFile(pageUrl, source, 'utf8');
console.log(changed ? 'Совместимость последовательного редактора сохранена.' : 'Совместимость последовательного редактора уже настроена.');
