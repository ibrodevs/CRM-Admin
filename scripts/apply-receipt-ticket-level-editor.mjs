import { readFile, writeFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const editorUrl = new URL('../js/features/receipts/editor.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);

let page = await readFile(pageUrl, 'utf8');
let editor = await readFile(editorUrl, 'utf8');
let css = await readFile(cssUrl, 'utf8');
let changed = false;

function replaceRequired(source, from, to, label) {
  if (source.includes(to)) return source;
  if (label === 'подпись номера ЖД-билета в предпросмотре'
    && source.includes("type === 'ЖД' ? (previewDraft.ticketNo")) return source;
  if (typeof from === 'string') {
    if (!source.includes(from)) throw new Error(`Не найден фрагмент: ${label}`);
    changed = true;
    return source.replace(from, to);
  }
  if (!from.test(source)) throw new Error(`Не найден фрагмент: ${label}`);
  changed = true;
  return source.replace(from, to);
}

// A grouped railway PDF is only a container. The aggregate must always be
// recalculated from its independently editable child tickets.
if (!page.includes("const agencyServiceFee = sum('agencyServiceFee');")) {
  const aggregatePattern = /function aggregateReceiptSubrows\(parent, subReceipts\) \{[\s\S]*?\n\}\nconst receiptImportMoney/;
  const aggregateNext = `function aggregateReceiptSubrows(parent, subReceipts) {
  if (!subReceipts.length) return parent;
  const tickets = subReceipts.map((receipt) => normalizeReceiptDraft('ЖД', {
    ...receipt,
    groupTickets: [], receipts: [], railTickets: [], receiptItems: [], receiptCount: 1,
  }));
  const sum = (key) => Math.round(tickets.reduce((total, receipt) => total + (Number(receipt[key]) || 0), 0) * 100) / 100;
  const passengers = tickets.flatMap((receipt) => receipt.passengers || []).filter((passenger) => passenger.name);
  const uniqueLegs = [];
  const seenLegs = new Set();
  tickets.flatMap((receipt) => receipt.legs || []).forEach((leg) => {
    const key = [leg.from, leg.to, leg.date, leg.dep, leg.arr, leg.flightNo].join('|');
    if (!seenLegs.has(key)) {
      seenLegs.add(key);
      uniqueLegs.push(leg);
    }
  });
  const ticketCost = sum('ticketCost');
  const reservedSeatCost = sum('reservedSeatCost');
  const agencyServiceFee = sum('agencyServiceFee');
  const additionalFees = sum('additionalFees');
  const taxes = sum('taxes');
  const computedTotal = Math.round((ticketCost + reservedSeatCost + agencyServiceFee + additionalFees + taxes) * 100) / 100;
  const ticketTotals = sum('total');
  const total = ticketTotals || computedTotal;
  return normalizeReceiptDraft('ЖД', {
    ...parent,
    passenger: passengers.map((passenger) => passenger.name).join(', '),
    passengers,
    ticketNo: tickets.map((receipt) => receipt.ticketNo).filter(Boolean).join(', '),
    legs: uniqueLegs.length ? uniqueLegs : parent.legs,
    fare: Math.round((ticketCost + reservedSeatCost) * 100) / 100,
    taxes,
    fees: Math.round((agencyServiceFee + additionalFees) * 100) / 100,
    total,
    originalTotal: total,
    ticketCost,
    reservedSeatCost,
    agencyServiceFee,
    additionalFees,
    fareBreakdown: [
      { code: 'TICKET', label: 'Билет', amount: ticketCost, currency: parent.currency || 'RUB' },
      { code: 'RESERVED_SEAT', label: 'Плацкарта', amount: reservedSeatCost, currency: parent.currency || 'RUB' },
    ],
    groupTickets: tickets,
    receipts: tickets,
    railTickets: tickets,
    receiptItems: tickets,
    receiptCount: tickets.length,
    recognitionPending: tickets.some((receipt) => receipt.recognitionPending),
  });
}
const receiptImportMoney`;
  page = replaceRequired(page, aggregatePattern, aggregateNext, 'агрегация отдельных ЖД-билетов');
}

// Keep the imported child list from the canonical backend field too.
const oldSubRows = "        const subReceipts = receiptImportSubrows(detectedType, extracted.receipts);";
const newSubRows = "        const subReceipts = receiptImportSubrows(detectedType, result.receipt_items || extracted.receipt_items || extracted.receipts || verified.groupTickets || verified.receipts);";
page = replaceRequired(page, oldSubRows, newSubRows, 'источник отдельных бланков');

// Replacing one child ticket must also preserve global CRM binding on the parent.
const subReceiptPattern = /  const updateSubReceipt = \(fileId, subIndex, parsed\) => \{[\s\S]*?\n  \};\n  const markReviewed/;
const subReceiptNext = `  const updateSubReceipt = (fileId, subIndex, parsed) => {
    setFiles((cur) => cur.map((file) => {
      if (file.id !== fileId) return file;
      const child = normalizeReceiptDraft(file.type, {
        ...parsed,
        groupTickets: [], receipts: [], railTickets: [], receiptItems: [], receiptCount: 1,
      });
      const subReceipts = (file.subReceipts || []).map((receipt, index) => (
        index === subIndex ? child : receipt
      ));
      const parent = {
        ...file.parsed,
        crmBindingMode: child.crmBindingMode || file.parsed?.crmBindingMode,
        crmOrderId: child.crmOrderId || file.parsed?.crmOrderId,
        crmOrderNo: child.crmOrderNo || file.parsed?.crmOrderNo,
        crmPersonId: child.crmPersonId || file.parsed?.crmPersonId,
        crmPerson: child.crmPerson || file.parsed?.crmPerson,
        crmService: child.crmService || file.parsed?.crmService,
        crmServiceId: child.crmServiceId || file.parsed?.crmServiceId,
        crmTrip: child.crmTrip || file.parsed?.crmTrip,
        crmTripId: child.crmTripId || file.parsed?.crmTripId,
        output: child.output || file.parsed?.output,
      };
      return {
        ...file,
        subReceipts,
        parsed: aggregateReceiptSubrows(parent, subReceipts),
      };
    }));
    setReviewed((cur) => ({ ...cur, [fileId]: true }));
  };
  const markReviewed`;
if (!page.includes('crmBindingMode: child.crmBindingMode || file.parsed?.crmBindingMode')) {
  page = replaceRequired(page, subReceiptPattern, subReceiptNext, 'обновление выбранного билета');
}

// The selected chip must drive BOTH preview and editor. Previously the ticket
// selector existed only inside the preview, while the form edited the aggregate.
const drawerPattern = /function ReceiptEditDrawer\(\{ open, file, onClose, onChange, onBrand, onReview, orders = \[\], services = \[\] \}\) \{[\s\S]*?\n\}\n\n\nfunction ReceiptMathDrawer/;
const drawerNext = `function ReceiptEditDrawer({ open, file, onClose, onChange, onSubChange, onBrand, onReview, orders = [], services = [] }) {
  const [correctionMode, setCorrectionMode] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [activeBlankIndex, setActiveBlankIndex] = useState(0);
  useEffect(() => {
    if (open) {
      setCorrectionMode(false);
      setPreviewExpanded(false);
      setActiveBlankIndex(0);
    }
  }, [open, file && file.id]);
  useEffect(() => {
    if (!previewExpanded) return undefined;
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setPreviewExpanded(false);
    };
    window.addEventListener('keydown', closeOnEscape, true);
    return () => window.removeEventListener('keydown', closeOnEscape, true);
  }, [previewExpanded]);
  if (!open || !file) return null;

  const parsed = normalizeReceiptDraft(file.type, file.parsed);
  const rawTickets = file.type === 'ЖД'
    ? ((Array.isArray(file.subReceipts) && file.subReceipts.length ? file.subReceipts : parsed.groupTickets) || [])
    : [];
  const groupTickets = rawTickets.map((ticket) => normalizeReceiptDraft(file.type, {
    ...ticket,
    groupTickets: [], receipts: [], railTickets: [], receiptItems: [], receiptCount: 1,
  }));
  const hasTicketGroup = file.type === 'ЖД' && groupTickets.length > 1;
  const safeBlankIndex = hasTicketGroup ? Math.min(activeBlankIndex, groupTickets.length - 1) : 0;
  const selectedBase = hasTicketGroup ? groupTickets[safeBlankIndex] : parsed;
  const editingParsed = hasTicketGroup ? normalizeReceiptDraft(file.type, {
    ...selectedBase,
    crmBindingMode: selectedBase.crmBindingMode || parsed.crmBindingMode,
    crmOrderId: selectedBase.crmOrderId || parsed.crmOrderId,
    crmOrderNo: selectedBase.crmOrderNo || parsed.crmOrderNo,
    crmPersonId: selectedBase.crmPersonId || parsed.crmPersonId,
    crmPerson: selectedBase.crmPerson || parsed.crmPerson,
    crmService: selectedBase.crmService || parsed.crmService,
    crmServiceId: selectedBase.crmServiceId || parsed.crmServiceId,
    crmTrip: selectedBase.crmTrip || parsed.crmTrip,
    crmTripId: selectedBase.crmTripId || parsed.crmTripId,
    output: selectedBase.output || parsed.output,
    groupTickets: [], receipts: [], railTickets: [], receiptItems: [], receiptCount: 1,
  }) : parsed;

  const commitEditingReceipt = (next) => {
    if (!hasTicketGroup) {
      onChange(file.id, next);
      return;
    }
    const child = normalizeReceiptDraft(file.type, {
      ...next,
      groupTickets: [], receipts: [], railTickets: [], receiptItems: [], receiptCount: 1,
    });
    if (onSubChange) {
      onSubChange(file.id, safeBlankIndex, child);
      return;
    }
    const tickets = groupTickets.map((ticket, index) => index === safeBlankIndex ? child : ticket);
    const parent = {
      ...parsed,
      crmBindingMode: child.crmBindingMode || parsed.crmBindingMode,
      crmOrderId: child.crmOrderId || parsed.crmOrderId,
      crmOrderNo: child.crmOrderNo || parsed.crmOrderNo,
      crmPersonId: child.crmPersonId || parsed.crmPersonId,
      crmPerson: child.crmPerson || parsed.crmPerson,
      crmService: child.crmService || parsed.crmService,
      crmServiceId: child.crmServiceId || parsed.crmServiceId,
      crmTrip: child.crmTrip || parsed.crmTrip,
      crmTripId: child.crmTripId || parsed.crmTripId,
      output: child.output || parsed.output,
    };
    onChange(file.id, aggregateReceiptSubrows(parent, tickets));
  };

  const drawerTitle = hasTicketGroup
    ? \`Проверка · билет \${safeBlankIndex + 1} из \${groupTickets.length} · \${receiptParticipantLabel(editingParsed)}\`
    : 'Проверка · ' + receiptParticipantLabel(parsed);

  return (
    <>
      <Drawer open={open} onClose={onClose} title={drawerTitle}
        sub={hasTicketGroup
          ? \`Групповой PDF · \${groupTickets.length} отдельных билета · редактируется выбранный билет\`
          : \`\${recType(file.type).doc} · исходный файл сохраняется без изменений\`}
        width="min(1280px,98vw)" className="receipt-editor-drawer"
        footer={<>
          {file.originalUrl && <Button variant="secondary" icon="eye" onClick={() => window.open(inlineSupplierDocumentUrl(file.originalUrl), '_blank', 'noopener,noreferrer')}>Оригинал</Button>}
          {onBrand && <Button variant="secondary" icon="template" onClick={onBrand}>На фирменном бланке</Button>}
          <Button style={{ flex: 1 }} icon="check" onClick={async () => {
            const saved = await onReview?.(file.id, parsed);
            if (saved !== false) onClose();
          }}>Проверено</Button>
        </>}>
        <div className="receipt-edit-layout">
          {hasTicketGroup && <section className="receipt-ticket-editor-strip" aria-label="Билеты в групповом PDF">
            <div className="receipt-ticket-editor-head">
              <span><b>Билеты в PDF</b><small>Каждый билет хранит своего пассажира, номер, место и стоимость</small></span>
              <Pill tone="blue">{safeBlankIndex + 1} из {groupTickets.length}</Pill>
            </div>
            <div className="receipt-ticket-editor-scroll">
              {groupTickets.map((ticket, index) => {
                const passenger = ticket.passengers?.[0] || {};
                const leg = ticket.legs?.[0] || {};
                const ticketNumber = ticket.ticketNo || passenger.ticketNo || '—';
                const amount = Number(ticket.total) || Number(ticket.ticketCost) + Number(ticket.reservedSeatCost)
                  + Number(ticket.agencyServiceFee) + Number(ticket.additionalFees);
                const place = [leg.coach ? \`вагон \${leg.coach}\` : '', leg.seat ? \`место \${leg.seat}\` : ''].filter(Boolean).join(' · ');
                return <button type="button" key={ticket.blankId || ticketNumber || index}
                  className={'receipt-ticket-editor-chip' + (index === safeBlankIndex ? ' is-active' : '')}
                  aria-pressed={index === safeBlankIndex}
                  onClick={() => { setActiveBlankIndex(index); setCorrectionMode(false); }}>
                  <span className="receipt-ticket-editor-index">{index + 1}</span>
                  <span className="receipt-ticket-editor-main">
                    <b>{passenger.name || ticket.passenger || \`Билет \${index + 1}\`}</b>
                    <small>№ {ticketNumber}</small>
                  </span>
                  <span className="receipt-ticket-editor-side">
                    <b>{recMoney(Number.isFinite(amount) ? amount : 0, ticket.currency || parsed.currency || 'RUB')}</b>
                    <small>{place || 'Место не указано'}</small>
                  </span>
                </button>;
              })}
            </div>
            <div className="receipt-ticket-editor-note"><Icon name="checkCircle" /> Изменения применяются только к выбранному билету. Общая сумма PDF пересчитывается автоматически как сумма всех билетов.</div>
          </section>}
          <aside className="receipt-edit-preview">
            <div className="receipt-edit-preview-head">
              <div><Icon name="eye" /><span><b>{hasTicketGroup ? \`Билет \${safeBlankIndex + 1}\` : 'Квитанция с корректировками'}</b><small>Живой предпросмотр</small></span></div>
              <button type="button" className="btn btn-secondary btn-sm"
                aria-expanded={previewExpanded} aria-controls="receipt-corrected-preview"
                onClick={() => setPreviewExpanded(true)}>
                <Icon name="arrowUpRight" />Развернуть
              </button>
            </div>
            <ReceiptDocumentPreview type={file.type} draft={editingParsed} />
            <div className="receipt-edit-preview-note"><Icon name="checkCircle" /> Предпросмотр обновляется сразу и показывает данные только выбранного билета.</div>
          </aside>
          <ReceiptSpecializedForm type={file.type} value={editingParsed} onChange={commitEditingReceipt}
            correctionMode={correctionMode} onToggleCorrection={() => setCorrectionMode((value) => !value)}
            orders={orders} services={services} />
        </div>
      </Drawer>
      {previewExpanded && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div id="receipt-corrected-preview"
          className="receipt-corrected-preview-overlay is-open"
          role="dialog" aria-modal="true"
          aria-label="Развернутая квитанция с корректировками"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreviewExpanded(false);
          }}>
          <section className="receipt-corrected-preview-dialog">
            <header>
              <div><Icon name="eye" /><span><b>{hasTicketGroup ? \`Билет \${safeBlankIndex + 1} из \${groupTickets.length}\` : 'Квитанция с корректировками'}</b><small>Все несохранённые изменения уже учтены</small></span></div>
              <button type="button" className="btn btn-secondary btn-sm"
                onClick={() => setPreviewExpanded(false)}><Icon name="x" />Закрыть</button>
            </header>
            <ReceiptDocumentPreview type={file.type} draft={editingParsed} />
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}


function ReceiptMathDrawer`;
if (!page.includes('const [activeBlankIndex, setActiveBlankIndex] = useState(0);')) {
  page = replaceRequired(page, drawerPattern, drawerNext, 'редактор выбранного билета');
}

// The normal group editor knows the real file.subReceipts, so let it update the
// selected child atomically instead of only replacing the aggregate draft.
const drawerInvocation = `<ReceiptEditDrawer open={!!editFile} file={editFile} onClose={() => setEditId(null)} onChange={updateParsed} onReview={markReviewed}`;
const drawerInvocationNext = `<ReceiptEditDrawer open={!!editFile} file={editFile} onClose={() => setEditId(null)} onChange={updateParsed} onSubChange={updateSubReceipt} onReview={markReviewed}`;
page = replaceRequired(page, drawerInvocation, drawerInvocationNext, 'передача обработчика отдельного билета');

// Railway identifiers: a railway ticket number is NOT a supplier booking/order.
const supplierFallbackPattern = /draft\.supplierOrderNo = value\.supplierOrderNo \|\| value\.supplier_order_number \|\| value\.order_number\n\s*\|\| \(\(type === 'ЖД' \|\| type === 'Гостиница' \|\| type === 'Трансфер'\) \? value\.ref \|\| value\.reference \|\| '' : ''\);/;
const supplierFallbackNext = `draft.supplierOrderNo = value.supplierOrderNo || value.supplier_order_number || value.order_number
    || ((type === 'Гостиница' || type === 'Трансфер') ? value.ref || value.reference || '' : '');`;
if (!editor.includes("((type === 'Гостиница' || type === 'Трансфер') ? value.ref")) {
  editor = replaceRequired(editor, supplierFallbackPattern, supplierFallbackNext, 'ЖД номер заказа поставщика');
}

const bookingOld = `{(type === 'ЖД' || type === 'Трансфер') && source('Номер заказа поставщика', 'supplierOrderNo')}`;
const bookingNext = `{type === 'ЖД' && source('Номер билета', 'ticketNo')}
        {type === 'ЖД' && p.supplierOrderNo && p.supplierOrderNo !== p.ticketNo && source('Номер заказа поставщика', 'supplierOrderNo')}
        {type === 'Трансфер' && source('Номер заказа поставщика', 'supplierOrderNo')}`;
editor = replaceRequired(editor, bookingOld, bookingNext, 'номер ЖД-билета в информации о документе');

editor = editor.replaceAll(
  `{type === 'Авиа' && <Field label="Документ"><LockedInput correctionMode={correctionMode}`,
  `{(type === 'Авиа' || type === 'ЖД') && <Field label="Документ"><LockedInput correctionMode={correctionMode}`,
);
editor = editor.replaceAll(
  `{type === 'Авиа' && <Field label="Номер билета"><LockedInput correctionMode={correctionMode}`,
  `{(type === 'Авиа' || type === 'ЖД') && <Field label="Номер билета"><LockedInput correctionMode={correctionMode}`,
);

const previewOld = `<div className="receipt-preview-ref"><small>{type === 'Авиа' ? 'PNR' : 'Бронь поставщика'}</small><b>{draft.ref || draft.supplierOrderNo || '—'}</b></div>`;
const previewNext = `<div className="receipt-preview-ref"><small>{type === 'Авиа' ? 'PNR' : type === 'ЖД' ? 'Номер билета' : 'Бронь поставщика'}</small><b>{type === 'ЖД' ? (draft.ticketNo || draft.passengers?.[0]?.ticketNo || '—') : (draft.ref || draft.supplierOrderNo || '—')}</b></div>`;
editor = replaceRequired(editor, previewOld, previewNext, 'подпись номера ЖД-билета в предпросмотре');

// Keep generic per-ticket conditions editable for rail documents when a supplier
// parser provides them (or when an operator needs to correct/add them).
if (!editor.includes("const railConditionsBlock = type === 'ЖД'")) {
  const routeMarker = `  const breakdown = (key, title, isTax) => (`;
  const railConditions = `  const railConditionsBlock = type === 'ЖД' ? (
    <Section title="4. Условия билета">
      <Field label="Условия / примечания поставщика">
        <TextArea value={p.conditions || p.terms || p.fareRules || p.fare_rules || ''}
          disabled={!correctionMode}
          placeholder="Условия тарифа, возврата, обмена или другие примечания по этому билету"
          onChange={(event) => set('conditions', event.target.value, 'Условия билета')} />
      </Field>
    </Section>
  ) : null;

`;
  editor = replaceRequired(editor, routeMarker, `${railConditions}${routeMarker}`, 'условия отдельного ЖД-билета');
  const railReturnOld = `{type === 'ЖД' && <>{passengerBlock}{routeBlock}{financeBlock}</>}`;
  const railReturnNext = `{type === 'ЖД' && <>{passengerBlock}{routeBlock}{railConditionsBlock}{financeBlock}</>}`;
  editor = replaceRequired(editor, railReturnOld, railReturnNext, 'вывод условий ЖД-билета');
}

const cssMarker = '/* Ticket-level editor: a grouped supplier PDF is a container, each ticket is independent. */';
if (!css.includes(cssMarker)) {
  css += `\n\n${cssMarker}\n.receipt-ticket-editor-strip {\n  grid-column: 1 / -1;\n  min-width: 0;\n  padding: 12px;\n  border: 1px solid #dfe7f3;\n  border-radius: 14px;\n  background: #f8faff;\n  display: grid;\n  gap: 10px;\n}\n\n.receipt-ticket-editor-head {\n  min-width: 0;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n}\n\n.receipt-ticket-editor-head > span {\n  min-width: 0;\n  display: grid;\n  gap: 2px;\n}\n\n.receipt-ticket-editor-head b {\n  color: var(--ink);\n  font-size: 13px;\n}\n\n.receipt-ticket-editor-head small {\n  color: var(--muted);\n  font-size: 11.5px;\n}\n\n.receipt-ticket-editor-scroll {\n  min-width: 0;\n  display: flex;\n  gap: 8px;\n  overflow-x: auto;\n  padding: 2px 2px 6px;\n  scrollbar-width: thin;\n}\n\n.receipt-ticket-editor-chip {\n  min-width: 285px;\n  max-width: 360px;\n  min-height: 70px;\n  flex: 0 0 auto;\n  padding: 9px 10px;\n  border: 1px solid #dfe5ee;\n  border-radius: 12px;\n  background: #fff;\n  display: grid;\n  grid-template-columns: 28px minmax(130px, 1fr) minmax(90px, auto);\n  align-items: center;\n  gap: 9px;\n  color: var(--ink);\n  cursor: pointer;\n  text-align: left;\n  transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;\n}\n\n.receipt-ticket-editor-chip:hover {\n  border-color: #a9c1ff;\n  box-shadow: 0 3px 12px rgba(37, 102, 255, .08);\n}\n\n.receipt-ticket-editor-chip.is-active {\n  border-color: var(--blue);\n  background: #eef4ff;\n  box-shadow: 0 0 0 2px rgba(37, 102, 255, .08);\n}\n\n.receipt-ticket-editor-index {\n  width: 28px;\n  height: 28px;\n  border-radius: 9px;\n  background: #f1f3f7;\n  color: var(--muted);\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 11.5px;\n  font-weight: 800;\n}\n\n.receipt-ticket-editor-chip.is-active .receipt-ticket-editor-index {\n  background: var(--blue);\n  color: #fff;\n}\n\n.receipt-ticket-editor-main,\n.receipt-ticket-editor-side {\n  min-width: 0;\n  display: grid;\n  gap: 3px;\n}\n\n.receipt-ticket-editor-main b {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  font-size: 12px;\n}\n\n.receipt-ticket-editor-main small,\n.receipt-ticket-editor-side small {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  color: var(--muted);\n  font-size: 10.5px;\n}\n\n.receipt-ticket-editor-side {\n  justify-items: end;\n  text-align: right;\n}\n\n.receipt-ticket-editor-side b {\n  white-space: nowrap;\n  font-size: 11.5px;\n}\n\n.receipt-ticket-editor-note {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  color: #47705a;\n  font-size: 11px;\n  line-height: 1.35;\n}\n\n.receipt-ticket-editor-note svg {\n  width: 14px;\n  height: 14px;\n  flex: 0 0 14px;\n  color: var(--green);\n}\n\n@media (max-width: 760px) {\n  .receipt-ticket-editor-chip {\n    min-width: min(285px, 82vw);\n    grid-template-columns: 28px minmax(0, 1fr);\n  }\n\n  .receipt-ticket-editor-side {\n    grid-column: 2;\n    justify-items: start;\n    text-align: left;\n    grid-template-columns: auto minmax(0, 1fr);\n    align-items: center;\n    gap: 7px;\n  }\n}\n`;
  changed = true;
}

for (const token of [
  "const [activeBlankIndex, setActiveBlankIndex] = useState(0);",
  'onSubChange={updateSubReceipt}',
  "const agencyServiceFee = sum('agencyServiceFee');",
  'groupTickets: tickets,',
  'result.receipt_items || extracted.receipt_items',
]) {
  if (!page.includes(token)) throw new Error(`Не подтверждён ticket-level редактор: ${token}`);
}
for (const token of [
  "type === 'ЖД' && source('Номер билета', 'ticketNo')",
  "(type === 'Авиа' || type === 'ЖД') && <Field label=\"Документ\"",
  "type === 'ЖД' ? 'Номер билета'",
  "const railConditionsBlock = type === 'ЖД'",
]) {
  if (!editor.includes(token)) throw new Error(`Не подтверждены поля отдельного ЖД-билета: ${token}`);
}
if (!css.includes(cssMarker)) throw new Error('Не подтверждены стили ticket-level редактора.');

if (changed) {
  await writeFile(pageUrl, page, 'utf8');
  await writeFile(editorUrl, editor, 'utf8');
  await writeFile(cssUrl, css, 'utf8');
  console.log('Групповой PDF переведён на независимое редактирование каждого билета.');
} else {
  console.log('Ticket-level редактор уже настроен.');
}
