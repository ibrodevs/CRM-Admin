import { readFile, writeFile } from 'node:fs/promises';

const fileUrl = new URL('../js/page_company_finance.jsx', import.meta.url);
let source = await readFile(fileUrl, 'utf8');
let changed = false;

const replaceOnce = (from, to, label) => {
  if (source.includes(to)) return;
  if (!source.includes(from)) throw new Error(`Не найден фрагмент для изменения: ${label}`);
  source = source.replace(from, to);
  changed = true;
};

// Признак уже применённого патча — сами кнопки, а не дословный фрагмент JSX:
// иначе любая последующая правка этих строк снова запускала legacy-замену.
const alreadyReconfigured = source.includes('Создать новые условия')
  && source.includes('<CompanyFinanceCreateDrawer open={createOpen} co={co}');

if (!alreadyReconfigured) replaceOnce(
`  return (
    <div className="fade-in">
      <CompanyFinanceSection fin={fin} onChangeSettlement={setSettlement} />`,
`  return (
    <>
      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <Button variant="secondary" size="sm" icon="plus" onClick={() => setCreateOpen(true)}>Создать новые условия</Button>
        </div>
        <CompanyFinanceSection fin={fin} onChangeSettlement={setSettlement} />`,
  'кнопка повторного создания условий',
);

if (!alreadyReconfigured) replaceOnce(
`      <ClosingDocsPreview open={!!closing} agreement={closing} co={co} coName={co.name} onClose={() => setClosing(null)} />
    </div>
  );
}

Object.assign(window, {`,
`        <ClosingDocsPreview open={!!closing} agreement={closing} co={co} coName={co.name} onClose={() => setClosing(null)} />
      </div>
      <CompanyFinanceCreateDrawer open={createOpen} co={co} onClose={() => setCreateOpen(false)} onCreated={updateFin} />
    </>
  );
}

Object.assign(window, {`,
  'форма создания поверх существующих условий',
);

const required = [
  'Создать новые условия',
  '<CompanyFinanceCreateDrawer open={createOpen} co={co}',
];
for (const token of required) {
  if (!source.includes(token)) throw new Error(`Не подтверждено повторное создание финансовых условий: ${token}`);
}

if (changed) await writeFile(fileUrl, source, 'utf8');
console.log(changed
  ? 'Создание новых финансовых условий доступно и при наличии старых данных.'
  : 'Повторное создание финансовых условий уже доступно.');
