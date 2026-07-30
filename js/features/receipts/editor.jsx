import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../icons';
import { Button, Drawer, EmptyState, Field, Input, Pill, SearchBox, Select, TimeField } from '../../ui';
import { UFDateField, UnifiedBindField } from '../../forms_unified';
import { segmentConnectionLabel } from './layover';

const TYPE_META = {
  'Авиа': { icon: 'plane', color: '#2566ff', document: 'Маршрут-квитанция' },
  'ЖД': { icon: 'train', color: '#5a5af0', document: 'Электронный ЖД-билет' },
  'Гостиница': { icon: 'bed', color: '#1f9d57', document: 'Отельный ваучер' },
  'Трансфер': { icon: 'car', color: '#c47e22', document: 'Ваучер трансфера' },
  'Прочее': { icon: 'paperclip', color: '#9aa3b2', document: 'Документ' },
};

const emptyPassenger = () => ({
  name: '', dob: '', document: '', ticketNo: '', loyaltyCard: '', phone: '',
  signText: '', comment: '', crmPassenger: '', guestType: 'Взрослый',
});
const emptyLeg = () => ({
  from: '', fromCode: '', to: '', toCode: '', fromAddress: '', toAddress: '',
  date: '', endDate: '', dep: '', arr: '', duration: '', carrier: '',
  flightNo: '', coach: '', seat: '', cls: '', status: '', fareBasis: '', cabin: '', baggage: '', dir: 'out',
});
const emptyRoom = () => ({
  category: '', name: '', bedType: '', adults: 1, children: 0, meal: 'Без питания',
  earlyCheckIn: '', lateCheckOut: '', conditions: '', guestIds: [],
});
const emptyCharge = () => ({ code: '', label: '', amount: '', currency: '' });
const emptyExtra = () => ({ name: '', details: '', amount: '' });

const RECEIPT_SERVICE_KINDS = {
  'Авиа': ['авиа', 'avia', 'flight'],
  'ЖД': ['жд', 'rail', 'train'],
  'Гостиница': ['гостиница', 'отель', 'hotel'],
  'Трансфер': ['трансфер', 'transfer'],
};

function receiptRelationText(value) {
  return String(value ?? '').trim();
}

function relationServiceKind(service) {
  return receiptRelationText(service?.kind || service?.service_kind || service?.serviceType || service?.service_type).toLowerCase();
}

function relationServiceLabel(service) {
  return receiptRelationText(service?.title || service?.route || service?.name || service?.description)
    || [service?.kind, service?.date || service?.starts_at].filter(Boolean).join(' · ')
    || 'Услуга без названия';
}

function relationServiceOptions(type, services, draft) {
  const selectedOrder = receiptRelationText(draft.crmOrderId || draft.crmOrderNo);
  if (!selectedOrder) return [];
  const orderServices = (Array.isArray(services) ? services : []).filter((service) => {
    const serviceOrder = receiptRelationText(service.orderId || service.order || service.order_id || service.orderNo || service.order_number);
    return serviceOrder === selectedOrder;
  });
  const aliases = RECEIPT_SERVICE_KINDS[type] || [];
  const compatible = orderServices.filter((service) => {
    const kind = relationServiceKind(service);
    return aliases.some((alias) => kind.includes(alias));
  });
  const rows = compatible.length ? compatible : orderServices;
  return rows.map((service) => ({
    id: receiptRelationText(service.serverId || service.id),
    label: relationServiceLabel(service),
    hint: [service.kind || service.service_kind, service.status, service.date || service.starts_at].filter(Boolean).join(' · '),
    raw: service,
  }));
}

function relationSegmentArrays(service) {
  const sources = [
    service,
    service?.details,
    service?.metadata,
    service?.supplier_data,
    service?.booking_data,
    service?.offer_snapshot,
  ].filter(Boolean);
  for (const source of sources) {
    for (const key of ['segments', 'legs', 'flights', 'itinerary']) {
      if (Array.isArray(source[key]) && source[key].length) return source[key];
    }
  }
  return [];
}

function relationSegmentLabel(segment, index) {
  const from = receiptRelationText(segment.fromCode || segment.origin_code || segment.origin || segment.from);
  const to = receiptRelationText(segment.toCode || segment.destination_code || segment.destination || segment.to);
  const route = [from, to].filter(Boolean).join(' → ');
  const flight = receiptRelationText(segment.flightNo || segment.flight_number || segment.number || segment.train_number);
  return route || flight || `Перелёт ${index + 1}`;
}

function relationFlightOptions(serviceOptions, selectedServiceId, selectedServiceLabel) {
  const selected = serviceOptions.find((option) => (selectedServiceId && option.id === selectedServiceId)
    || (!selectedServiceId && selectedServiceLabel && option.label === selectedServiceLabel));
  if (!selected) return [];
  const segments = relationSegmentArrays(selected.raw);
  if (!segments.length) {
    return [{
      id: `${selected.id || selected.label}:1`,
      label: selected.label,
      hint: selected.hint,
    }];
  }
  return segments.map((segment, index) => ({
    id: receiptRelationText(segment.id) || `${selected.id || selected.label}:${index + 1}`,
    label: relationSegmentLabel(segment, index),
    hint: [
      segment.date || segment.departure_date || segment.starts_at,
      segment.dep || segment.departure_time,
      segment.flightNo || segment.flight_number || segment.number,
      segment.carrier || segment.airline,
    ].filter(Boolean).join(' · '),
  }));
}

function ReceiptRelationField({
  value, placeholder, title, sub, options, emptyTitle, searchPlaceholder, icon = 'briefcase', onPick,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);
  const normalizedQuery = query.trim().toLowerCase();
  const shown = normalizedQuery
    ? options.filter((option) => `${option.label} ${option.hint || ''}`.toLowerCase().includes(normalizedQuery))
    : options;
  return (
    <>
      <button type="button" className="select receipt-relation-field" onClick={() => setOpen(true)}
        aria-haspopup="dialog" aria-expanded={open}>
        <Icon name={icon} />
        <span className={value ? '' : 'is-placeholder'}>{value || placeholder}</span>
        <Icon name="chevRight" />
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} title={title} sub={sub}
        footer={<Button variant="secondary" style={{ width: '100%' }} onClick={() => setOpen(false)}>Отмена</Button>}>
        <SearchBox value={query} onChange={setQuery} placeholder={searchPlaceholder} style={{ width: '100%', marginBottom: 12 }} />
        <div className="receipt-relation-options">
          {shown.map((option) => (
            <button type="button" className="receipt-relation-option" key={option.id || option.label}
              onClick={() => { onPick(option); setOpen(false); }}>
              <span className="receipt-relation-option-icon"><Icon name={icon} /></span>
              <span>
                <b>{option.label}</b>
                {option.hint && <small>{option.hint}</small>}
              </span>
              <Icon name="chevRight" />
            </button>
          ))}
          {!shown.length && <EmptyState icon={icon} title={emptyTitle} />}
        </div>
      </Drawer>
    </>
  );
}

function asArray(value, fallback) {
  return Array.isArray(value) && value.length ? value : fallback;
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function parseReceiptDate(value) {
  const raw = String(value || '').trim();
  let match = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

function nightsBetween(start, end) {
  const from = parseReceiptDate(start);
  const to = parseReceiptDate(end);
  if (!from || !to || to <= from) return '';
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function receiptLegPlace(leg, side) {
  const name = String(leg?.[side] || '').trim();
  const code = String(leg?.[`${side}Code`] || '').trim();
  if (!code || name.includes(code)) return name || code || '—';
  return `${name || code} (${code})`;
}

export function receiptFinancialTotal(type, draft) {
  if (type === 'ЖД') {
    return roundMoney((Number(draft.ticketCost) || 0) + (Number(draft.reservedSeatCost) || 0)
      + (Number(draft.agencyServiceFee) || 0) + (Number(draft.additionalFees) || 0));
  }
  if (type === 'Гостиница' || type === 'Трансфер') {
    return roundMoney((Number(draft.supplierCost) || 0) + (Number(draft.markup) || 0)
      + (Number(draft.agencyServiceFee) || 0) + (Number(draft.additionalFees) || 0)
      - (Number(draft.discount) || 0));
  }
  return roundMoney((Number(draft.fare) || 0) + (Number(draft.taxes) || 0) + (Number(draft.fees) || 0));
}

function withFinancialAliases(type, draft) {
  const total = receiptFinancialTotal(type, draft);
  if (type === 'ЖД') {
    return { ...draft, fare: roundMoney((Number(draft.ticketCost) || 0) + (Number(draft.reservedSeatCost) || 0)),
      fees: roundMoney((Number(draft.agencyServiceFee) || 0) + (Number(draft.additionalFees) || 0)), total };
  }
  if (type === 'Гостиница' || type === 'Трансфер') {
    return { ...draft, fare: roundMoney(draft.supplierCost), fees: roundMoney((Number(draft.agencyServiceFee) || 0)
      + (Number(draft.additionalFees) || 0) + (Number(draft.markup) || 0) - (Number(draft.discount) || 0)), total };
  }
  return { ...draft, total };
}

export function normalizeReceiptDraft(type, value = {}) {
  const passengerFallback = value.passenger ? [{ ...emptyPassenger(), name: value.passenger, dob: value.dob || '',
    document: value.docNo || '', ticketNo: value.ticketNo || '',
    loyaltyCard: value.loyaltyCard || value.loyalty_card || '' }] : [emptyPassenger()];
  const passengers = asArray(value.passengers, passengerFallback).map((row) => ({ ...emptyPassenger(), ...row }));
  const supplierTotal = Number(value.total) || Number(value.originalTotal)
    || ((Number(value.fare) || 0) + (Number(value.taxes) || 0) + (Number(value.fees) || 0));
  const supplierBase = Number(value.fare) || supplierTotal;
  const draft = {
    carrier: '', carrierCode: '', passenger: passengers[0]?.name || '', passengers,
    dob: passengers[0]?.dob || '', docNo: passengers[0]?.document || '', ticketNo: passengers[0]?.ticketNo || '',
    ref: '', supplierOrderNo: '', hotelBookingNo: '', crmBindingMode: 'order',
    crmOrderId: '', crmOrderNo: '', crmPersonId: '', crmPerson: '', crmPassenger: '',
    crmService: '', crmServiceId: '', crmTrip: '', crmTripId: '',
    issueDate: '', bookingStatus: '', currency: 'RUB', tripType: type === 'Гостиница' ? 'stay' : 'oneway',
    legs: [emptyLeg()], fare: '', taxes: '', fees: '', total: '', originalTotal: supplierTotal || '', supplierFees: '',
    ticketCost: value.fare || '', reservedSeatCost: '', agencyServiceFee: value.fees || '',
    additionalFees: '', supplierCost: supplierBase || '', markup: '', discount: '',
    fareBreakdown: [], taxBreakdown: [], feeBreakdown: [], extras: [], fareInfo: {
      code: '', name: '', bookingClass: value.cls || '', exchangeRules: '', refundRules: '',
    },
    hotel: { name: value.carrier || '', category: '', country: '', city: '', address: '', phone: '', email: '', map: '' },
    rooms: [emptyRoom()], nights: '', hotelTerms: {
      deposit: '', cityTax: '', resortFee: '', registrationFee: '', cancellation: '',
      noShow: '', amendment: '', important: '', guestComment: '',
    },
    vehicle: { className: '', category: '', passengers: '', luggage: '', requirements: '' },
    transferTerms: {
      cancellation: '', freeWaiting: '', meetAndGreet: '', baggageHelp: '', supportContacts: '',
      supplierComment: '', driverComment: '', passengerComment: '',
    },
    output: { mode: 'original', template: '', priceMode: type === 'Гостиница' || type === 'Трансфер' ? 'hidden' : 'total' },
    priceSource: supplierTotal ? 'document' : 'manual', priceSourceOrder: '',
    internalComments: '', recognitionPending: true, backendWarnings: [], auditLog: [],
    ...value,
  };
  draft.passengers = passengers;
  draft.passenger = passengers[0]?.name || value.passenger || '';
  draft.legs = asArray(value.legs, [emptyLeg()]).map((row) => ({ ...emptyLeg(), ...row }));
  draft.fareBreakdown = Array.isArray(value.fareBreakdown) ? value.fareBreakdown : [];
  draft.taxBreakdown = Array.isArray(value.taxBreakdown) ? value.taxBreakdown : [];
  draft.feeBreakdown = Array.isArray(value.feeBreakdown) ? value.feeBreakdown : [];
  draft.extras = Array.isArray(value.extras) ? value.extras : [];
  draft.rooms = asArray(value.rooms, [emptyRoom()]).map((row) => ({ ...emptyRoom(), ...row }));
  const suppliedFareInfo = value.fareInfo || {};
  draft.fareInfo = {
    code: suppliedFareInfo.code || draft.fareBasis || draft.legs.find((leg) => leg.fareBasis)?.fareBasis || '',
    name: suppliedFareInfo.name || draft.legs.find((leg) => leg.cabin)?.cabin || '',
    bookingClass: suppliedFareInfo.bookingClass || draft.cls || draft.legs.find((leg) => leg.cls)?.cls || '',
    exchangeRules: suppliedFareInfo.exchangeRules || '',
    refundRules: suppliedFareInfo.refundRules || '',
  };
  draft.hotel = { name: value.carrier || '', category: '', country: '', city: '', address: '', phone: '', email: '', map: '', ...(value.hotel || {}) };
  draft.hotelTerms = { deposit: '', cityTax: '', resortFee: '', registrationFee: '', cancellation: '', noShow: '', amendment: '', important: '', guestComment: '', ...(value.hotelTerms || {}) };
  draft.vehicle = { className: '', category: '', passengers: '', luggage: '', requirements: '', ...(value.vehicle || {}) };
  draft.transferTerms = { cancellation: '', freeWaiting: '', meetAndGreet: '', baggageHelp: '', supportContacts: '', supplierComment: '', driverComment: '', passengerComment: '', ...(value.transferTerms || {}) };
  draft.output = { mode: 'original', template: '', priceMode: type === 'Гостиница' || type === 'Трансфер' ? 'hidden' : 'total', ...(value.output || {}) };
  draft.auditLog = Array.isArray(value.auditLog) ? value.auditLog : [];
  draft.supplierOrderNo = value.supplierOrderNo || value.supplier_order_number || value.order_number
    || ((type === 'ЖД' || type === 'Гостиница' || type === 'Трансфер') ? value.ref || value.reference || '' : '');
  draft.hotelBookingNo = value.hotelBookingNo || value.hotel_booking_number || '';
  draft.crmOrderId = value.crmOrderId || value.crm_order_id || '';
  draft.crmOrderNo = value.crmOrderNo || value.crm_order_no || '';
  draft.crmPersonId = value.crmPersonId || value.crm_person_id || '';
  draft.crmPerson = value.crmPerson || value.crm_person || '';
  draft.crmBindingMode = draft.crmPerson && !draft.crmOrderNo ? 'person' : (value.crmBindingMode || 'order');
  if (value.originalTotal === undefined || value.originalTotal === '') draft.originalTotal = supplierTotal || '';
  if (type === 'ЖД') {
    const firstFinancial = (...values) => values.find((item) => item !== undefined && item !== null && item !== '') ?? '';
    draft.reservedSeatCost = firstFinancial(value.reservedSeatCost, value.reserved_seat_cost);
    draft.agencyServiceFee = firstFinancial(value.agencyServiceFee, value.agency_service_fee, value.fees);
    draft.additionalFees = firstFinancial(value.additionalFees, value.additional_fees);
    const explicitTicketCost = firstFinancial(value.ticketCost, value.ticket_cost, value.fare);
    draft.ticketCost = explicitTicketCost !== '' ? explicitTicketCost : roundMoney(Math.max(supplierTotal
      - (Number(draft.reservedSeatCost) || 0) - (Number(draft.agencyServiceFee) || 0)
      - (Number(draft.additionalFees) || 0), 0));
  }
  if ((type === 'Гостиница' || type === 'Трансфер') && (value.supplierCost === undefined || value.supplierCost === '')) draft.supplierCost = supplierBase || '';
  if ((type === 'Гостиница' || type === 'Трансфер') && (value.agencyServiceFee === undefined || value.agencyServiceFee === '')) draft.agencyServiceFee = value.fees || '';
  return withFinancialAliases(type, draft);
}

export function receiptParticipantNames(draft) {
  const groupNames = (draft.groupTickets || []).flatMap((ticket) => {
    const ticketNames = (ticket.passengers || []).map((row) => String(row.name || '').trim()).filter(Boolean);
    const fallback = String(ticket.passenger || ticket.passenger_name || '').trim();
    return ticketNames.length ? ticketNames : (fallback ? [fallback] : []);
  });
  if (groupNames.length > 1) return [...new Set(groupNames)];
  const names = (draft.passengers || []).map((row) => String(row.name || '').trim()).filter(Boolean);
  const fallback = String(draft.passenger || '').trim();
  const resolved = names.length ? names : (fallback ? [fallback] : []);
  if (resolved.length === 1 && Number(draft.receiptCount) > 1 && resolved[0].includes(',')) {
    const split = resolved[0].split(/\s*,\s*/).map((name) => name.trim()).filter(Boolean);
    if (split.length > 1) return split;
  }
  return resolved;
}

export function receiptParticipantLabel(draft, fallback = 'квитанция') {
  const names = receiptParticipantNames(draft);
  return names.length ? `${names[0]}${names.length > 1 ? ` +${names.length - 1}` : ''}` : fallback;
}

export function receiptDetailsLines(type, draft) {
  const legs = draft.legs || [];
  if (type === 'Гостиница') {
    const stay = legs[0] || {};
    const guests = receiptParticipantNames(draft).length;
    return [
      draft.hotel?.name || draft.carrier || 'Отель не распознан',
      [stay.date, stay.endDate].filter(Boolean).join('–') || 'Период не распознан',
      [guests ? `${guests} гост.` : '', draft.nights ? `${draft.nights} ноч.` : ''].filter(Boolean).join(' • ') || 'Гости не распознаны',
    ];
  }
  const first = legs[0] || {};
  const last = legs[legs.length - 1] || {};
  const route = legs.length
    ? [...legs.map((leg) => leg.fromCode || leg.from).filter(Boolean), last.toCode || last.to].filter(Boolean).join(' → ')
    : '';
  if (type === 'Трансфер') {
    return [route || 'Маршрут не распознан', [first.date, first.dep].filter(Boolean).join(' · ') || 'Дата не распознана',
      `${receiptParticipantNames(draft).length || draft.vehicle?.passengers || 0} пассаж.`];
  }
  if (type === 'ЖД') {
    const train = [
      first.flightNo ? `Поезд ${first.flightNo}` : '',
      first.coach ? `вагон ${first.coach}` : '',
      first.seat ? `место ${first.seat}` : '',
    ].filter(Boolean).join(' · ');
    return [route || 'Маршрут не распознан', first.date || 'Дата не распознана', train || 'Поезд, вагон и место не распознаны'];
  }
  const dates = [first.date, last.date && last.date !== first.date ? last.date : ''].filter(Boolean).join('–');
  return [route || 'Маршрут не распознан', dates || 'Дата не распознана',
    draft.tripType === 'oneway' && legs.length === 1 ? (first.flightNo || 'Рейс не распознан') : `${legs.length} сегм.`];
}

function Section({ title, action, children }) {
  return (
    <section className="receipt-section">
      <div className="receipt-section-head"><h3>{title}</h3>{action}</div>
      {children}
    </section>
  );
}

function SourceNotice({ correctionMode, onToggle }) {
  return (
    <div className={'receipt-source-notice ' + (correctionMode ? 'is-correction' : '')}>
      <Icon name={correctionMode ? 'alertCircle' : 'lock'} />
      <div><b>{correctionMode ? 'Режим исправления распознавания включён' : 'Данные поставщика защищены'}</b>
        <span>{correctionMode ? 'Изменения попадут в журнал, оригинальный файл останется без изменений.' : 'Для исправления ошибки OCR включите специальный режим.'}</span></div>
      <Button size="sm" variant={correctionMode ? 'secondary' : 'ghost'} onClick={onToggle}>
        {correctionMode ? 'Завершить исправление' : 'Исправить распознавание'}
      </Button>
    </div>
  );
}

function LockedInput({ correctionMode, ...props }) {
  const lockedProps = correctionMode ? {} : { disabled: true, className: 'input receipt-locked-input' };
  return <Input {...props} {...lockedProps} />;
}

function TextArea({ value, onChange, disabled, placeholder, rows = 3 }) {
  return <textarea className={'input receipt-textarea' + (disabled ? ' receipt-locked-input' : '')}
    value={value || ''} onChange={onChange} disabled={disabled} placeholder={placeholder} rows={rows} />;
}

function ProtectedDate({ correctionMode, label, value, onChange }) {
  if (correctionMode) return <UFDateField label={label} value={value || null} onChange={onChange} placeholder="дд.мм.гггг" />;
  return <Field label={label}><Input disabled className="input receipt-locked-input" value={value || ''} placeholder="дд.мм.гггг" /></Field>;
}

function ProtectedTime({ correctionMode, label, value, onChange }) {
  if (correctionMode) return <TimeField label={label} value={value || ''} onChange={onChange} />;
  return <Field label={label}><Input disabled className="input receipt-locked-input" value={value || ''} placeholder="чч:мм" /></Field>;
}

function ListHeader({ title, onAdd, addLabel = 'Добавить' }) {
  return <div className="receipt-list-head"><b>{title}</b><Button size="sm" variant="ghost" icon="plus" onClick={onAdd}>{addLabel}</Button></div>;
}

function RowRemove({ onClick, label = 'Удалить' }) {
  return <Button type="button" size="sm" variant="ghost" icon="trash" className="receipt-remove"
    aria-label="Удалить строку" title="Удалить строку" onClick={onClick}>{label}</Button>;
}

function AuditLog({ rows }) {
  return (
    <Section title="Журнал действий">
      {rows?.length ? <div className="receipt-audit">{rows.slice().reverse().map((row, index) => (
        <div key={`${row.at}-${index}`}><span>{row.at}</span><b>{row.user}</b><p>{row.label}: «{String(row.before || '—')}» → «{String(row.after || '—')}»</p></div>
      ))}</div> : <div className="receipt-empty">Изменений оператора пока нет</div>}
    </Section>
  );
}

export function ReceiptDocumentPreview({ type, draft }) {
  const meta = TYPE_META[type] || TYPE_META['Прочее'];
  const lines = receiptDetailsLines(type, draft);
  const participants = receiptParticipantNames(draft);
  return (
    <div className="receipt-preview">
      <header><span style={{ background: meta.color }}><Icon name={meta.icon} /></span>
        <div><b>{meta.document}</b><small>{draft.carrier || draft.hotel?.name || 'Поставщик не распознан'}</small></div>
        <div className="receipt-preview-ref"><small>{type === 'Авиа' ? 'PNR' : 'Бронь поставщика'}</small><b>{draft.ref || draft.supplierOrderNo || '—'}</b></div>
      </header>
      <div className="receipt-preview-body">
        <div className="receipt-preview-summary">{lines.map((line, i) => <div key={i}>{line}</div>)}</div>
        <div className="receipt-preview-grid">
          <div><small>{type === 'Гостиница' ? 'Гости' : 'Пассажиры'}</small><b>{participants[0] || '—'}{participants.length > 1 ? ` +${participants.length - 1}` : ''}</b></div>
          <div><small>Заказ CRM</small><b>{draft.crmOrderNo || 'Не привязан'}</b></div>
          <div><small>Валюта</small><b>{draft.currency || '—'}</b></div>
          <div><small>Итого клиенту</small><b>{receiptFinancialTotal(type, draft).toLocaleString('ru-RU')} {draft.currency || ''}</b></div>
        </div>
        {type === 'ЖД' && <div className="receipt-preview-rail-place">
          <span>Поезд</span><b>{draft.legs?.[0]?.flightNo || '—'}</b>
          <span>Вагон</span><b>{draft.legs?.[0]?.coach || '—'}</b>
          <span>Место</span><b>{draft.legs?.[0]?.seat || '—'}</b>
        </div>}
        {type === 'ЖД' && draft.crmOrderNo && <div className="receipt-rail-footer">Заказ в CRM: № {draft.crmOrderNo}</div>}
      </div>
    </div>
  );
}

export function ReceiptBrandDocumentDrawer({ open, type, draft, originalUrl, onClose }) {
  const [previewMode, setPreviewMode] = useState('agency');
  useEffect(() => {
    if (!open) return;
    const storedMode = draft?.output?.mode;
    setPreviewMode(storedMode && storedMode !== 'original' ? storedMode : 'agency');
  }, [open, draft?.output?.mode, type]);
  if (!open || !draft) return null;
  const p = normalizeReceiptDraft(type, draft);
  const participants = receiptParticipantNames(p);
  const output = { ...(p.output || {}), mode: previewMode };
  const organization = output.mode === 'saas' ? 'Компания клиента' : 'ПСЦ Travel Hub';
  const outputLabel = output.mode === 'saas' ? 'Фирменный ваучер SaaS-компании' : output.mode === 'agency' ? 'Фирменный бланк агентства' : 'Оригинал поставщика';
  const price = output.priceMode === 'paid' ? 'Оплачено'
    : output.priceMode === 'hidden' ? '' : `${receiptFinancialTotal(type, p).toLocaleString('ru-RU')} ${p.currency || ''}`;
  const money = (value) => `${roundMoney(value).toLocaleString('ru-RU')} ${p.currency || ''}`.trim();
  const rowMoney = (row) => `${Number(row.amount || 0).toLocaleString('ru-RU', { maximumFractionDigits: 6 })} ${row.currency || ''}`.trim();
  const fareRows = p.fareBreakdown?.length ? p.fareBreakdown : [];
  const taxRows = p.taxBreakdown?.length ? p.taxBreakdown
    : (Number(p.taxes) ? [{ code: 'TAX', label: 'Таксы перевозчика', amount: p.taxes }] : []);
  const feeRows = p.feeBreakdown?.length ? p.feeBreakdown
    : (Number(p.fees) ? [{ code: 'FEE', label: 'Сервисный сбор', amount: p.fees }] : []);
  const terms = type === 'Гостиница'
    ? [['Депозит', p.hotelTerms.deposit], ['Городской налог', p.hotelTerms.cityTax], ['Курортный сбор', p.hotelTerms.resortFee],
      ['Условия отмены', p.hotelTerms.cancellation], ['Штраф при незаезде', p.hotelTerms.noShow], ['Важная информация', p.hotelTerms.important],
      ['Комментарий для гостя', p.hotelTerms.guestComment]]
    : [['Условия отмены', p.transferTerms.cancellation], ['Бесплатное ожидание', p.transferTerms.freeWaiting],
      ['Встреча с табличкой', p.transferTerms.meetAndGreet], ['Помощь с багажом', p.transferTerms.baggageHelp],
      ['Контакты поддержки', p.transferTerms.supportContacts], ['Комментарий пассажиру', p.transferTerms.passengerComment]];
  const hotelCategory = type === 'Гостиница' && p.hotel.category
    && !String(p.hotel.name || '').toLowerCase().includes(String(p.hotel.category).toLowerCase())
    ? p.hotel.category : '';
  const hotelLocation = type === 'Гостиница'
    ? [['Категория отеля', hotelCategory], ['Город', p.hotel.city], ['Страна', p.hotel.country]].filter(([, value]) => value)
    : [];
  const hotelContacts = type === 'Гостиница'
    ? [['Телефон', p.hotel.phone], ['Электронная почта', p.hotel.email], ['Карта / координаты', p.hotel.map]].filter(([, value]) => value)
    : [];
  const printReceipt = () => {
    const cleanup = () => document.body.classList.remove('receipt-printing');
    document.body.classList.add('receipt-printing');
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 1000);
  };
  return (
    <Drawer open={open} onClose={onClose} title="Предпросмотр клиентского документа"
      sub={`${outputLabel}${output.template ? ` · ${output.template}` : ''}`} width="min(860px,98vw)"
      footer={<>
        {originalUrl && <Button variant="secondary" icon="eye" onClick={() => window.open(originalUrl, '_blank')}>Оригинал поставщика</Button>}
        <Button variant="secondary" onClick={onClose}>Закрыть</Button>
        {output.mode !== 'original' && <Button icon="download" onClick={printReceipt}>Печать / сохранить PDF</Button>}
      </>}>
      <div className="receipt-brand-variants" aria-label="Вариант бланка">
        {[
          ['original', 'Оригинал поставщика'],
          ['agency', 'Бланк агентства'],
          ['saas', 'Бланк SaaS-компании'],
        ].map(([mode, label]) => <button type="button" key={mode}
          className={output.mode === mode ? 'active' : ''} aria-pressed={output.mode === mode}
          onClick={() => setPreviewMode(mode)}>{label}</button>)}
      </div>
      {output.mode === 'original' ? (
        <div className="receipt-source-notice"><Icon name="lock" /><div><b>Будет использован оригинал поставщика</b>
          <span>Исходный файл хранится и отправляется без изменений.</span></div></div>
      ) : (
        <article className="receipt-brand-document">
          <header><div className="receipt-brand-logo">P</div><div><b>{organization}</b><span>{TYPE_META[type]?.document || 'Документ'}</span></div>
            <div><small>Заказ CRM</small><b>{p.crmOrderNo || '—'}</b></div></header>
          {type === 'Авиа' && <section className="receipt-brand-passengers">
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
              return <div className="receipt-brand-passenger" key={`${passenger.name || 'passenger'}-${index}`}>
                {p.passengers.length > 1 && <h5>Пассажир {index + 1}</h5>}
                <div className="receipt-brand-passenger-grid">{details.map(([label, value]) => <div key={label}>
                  <small>{label}</small><b>{value || '—'}</b>
                </div>)}</div>
              </div>;
            })}
          </section>}
          <div className="receipt-brand-meta">
            <div><small>Заказ поставщика/API</small><b>{p.supplierOrderNo || '—'}</b></div>
            <div><small>{type === 'Авиа' ? 'PNR / код бронирования' : type === 'Гостиница' ? 'Бронь отеля' : 'Бронь / билет'}</small>
              <b>{type === 'Гостиница' ? p.hotelBookingNo || p.ref || '—' : p.ref || p.ticketNo || '—'}</b></div>
            <div><small>Дата оформления</small><b>{p.issueDate || '—'}</b></div>
            <div><small>Статус</small><b>{p.bookingStatus || 'Подтверждено'}</b></div>
          </div>

          {type === 'Гостиница' && <>
            <h3>{p.hotel.name || 'Отель'}</h3>
            {hotelLocation.length > 0 && <div className="receipt-brand-hotel-facts">
              {hotelLocation.map(([label, value]) => <div key={label}><small>{label}</small><b>{value}</b></div>)}
            </div>}
            <section className="receipt-brand-hotel-address">
              <small>Адрес</small>
              <b>{p.hotel.address || 'Не указан'}</b>
            </section>
            {hotelContacts.length > 0 && <section className="receipt-brand-hotel-contacts">
              {hotelContacts.map(([label, value]) => <div key={label}><small>{label}</small><b>{value}</b></div>)}
            </section>}
            <div className="receipt-brand-period"><b>{p.legs[0]?.date || '—'} → {p.legs[0]?.endDate || '—'}</b><span>{p.nights || '—'} ноч.</span></div>
            <h4>Размещение</h4>
            <div className="receipt-brand-hotel-rooms">{p.rooms.map((room, index) => {
              const roomFacts = [
                ['Категория номера', room.category],
                ['Название номера', room.name],
                ['Тип кровати', room.bedType],
                ['Взрослых', room.adults ?? 0],
                ['Детей', room.children ?? 0],
                ['Питание', room.meal],
                ['Ранний заезд', room.earlyCheckIn],
                ['Поздний выезд', room.lateCheckOut],
              ].filter(([, value]) => value !== '' && value !== null && value !== undefined);
              return <section key={index} className="receipt-brand-hotel-room">
                <h5>Номер {index + 1}</h5>
                <div className="receipt-brand-hotel-room-grid">{roomFacts.map(([label, value]) => <div key={label}>
                  <small>{label}</small><b>{value}</b>
                </div>)}</div>
                {p.rooms.length > 1 && !!room.guestIds?.length && <div className="receipt-brand-hotel-room-note">
                  <small>Гости номера</small><span>{room.guestIds.join(', ')}</span>
                </div>}
                {room.conditions && <div className="receipt-brand-hotel-room-note"><small>Дополнительные условия</small><span>{room.conditions}</span></div>}
              </section>;
            })}</div>
          </>}

          {type === 'Авиа' && <>
            <h3>{receiptDetailsLines(type, p)[0]}</h3>
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
                ['Класс бронирования', leg.cls],
                ['Код тарифа', leg.fareBasis],
                ['Класс обслуживания', leg.cabin],
                ['Багаж', leg.baggage],
                ['Статус', leg.status],
              ];
              return <React.Fragment key={`${leg.flightNo || 'segment'}-${index}`}>
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
          </>}

          {(type === 'ЖД' || type === 'Трансфер') && <>
            <h3>{receiptDetailsLines(type, p)[0]}</h3>
            <h4>{type === 'Трансфер' ? 'Поездки' : 'Маршрут'}</h4>
            <div className="receipt-brand-list">{p.legs.map((leg, index) => <div key={index}>
              <b>{leg.from || leg.fromCode || '—'} → {leg.to || leg.toCode || '—'}</b>
              <span>{[leg.date, leg.dep, leg.arr, leg.flightNo].filter(Boolean).join(' · ')}</span>
              {type === 'ЖД' && <span>{[
                leg.coach ? `Вагон ${leg.coach}` : '',
                leg.seat ? `место ${leg.seat}` : '',
              ].filter(Boolean).join(' · ') || 'Вагон и место не распознаны'}</span>}
              {(leg.fromAddress || leg.toAddress) && <span>{[leg.fromAddress, leg.toAddress].filter(Boolean).join(' → ')}</span>}
            </div>)}</div>
          </>}

          {type !== 'Авиа' && <>
            <h4>{type === 'Гостиница' ? 'Гости' : 'Пассажиры'}</h4>
            <div className="receipt-brand-names">{participants.map((name) => <span key={name}>{name}</span>)}</div>
          </>}

          {type === 'Трансфер' && <div className="receipt-brand-callout"><b>Автомобиль</b>
            <span>{[p.vehicle.className, p.vehicle.category, p.vehicle.passengers && `${p.vehicle.passengers} пассаж.`, p.vehicle.luggage && `${p.vehicle.luggage} багажа`].filter(Boolean).join(' · ')}</span>
            {p.vehicle.requirements && <span>{p.vehicle.requirements}</span>}
          </div>}
          {type === 'Авиа' && p.extras.length > 0 && <><h4>Дополнительные услуги</h4>
            <div className="receipt-brand-names">{p.extras.map((row, index) => <span key={index}>{row.name}{row.details ? ` · ${row.details}` : ''}</span>)}</div></>}
          {(type === 'Гостиница' || type === 'Трансфер') && terms.some(([, value]) => value) && <><h4>Условия и важная информация</h4>
            <div className="receipt-brand-terms">{terms.filter(([, value]) => value).map(([label, value]) => <div key={label}><b>{label}</b><span>{value}</span></div>)}</div></>}
          {type === 'Авиа' && <><h4>Расчёт стоимости</h4>
            <div className="receipt-brand-finance-groups">
              <section><h5>Тариф</h5><div className="receipt-brand-finance">
                <div><span>Тариф перевозчика</span><b>{money(p.fare)}</b></div>
                {fareRows.map((row, index) => <div key={`fare-${index}`}><span>{[row.code, row.label].filter(Boolean).join(' · ') || 'Расчёт тарифа'}</span><b>{rowMoney(row)}</b></div>)}
              </div></section>
              <section><h5>Таксы</h5><div className="receipt-brand-finance">
                <div><span>Таксы перевозчика</span><b>{money(p.taxes)}</b></div>
                {taxRows.map((row, index) => <div key={`tax-${index}`}><span>{[row.code, row.label].filter(Boolean).join(' · ') || 'Такса'}</span><b>{money(row.amount)}</b></div>)}
              </div></section>
              <section><h5>Сборы</h5><div className="receipt-brand-finance">
                <div><span>Сервисный сбор</span><b>{money(p.fees)}</b></div>
                {feeRows.map((row, index) => <div key={`fee-${index}`}><span>{[row.code, row.label].filter(Boolean).join(' · ') || 'Сбор'}</span><b>{money(row.amount)}</b></div>)}
              </div></section>
              <div className="receipt-brand-finance-total"><span>Итого для клиента</span><b>{money(receiptFinancialTotal(type, p))}</b></div>
            </div>
            {(p.fareInfo.code || p.fareInfo.name || p.fareInfo.bookingClass) && <div className="receipt-brand-callout"><b>Тариф</b>
              <span>{[p.fareInfo.code, p.fareInfo.name, p.fareInfo.bookingClass].filter(Boolean).join(' · ')}</span></div>}
          </>}
          {type === 'ЖД' && <><h4>Расчёт стоимости</h4>
            <div className="receipt-brand-finance">
              <div><span>Стоимость билета</span><b>{money(p.ticketCost)}</b></div>
              <div><span>Стоимость плацкарты</span><b>{money(p.reservedSeatCost)}</b></div>
              <div><span>Сервисный сбор агентства</span><b>{money(p.agencyServiceFee)}</b></div>
              <div><span>Дополнительные сборы</span><b>{money(p.additionalFees)}</b></div>
              <div className="is-total"><span>Итого для клиента</span><b>{money(receiptFinancialTotal(type, p))}</b></div>
            </div>
            {p.crmOrderNo && <div className="receipt-rail-footer">Заказ в CRM: № {p.crmOrderNo}</div>}
          </>}
          {price && type !== 'Авиа' && type !== 'ЖД' && <div className="receipt-brand-total"><span>{output.priceMode === 'paid' ? 'Статус оплаты' : 'Итого для клиента'}</span><b>{price}</b></div>}
          <footer>{organization} · Сформировано в PSC Travel Hub</footer>
        </article>
      )}
    </Drawer>
  );
}

export function ReceiptSpecializedForm({
  type, value, onChange, correctionMode, onToggleCorrection, orders = [], services = [],
}) {
  const p = useMemo(() => normalizeReceiptDraft(type, value), [type, value]);
  const user = (typeof window !== 'undefined' && window.CURRENT_USER?.name) || 'Оператор';
  const commit = (next, label, before, after) => {
    const changed = String(before ?? '') !== String(after ?? '');
    const auditLog = changed ? [...(next.auditLog || []), {
      at: new Date().toLocaleString('ru-RU'), user, label, before: before ?? '', after: after ?? '',
    }] : (next.auditLog || []);
    onChange(withFinancialAliases(type, { ...next, auditLog }));
  };
  const set = (key, next, label = key) => commit({ ...p, [key]: next }, label, p[key], next);
  const setObject = (key, field, next, label) => commit({ ...p, [key]: { ...p[key], [field]: next } }, label, p[key]?.[field], next);
  const synchronizeBreakdown = (draft, key, rows) => {
    const sum = roundMoney(rows.reduce((total, row) => total + (Number(row.amount) || 0), 0));
    if (key === 'taxBreakdown') return { ...draft, taxes: sum };
    if (key === 'feeBreakdown' && type === 'ЖД') return { ...draft, agencyServiceFee: sum };
    if (key === 'feeBreakdown') return { ...draft, fees: sum };
    return draft;
  };
  const setArray = (key, index, field, next, label) => {
    const rows = (p[key] || []).map((row, i) => i === index ? { ...row, [field]: next } : row);
    const autoNights = type === 'Гостиница' && key === 'legs' && ['date', 'endDate'].includes(field)
      ? nightsBetween(rows[0]?.date, rows[0]?.endDate) : null;
    const nextDraft = synchronizeBreakdown({ ...p, [key]: rows,
      ...(autoNights !== null && autoNights !== '' ? { nights: autoNights } : {}),
      ...(key === 'passengers' && index === 0 && field === 'name' ? { passenger: next } : {}) }, key, rows);
    commit(nextDraft,
      label, p[key]?.[index]?.[field], next);
  };
  const addRow = (key, row, label) => commit({ ...p, [key]: [...(p[key] || []), row] }, label, '—', `Строка ${(p[key] || []).length + 1}`);
  const removeRow = (key, index, label) => {
    if ((p[key] || []).length <= 1 && ['passengers', 'legs', 'rooms'].includes(key)) return;
    const before = p[key]?.[index]?.name || p[key]?.[index]?.flightNo || `Строка ${index + 1}`;
    const rows = (p[key] || []).filter((_, i) => i !== index);
    commit(synchronizeBreakdown({ ...p, [key]: rows }, key, rows), label, before, 'Удалено');
  };
  const source = (label, key, input = {}) => <Field label={label}><LockedInput correctionMode={correctionMode}
    value={p[key] || ''} onChange={(e) => set(key, e.target.value, label)} {...input} /></Field>;
  const setTripType = (tripType) => {
    let legs = p.legs.map((leg) => ({ ...leg }));
    if (tripType === 'oneway') legs = [{ ...(legs[0] || emptyLeg()), dir: 'out' }];
    if (tripType === 'roundtrip') {
      const outbound = { ...(legs[0] || emptyLeg()), dir: 'out' };
      const inbound = legs.find((leg) => leg.dir === 'back') || legs[1] || emptyLeg();
      legs = [outbound, { ...inbound, dir: 'back', from: inbound.from || outbound.to, fromCode: inbound.fromCode || outbound.toCode,
        to: inbound.to || outbound.from, toCode: inbound.toCode || outbound.fromCode }];
    }
    if (tripType === 'complex') {
      legs = legs.map((leg) => ({ ...leg, dir: 'seg' }));
      if (legs.length < 2) legs.push({ ...emptyLeg(), dir: 'seg' });
    }
    commit({ ...p, tripType, legs }, 'Тип маршрута', p.tripType, tripType);
  };
  const bindingTarget = p.crmBindingMode === 'person' || (p.crmPerson && !p.crmOrderNo)
    ? { mode: 'person', client: p.crmPerson, id: p.crmPersonId, label: p.crmPerson || 'Выберите физ. лицо' }
    : {
      mode: 'order',
      order: p.crmOrderNo ? { id: p.crmOrderId, no: p.crmOrderNo } : null,
      label: p.crmOrderNo ? `Заказ № ${p.crmOrderNo}` : 'Выберите заказ',
    };
  const setBindingTarget = (target) => {
    const before = p.crmBindingMode === 'person' ? p.crmPerson : p.crmOrderNo;
    const next = target?.mode === 'person'
      ? {
        ...p, crmBindingMode: 'person', crmPerson: target.client || '', crmPersonId: target.id || '',
        crmOrderNo: '', crmOrderId: '', crmService: '', crmServiceId: '', crmTrip: '', crmTripId: '',
      }
      : {
        ...p, crmBindingMode: 'order', crmOrderNo: target?.order?.no || '',
        crmOrderId: target?.order?.id || '', crmPerson: '', crmPersonId: '',
        crmService: '', crmServiceId: '', crmTrip: '', crmTripId: '',
      };
    const after = target?.mode === 'person' ? target.client || '' : target?.order?.no || '';
    commit(next, 'Привязка квитанции', before, after);
  };
  const selectedOrder = orders.find((order) => receiptRelationText(order.id) === receiptRelationText(p.crmOrderId)
    || receiptRelationText(order.no) === receiptRelationText(p.crmOrderNo));
  const serviceOptions = useMemo(
    () => relationServiceOptions(type, services, { crmOrderId: p.crmOrderId || selectedOrder?.id || '', crmOrderNo: p.crmOrderNo }),
    [type, services, p.crmOrderId, p.crmOrderNo, selectedOrder?.id],
  );
  const selectedService = serviceOptions.find((option) => (p.crmServiceId && option.id === p.crmServiceId)
    || (!p.crmServiceId && p.crmService && option.label === p.crmService));
  const flightOptions = useMemo(
    () => relationFlightOptions(serviceOptions, p.crmServiceId, p.crmService),
    [serviceOptions, p.crmServiceId, p.crmService],
  );
  const pickService = (option) => {
    const next = {
      ...p,
      crmService: option.label,
      crmServiceId: option.id || '',
      crmTrip: '',
      crmTripId: '',
    };
    commit(next, 'Привязка к услуге', p.crmService, option.label);
  };
  const pickFlight = (option) => {
    commit({ ...p, crmTrip: option.label, crmTripId: option.id || '' },
      'Привязка к перелёту', p.crmTrip, option.label);
  };

  const bindingBlock = (
    <Section title="Привязка квитанции">
      <div className="receipt-form-grid">
        <Field label="Заказ CRM или физическое лицо">
          <UnifiedBindField value={bindingTarget} onChange={setBindingTarget} modes={['order', 'person']}
            title="Куда привязать квитанцию"
            sub="Выберите существующий заказ CRM или физическое лицо"
            style={{ width: '100%' }} />
        </Field>
        <Field label={type === 'Гостиница' ? 'Услуга размещения' : type === 'Трансфер' ? 'Услуга трансфера' : 'Услуга'}>
          <ReceiptRelationField
            value={p.crmService}
            placeholder="Выберите услугу"
            title="Выбор услуги"
            sub={selectedOrder ? `Заказ № ${selectedOrder.no} · ${selectedOrder.client || ''}` : 'Выберите услугу CRM для этой квитанции'}
            options={serviceOptions}
            emptyTitle={p.crmOrderId || p.crmOrderNo ? 'В заказе нет подходящих услуг' : 'Сначала выберите заказ CRM'}
            searchPlaceholder="Название, маршрут или статус"
            icon={TYPE_META[type]?.icon || 'briefcase'}
            onPick={pickService}
          />
        </Field>
        {type === 'Авиа' && <Field label="Соответствующий перелёт">
          <ReceiptRelationField
            value={p.crmTrip}
            placeholder="Выберите перелёт"
            title="Соответствующий перелёт"
            sub={selectedService ? selectedService.label : 'Сначала выберите услугу, затем нужный перелёт'}
            options={flightOptions}
            emptyTitle={selectedService ? 'В услуге нет перелётов' : 'Сначала выберите услугу'}
            searchPlaceholder="Маршрут, дата или номер рейса"
            icon="plane"
            onPick={pickFlight}
          />
        </Field>}
      </div>
      <div className="receipt-binding-note">Привязка задаётся один раз здесь. Сопоставление каждого пассажира или гостя с карточкой CRM остаётся в блоке участников.</div>
    </Section>
  );

  const commonBooking = (
    <Section title="1. Информация о документе">
      <div className="receipt-form-grid">
        {type === 'Авиа' && source('Номер билета', 'ticketNo')}
        {type === 'Авиа' && source('Код бронирования (PNR)', 'ref')}
        {type === 'Авиа' && source('Номер заказа поставщика/API', 'supplierOrderNo')}
        {type === 'Гостиница' && source('Бронирование поставщика', 'supplierOrderNo')}
        {type === 'Гостиница' && source('Бронирование отеля', 'hotelBookingNo')}
        {(type === 'ЖД' || type === 'Трансфер') && source('Номер заказа поставщика', 'supplierOrderNo')}
        {source('Дата оформления', 'issueDate')}
        {source('Статус бронирования', 'bookingStatus')}
        <Field label="Валюта"><Select options={['RUB', 'USD', 'EUR', 'KGS', 'KZT', 'CNY']} value={p.currency || 'RUB'} onChange={(e) => set('currency', e.target.value, 'Валюта')} /></Field>
      </div>
    </Section>
  );

  const passengerBlock = (
    <Section title={type === 'Гостиница' ? '5. Гости' : '2. Пассажиры'} action={correctionMode
      ?
      <Button size="sm" variant="ghost" icon="plus" onClick={() => addRow('passengers', emptyPassenger(), type === 'Гостиница' ? 'Добавлен гость' : 'Добавлен пассажир')}>Добавить</Button>
      : null}>
      <div className="receipt-stack">{p.passengers.map((row, index) => (
        <div className="receipt-subcard" key={index}>
          <div className="receipt-subcard-title"><b>{type === 'Гостиница' ? `Гость ${index + 1}` : `Пассажир ${index + 1}`}</b>
            {correctionMode && p.passengers.length > 1 && <RowRemove label="" onClick={() => removeRow('passengers', index, 'Удалён участник')} />}</div>
          <div className="receipt-form-grid">
            <Field label="ФИО"><LockedInput correctionMode={correctionMode} value={row.name} onChange={(e) => setArray('passengers', index, 'name', e.target.value, `ФИО участника ${index + 1}`)} /></Field>
            <ProtectedDate correctionMode={correctionMode} label="Дата рождения" value={row.dob}
              onChange={(next) => setArray('passengers', index, 'dob', next, `Дата рождения участника ${index + 1}`)} />
            {type === 'Авиа' && <Field label="Документ"><LockedInput correctionMode={correctionMode} value={row.document} onChange={(e) => setArray('passengers', index, 'document', e.target.value, `Документ участника ${index + 1}`)} /></Field>}
            {type === 'Авиа' && <Field label="Номер билета"><LockedInput correctionMode={correctionMode} value={row.ticketNo} onChange={(e) => setArray('passengers', index, 'ticketNo', e.target.value, `Билет участника ${index + 1}`)} /></Field>}
            {type === 'Авиа' && <Field label="Бонусная карта"><LockedInput correctionMode={correctionMode} value={row.loyaltyCard} onChange={(e) => setArray('passengers', index, 'loyaltyCard', e.target.value, `Бонусная карта участника ${index + 1}`)} /></Field>}
            {type === 'Гостиница' && <Field label="Тип гостя"><Select options={['Взрослый', 'Ребёнок']} value={row.guestType} onChange={(e) => setArray('passengers', index, 'guestType', e.target.value, `Тип гостя ${index + 1}`)} /></Field>}
            {type === 'Трансфер' && <Field label="Мобильный телефон"><Input value={row.phone} onChange={(e) => setArray('passengers', index, 'phone', e.target.value, `Телефон пассажира ${index + 1}`)} /></Field>}
            {type === 'Трансфер' && <Field label="Текст на табличке"><Input value={row.signText} onChange={(e) => setArray('passengers', index, 'signText', e.target.value, `Табличка пассажира ${index + 1}`)} /></Field>}
            <Field label="Привязка к пассажиру CRM">
              <UnifiedBindField
                value={row.crmPassenger
                  ? { mode: 'person', client: row.crmPassenger, label: row.crmPassenger }
                  : { mode: 'person', label: 'Выберите пассажира CRM' }}
                onChange={(target) => setArray('passengers', index, 'crmPassenger', target?.client || '', `Привязка участника ${index + 1}`)}
                modes={['person']}
                title="Привязка к пассажиру"
                sub={`Выберите пассажира CRM для ${row.name || `участника ${index + 1}`}`}
                style={{ width: '100%' }}
              />
            </Field>
          </div>
        </div>
      ))}</div>
    </Section>
  );

  const routeBlock = (
    <Section title={type === 'Гостиница' ? '3. Период проживания' : '3. Маршрут'} action={
      type !== 'Гостиница' && correctionMode ? <Button size="sm" variant="ghost" icon="plus" onClick={() => addRow('legs', { ...emptyLeg(), dir: p.tripType === 'roundtrip' ? 'back' : 'seg' }, 'Добавлен сегмент маршрута')}>Добавить сегмент</Button> : null
    }>
      {type === 'Авиа' && <div className="trip-toggle receipt-trip-toggle">{[
        ['oneway', 'В одну сторону'], ['roundtrip', 'Туда и обратно'], ['complex', 'Сложный маршрут'],
      ].map(([key, label]) => <button key={key} disabled={!correctionMode} className={p.tripType === key ? 'on' : ''} onClick={() => setTripType(key)}>{label}</button>)}</div>}
      <div className="receipt-stack">{p.legs.map((leg, index) => (
        <div className="receipt-subcard" key={index}>
          <div className="receipt-subcard-title"><b>{type === 'Гостиница' ? 'Период проживания' : `${type === 'Трансфер' ? 'Поездка' : 'Сегмент'} ${index + 1}`}</b>
            {correctionMode && p.legs.length > 1 && <RowRemove label="" onClick={() => removeRow('legs', index, 'Удалён сегмент маршрута')} />}</div>
          <div className="receipt-form-grid">
            {type !== 'Гостиница' && <Field label="Место отправления"><LockedInput correctionMode={correctionMode} value={leg.from} onChange={(e) => setArray('legs', index, 'from', e.target.value, `Отправление сегмента ${index + 1}`)} /></Field>}
            {type !== 'Гостиница' && <Field label="Место назначения"><LockedInput correctionMode={correctionMode} value={leg.to} onChange={(e) => setArray('legs', index, 'to', e.target.value, `Назначение сегмента ${index + 1}`)} /></Field>}
            {type === 'Трансфер' && <Field label="Адрес отправления"><LockedInput correctionMode={correctionMode} value={leg.fromAddress} onChange={(e) => setArray('legs', index, 'fromAddress', e.target.value, `Адрес отправления ${index + 1}`)} /></Field>}
            {type === 'Трансфер' && <Field label="Адрес назначения"><LockedInput correctionMode={correctionMode} value={leg.toAddress} onChange={(e) => setArray('legs', index, 'toAddress', e.target.value, `Адрес назначения ${index + 1}`)} /></Field>}
            <ProtectedDate correctionMode={correctionMode} label={type === 'Гостиница' ? 'Дата заезда' : 'Дата'} value={leg.date}
              onChange={(next) => setArray('legs', index, 'date', next, `Дата сегмента ${index + 1}`)} />
            {type === 'Гостиница' && <ProtectedDate correctionMode={correctionMode} label="Дата выезда" value={leg.endDate}
              onChange={(next) => setArray('legs', index, 'endDate', next, 'Дата выезда')} />}
            {type !== 'Гостиница' && <ProtectedTime correctionMode={correctionMode} label="Время отправления" value={leg.dep}
              onChange={(next) => setArray('legs', index, 'dep', next, `Время отправления ${index + 1}`)} />}
            {(type === 'Авиа' || type === 'ЖД') && <ProtectedTime correctionMode={correctionMode} label="Время прибытия" value={leg.arr}
              onChange={(next) => setArray('legs', index, 'arr', next, `Время прибытия ${index + 1}`)} />}
            {(type === 'Авиа' || type === 'ЖД' || type === 'Трансфер') && <Field label={type === 'ЖД' ? 'Номер поезда' : type === 'Трансфер' ? 'Рейс или поезд' : 'Номер рейса'}><LockedInput correctionMode={correctionMode} value={leg.flightNo} onChange={(e) => setArray('legs', index, 'flightNo', e.target.value, `Рейс/поезд сегмента ${index + 1}`)} /></Field>}
            {type === 'ЖД' && <Field label="Вагон"><LockedInput correctionMode={correctionMode} value={leg.coach} onChange={(e) => setArray('legs', index, 'coach', e.target.value, `Вагон сегмента ${index + 1}`)} /></Field>}
            {type === 'ЖД' && <Field label="Место"><LockedInput correctionMode={correctionMode} value={leg.seat} onChange={(e) => setArray('legs', index, 'seat', e.target.value, `Место сегмента ${index + 1}`)} /></Field>}
            {type === 'Авиа' && <Field label="Авиакомпания"><LockedInput correctionMode={correctionMode} value={leg.carrier || p.carrier} onChange={(e) => setArray('legs', index, 'carrier', e.target.value, `Авиакомпания сегмента ${index + 1}`)} /></Field>}
            {type === 'Авиа' && <Field label="Класс бронирования"><LockedInput correctionMode={correctionMode} value={leg.cls} onChange={(e) => setArray('legs', index, 'cls', e.target.value, `Класс сегмента ${index + 1}`)} /></Field>}
            {type === 'Авиа' && <Field label="Код тарифа"><LockedInput correctionMode={correctionMode} value={leg.fareBasis} onChange={(e) => setArray('legs', index, 'fareBasis', e.target.value, `Тариф сегмента ${index + 1}`)} /></Field>}
            {type === 'Авиа' && <Field label="Класс обслуживания"><LockedInput correctionMode={correctionMode} value={leg.cabin} onChange={(e) => setArray('legs', index, 'cabin', e.target.value, `Класс обслуживания сегмента ${index + 1}`)} /></Field>}
            {type === 'Авиа' && <Field label="Багаж сегмента"><LockedInput correctionMode={correctionMode} value={leg.baggage} onChange={(e) => setArray('legs', index, 'baggage', e.target.value, `Багаж сегмента ${index + 1}`)} /></Field>}
            {type === 'Авиа' && <Field label="Статус сегмента"><LockedInput correctionMode={correctionMode} value={leg.status} onChange={(e) => setArray('legs', index, 'status', e.target.value, `Статус сегмента ${index + 1}`)} /></Field>}
            {type === 'Трансфер' && <Field label="Время поездки"><LockedInput correctionMode={correctionMode} value={leg.duration} onChange={(e) => setArray('legs', index, 'duration', e.target.value, `Время поездки ${index + 1}`)} /></Field>}
          </div>
        </div>
      ))}</div>
      {type === 'Гостиница' && <div className="receipt-form-grid receipt-top-gap">
        <Field label="Количество ночей"><Input type="number" min="0" value={p.nights || ''} onChange={(e) => set('nights', e.target.value, 'Количество ночей')} /></Field>
      </div>}
    </Section>
  );

  const breakdown = (key, title, isTax) => (
    <div className="receipt-subcard">
      {(!isTax || correctionMode)
        ? <ListHeader title={title} onAdd={() => addRow(key, { ...emptyCharge(), currency: p.currency }, `Добавлена строка: ${title}`)} />
        : <div className="receipt-list-head"><b>{title}</b><Pill tone="gray">Данные поставщика</Pill></div>}
      {(p[key] || []).length ? p[key].map((row, index) => <div className="receipt-inline-row" key={index}>
        <Field label={isTax ? 'Код' : 'Тип сбора'}>{isTax
          ? <LockedInput correctionMode={correctionMode} value={row.code || ''} onChange={(e) => setArray(key, index, 'code', e.target.value, `${title}: код ${index + 1}`)} />
          : <Input value={row.code || ''} onChange={(e) => setArray(key, index, 'code', e.target.value, `${title}: код ${index + 1}`)} />}</Field>
        <Field label="Наименование">{isTax
          ? <LockedInput correctionMode={correctionMode} value={row.label || ''} onChange={(e) => setArray(key, index, 'label', e.target.value, `${title}: название ${index + 1}`)} />
          : <Input value={row.label || ''} onChange={(e) => setArray(key, index, 'label', e.target.value, `${title}: название ${index + 1}`)} />}</Field>
        <Field label="Сумма">{isTax
          ? <LockedInput correctionMode={correctionMode} type="number" value={row.amount || ''} onChange={(e) => setArray(key, index, 'amount', e.target.value, `${title}: сумма ${index + 1}`)} />
          : <Input type="number" value={row.amount || ''} onChange={(e) => setArray(key, index, 'amount', e.target.value, `${title}: сумма ${index + 1}`)} />}</Field>
        {(!isTax || correctionMode) && <RowRemove label="" onClick={() => removeRow(key, index, `Удалена строка: ${title}`)} />}
      </div>) : <div className="receipt-empty">Нет строк</div>}
    </div>
  );

  const moneyField = (label, key, locked = false) => {
    const lockedProps = locked && !correctionMode ? { disabled: true, className: 'input receipt-locked-input' } : {};
    return <Field label={label}><Input type="number" min="0" value={p[key] || ''}
      {...lockedProps} onChange={(e) => set(key, e.target.value, label)} /></Field>;
  };
  const total = receiptFinancialTotal(type, p);
  const financeBlock = (
    <Section title={type === 'Авиа' ? '4–6. Стоимость, таксы и сборы' : type === 'Гостиница' ? '8. Финансы' : type === 'Трансфер' ? '5. Финансы' : 'Стоимость'}>
      <div className="receipt-form-grid">
        <Field label="Валюта"><Select options={['RUB', 'USD', 'EUR', 'KGS', 'KZT', 'CNY']} value={p.currency} onChange={(e) => set('currency', e.target.value, 'Валюта')} /></Field>
        {type === 'Авиа' && moneyField('Тариф перевозчика', 'fare', true)}
        {type === 'Авиа' && moneyField('Таксы перевозчика', 'taxes', true)}
        {type === 'Авиа' && moneyField('Сервисный сбор', 'fees')}
        {type === 'ЖД' && moneyField('Стоимость билета', 'ticketCost')}
        {type === 'ЖД' && moneyField('Стоимость плацкарты', 'reservedSeatCost')}
        {type === 'ЖД' && moneyField('Сервисный сбор агентства', 'agencyServiceFee')}
        {type === 'ЖД' && moneyField('Дополнительные сборы', 'additionalFees')}
        {(type === 'Гостиница' || type === 'Трансфер') && moneyField('Стоимость поставщика', 'supplierCost')}
        {type === 'Гостиница' && moneyField('Наценка', 'markup')}
        {(type === 'Гостиница' || type === 'Трансфер') && moneyField('Сервисный сбор', 'agencyServiceFee')}
        {(type === 'Гостиница' || type === 'Трансфер') && moneyField('Дополнительные сборы', 'additionalFees')}
        {(type === 'Гостиница' || type === 'Трансфер') && moneyField('Скидка', 'discount')}
        <Field label="Итого для клиента"><Input value={total} readOnly className="input receipt-total-input" /></Field>
        {(type === 'Гостиница' || type === 'Трансфер') && <Field label="Источник стоимости"><Select options={[
          { value: 'document', label: type === 'Гостиница' ? 'Распознано из ваучера' : 'Распознано из документа' },
          { value: 'crm', label: 'Подтянуто из заказа CRM' }, { value: 'manual', label: 'Введено вручную' },
        ]} value={p.priceSource} onChange={(e) => set('priceSource', e.target.value, 'Источник стоимости')} /></Field>}
        {p.priceSource === 'crm' && <Field label="Заказ-источник стоимости"><Input value={p.priceSourceOrder || ''} onChange={(e) => set('priceSourceOrder', e.target.value, 'Заказ-источник стоимости')} /></Field>}
      </div>
      {type === 'Авиа' && <>
        <div className="receipt-grid-2 receipt-top-gap">
          {breakdown('fareBreakdown', 'Разбивка тарифа', true)}
          {breakdown('taxBreakdown', 'Разбивка такс', true)}
        </div>
        <div className="receipt-top-gap">{breakdown('feeBreakdown', 'Разбивка сборов', false)}</div>
      </>}
      {type === 'ЖД' && <div className="receipt-top-gap">{breakdown('feeBreakdown', 'Разбивка сервисных сборов', false)}</div>}
    </Section>
  );

  const aviaBlocks = type === 'Авиа' && <>
    {(p.extras.length > 0 || correctionMode) && <Section title="7. Дополнительные услуги" action={correctionMode
      ? <Button size="sm" variant="ghost" icon="plus" onClick={() => addRow('extras', emptyExtra(), 'Добавлена дополнительная услуга')}>Добавить</Button>
      : null}>
      {p.extras.length ? <div className="receipt-stack">{p.extras.map((row, index) => <div className="receipt-inline-row receipt-extra-row" key={index}>
        <Field label="Услуга"><LockedInput correctionMode={correctionMode} value={row.name} onChange={(e) => setArray('extras', index, 'name', e.target.value, `Дополнительная услуга ${index + 1}`)} /></Field>
        <Field label="Описание"><LockedInput correctionMode={correctionMode} value={row.details} onChange={(e) => setArray('extras', index, 'details', e.target.value, `Описание доп. услуги ${index + 1}`)} /></Field>
        <Field label="Сумма"><LockedInput correctionMode={correctionMode} type="number" value={row.amount} onChange={(e) => setArray('extras', index, 'amount', e.target.value, `Сумма доп. услуги ${index + 1}`)} /></Field>
        {correctionMode && <RowRemove label="" onClick={() => removeRow('extras', index, 'Удалена дополнительная услуга')} />}
      </div>)}</div> : <div className="receipt-empty">В документе дополнительные услуги не найдены</div>}
    </Section>}
    <Section title="8. Тариф">
      <div className="receipt-form-grid">
        {['code', 'name', 'bookingClass'].map((key) => <Field key={key} label={{ code: 'Код тарифа', name: 'Название тарифа', bookingClass: 'Класс бронирования' }[key]}>
          <LockedInput correctionMode={correctionMode} value={p.fareInfo[key]} onChange={(e) => setObject('fareInfo', key, e.target.value, `Тариф: ${key}`)} />
        </Field>)}
      </div>
      <div className="receipt-grid-2 receipt-top-gap">
        <Field label="Правила обмена"><TextArea disabled={!correctionMode} value={p.fareInfo.exchangeRules} onChange={(e) => setObject('fareInfo', 'exchangeRules', e.target.value, 'Правила обмена')} /></Field>
        <Field label="Правила возврата"><TextArea disabled={!correctionMode} value={p.fareInfo.refundRules} onChange={(e) => setObject('fareInfo', 'refundRules', e.target.value, 'Правила возврата')} /></Field>
      </div>
    </Section>
  </>;

  const hotelBlocks = type === 'Гостиница' && <>
    <Section title="2. Информация об отеле">
      <div className="receipt-form-grid">{[
        ['name', 'Название отеля'], ['category', 'Категория'], ['country', 'Страна'], ['city', 'Город'],
        ['address', 'Адрес'], ['phone', 'Телефон'], ['email', 'Электронная почта'], ['map', 'Координаты / ссылка на карту'],
      ].map(([key, label]) => <Field key={key} label={label}><LockedInput correctionMode={correctionMode}
        value={p.hotel[key]} onChange={(e) => setObject('hotel', key, e.target.value, `Отель: ${label}`)} /></Field>)}</div>
    </Section>
    {routeBlock}
    <Section title="4. Размещение по номерам" action={correctionMode ? <Button size="sm" variant="ghost" icon="plus" onClick={() => addRow('rooms', emptyRoom(), 'Добавлен номер размещения')}>Добавить номер</Button> : null}>
      <div className="receipt-stack">{p.rooms.map((room, index) => <div className="receipt-subcard" key={index}>
        <div className="receipt-subcard-title"><b>Номер {index + 1}</b>{correctionMode && p.rooms.length > 1 && <RowRemove label="" onClick={() => removeRow('rooms', index, 'Удалён номер размещения')} />}</div>
        <div className="receipt-form-grid">
          <Field label="Категория номера"><LockedInput correctionMode={correctionMode} value={room.category} onChange={(e) => setArray('rooms', index, 'category', e.target.value, `Категория номера ${index + 1}`)} /></Field>
          <Field label="Название номера"><LockedInput correctionMode={correctionMode} value={room.name} onChange={(e) => setArray('rooms', index, 'name', e.target.value, `Название номера ${index + 1}`)} /></Field>
          <Field label="Тип кровати"><LockedInput correctionMode={correctionMode} value={room.bedType} onChange={(e) => setArray('rooms', index, 'bedType', e.target.value, `Кровать номера ${index + 1}`)} /></Field>
          <Field label="Взрослых"><LockedInput correctionMode={correctionMode} type="number" min="0" value={room.adults} onChange={(e) => setArray('rooms', index, 'adults', e.target.value, `Взрослых в номере ${index + 1}`)} /></Field>
          <Field label="Детей"><LockedInput correctionMode={correctionMode} type="number" min="0" value={room.children} onChange={(e) => setArray('rooms', index, 'children', e.target.value, `Детей в номере ${index + 1}`)} /></Field>
          <Field label="Питание"><Select options={['Без питания', 'Завтрак', 'Полупансион', 'Полный пансион', 'All Inclusive', 'Другое']} value={room.meal} onChange={(e) => setArray('rooms', index, 'meal', e.target.value, `Питание номера ${index + 1}`)} /></Field>
          <Field label="Ранний заезд"><Input value={room.earlyCheckIn} onChange={(e) => setArray('rooms', index, 'earlyCheckIn', e.target.value, `Ранний заезд номера ${index + 1}`)} /></Field>
          <Field label="Поздний выезд"><Input value={room.lateCheckOut} onChange={(e) => setArray('rooms', index, 'lateCheckOut', e.target.value, `Поздний выезд номера ${index + 1}`)} /></Field>
          <Field label="Состав гостей"><Input value={(room.guestIds || []).join(', ')} onChange={(e) => setArray('rooms', index, 'guestIds', e.target.value.split(',').map((s) => s.trim()).filter(Boolean), `Гости номера ${index + 1}`)} placeholder="ФИО через запятую" /></Field>
          <Field label="Дополнительные условия"><TextArea value={room.conditions} onChange={(e) => setArray('rooms', index, 'conditions', e.target.value, `Условия номера ${index + 1}`)} /></Field>
        </div>
      </div>)}</div>
    </Section>
    {passengerBlock}
    <Section title="7. Дополнительные условия">
      <div className="receipt-form-grid">{[
        ['deposit', 'Депозит'], ['cityTax', 'Городской налог'], ['resortFee', 'Курортный сбор'], ['registrationFee', 'Регистрационный сбор'],
        ['cancellation', 'Условия отмены'], ['noShow', 'Штраф при незаезде'], ['amendment', 'Условия изменения'], ['important', 'Важная информация'],
      ].map(([key, label]) => <Field key={key} label={label}><TextArea disabled={!correctionMode}
        value={p.hotelTerms[key]} onChange={(e) => setObject('hotelTerms', key, e.target.value, label)} rows={2} /></Field>)}</div>
      <Field label="Комментарий для гостя"><TextArea value={p.hotelTerms.guestComment} onChange={(e) => setObject('hotelTerms', 'guestComment', e.target.value, 'Комментарий для гостя')} /></Field>
    </Section>
    {financeBlock}
  </>;

  const transferBlocks = type === 'Трансфер' && <>
    {passengerBlock}
    {routeBlock}
    <Section title="4. Автомобиль">
      <div className="receipt-form-grid">{[
        ['className', 'Класс автомобиля'], ['category', 'Категория'], ['passengers', 'Количество пассажиров'],
        ['luggage', 'Количество багажа'], ['requirements', 'Дополнительные требования'],
      ].map(([key, label]) => <Field key={key} label={label}><LockedInput correctionMode={correctionMode}
        value={p.vehicle[key]} onChange={(e) => setObject('vehicle', key, e.target.value, `Автомобиль: ${label}`)} /></Field>)}</div>
    </Section>
    {financeBlock}
    <Section title="6. Дополнительные условия">
      <div className="receipt-form-grid">{[
        ['cancellation', 'Условия отмены'], ['freeWaiting', 'Бесплатное ожидание'], ['meetAndGreet', 'Встреча с табличкой'],
        ['baggageHelp', 'Помощь с багажом'], ['supportContacts', 'Контакты поддержки'], ['supplierComment', 'Комментарий поставщика'],
        ['driverComment', 'Комментарий водителю'], ['passengerComment', 'Комментарий пассажиру'],
      ].map(([key, label]) => <Field key={key} label={label}><TextArea value={p.transferTerms[key]}
        disabled={['cancellation', 'freeWaiting', 'supportContacts', 'supplierComment'].includes(key) && !correctionMode}
        onChange={(e) => setObject('transferTerms', key, e.target.value, label)} rows={2} /></Field>)}</div>
    </Section>
  </>;

  const outputBlock = (
    <Section title={type === 'Гостиница' ? '10. Формирование документа' : type === 'Трансфер' ? '7. Формирование документа' : type === 'ЖД' ? 'Вывод документа' : '9. Вывод документа'}>
      <div className="receipt-form-grid">
        <Field label="Вариант документа"><Select options={[
          { value: 'original', label: 'Оригинал поставщика' }, { value: 'agency', label: 'Фирменный бланк агентства' },
          { value: 'saas', label: 'Фирменный бланк SaaS-компании' },
        ]} value={p.output.mode} onChange={(e) => setObject('output', 'mode', e.target.value, 'Вариант документа')} /></Field>
        {p.output.mode !== 'original' && <Field label="Шаблон организации"><Select placeholder="Выберите шаблон" options={[
          'Основной фирменный', 'Компактный', 'Корпоративный клиент',
        ]} value={p.output.template} onChange={(e) => setObject('output', 'template', e.target.value, 'Шаблон организации')} /></Field>}
        {(type === 'Гостиница' || type === 'Трансфер') && <Field label="Стоимость в клиентском ваучере"><Select options={[
          { value: 'total', label: 'Показывать итоговую стоимость' }, { value: 'paid', label: 'Показывать только «Оплачено»' },
          { value: 'hidden', label: 'Не показывать стоимость' },
        ]} value={p.output.priceMode} onChange={(e) => setObject('output', 'priceMode', e.target.value, 'Отображение стоимости')} /></Field>}
      </div>
      <Field label="Внутренние комментарии"><TextArea value={p.internalComments} onChange={(e) => set('internalComments', e.target.value, 'Внутренний комментарий')} placeholder="Не попадут в клиентский документ" /></Field>
      {(type === 'Гостиница' || type === 'Трансфер') && <div className="receipt-privacy-note"><Icon name="lock" /> В клиентский ваучер не попадут стоимость поставщика, наценка, внутренние комиссии и сборы.</div>}
    </Section>
  );

  return (
    <div className="receipt-editor-form">
      <SourceNotice correctionMode={correctionMode} onToggle={onToggleCorrection} />
      {bindingBlock}
      {commonBooking}
      {type === 'Авиа' && <>{passengerBlock}{routeBlock}{financeBlock}{aviaBlocks}</>}
      {type === 'ЖД' && <>{passengerBlock}{routeBlock}{financeBlock}</>}
      {hotelBlocks}
      {transferBlocks}
      {outputBlock}
      <AuditLog rows={p.auditLog} />
    </div>
  );
}

export function ReceiptParticipantSummary({ draft, noun = 'пассажиров' }) {
  const [open, setOpen] = useState(false);
  const names = receiptParticipantNames(draft);
  if (!names.length) return <span>Участники не распознаны</span>;
  if (names.length === 1) return <span>{names[0]}</span>;
  return <span className="receipt-participants">
    <button type="button" onClick={() => setOpen((value) => !value)}>{names[0]} +{names.length - 1} {noun} <Icon name={open ? 'chevUp' : 'chevDown'} /></button>
    {open && <span className="receipt-participant-list">{names.map((name) => <span key={name}>{name}</span>)}</span>}
  </span>;
}

export { TYPE_META };
