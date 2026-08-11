import { readFile, writeFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);

let page = await readFile(pageUrl, 'utf8');
let css = await readFile(cssUrl, 'utf8');
let changed = false;

function replaceRequired(source, from, to, label) {
  if (source.includes(to)) return source;
  if (label === 'явный запуск последовательной проверки'
    && source.includes("(r.f.subReceipts || []).length > 1 ? 'Проверить бланки по очереди'")) return source;
  if (typeof from === 'string') {
    if (!source.includes(from)) throw new Error(`Не найден фрагмент: ${label}`);
    changed = true;
    return source.replace(from, to);
  }
  if (!from.test(source)) throw new Error(`Не найден фрагмент: ${label}`);
  changed = true;
  return source.replace(from, to);
}

const helperMarker = 'function receiptBlankIsReviewed(ticket) {';
if (!page.includes(helperMarker)) {
  const drawerAnchor = 'function ReceiptEditDrawer({ open, file, onClose, onChange, onSubChange, onBrand, onReview, orders = [], services = [] }) {';
  const helpers = `function receiptBlankIsReviewed(ticket) {
  const raw = String(ticket?.reviewStatus || ticket?.review_status || '').trim().toLowerCase();
  return ticket?.reviewed === true || ['reviewed', 'checked', 'done', 'complete', 'completed'].includes(raw);
}

function receiptGroupedTickets(file) {
  if (!file || file.type !== 'ЖД') return [];
  if (Array.isArray(file.subReceipts) && file.subReceipts.length) return file.subReceipts;
  const parsed = file.parsed || {};
  return parsed.groupTickets || parsed.receiptItems || parsed.receipts || parsed.railTickets || [];
}

function receiptGroupNeedsSequentialReview(file) {
  const tickets = receiptGroupedTickets(file);
  return tickets.length > 1 && !tickets.every(receiptBlankIsReviewed);
}

function receiptBlankMissingFields(ticket) {
  const passenger = ticket?.passengers?.[0] || {};
  const leg = ticket?.legs?.[0] || {};
  const missing = [];
  if (!(passenger.name || ticket?.passenger)) missing.push('ФИО пассажира');
  if (!(ticket?.ticketNo || passenger.ticketNo)) missing.push('номер билета');
  if (!(leg.from && leg.to)) missing.push('маршрут');
  if (!leg.flightNo) missing.push('номер поезда');
  const amount = Number(ticket?.total) || Number(ticket?.ticketCost) + Number(ticket?.reservedSeatCost)
    + Number(ticket?.agencyServiceFee) + Number(ticket?.additionalFees);
  if (!(amount > 0)) missing.push('стоимость билета');
  return missing;
}

`;
  page = replaceRequired(page, drawerAnchor, helpers + drawerAnchor, 'helpers последовательной проверки');
}

const drawerPattern = /function ReceiptEditDrawer\(\{ open, file, onClose, onChange, onSubChange, onBrand, onReview, orders = \[\], services = \[\] \}\) \{[\s\S]*?\n\}\n\n\nfunction ReceiptMathDrawer/;
const drawerNext = `function ReceiptEditDrawer({ open, file, onClose, onChange, onSubChange, onBrand, onReview, orders = [], services = [] }) {
  const [correctionMode, setCorrectionMode] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [activeBlankIndex, setActiveBlankIndex] = useState(0);
  useEffect(() => {
    if (!open) return;
    setCorrectionMode(false);
    setPreviewExpanded(false);
    const tickets = receiptGroupedTickets(file);
    const firstUnreviewed = tickets.findIndex((ticket) => !receiptBlankIsReviewed(ticket));
    setActiveBlankIndex(firstUnreviewed >= 0 ? firstUnreviewed : 0);
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
  const rawTickets = receiptGroupedTickets(file);
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
  const reviewedCount = hasTicketGroup ? groupTickets.filter(receiptBlankIsReviewed).length : 0;
  const currentMissing = hasTicketGroup ? receiptBlankMissingFields(editingParsed) : [];
  const progress = hasTicketGroup ? Math.round((reviewedCount / groupTickets.length) * 100) : 0;
  const currentIsReviewed = hasTicketGroup && receiptBlankIsReviewed(editingParsed);
  const allOtherReviewed = hasTicketGroup && groupTickets.every((ticket, index) => index === safeBlankIndex || receiptBlankIsReviewed(ticket));
  const canFinishSequence = hasTicketGroup && safeBlankIndex === groupTickets.length - 1 && allOtherReviewed;

  const parentFromTickets = (tickets, child = editingParsed) => aggregateReceiptSubrows({
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
  }, tickets);

  const persistChild = (child, index = safeBlankIndex) => {
    if (onSubChange) {
      onSubChange(file.id, index, child);
      return;
    }
    const tickets = groupTickets.map((ticket, ticketIndex) => ticketIndex === index ? child : ticket);
    onChange(file.id, parentFromTickets(tickets, child));
  };

  const commitEditingReceipt = (next) => {
    if (!hasTicketGroup) {
      onChange(file.id, next);
      return;
    }
    const child = normalizeReceiptDraft(file.type, {
      ...next,
      groupTickets: [], receipts: [], railTickets: [], receiptItems: [], receiptCount: 1,
    });
    persistChild(child);
  };

  const saveAndContinue = async () => {
    if (!hasTicketGroup || currentMissing.length) return;
    const reviewedAt = new Date().toISOString();
    const child = normalizeReceiptDraft(file.type, {
      ...editingParsed,
      reviewStatus: 'reviewed',
      review_status: 'reviewed',
      reviewedAt,
      reviewed_at: reviewedAt,
      groupTickets: [], receipts: [], railTickets: [], receiptItems: [], receiptCount: 1,
    });
    const tickets = groupTickets.map((ticket, index) => index === safeBlankIndex ? child : ticket);
    const nextParent = parentFromTickets(tickets, child);
    persistChild(child);

    if (safeBlankIndex < tickets.length - 1) {
      setActiveBlankIndex(safeBlankIndex + 1);
      setCorrectionMode(false);
      return;
    }

    const firstPending = tickets.findIndex((ticket) => !receiptBlankIsReviewed(ticket));
    if (firstPending >= 0) {
      setActiveBlankIndex(firstPending);
      setCorrectionMode(false);
      return;
    }

    const saved = await onReview?.(file.id, nextParent);
    if (saved !== false) onClose();
  };

  const drawerTitle = hasTicketGroup
    ? \`Проверка · бланк \${safeBlankIndex + 1} из \${groupTickets.length} · \${receiptParticipantLabel(editingParsed)}\`
    : 'Проверка · ' + receiptParticipantLabel(parsed);

  return (
    <>
      <Drawer open={open} onClose={onClose} title={drawerTitle}
        sub={hasTicketGroup
          ? \`Последовательная проверка · \${reviewedCount} из \${groupTickets.length} бланков уже проверено\`
          : \`\${recType(file.type).doc} · исходный файл сохраняется без изменений\`}
        width="min(1280px,98vw)" className="receipt-editor-drawer"
        footer={<>
          {file.originalUrl && <Button variant="secondary" icon="eye" onClick={() => window.open(inlineSupplierDocumentUrl(file.originalUrl), '_blank', 'noopener,noreferrer')}>Оригинал</Button>}
          {onBrand && <Button variant="secondary" icon="template" onClick={onBrand}>На фирменном бланке</Button>}
          {hasTicketGroup ? <>
            <Button variant="secondary" icon="chevLeft" disabled={safeBlankIndex === 0}
              onClick={() => { setActiveBlankIndex((index) => Math.max(0, index - 1)); setCorrectionMode(false); }}>Назад</Button>
            <Button style={{ flex: 1 }} icon={canFinishSequence ? 'check' : 'chevRight'} disabled={currentMissing.length > 0}
              onClick={saveAndContinue}>
              {canFinishSequence ? 'Сохранить и завершить проверку' : 'Сохранить и далее'}
            </Button>
          </> : <Button style={{ flex: 1 }} icon="check" onClick={async () => {
            const saved = await onReview?.(file.id, parsed);
            if (saved !== false) onClose();
          }}>Проверено</Button>}
        </>}>
        <div className="receipt-edit-layout">
          {hasTicketGroup && <section className="receipt-sequential-review" aria-label="Последовательная проверка бланков">
            <div className="receipt-sequential-review-head">
              <span><b>Последовательная проверка бланков</b><small>Проверьте текущий билет и нажмите «Сохранить и далее» — следующий откроется автоматически.</small></span>
              <strong>{reviewedCount} / {groupTickets.length}</strong>
            </div>
            <div className="receipt-sequential-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
              <span style={{ width: \`\${progress}%\` }} />
            </div>
            <div className="receipt-sequential-steps">
              {groupTickets.map((ticket, index) => {
                const reviewed = receiptBlankIsReviewed(ticket);
                return <button type="button" key={ticket.blankId || ticket.ticketNo || index}
                  className={(index === safeBlankIndex ? ' is-active' : '') + (reviewed ? ' is-reviewed' : '')}
                  aria-label={\`Бланк \${index + 1}\${reviewed ? ', проверен' : ''}\`}
                  onClick={() => { setActiveBlankIndex(index); setCorrectionMode(false); }}>
                  <span>{reviewed ? <Icon name="check" /> : index + 1}</span>
                  <small>{reviewed ? 'Проверен' : index === safeBlankIndex ? 'Сейчас' : 'Не проверен'}</small>
                </button>;
              })}
            </div>
          </section>}

          {hasTicketGroup && <section className="receipt-ticket-editor-strip" aria-label="Билеты в групповом PDF">
            <div className="receipt-ticket-editor-head">
              <span><b>Бланк {safeBlankIndex + 1} из {groupTickets.length}</b><small>У каждого билета свои пассажир, номер, место, условия и стоимость.</small></span>
              <Pill tone={currentIsReviewed ? 'green' : 'blue'}>{currentIsReviewed ? 'Проверен' : 'На проверке'}</Pill>
            </div>
            <div className="receipt-ticket-editor-scroll">
              {groupTickets.map((ticket, index) => {
                const passenger = ticket.passengers?.[0] || {};
                const leg = ticket.legs?.[0] || {};
                const ticketNumber = ticket.ticketNo || passenger.ticketNo || '—';
                const amount = Number(ticket.total) || Number(ticket.ticketCost) + Number(ticket.reservedSeatCost)
                  + Number(ticket.agencyServiceFee) + Number(ticket.additionalFees);
                const place = [leg.coach ? \`вагон \${leg.coach}\` : '', leg.seat ? \`место \${leg.seat}\` : ''].filter(Boolean).join(' · ');
                const reviewed = receiptBlankIsReviewed(ticket);
                return <button type="button" key={ticket.blankId || ticketNumber || index}
                  className={'receipt-ticket-editor-chip' + (index === safeBlankIndex ? ' is-active' : '') + (reviewed ? ' is-reviewed' : '')}
                  aria-pressed={index === safeBlankIndex}
                  onClick={() => { setActiveBlankIndex(index); setCorrectionMode(false); }}>
                  <span className="receipt-ticket-editor-index">{reviewed ? <Icon name="check" /> : index + 1}</span>
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
            {currentMissing.length > 0
              ? <div className="receipt-sequential-validation is-warning"><Icon name="alertCircle" /> Не заполнено: {currentMissing.join(', ')}. Заполните эти данные, чтобы перейти к следующему бланку.</div>
              : <div className="receipt-sequential-validation is-ok"><Icon name="checkCircle" /> Текущий бланк готов к сохранению. После сохранения система откроет следующий автоматически.</div>}
          </section>}
          <aside className="receipt-edit-preview">
            <div className="receipt-edit-preview-head">
              <div><Icon name="eye" /><span><b>{hasTicketGroup ? \`Бланк \${safeBlankIndex + 1}\` : 'Квитанция с корректировками'}</b><small>Живой предпросмотр</small></span></div>
              <button type="button" className="btn btn-secondary btn-sm"
                aria-expanded={previewExpanded} aria-controls="receipt-corrected-preview"
                onClick={() => setPreviewExpanded(true)}>
                <Icon name="arrowUpRight" />Развернуть
              </button>
            </div>
            <ReceiptDocumentPreview type={file.type} draft={editingParsed} />
            <div className="receipt-edit-preview-note"><Icon name="checkCircle" /> Предпросмотр показывает только выбранный бланк и обновляется сразу.</div>
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
              <div><Icon name="eye" /><span><b>{hasTicketGroup ? \`Бланк \${safeBlankIndex + 1} из \${groupTickets.length}\` : 'Квитанция с корректировками'}</b><small>Все несохранённые изменения уже учтены</small></span></div>
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
page = replaceRequired(page, drawerPattern, drawerNext, 'последовательный редактор группового PDF');

// Editing a single child must not mark the whole grouped PDF as reviewed. Only
// completing the sequential wizard does that.
const prematureReview = `    setReviewed((cur) => ({ ...cur, [fileId]: true }));\n  };\n  const markReviewed`;
const safeReview = `  };\n  const markReviewed`;
page = replaceRequired(page, prematureReview, safeReview, 'статус проверки только после всех бланков');

const eligiblePattern = /  const isEligible = \(r\) => !r\.pending && r\.f\.importId && !excluded\[r\.f\.id\] && r\.status !== 'Ошибка' && \(r\.status === 'Распознано' \|\| r\.status === 'Заполнено вручную' \|\| reviewed\[r\.f\.id\] \|\| optAddIncomplete\);\n  const toAdd = doneRows\.filter\(isEligible\);\n  const pendingReview = doneRows\.filter\(\(r\) => !excluded\[r\.f\.id\] && r\.status === 'Требует проверки' && !reviewed\[r\.f\.id\]\)\.length;/;
const eligibleNext = `  const isEligible = (r) => !r.pending && r.f.importId && !excluded[r.f.id] && r.status !== 'Ошибка'
    && !receiptGroupNeedsSequentialReview(r.f)
    && (r.status === 'Распознано' || r.status === 'Заполнено вручную' || reviewed[r.f.id] || optAddIncomplete);
  const toAdd = doneRows.filter(isEligible);
  const pendingReview = doneRows.filter((r) => !excluded[r.f.id] && (
    (r.status === 'Требует проверки' && !reviewed[r.f.id]) || receiptGroupNeedsSequentialReview(r.f)
  )).length;`;
page = replaceRequired(page, eligiblePattern, eligibleNext, 'блокировка непроверенной группы');

const actionOld = `                                      }}>{st.action}</button>`;
const actionNext = `                                      }}>{(r.f.subReceipts || []).length > 1 ? 'Проверить бланки по очереди' : st.action}</button>`;
page = replaceRequired(page, actionOld, actionNext, 'явный запуск последовательной проверки');

const childStatusOld = `<td data-label="Проверка"><Pill tone="green">Распознано</Pill></td>`;
const childStatusNext = `<td data-label="Проверка"><Pill tone={receiptBlankIsReviewed(subReceipt) ? 'green' : 'amber'}>{receiptBlankIsReviewed(subReceipt) ? 'Проверено' : 'Не проверено'}</Pill></td>`;
page = replaceRequired(page, childStatusOld, childStatusNext, 'статус отдельного бланка');

const cssMarker = '/* Sequential grouped receipt review wizard. */';
if (!css.includes(cssMarker)) {
  css += `\n\n${cssMarker}\n.receipt-sequential-review {\n  grid-column: 1 / -1;\n  display: grid;\n  gap: 10px;\n  padding: 14px;\n  border: 1px solid #dce6f6;\n  border-radius: 14px;\n  background: #fff;\n}\n.receipt-sequential-review-head { display:flex; align-items:center; justify-content:space-between; gap:14px; }\n.receipt-sequential-review-head > span { min-width:0; display:grid; gap:3px; }\n.receipt-sequential-review-head b { color:var(--ink); font-size:14px; }\n.receipt-sequential-review-head small { color:var(--muted); font-size:11.5px; line-height:1.4; }\n.receipt-sequential-review-head strong { flex:0 0 auto; color:var(--blue); font-size:14px; }\n.receipt-sequential-progress { height:6px; border-radius:999px; background:#e9eef7; overflow:hidden; }\n.receipt-sequential-progress > span { display:block; height:100%; border-radius:inherit; background:var(--green); transition:width .2s ease; }\n.receipt-sequential-steps { display:flex; gap:7px; overflow-x:auto; padding-bottom:2px; }\n.receipt-sequential-steps button { min-width:82px; border:1px solid #dfe5ee; border-radius:10px; background:#fff; padding:7px 9px; display:flex; align-items:center; gap:7px; color:var(--muted); cursor:pointer; }\n.receipt-sequential-steps button > span { width:24px; height:24px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; background:#f1f3f7; font-size:11px; font-weight:800; }\n.receipt-sequential-steps button > span svg { width:13px; height:13px; }\n.receipt-sequential-steps button small { white-space:nowrap; font-size:10.5px; }\n.receipt-sequential-steps button.is-active { border-color:var(--blue); background:#eef4ff; color:var(--blue); }\n.receipt-sequential-steps button.is-active > span { background:var(--blue); color:#fff; }\n.receipt-sequential-steps button.is-reviewed { border-color:#bfe7ce; background:#f1fbf5; color:var(--green); }\n.receipt-sequential-steps button.is-reviewed > span { background:var(--green); color:#fff; }\n.receipt-ticket-editor-chip.is-reviewed:not(.is-active) { border-color:#bfe7ce; background:#f7fcf9; }\n.receipt-ticket-editor-chip.is-reviewed .receipt-ticket-editor-index { background:var(--green); color:#fff; }\n.receipt-ticket-editor-index svg { width:13px; height:13px; }\n.receipt-sequential-validation { display:flex; align-items:flex-start; gap:7px; padding:9px 10px; border-radius:10px; font-size:11.5px; line-height:1.4; }\n.receipt-sequential-validation svg { width:15px; height:15px; flex:0 0 15px; margin-top:1px; }\n.receipt-sequential-validation.is-warning { background:var(--amber-bg); color:var(--amber); }\n.receipt-sequential-validation.is-ok { background:#effaf3; color:#347a50; }\n@media (max-width:760px) {\n  .receipt-sequential-review-head { align-items:flex-start; }\n  .receipt-sequential-steps button { min-width:74px; }\n}\n`;
  changed = true;
}

for (const token of [
  'Последовательная проверка бланков',
  'Сохранить и далее',
  'Сохранить и завершить проверку',
  "reviewStatus: 'reviewed'",
  'receiptGroupNeedsSequentialReview(r.f)',
  'Проверить бланки по очереди',
  "receiptBlankIsReviewed(subReceipt) ? 'Проверено' : 'Не проверено'",
]) {
  if (!page.includes(token)) throw new Error(`Не подтверждена последовательная проверка: ${token}`);
}
if (!css.includes(cssMarker)) throw new Error('Не подтверждены стили последовательной проверки.');

if (changed) {
  await writeFile(pageUrl, page, 'utf8');
  await writeFile(cssUrl, css, 'utf8');
  console.log('Последовательная проверка групповых бланков включена.');
} else {
  console.log('Последовательная проверка групповых бланков уже настроена.');
}
