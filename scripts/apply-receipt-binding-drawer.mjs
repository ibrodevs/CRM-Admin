import { readFile, writeFile } from 'node:fs/promises';

async function patchTextFile(url, replacements, changedMessage, unchangedMessage) {
  let source = await readFile(url, 'utf8');
  let changed = false;

  for (const { label, before, after } of replacements) {
    if (source.includes(after)) continue;
    if (!source.includes(before)) {
      throw new Error(`Не удалось применить изменение «${label}»: исходный фрагмент не найден`);
    }
    source = source.replace(before, after);
    changed = true;
  }

  if (changed) {
    await writeFile(url, source, 'utf8');
    console.log(changedMessage);
  } else {
    console.log(unchangedMessage);
  }
}

await patchTextFile(
  new URL('../js/features/receipts/editor.jsx', import.meta.url),
  [
    {
      label: 'импорт бокового выбора',
      before: "import { UFDateField } from '../../forms_unified';",
      after: "import { UFDateField, UnifiedBindField } from '../../forms_unified';",
    },
  ],
  'Привязка квитанций перенесена в боковые окна выбора CRM.',
  'Привязка квитанций через боковые окна уже настроена.',
);

await patchTextFile(
  new URL('../js/forms_unified.jsx', import.meta.url),
  [
    {
      label: 'одна стрелка поля привязки',
      before: '<button type="button" className="select" onClick={() => setOpen(true)}',
      after: '<button type="button" className="select unified-bind-field" onClick={() => setOpen(true)}',
    },
  ],
  'У поля привязки оставлена одна стрелка.',
  'У поля привязки уже оставлена одна стрелка.',
);

await patchTextFile(
  new URL('../js/api/legacy-adapters.js', import.meta.url),
  [
    {
      label: 'признак серверного черновика квитанции',
      before: "    status: documentStatus[item.status] || item.status,\n    version: item.current_version || item.version || 0,",
      after: "    status: documentStatus[item.status] || item.status,\n    isReceiptDraft: receiptImport.stage === 'draft',\n    version: item.current_version || item.version || 0,",
    },
  ],
  'Серверные черновики квитанций отмечаются в адаптере.',
  'Признак серверного черновика квитанции уже настроен.',
);

await patchTextFile(
  new URL('../js/page_fulfillment.jsx', import.meta.url),
  [
    {
      label: 'статус черновика квитанции',
      before: "const REC_STATUS = {\n  'Распознано':       { tone: 'green', action: 'Проверить' },",
      after: "const REC_STATUS = {\n  'Черновик':         { tone: 'amber', action: 'Продолжить черновик' },\n  'Распознано':       { tone: 'green', action: 'Проверить' },",
    },
    {
      label: 'состояние боковой панели черновиков',
      before: "  const [expandedRegistry, setExpandedRegistry] = useState({});\n  const [brandEdit, setBrandEdit] = useState(null);",
      after: "  const [expandedRegistry, setExpandedRegistry] = useState({});\n  const [draftsOpen, setDraftsOpen] = useState(false);\n  const [draftQuery, setDraftQuery] = useState('');\n  const [brandEdit, setBrandEdit] = useState(null);",
    },
    {
      label: 'коллекция существующих черновиков',
      before: "  const receipts = all.filter((document) => {\n    const details = receiptDetailsLines(document.editorType, document.parsed).join(' ');\n    return !q || `${document.no} ${document.name} ${document.order} ${document.participant} ${details}`.toLowerCase().includes(q.toLowerCase());\n  });",
      after: "  const receipts = all.filter((document) => {\n    const details = receiptDetailsLines(document.editorType, document.parsed).join(' ');\n    return !q || `${document.no} ${document.name} ${document.order} ${document.participant} ${details}`.toLowerCase().includes(q.toLowerCase());\n  });\n  const receiptDrafts = all.filter((document) => document.isReceiptDraft);\n  const filteredReceiptDrafts = receiptDrafts.filter((document) => {\n    const details = receiptDetailsLines(document.editorType, document.parsed).join(' ');\n    const haystack = `${document.no} ${document.name} ${document.order} ${document.participant} ${document.parsed?.passenger || ''} ${details}`.toLowerCase();\n    return !draftQuery || haystack.includes(draftQuery.toLowerCase());\n  });",
    },
    {
      label: 'ответ backend после сохранения квитанции',
      before: "      await documentsApi.updateReceipt(fileId, {\n        draft: asDraft,",
      after: "      const savedDocument = await documentsApi.updateReceipt(fileId, {\n        draft: asDraft,",
    },
    {
      label: 'моментальное отображение сохранённого черновика',
      before: "      if (!groupEdit) updateLocalReceipt(fileId, { ...verifiedData, recognitionPending: asDraft });\n      editDirty.current = false;",
      after: "      if (asDraft) {\n        const savedDraft = toLegacyDocument(savedDocument, orders);\n        setImported((current) => [\n          savedDraft,\n          ...current.filter((row) => String(row.serverId || row.no) !== String(savedDraft.serverId || savedDraft.no)),\n        ]);\n      } else if (!groupEdit) {\n        updateLocalReceipt(fileId, { ...verifiedData, recognitionPending: false });\n      }\n      editDirty.current = false;",
    },
    {
      label: 'кнопка выбора черновиков существующих квитанций',
      before: "            <SearchBox value={q} onChange={setQ} placeholder=\"Документ, участник, маршрут…\" style={{ width: 280 }} />\n            {importDraft && <Button variant=\"secondary\" icon=\"edit\" onClick={() => {",
      after: "            <SearchBox value={q} onChange={setQ} placeholder=\"Документ, участник, маршрут…\" style={{ width: 280 }} />\n            <Button variant=\"secondary\" icon=\"edit\" disabled={!receiptDrafts.length}\n              title={receiptDrafts.length ? 'Открыть сохранённые черновики квитанций' : 'Нет сохранённых черновиков квитанций'}\n              onClick={() => {\n                if (!receiptDrafts.length) return;\n                if (receiptDrafts.length === 1) {\n                  editDirty.current = false;\n                  setEdit(receiptDrafts[0]);\n                  return;\n                }\n                setDraftQuery('');\n                setDraftsOpen(true);\n              }}>Черновики квитанций ({receiptDrafts.length})</Button>\n            {importDraft && <Button variant=\"secondary\" icon=\"edit\" onClick={() => {",
    },
    {
      label: 'отдельное распознавание статуса черновика',
      before: "                    const recognition = d.parsed.manualCompletion\n                      ? 'Заполнено вручную'\n                      : receiptStatus(d.parsed, new Set(), d.editorType, null);",
      after: "                    const recognition = d.isReceiptDraft\n                      ? 'Черновик'\n                      : d.parsed.manualCompletion\n                        ? 'Заполнено вручную'\n                        : receiptStatus(d.parsed, new Set(), d.editorType, null);",
    },
    {
      label: 'кнопка продолжения конкретного черновика',
      before: "                          <Button size=\"sm\" variant=\"ghost\" onClick={() => { editDirty.current = false; setEdit(d); }}>{recognition === 'Требует проверки' ? 'Проверить' : 'Изменить'}</Button>",
      after: "                          <Button size=\"sm\" variant=\"ghost\" onClick={() => { editDirty.current = false; setEdit(d); }}>{d.isReceiptDraft ? 'Продолжить черновик' : recognition === 'Требует проверки' ? 'Проверить' : 'Изменить'}</Button>",
    },
    {
      label: 'боковая панель выбора черновика',
      before: "      <ReceiptEditDrawer open={!!edit} file={edit ? { ...edit, type: edit.editorType } : null} onClose={closeReceiptEditor}",
      after: "      <Drawer open={draftsOpen} onClose={() => setDraftsOpen(false)} title={`Черновики квитанций (${receiptDrafts.length})`}>\n        <SearchBox value={draftQuery} onChange={setDraftQuery} placeholder=\"Пассажир, документ, заказ или маршрут…\" style={{ width: '100%', marginBottom: 16 }} />\n        {filteredReceiptDrafts.length ? (\n          <div style={{ display: 'grid', gap: 10 }}>\n            {filteredReceiptDrafts.map((draft) => {\n              const draftType = recType(draft.editorType);\n              const details = receiptDetailsLines(draft.editorType, draft.parsed);\n              return (\n                <div key={draft.serverId || draft.no} className=\"card card-pad\">\n                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>\n                    <span className=\"rec-import-icon\" style={{ background: draftType.color, flexShrink: 0 }}><Icon name={draftType.icon} /></span>\n                    <div style={{ flex: 1, minWidth: 0 }}>\n                      <b><ReceiptParticipantSummary draft={draft.parsed} noun={draft.editorType === 'Гостиница' ? 'гостей' : 'пассажиров'} /></b>\n                      <div className=\"rec-import-meta\" style={{ marginTop: 4 }}>{draft.editorType} · {draft.no} · {draft.name}</div>\n                      <div className=\"rec-import-details\" style={{ marginTop: 8 }}>\n                        {details.slice(0, 3).map((line, index) => <span key={index}>{line}</span>)}\n                      </div>\n                      <div className=\"rec-import-meta\" style={{ marginTop: 8 }}>Заказ: {draft.order || '—'} · сохранён как черновик</div>\n                    </div>\n                    <Button size=\"sm\" onClick={() => {\n                      setDraftsOpen(false);\n                      editDirty.current = false;\n                      setEdit(draft);\n                    }}>Продолжить</Button>\n                  </div>\n                </div>\n              );\n            })}\n          </div>\n        ) : (\n          <EmptyState icon=\"edit\" title=\"Черновики не найдены\" sub=\"Измените поисковый запрос или очистите его.\" />\n        )}\n      </Drawer>\n\n      <ReceiptEditDrawer open={!!edit} file={edit ? { ...edit, type: edit.editorType } : null} onClose={closeReceiptEditor}",
    },
  ],
  'Выбор черновиков существующих квитанций добавлен в боковую панель.',
  'Выбор черновиков существующих квитанций уже настроен.',
);
