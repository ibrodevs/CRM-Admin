import { readFile, writeFile } from 'node:fs/promises';

const editorUrl = new URL('../js/features/receipts/editor.jsx', import.meta.url);
let source = await readFile(editorUrl, 'utf8');
let changed = false;

function replaceOnce(label, before, after) {
  if (source.includes(after)) return;
  if (!source.includes(before)) {
    throw new Error(`Не удалось применить изменение «${label}»: исходный фрагмент не найден`);
  }
  source = source.replace(before, after);
  changed = true;
}

replaceOnce(
  'импорт бокового выбора',
  "import { UFDateField } from '../../forms_unified';",
  "import { UFDateField, UnifiedBindField } from '../../forms_unified';",
);

if (changed) {
  await writeFile(editorUrl, source, 'utf8');
  console.log('Привязка квитанций перенесена в боковые окна выбора CRM.');
} else {
  console.log('Привязка квитанций через боковые окна уже настроена.');
}

const bindFieldUrl = new URL('../js/forms_unified.jsx', import.meta.url);
let bindSource = await readFile(bindFieldUrl, 'utf8');
const oldBindClass = '<button type="button" className="select" onClick={() => setOpen(true)}';
const newBindClass = '<button type="button" className="select unified-bind-field" onClick={() => setOpen(true)}';
if (!bindSource.includes(newBindClass)) {
  if (!bindSource.includes(oldBindClass)) {
    throw new Error('Не удалось убрать дублирующую стрелку: поле привязки не найдено');
  }
  bindSource = bindSource.replace(oldBindClass, newBindClass);
  await writeFile(bindFieldUrl, bindSource, 'utf8');
  console.log('У поля привязки оставлена одна стрелка.');
}
