import { readFile, writeFile } from 'node:fs/promises';

const fileUrl = new URL('../js/features/receipts/editor.jsx', import.meta.url);
let source = await readFile(fileUrl, 'utf8');
let changed = false;

const replaceOnce = (from, to, label) => {
  if (source.includes(to)) return;
  if (!source.includes(from)) throw new Error(`Не найден фрагмент для изменения: ${label}`);
  source = source.replace(from, to);
  changed = true;
};

replaceOnce(
`  if ((type === 'Гостиница' || type === 'Трансфер') && (value.supplierCost === undefined || value.supplierCost === '')) draft.supplierCost = supplierBase || '';
  if ((type === 'Гостиница' || type === 'Трансфер') && (value.agencyServiceFee === undefined || value.agencyServiceFee === '')) draft.agencyServiceFee = value.fees || '';
  return withFinancialAliases(type, draft);`,
`  if ((type === 'Гостиница' || type === 'Трансфер') && (value.supplierCost === undefined || value.supplierCost === '')) draft.supplierCost = supplierBase || '';
  if ((type === 'Гостиница' || type === 'Трансфер') && (value.agencyServiceFee === undefined || value.agencyServiceFee === '')) draft.agencyServiceFee = value.fees || '';

  const rawGroupTickets = [value.groupTickets, value.receipts, value.railTickets]
    .find((rows) => Array.isArray(rows) && rows.length > 0) || [];
  draft.groupTickets = rawGroupTickets.map((ticket, index) => normalizeReceiptDraft(type, {
    ...ticket,
    passenger: firstReceiptValue(ticket.passenger, ticket.passenger_name),
    ticketNo: firstReceiptValue(ticket.ticketNo, ticket.ticket_number),
    legs: ticket.legs || ticket.segments || [],
    fareBreakdown: ticket.fareBreakdown || ticket.costBreakdown || ticket.fare_breakdown || [],
    taxBreakdown: ticket.taxBreakdown || ticket.tax_breakdown || [],
    feeBreakdown: ticket.feeBreakdown || ticket.fee_breakdown || [],
    groupTickets: [],
    receipts: [],
    railTickets: [],
    receiptCount: 1,
    receiptIndex: ticket.receiptIndex || ticket.receipt_index || index + 1,
  }));
  draft.receiptCount = draft.groupTickets.length || Number(value.receiptCount || value.receipt_count) || 0;
  return withFinancialAliases(type, draft);`,
  'нормализация отдельных бланков',
);

const components = `
function railBlankIdentity(ticket, index) {
  const passenger = receiptParticipantNames(ticket)[0] || ticket.passenger || 'Пассажир не распознан';
  const leg = ticket.legs?.[0] || {};
  return {
    passenger,
    ticketNo: ticket.ticketNo || ticket.passengers?.[0]?.ticketNo || '—',
    route: [leg.from || leg.fromCode, leg.to || leg.toCode].filter(Boolean).join(' → ') || 'Маршрут не распознан',
    trip: [leg.flightNo && \`поезд \${leg.flightNo}\`, leg.coach && \`вагон \${leg.coach}\`, leg.seat && \`место \${leg.seat}\`].filter(Boolean).join(' · '),
    total: receiptFinancialTotal('ЖД', ticket),
    index: Number(ticket.receiptIndex) || index + 1,
  };
}

function ReceiptRailMultiBlankPreview({ draft }) {
  const tickets = (draft.groupTickets || []).map((ticket) => normalizeReceiptDraft('ЖД', {
    ...ticket,
    groupTickets: [],
    receipts: [],
    railTickets: [],
    receiptCount: 1,
    crmOrderNo: ticket.crmOrderNo || draft.crmOrderNo,
    crmOrderId: ticket.crmOrderId || draft.crmOrderId,
    output: ticket.output || draft.output,
  }));
  const ticketKey = tickets.map((ticket) => ticket.ticketNo || ticket.receiptIndex || '').join('|');
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => setActiveIndex(0), [ticketKey]);
  const active = tickets[Math.min(activeIndex, Math.max(0, tickets.length - 1))];
  const identities = tickets.map(railBlankIdentity);
  const routeCount = new Set(identities.map((item) => item.route)).size;
  const passengerCount = new Set(identities.map((item) => item.passenger)).size;
  const total = identities.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="receipt-multiform-preview">
      <section className="receipt-blank-strip" aria-label="Доступные ЖД-бланки">
        <div className="receipt-blank-strip-title">
          <div><Icon name="docs" /><span><b>Доступные бланки</b><small>{tickets.length} отдельных билета · {passengerCount} пассажира · {routeCount} маршрута</small></span></div>
          <strong>{total.toLocaleString('ru-RU')} {draft.currency || 'RUB'}</strong>
        </div>
        <div className="receipt-blank-strip-scroll">
          {tickets.map((ticket, index) => {
            const item = identities[index];
            return (
              <button type="button" key={ticket.ticketNo || ticket.receiptIndex || index}
                className={'receipt-blank-chip' + (index === activeIndex ? ' is-active' : '')}
                aria-pressed={index === activeIndex} onClick={() => setActiveIndex(index)}>
                <span className="receipt-blank-chip-number">{item.index}</span>
                <span className="receipt-blank-chip-main"><b>{item.passenger}</b><small>Билет № {item.ticketNo}</small><small>{item.route}</small></span>
                <span className="receipt-blank-chip-side"><b>{item.total.toLocaleString('ru-RU')} {ticket.currency || draft.currency || 'RUB'}</b><small>{item.trip || 'Место не распознано'}</small></span>
              </button>
            );
          })}
        </div>
      </section>
      {active && <div className="receipt-active-blank">
        <div className="receipt-active-blank-label"><Icon name="checkCircle" /> Бланк {activeIndex + 1} из {tickets.length} · данные и стоимость только этого билета</div>
        <ReceiptDocumentPreview type="ЖД" draft={active} />
      </div>}
    </div>
  );
}

function ReceiptHotelDocumentPreview({ draft }) {
  const p = normalizeReceiptDraft('Гостиница', draft);
  const stay = p.legs?.[0] || {};
  const rooms = p.rooms || [];
  return (
    <article className="receipt-hotel-preview">
      <header>
        <span><Icon name="bed" /></span>
        <div><b>{p.hotel?.name || p.carrier || 'Отель не распознан'}</b><small>{[p.hotel?.city, p.hotel?.country].filter(Boolean).join(', ') || 'Локация не распознана'}</small></div>
        <div><small>Период проживания</small><b>{[stay.date, stay.endDate].filter(Boolean).join(' → ') || '—'}</b></div>
      </header>
      {p.hotel?.address && <div className="receipt-hotel-preview-address"><Icon name="pin" /><span>{p.hotel.address}</span></div>}
      <div className="receipt-hotel-preview-summary">
        <div><small>Гостей</small><b>{receiptParticipantNames(p).length}</b></div>
        <div><small>Номеров / размещений</small><b>{rooms.length}</b></div>
        <div><small>Ночей</small><b>{p.nights || '—'}</b></div>
        <div><small>Бронирование</small><b>{p.hotelBookingNo || p.supplierOrderNo || p.ref || 'по ФИО'}</b></div>
      </div>
      <h4>Размещение по гостям</h4>
      <div className="receipt-hotel-preview-rooms">
        {rooms.map((room, index) => {
          const guests = room.guestIds?.length
            ? room.guestIds
            : [p.passengers?.[index]?.name || p.passengers?.[0]?.name].filter(Boolean);
          const checkIn = room.checkInDate || stay.date;
          const checkOut = room.checkOutDate || stay.endDate;
          return (
            <section key={`${guests.join('|')}-${index}`} className="receipt-hotel-preview-room">
              <div className="receipt-hotel-preview-room-head"><span>{index + 1}</span><div><b>{guests.join(', ') || `Гость ${index + 1}`}</b><small>{room.bookingNo || 'Заселение по ФИО'}</small></div></div>
              <div className="receipt-hotel-preview-room-grid">
                <div><small>Категория номера</small><b>{room.category || room.name || '—'}</b></div>
                <div><small>Питание</small><b>{room.meal || '—'}</b></div>
                <div><small>Заезд</small><b>{[checkIn, room.checkInTime || stay.dep].filter(Boolean).join(' · ') || '—'}</b></div>
                <div><small>Выезд</small><b>{[checkOut, room.checkOutTime || stay.arr].filter(Boolean).join(' · ') || '—'}</b></div>
              </div>
            </section>
          );
        })}
      </div>
      {!rooms.length && <div className="receipt-empty">Размещения не распознаны</div>}
    </article>
  );
}

`;

if (!source.includes('function ReceiptRailMultiBlankPreview(')) {
  const marker = 'export function ReceiptDocumentPreview({ type, draft }) {';
  if (!source.includes(marker)) throw new Error('Не найден ReceiptDocumentPreview');
  source = source.replace(marker, components + marker);
  changed = true;
}

replaceOnce(
`export function ReceiptDocumentPreview({ type, draft }) {
  if (type === 'Авиа') return <ReceiptAviaDocument draft={draft} />;`,
`export function ReceiptDocumentPreview({ type, draft }) {
  if (type === 'Авиа') return <ReceiptAviaDocument draft={draft} />;
  if (type === 'ЖД') {
    const normalized = normalizeReceiptDraft('ЖД', draft);
    if (normalized.groupTickets?.length > 1) return <ReceiptRailMultiBlankPreview draft={normalized} />;
  }
  if (type === 'Гостиница') return <ReceiptHotelDocumentPreview draft={draft} />;`,
  'выбор отдельного предпросмотра',
);

const required = [
  'const rawGroupTickets = [value.groupTickets, value.receipts, value.railTickets]',
  'function ReceiptRailMultiBlankPreview(',
  'Доступные бланки',
  'данные и стоимость только этого билета',
  'function ReceiptHotelDocumentPreview(',
  'Размещение по гостям',
  "if (normalized.groupTickets?.length > 1) return <ReceiptRailMultiBlankPreview draft={normalized} />;",
];
for (const token of required) {
  if (!source.includes(token)) throw new Error(`Не подтверждён многоформатный редактор: ${token}`);
}

if (changed) await writeFile(fileUrl, source, 'utf8');
console.log(changed
  ? 'ЖД-бланки и отельные размещения выводятся отдельно, без визуального склеивания.'
  : 'Многоформатный предпросмотр квитанций уже настроен.');
