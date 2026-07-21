import fs from 'node:fs';

function replaceOnce(file, before, after, label) {
  let source = fs.readFileSync(file, 'utf8');
  if (source.includes(after)) return;
  if (!source.includes(before)) {
    console.warn(`Legacy backend patch skipped: ${label} already changed or not found in ${file}`);
    return;
  }
  source = source.replace(before, after);
  fs.writeFileSync(file, source);
}

replaceOnce(
  'js/order_extras.jsx',
  `      onSave={(person, client) => { onAdd && onAdd(client); toast('Пассажир добавлен', 'ok'); onClose(); }} />`,
  `      onSave={async (person, client) => {
        try {
          const runtime = typeof window !== 'undefined' ? window.__orderCardRuntime : null;
          const next = runtime?.addParticipant ? await runtime.addParticipant({ ...client, ...person }) : null;
          onAdd && onAdd(next || client, { backend: Boolean(next) });
          toast(next ? 'Пассажир сохранён в backend' : 'Пассажир добавлен', 'ok');
          onClose();
        } catch (error) {
          toast(error.message || 'Не удалось добавить пассажира', 'err');
        }
      }} />`,
  'PassengerDrawer backend save',
);

replaceOnce(
  'js/page_order_card.jsx',
  `        onAdd={(client) => setParticipants((l) => [...l, { name: client.name, role: client.role || 'Взрослый', doc: client.doc, dob: client.dob, phone: client.phone, docStatus: 'ok', documents: client.documents || [] }])} />`,
  `        onAdd={(value, meta) => {
          if (meta?.backend && Array.isArray(value)) setParticipants(value);
          else setParticipants((l) => [...l, { name: value.name, role: value.role || 'Взрослый', doc: value.doc, dob: value.dob, phone: value.phone, docStatus: 'ok', documents: value.documents || [] }]);
        }} />`,
  'OrderCard passenger add callback',
);

replaceOnce(
  'js/page_order_card.jsx',
  `        onSave={(person, client) => { setParticipants((l) => l.map((x) => x.name === (editPax && editPax.name) ? { ...x, name: client.name, role: person.role, doc: client.doc, dob: client.dob, phone: client.phone } : x)); setEditPax(null); toast('Данные участника обновлены', 'ok'); }} />`,
  `        onSave={async (person, client) => {
          try {
            const runtime = typeof window !== 'undefined' ? window.__orderCardRuntime : null;
            if (!runtime?.updateParticipant) throw new Error('Backend карточки заказа недоступен');
            const next = await runtime.updateParticipant(editPax, { ...client, ...person });
            setParticipants(next);
            setEditPax(null);
            toast('Данные участника сохранены в backend', 'ok');
          } catch (error) {
            toast(error.message || 'Не удалось обновить участника', 'err');
          }
        }} />`,
  'OrderCard passenger edit callback',
);

replaceOnce(
  'js/page_order_card.jsx',
  `        onSave={(doc) => { setParticipants((l) => l.map((x) => x.name === (docPax && docPax.name) ? { ...x, documents: [...(x.documents || []), doc], docStatus: 'ok' } : x)); setDocPax(null); toast('Документ добавлен участнику', 'ok'); }} />`,
  `        onSave={async (doc) => {
          try {
            const runtime = typeof window !== 'undefined' ? window.__orderCardRuntime : null;
            if (!runtime?.appendDocument) throw new Error('Backend карточки заказа недоступен');
            const next = await runtime.appendDocument(docPax, doc);
            setParticipants(next);
            setDocPax(null);
            toast('Документ участника сохранён в backend', 'ok');
          } catch (error) {
            toast(error.message || 'Не удалось сохранить документ', 'err');
          }
        }} />`,
  'OrderCard passenger document callback',
);

console.log('Legacy order card backend handlers are connected.');
