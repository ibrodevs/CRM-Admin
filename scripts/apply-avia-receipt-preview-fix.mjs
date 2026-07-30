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
  'нормализация полей авиа-сегмента',
  "const emptyRoom = () => ({",
  `function firstReceiptValue(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? '';
}

function normalizeReceiptLeg(row = {}) {
  const source = row && typeof row === 'object' ? row : {};
  return {
    ...emptyLeg(),
    ...source,
    from: firstReceiptValue(source.from, source.origin, source.origin_name, source.departure_city, source.departure_airport),
    fromCode: firstReceiptValue(source.fromCode, source.from_code, source.originCode, source.origin_code, source.origin_iata, source.departure_airport_code),
    to: firstReceiptValue(source.to, source.destination, source.destination_name, source.arrival_city, source.arrival_airport),
    toCode: firstReceiptValue(source.toCode, source.to_code, source.destinationCode, source.destination_code, source.destination_iata, source.arrival_airport_code),
    fromAddress: firstReceiptValue(source.fromAddress, source.from_address),
    toAddress: firstReceiptValue(source.toAddress, source.to_address),
    date: firstReceiptValue(source.date, source.departureDate, source.departure_date, source.flight_date),
    endDate: firstReceiptValue(source.endDate, source.end_date, source.arrival_date),
    dep: firstReceiptValue(source.dep, source.departureTime, source.departure_time),
    arr: firstReceiptValue(source.arr, source.arrivalTime, source.arrival_time),
    duration: firstReceiptValue(source.duration, source.flight_duration),
    carrier: firstReceiptValue(source.carrier, source.airline, source.airline_name, source.marketing_carrier),
    flightNo: firstReceiptValue(source.flightNo, source.flight_no, source.flight_number, source.number),
    coach: firstReceiptValue(source.coach, source.coach_number),
    seat: firstReceiptValue(source.seat, source.seat_number),
    cls: firstReceiptValue(source.cls, source.bookingClass, source.booking_class, source.class_code),
    status: firstReceiptValue(source.status, source.bookingStatus, source.booking_status, source.segment_status, source.confirmation_status),
    fareBasis: firstReceiptValue(source.fareBasis, source.fare_basis, source.tariff_code),
    cabin: firstReceiptValue(source.cabin, source.cabinClass, source.cabin_class, source.service_class),
    baggage: firstReceiptValue(source.baggage, source.baggage_allowance, source.checked_baggage),
    dir: firstReceiptValue(source.dir, source.direction, 'out'),
  };
}

const emptyRoom = () => ({`,
);

replaceOnce(
  'использование нормализованных сегментов',
  "  draft.legs = asArray(value.legs, [emptyLeg()]).map((row) => ({ ...emptyLeg(), ...row }));",
  "  draft.legs = asArray(value.legs || value.segments, [emptyLeg()]).map(normalizeReceiptLeg);",
);

replaceOnce(
  'алиасы бронирования авиа-квитанции',
  "  draft.passenger = passengers[0]?.name || value.passenger || '';\n  draft.legs = asArray(value.legs || value.segments, [emptyLeg()]).map(normalizeReceiptLeg);",
  `  draft.passenger = passengers[0]?.name || value.passenger || value.passenger_name || '';
  draft.legs = asArray(value.legs || value.segments, [emptyLeg()]).map(normalizeReceiptLeg);
  draft.ref = firstReceiptValue(value.ref, value.reference, value.pnr, value.booking_reference, draft.ref);
  draft.ticketNo = firstReceiptValue(value.ticketNo, value.ticket_number, value.ticket_no, draft.ticketNo);
  draft.issueDate = firstReceiptValue(value.issueDate, value.issue_date, draft.issueDate);
  draft.bookingStatus = firstReceiptValue(
    value.bookingStatus,
    value.booking_status,
    value.reservation_status,
    draft.legs.find((leg) => leg.status)?.status,
    draft.bookingStatus,
  );
  draft.tripType = firstReceiptValue(value.tripType, value.trip_type, draft.tripType);
  draft.carrier = firstReceiptValue(value.carrier, value.issuer, value.airline, draft.legs.find((leg) => leg.carrier)?.carrier, draft.carrier);`,
);

replaceOnce(
  'единый детальный авиа-бланк',
  "export function ReceiptDocumentPreview({ type, draft }) {",
  `function ReceiptAviaDocument({ draft, organization = 'ПСЦ Travel Hub' }) {
  const p = normalizeReceiptDraft('Авиа', draft);
  const participants = receiptParticipantNames(p);
  const money = (value) => \`${'${roundMoney(value).toLocaleString(\'ru-RU\')} ${p.currency || \'\'}'}\`.trim();
  const fareRows = p.fareBreakdown?.length ? p.fareBreakdown : [];
  const taxRows = p.taxBreakdown?.length ? p.taxBreakdown
    : (Number(p.taxes) ? [{ code: 'TAX', label: 'Таксы перевозчика', amount: p.taxes }] : []);
  const feeRows = p.feeBreakdown?.length ? p.feeBreakdown
    : (Number(p.fees) ? [{ code: 'FEE', label: 'Сервисный сбор', amount: p.fees }] : []);
  return (
    <article className="receipt-brand-document receipt-avia-document">
      <header><div className="receipt-brand-logo">P</div><div><b>{organization}</b><span>{TYPE_META['Авиа'].document}</span></div>
        <div><small>Заказ CRM</small><b>{p.crmOrderNo || '—'}</b></div></header>
      <section className="receipt-brand-passengers">
        <h4>Пассажиры</h4>
        {p.passengers.map((passenger, index) => {
          const details = [
            ['ФИО', passenger.name],
            ['Дата рождения', passenger.dob],
            ['Документ / паспорт', passenger.document],
            ['Номер билета', passenger.ticketNo || p.ticketNo],
            ['Код бронирования (PNR)', passenger.ref || p.ref],
            ['Бонусная карта', passenger.loyaltyCard],
          ];
          return <div className="receipt-brand-passenger" key={\`${'${passenger.name || \'passenger\'}-${index}'}\`}>
            {p.passengers.length > 1 && <h5>Пассажир {index + 1}</h5>}
            <div className="receipt-brand-passenger-grid">{details.map(([label, value]) => <div key={label}>
              <small>{label}</small><b>{value || '—'}</b>
            </div>)}</div>
          </div>;
        })}
        {!participants.length && <div className="receipt-empty">Пассажиры не распознаны</div>}
      </section>
      <div className="receipt-brand-meta">
        <div><small>Заказ поставщика/API</small><b>{p.supplierOrderNo || '—'}</b></div>
        <div><small>PNR / код бронирования</small><b>{p.ref || '—'}</b></div>
        <div><small>Дата оформления</small><b>{p.issueDate || '—'}</b></div>
        <div><small>Статус бронирования</small><b>{p.bookingStatus || p.legs.find((leg) => leg.status)?.status || '—'}</b></div>
      </div>
      <h3>{receiptDetailsLines('Авиа', p)[0]}</h3>
      <h4>Маршрут</h4>
      <div className="receipt-brand-itinerary">{p.legs.map((leg, index) => {
        const layover = index < p.legs.length - 1
          ? segmentConnectionLabel(leg, p.legs[index + 1], p.tripType) : '';
        const details = [
          ['Рейс', leg.flightNo],
          ['Дата', leg.date],
          ['Вылет', leg.dep],
          ['Прилёт', leg.arr],
          ['Авиакомпания', leg.carrier || p.carrier],
          ['Класс бронирования', leg.cls || p.fareInfo.bookingClass],
          ['Код тарифа', leg.fareBasis || p.fareInfo.code],
          ['Класс обслуживания', leg.cabin || p.fareInfo.name],
          ['Багаж', leg.baggage],
          ['Статус', leg.status || p.bookingStatus],
        ];
        return <React.Fragment key={\`${'${leg.flightNo || \'segment\'}-${index}'}\`}>
          <div className="receipt-brand-segment">
            <div className="receipt-brand-segment-title"><small>Сегмент {index + 1}</small>
              <b>{receiptLegPlace(leg, 'from')} → {receiptLegPlace(leg, 'to')}</b></div>
            <div className="receipt-brand-segment-grid">{details.map(([label, value]) => <div key={label}>
              <small>{label}</small><b>{value || '—'}</b>
            </div>)}</div>
          </div>
          {layover && <div className="receipt-brand-layover">{layover}</div>}
        </React.Fragment>;
      })}</div>
      {(p.fareInfo.code || p.fareInfo.name || p.fareInfo.bookingClass || p.fareInfo.exchangeRules || p.fareInfo.refundRules) && <>
        <h4>Тариф и условия</h4>
        <div className="receipt-brand-terms">
          {p.fareInfo.code && <div><b>Код тарифа</b><span>{p.fareInfo.code}</span></div>}
          {p.fareInfo.name && <div><b>Название / класс обслуживания</b><span>{p.fareInfo.name}</span></div>}
          {p.fareInfo.bookingClass && <div><b>Класс бронирования</b><span>{p.fareInfo.bookingClass}</span></div>}
          {p.fareInfo.exchangeRules && <div><b>Правила обмена</b><span>{p.fareInfo.exchangeRules}</span></div>}
          {p.fareInfo.refundRules && <div><b>Правила возврата</b><span>{p.fareInfo.refundRules}</span></div>}
        </div>
      </>}
      {p.extras.length > 0 && <><h4>Дополнительные услуги</h4>
        <div className="receipt-brand-names">{p.extras.map((row, index) => <span key={index}>{row.name}{row.details ? \` · ${'${row.details}'}\` : ''}</span>)}</div></>}
      <h4>Расчёт стоимости</h4>
      <div className="receipt-brand-finance-groups">
        <section><h5>Тариф</h5><div className="receipt-brand-finance">
          <div><span>Тариф перевозчика</span><b>{money(p.fare)}</b></div>
          {fareRows.map((row, index) => <div key={\`fare-${'${index}'}\`}><span>{[row.code, row.label].filter(Boolean).join(' · ') || 'Расчёт тарифа'}</span><b>{money(row.amount)}</b></div>)}
        </div></section>
        <section><h5>Таксы</h5><div className="receipt-brand-finance">
          <div><span>Таксы перевозчика</span><b>{money(p.taxes)}</b></div>
          {taxRows.map((row, index) => <div key={\`tax-${'${index}'}\`}><span>{[row.code, row.label].filter(Boolean).join(' · ') || 'Такса'}</span><b>{money(row.amount)}</b></div>)}
        </div></section>
        <section><h5>Сборы</h5><div className="receipt-brand-finance">
          <div><span>Сервисный сбор</span><b>{money(p.fees)}</b></div>
          {feeRows.map((row, index) => <div key={\`fee-${'${index}'}\`}><span>{[row.code, row.label].filter(Boolean).join(' · ') || 'Сбор'}</span><b>{money(row.amount)}</b></div>)}
        </div></section>
        <div className="receipt-brand-finance-total"><span>Итого для клиента</span><b>{money(receiptFinancialTotal('Авиа', p))}</b></div>
      </div>
      <footer>{organization} · Сформировано в PSC Travel Hub</footer>
    </article>
  );
}

export function ReceiptDocumentPreview({ type, draft }) {`,
);

replaceOnce(
  'полный авиа-предпросмотр',
  "export function ReceiptDocumentPreview({ type, draft }) {\n  const meta = TYPE_META[type] || TYPE_META['Прочее'];",
  "export function ReceiptDocumentPreview({ type, draft }) {\n  if (type === 'Авиа') return <div className=\"receipt-preview receipt-preview-full\"><ReceiptAviaDocument draft={draft} /></div>;\n  const meta = TYPE_META[type] || TYPE_META['Прочее'];",
);

replaceOnce(
  'единый авиа-компонент на бланке агентства',
  "      ) : (\n        <article className=\"receipt-brand-document\">",
  "      ) : type === 'Авиа' ? (\n        <ReceiptAviaDocument draft={p} organization={organization} />\n      ) : (\n        <article className=\"receipt-brand-document\">",
);

if (changed) {
  await writeFile(editorUrl, source, 'utf8');
  console.log('Авиа-маршрут восстановлен, предпросмотр и бланк агентства унифицированы.');
} else {
  console.log('Авиа-маршрут и единый предпросмотр уже настроены.');
}
