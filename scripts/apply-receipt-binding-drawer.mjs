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

replaceOnce(
  'привязка к заказу через боковое окно',
  `        <Field label="Внутренний номер заказа CRM"><Input value={p.crmOrderNo || ''} onChange={(e) => set('crmOrderNo', e.target.value, 'Привязка к заказу CRM')} placeholder="PSC-2026-000125" /></Field>`,
  `        <Field label="Привязка к заказу CRM">
          <UnifiedBindField
            value={p.crmOrderNo
              ? { mode: 'order', order: { no: p.crmOrderNo }, label: \`Заказ № \${p.crmOrderNo}\` }
              : { mode: 'order', label: 'Выберите заказ' }}
            onChange={(target) => set('crmOrderNo', target?.order?.no || '', 'Привязка к заказу CRM')}
            modes={['order']}
            title="Привязка к заказу"
            sub="Выберите заказ, к которому относится документ"
            style={{ width: '100%' }}
          />
        </Field>`,
);

replaceOnce(
  'привязка пассажира через боковое окно',
  `            <Field label="Привязка к пассажиру CRM"><Input value={row.crmPassenger} onChange={(e) => setArray('passengers', index, 'crmPassenger', e.target.value, \`Привязка участника \${index + 1}\`)} placeholder="Выберите или укажите ФИО" /></Field>`,
  `            <Field label="Привязка к пассажиру CRM">
              <UnifiedBindField
                value={row.crmPassenger
                  ? { mode: 'person', client: row.crmPassenger, label: row.crmPassenger }
                  : { mode: 'person', label: 'Выберите пассажира CRM' }}
                onChange={(target) => setArray('passengers', index, 'crmPassenger', target?.client || '', \`Привязка участника \${index + 1}\`)}
                modes={['person']}
                title="Привязка к пассажиру"
                sub={\`Выберите пассажира CRM для \${row.name || \`участника \${index + 1}\`}\`}
                style={{ width: '100%' }}
              />
            </Field>`,
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
