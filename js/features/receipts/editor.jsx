import React, { useEffect, useMemo, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Icon } from '../../icons';
import { Button, Checkbox, Combobox, Drawer, EmptyState, Field, Input, Pill, SearchBox, Select, TimeField, holdOverlaysDuringPrint, printOverlayScope } from '../../ui';
import { UFDateField, UnifiedBindField } from '../../forms_unified';
import { segmentConnectionLabel } from './layover';
import { normalizeReceiptDisplayDate } from './date';
import { AVIA_TAX_BY_CODE, CUSTOM_TAX_VALUE, aviaTaxName, aviaTaxOptionsFor } from './tax-catalog';

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
function firstReceiptValue(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? '';
}

function cleanHotelSupplierBooking(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const compact = raw.toLowerCase().replace(/[«»"'.,:;()]/g, '').replace(/\s+/g, ' ').trim();
  const isLabelFragment = /^(?:рования|бронирования|номер бронирования|бронь|номер брони)$/i.test(compact);
  const isCheckInInstruction = /^(?:заселение|размещение) по фио$/i.test(compact);
  return isLabelFragment || isCheckInInstruction ? '' : raw;
}

function isReceiptLegalEntityName(value) {
  return /^(?:ИП|ООО|АО|ПАО|ОАО|ЗАО|ОсОО|ТОО|LLC|JSC)\b/i.test(String(value || '').trim());
}

function firstReceiptAirlineValue(...values) {
  return values.find((value) => value !== undefined && value !== null
    && String(value).trim() !== '' && !isReceiptLegalEntityName(value)) ?? '';
}

function receiptCabinFromBookingClass(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (/^(?:ECONOMY|ЭКОНОМ|ЭКОНОМИЧЕСКИЙ)$/.test(normalized)) return 'ECONOMY';
  if (/^(?:BUSINESS|БИЗНЕС)$/.test(normalized)) return 'BUSINESS';
  if (/^(?:FIRST|ПЕРВЫЙ)$/.test(normalized)) return 'FIRST';
  return '';
}

function receiptBaggageAllowance(value) {
  return /^\d+(?:[.,]\d+)?\s*(?:PC|KG|КГ|КМ)$/i.test(String(value || '').trim());
}

function normalizeReceiptLeg(row = {}) {
  const source = row && typeof row === 'object' ? row : {};
  const normalized = {
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
    handBaggage: firstReceiptValue(source.handBaggage, source.hand_baggage, source.carryOn, source.carry_on),
    dir: firstReceiptValue(source.dir, source.direction, 'out'),
  };
  if (!normalized.cabin) normalized.cabin = receiptCabinFromBookingClass(normalized.cls);
  if (!normalized.handBaggage && receiptBaggageAllowance(normalized.fareBasis)
    && receiptBaggageAllowance(normalized.baggage)) {
    normalized.handBaggage = normalized.baggage;
    normalized.baggage = normalized.fareBasis;
    normalized.fareBasis = '';
  }
  if (isReceiptLegalEntityName(normalized.from) || isReceiptLegalEntityName(normalized.to)) {
    normalized.from = '';
    normalized.fromCode = '';
    normalized.to = '';
    normalized.toCode = '';
  }
  normalized.carrier = firstReceiptAirlineValue(normalized.carrier);
  return normalized;
}

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

function receiptIsItMarker(value) {
  return typeof value === 'string' && value.trim().toUpperCase() === 'IT';
}

function receiptOutputUsesItFare(output) {
  return ['it', 'itFare', 'fareIt'].includes(output?.priceMode);
}

function receiptNumericSource(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === '' || receiptIsItMarker(value)) continue;
    const number = Number(String(value).replace(/\s+/g, '').replace(',', '.'));
    if (Number.isFinite(number)) return value;
  }
  return '';
}

function receiptBreakdownTotal(rows) {
  if (!Array.isArray(rows) || !rows.length) return '';
  let hasAmount = false;
  const total = rows.reduce((sum, row) => {
    const raw = row?.amount;
    if (raw === undefined || raw === null || raw === '' || receiptIsItMarker(raw)) return sum;
    const number = Number(String(raw).replace(/\s+/g, '').replace(',', '.'));
    if (!Number.isFinite(number)) return sum;
    hasAmount = true;
    return sum + number;
  }, 0);
  return hasAmount ? roundMoney(total) : '';
}

function receiptRestoreAviaAmount(value, sourceValue, rows, sourceRows) {
  if (!receiptIsItMarker(value)) return value;
  return receiptNumericSource(
    sourceValue,
    receiptBreakdownTotal(rows),
    receiptBreakdownTotal(sourceRows),
  );
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
  const passengers = asArray(value.passengers, passengerFallback).map((row) => ({
    ...emptyPassenger(),
    ...row,
    dob: normalizeReceiptDisplayDate(firstReceiptValue(
      row?.dob, row?.birthDate, row?.birth_date, row?.dateOfBirth, row?.date_of_birth,
    )),
  }));
  if (!passengers[0]?.dob) {
    const fallbackDob = normalizeReceiptDisplayDate(firstReceiptValue(
      value.dob, value.birthDate, value.birth_date, value.dateOfBirth, value.date_of_birth,
    ));
    if (fallbackDob) passengers[0].dob = fallbackDob;
  }
  const supplierTotal = Number(value.total) || Number(value.originalTotal)
    || ((Number(value.fare) || 0) + (Number(value.taxes) || 0) + (Number(value.fees) || 0));
  const supplierBase = Number(value.fare) || supplierTotal;
  const draft = {
    carrier: '', carrierCode: '', passenger: passengers[0]?.name || '', passengers,
    dob: passengers[0]?.dob || '', docNo: passengers[0]?.document || '', ticketNo: passengers[0]?.ticketNo || '',
    ref: '', supplierOrderNo: '', hotelBookingNo: '', crmBindingMode: 'order',
    crmOrderId: '', crmOrderNo: '', crmPersonId: '', crmPerson: '', crmCompanyId: '', crmCompany: '', crmPassenger: '',
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
  draft.passenger = passengers[0]?.name || value.passenger || value.passenger_name || '';
  draft.legs = asArray(value.legs || value.segments, [emptyLeg()]).map(normalizeReceiptLeg);
  const firstAviaLeg = type === 'Авиа' ? draft.legs[0] : null;
  if (firstAviaLeg && receiptBaggageAllowance(value.fareBasis || value.fare_basis)
    && !firstAviaLeg.fareBasis && firstAviaLeg.handBaggage) {
    draft.fareBasis = '';
    draft.baggage = firstAviaLeg.baggage;
    draft.handBaggage = firstAviaLeg.handBaggage;
  }
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
  draft.carrier = firstReceiptAirlineValue(
    value.carrier,
    value.airline,
    draft.legs.find((leg) => leg.carrier)?.carrier,
    value.issuer,
    draft.carrier,
  );
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
  if (type === 'Авиа' && receiptOutputUsesItFare(draft.output)) {
    const sourceFinancials = value.sourceSupplierFinancials || value.source_supplier_financials || {};
    const snapshot = draft.output?.itFareSnapshot || draft.output?.it_fare_snapshot || {};
    draft.fare = receiptRestoreAviaAmount(
      draft.fare,
      receiptNumericSource(snapshot.fare, sourceFinancials.fare),
      draft.fareBreakdown,
      sourceFinancials.fareBreakdown || sourceFinancials.fare_breakdown,
    );
    draft.taxes = receiptRestoreAviaAmount(
      draft.taxes,
      receiptNumericSource(snapshot.taxes, sourceFinancials.taxes),
      draft.taxBreakdown,
      sourceFinancials.taxBreakdown || sourceFinancials.tax_breakdown,
    );
    draft.fees = receiptRestoreAviaAmount(
      draft.fees,
      receiptNumericSource(snapshot.fees, sourceFinancials.fees),
      draft.feeBreakdown,
      sourceFinancials.feeBreakdown || sourceFinancials.fee_breakdown,
    );
  }
  draft.auditLog = Array.isArray(value.auditLog) ? value.auditLog : [];
  const explicitSupplierOrder = firstReceiptValue(value.supplierOrderNo, value.supplier_order_number, value.order_number);
  const fallbackSupplierOrder = type === 'Трансфер'
    ? firstReceiptValue(value.ref, value.reference)
    : '';
  draft.supplierOrderNo = type === 'Гостиница'
    ? cleanHotelSupplierBooking(explicitSupplierOrder)
    : firstReceiptValue(explicitSupplierOrder, fallbackSupplierOrder);
  draft.hotelBookingNo = firstReceiptValue(value.hotelBookingNo, value.hotel_booking_number);
  draft.crmOrderId = value.crmOrderId || value.crm_order_id || '';
  draft.crmOrderNo = value.crmOrderNo || value.crm_order_no || '';
  draft.crmPersonId = value.crmPersonId || value.crm_person_id || '';
  draft.crmPerson = value.crmPerson || value.crm_person || '';
  draft.crmCompanyId = value.crmCompanyId || value.crm_company_id || '';
  draft.crmCompany = value.crmCompany || value.crm_company || '';
  draft.crmBindingMode = draft.crmCompany && !draft.crmOrderNo
    ? 'company'
    : (draft.crmPerson && !draft.crmOrderNo ? 'person' : (value.crmBindingMode || 'order'));
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

  const rawGroupTickets = [
    value.groupTickets,
    value.receiptItems,
    value.receipt_items,
    value.receipts,
    value.railTickets,
  ]
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
    receiptItems: [],
    receipt_items: [],
    receipts: [],
    railTickets: [],
    receiptCount: 1,
    receiptIndex: ticket.receiptIndex || ticket.receipt_index || index + 1,
  }));
  draft.receiptCount = draft.groupTickets.length || Number(value.receiptCount || value.receipt_count) || 0;
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

function receiptBlankCount(draft) {
  return (draft.groupTickets || []).length || Number(draft.receiptCount) || 0;
}

function receiptBlankWord(count) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return 'бланков';
  if (mod10 === 1) return 'бланк';
  if (mod10 >= 2 && mod10 <= 4) return 'бланка';
  return 'бланков';
}

function receiptParticipantSurname(name) {
  return String(name || '').trim().split(/[\/\s]+/)[0] || 'Квитанция';
}

export function receiptParticipantLabel(draft, fallback = 'квитанция') {
  const names = receiptParticipantNames(draft);
  const blankCount = receiptBlankCount(draft);
  if (names.length && blankCount > 1) {
    return `${receiptParticipantSurname(names[0])} +${blankCount - 1} ${receiptBlankWord(blankCount - 1)}`;
  }
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

function Section({ title, action, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`receipt-section${open ? ' is-open' : ' is-collapsed'}`}>
      <div className="receipt-section-head">
        <button type="button" className="receipt-section-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <Icon name="chevDown" /><h3>{title}</h3>
        </button>
        {action && <div className="receipt-section-action">{action}</div>}
      </div>
      {open && <div className="receipt-section-content">{children}</div>}
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

function receiptUsesItFare(draft) {
  return receiptOutputUsesItFare(draft?.output);
}

function uniqueReceiptTermRows(rows) {
  const unique = new Map();
  rows.forEach(([label, value]) => {
    const cleanValue = String(value || '').replace(/\s+/g, ' ').trim();
    if (!cleanValue) return;
    const key = cleanValue.toLocaleLowerCase('ru-RU');
    const existing = unique.get(key);
    if (existing) {
      if (!existing[0].split(' / ').includes(label)) existing[0] += ` / ${label}`;
      return;
    }
    unique.set(key, [label, cleanValue]);
  });
  return [...unique.values()];
}

function inlineSupplierDocumentUrl(url) {
  const value = String(url || '');
  if (!value || value.startsWith('blob:') || !value.includes('/documents/')
    || !value.includes('/download/') || value.includes('disposition=')) return value;
  return `${value}${value.includes('?') ? '&' : '?'}disposition=inline`;
}

function ReceiptAviaDocument({ draft, organization = 'ПСЦ Travel Hub' }) {
  const p = normalizeReceiptDraft('Авиа', draft);
  const participants = receiptParticipantNames(p);
  const money = (value) => `${roundMoney(value).toLocaleString('ru-RU')} ${p.currency || ''}`.trim();
  const fareMoney = () => receiptUsesItFare(p) ? 'IT' : money(p.fare);
  const fareRowMoney = (row) => receiptUsesItFare(p) ? 'IT' : money(row.amount);
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
          return <div className="receipt-brand-passenger" key={`${passenger.name || 'passenger'}-${index}`}>
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
          ['Ручная кладь', leg.handBaggage || p.handBaggage],
          ['Статус', leg.status || p.bookingStatus],
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
        <div className="receipt-brand-names">{p.extras.map((row, index) => <span key={index}>{row.name}{row.details ? ` · ${row.details}` : ''}</span>)}</div></>}
      <h4>Расчёт стоимости</h4>
      <div className="receipt-brand-finance-groups">
        <section><h5>Тариф</h5><div className="receipt-brand-finance">
          <div><span>Тариф перевозчика</span><b>{fareMoney()}</b></div>
          {fareRows.map((row, index) => <div key={`fare-${index}`}><span>{[row.code, row.label].filter(Boolean).join(' · ') || 'Расчёт тарифа'}</span><b>{fareRowMoney(row)}</b></div>)}
        </div></section>
        <section><h5>Таксы</h5><div className="receipt-brand-finance">
          <div><span>Таксы перевозчика</span><b>{money(p.taxes)}</b></div>
          {taxRows.map((row, index) => <div key={`tax-${index}`}><span>{[row.code, row.label].filter(Boolean).join(' · ') || 'Такса'}</span><b>{money(row.amount)}</b></div>)}
        </div></section>
        <section><h5>Сборы</h5><div className="receipt-brand-finance">
          <div><span>Сервисный сбор</span><b>{money(p.fees)}</b></div>
          {feeRows.map((row, index) => <div key={`fee-${index}`}><span>{[row.code, row.label].filter(Boolean).join(' · ') || 'Сбор'}</span><b>{money(row.amount)}</b></div>)}
        </div></section>
        <div className="receipt-brand-finance-total"><span>Итого для клиента</span><b>{money(receiptFinancialTotal('Авиа', p))}</b></div>
      </div>
      <footer>{organization} · Сформировано в PSC Travel Hub</footer>
    </article>
  );
}


function railBlankIdentity(ticket, index) {
  const passenger = receiptParticipantNames(ticket)[0] || ticket.passenger || 'Пассажир не распознан';
  const leg = ticket.legs?.[0] || {};
  return {
    passenger,
    ticketNo: ticket.ticketNo || ticket.passengers?.[0]?.ticketNo || '—',
    route: [leg.from || leg.fromCode, leg.to || leg.toCode].filter(Boolean).join(' → ') || 'Маршрут не распознан',
    trip: [leg.flightNo && `поезд ${leg.flightNo}`, leg.coach && `вагон ${leg.coach}`, leg.seat && `место ${leg.seat}`].filter(Boolean).join(' · '),
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
          <strong className="receipt-blank-strip-total"><small>Итого по {tickets.length} бланкам</small><b>{total.toLocaleString('ru-RU')} {draft.currency || 'RUB'}</b></strong>
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
            <section key={(guests.join('|') || 'room') + '-' + index} className="receipt-hotel-preview-room">
              <div className="receipt-hotel-preview-room-head"><span>{index + 1}</span><div><b>{guests.join(', ') || ('Гость ' + (index + 1))}</b><small>{room.bookingNo || 'Заселение по ФИО'}</small></div></div>
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

export function ReceiptDocumentPreview({ type, draft }) {
  if (type === 'Авиа') return <ReceiptAviaDocument draft={draft} />;
  if (type === 'ЖД') {
    const normalized = normalizeReceiptDraft('ЖД', draft);
    if (normalized.groupTickets?.length > 1) return <ReceiptRailMultiBlankPreview draft={normalized} />;
  }
  if (type === 'Гостиница') return <ReceiptHotelDocumentPreview draft={draft} />;
  let previewDraft = draft;
  if (type === 'ЖД') {
    const normalized = normalizeReceiptDraft('ЖД', draft);
    if (normalized.groupTickets?.length > 1) return <ReceiptRailMultiBlankPreview draft={normalized} />;
    previewDraft = normalized;
  }
  if (type === 'Гостиница') return <ReceiptHotelDocumentPreview draft={draft} />;
  const meta = TYPE_META[type] || TYPE_META['Прочее'];
  const lines = receiptDetailsLines(type, previewDraft);
  const participants = receiptParticipantNames(previewDraft);
  return (
    <div className="receipt-preview">
      <header><span style={{ background: meta.color }}><Icon name={meta.icon} /></span>
        <div><b>{meta.document}</b><small>{previewDraft.carrier || previewDraft.hotel?.name || 'Поставщик не распознан'}</small></div>
        <div className="receipt-preview-ref"><small>{type === 'Авиа' ? 'PNR' : type === 'ЖД' ? 'Номер билета' : 'Бронь поставщика'}</small><b>{type === 'ЖД' ? (previewDraft.ticketNo || previewDraft.passengers?.[0]?.ticketNo || '—') : (previewDraft.ref || previewDraft.supplierOrderNo || '—')}</b></div>
      </header>
      <div className="receipt-preview-body">
        <div className="receipt-preview-summary">{lines.map((line, i) => <div key={i}>{line}</div>)}</div>
        <div className="receipt-preview-grid">
          <div><small>{type === 'Гостиница' ? 'Гости' : 'Пассажиры'}</small><b>{participants[0] || '—'}{participants.length > 1 ? ` +${participants.length - 1}` : ''}</b></div>
          <div><small>Заказ CRM</small><b>{previewDraft.crmOrderNo || 'Не привязан'}</b></div>
          <div><small>Валюта</small><b>{previewDraft.currency || '—'}</b></div>
          <div><small>Итого клиенту</small><b>{receiptFinancialTotal(type, previewDraft).toLocaleString('ru-RU')} {previewDraft.currency || ''}</b></div>
        </div>
        {type === 'ЖД' && <div className="receipt-preview-rail-place">
          <span>Поезд</span><b>{previewDraft.legs?.[0]?.flightNo || '—'}</b>
          <span>Вагон</span><b>{previewDraft.legs?.[0]?.coach || '—'}</b>
          <span>Место</span><b>{previewDraft.legs?.[0]?.seat || '—'}</b>
        </div>}
        {type === 'ЖД' && <><h4>Расчёт стоимости</h4>
          <div className="receipt-brand-finance">
            <div><span>Стоимость билета</span><b>{roundMoney(previewDraft.ticketCost).toLocaleString('ru-RU')} {previewDraft.currency || ''}</b></div>
            <div><span>Стоимость плацкарты</span><b>{roundMoney(previewDraft.reservedSeatCost).toLocaleString('ru-RU')} {previewDraft.currency || ''}</b></div>
            <div><span>Сервисный сбор агентства</span><b>{roundMoney(previewDraft.agencyServiceFee).toLocaleString('ru-RU')} {previewDraft.currency || ''}</b></div>
            <div><span>Дополнительные сборы</span><b>{roundMoney(previewDraft.additionalFees).toLocaleString('ru-RU')} {previewDraft.currency || ''}</b></div>
            <div className="receipt-brand-finance-total"><span>Итого для клиента</span><b>{receiptFinancialTotal('ЖД', previewDraft).toLocaleString('ru-RU')} {previewDraft.currency || ''}</b></div>
          </div></>}
        {type === 'ЖД' && previewDraft.crmOrderNo && <div className="receipt-rail-footer">Заказ в CRM: № {previewDraft.crmOrderNo}</div>}
      </div>
    </div>
  );
}

export function ReceiptBrandDocumentDrawer({ open, type, draft, originalUrl, sourceOriginalUrl, onClose }) {
  const [previewMode, setPreviewMode] = useState('agency');
  const [supplierPdfNonce, setSupplierPdfNonce] = useState(0);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [printNotice, setPrintNotice] = useState('');
  const printScopeRef = useRef(null);
  const documentRef = useRef(null);
  useEffect(() => {
    if (open) setSupplierPdfNonce(Date.now());
    if (open) setPrintNotice('');
  }, [open, originalUrl]);
  useEffect(() => {
    if (!open) return;
    const storedMode = draft?.output?.mode;
    const correctedSupplierBlank = type === 'ЖД' || type === 'Авиа';
    setPreviewMode(correctedSupplierBlank
      ? (storedMode || 'original')
      : (storedMode && storedMode !== 'original' ? storedMode : 'agency'));
  }, [open, draft?.output?.mode, type]);
  if (!open || !draft) return null;
  const p = normalizeReceiptDraft(type, draft);
  const participants = receiptParticipantNames(p);
  const output = { ...(p.output || {}), mode: previewMode };
  const organization = output.mode === 'saas' ? 'Компания клиента' : 'ПСЦ Travel Hub';
  const outputLabel = output.mode === 'saas' ? 'Фирменный ваучер SaaS-компании' : output.mode === 'agency' ? 'Фирменный бланк агентства' : 'Оригинал поставщика с корректировками';
  const price = output.priceMode === 'paid' ? 'Оплачено'
    : output.priceMode === 'hidden' ? '' : `${receiptFinancialTotal(type, p).toLocaleString('ru-RU')} ${p.currency || ''}`;
  const money = (value) => `${roundMoney(value).toLocaleString('ru-RU')} ${p.currency || ''}`.trim();
  const rowMoney = (row) => `${Number(row.amount || 0).toLocaleString('ru-RU', { maximumFractionDigits: 6 })} ${row.currency || ''}`.trim();
  const fareRows = p.fareBreakdown?.length ? p.fareBreakdown : [];
  const taxRows = p.taxBreakdown?.length ? p.taxBreakdown
    : (Number(p.taxes) ? [{ code: 'TAX', label: 'Таксы перевозчика', amount: p.taxes }] : []);
  const feeRows = p.feeBreakdown?.length ? p.feeBreakdown
    : (Number(p.fees) ? [{ code: 'FEE', label: 'Сервисный сбор', amount: p.fees }] : []);
  const terms = uniqueReceiptTermRows(type === 'Гостиница'
    ? [['Депозит', p.hotelTerms.deposit], ['Городской налог', p.hotelTerms.cityTax], ['Курортный сбор', p.hotelTerms.resortFee],
      ['Регистрационный сбор', p.hotelTerms.registrationFee], ['Условия отмены', p.hotelTerms.cancellation],
      ['Штраф при незаезде', p.hotelTerms.noShow], ['Условия изменения', p.hotelTerms.amendment], ['Важная информация', p.hotelTerms.important],
      ['Комментарий для гостя', p.hotelTerms.guestComment]]
    : [['Условия отмены', p.transferTerms.cancellation], ['Бесплатное ожидание', p.transferTerms.freeWaiting],
      ['Встреча с табличкой', p.transferTerms.meetAndGreet], ['Помощь с багажом', p.transferTerms.baggageHelp],
      ['Контакты поддержки', p.transferTerms.supportContacts], ['Комментарий пассажиру', p.transferTerms.passengerComment]]);
  const hotelCategory = type === 'Гостиница' && p.hotel.category
    && !String(p.hotel.name || '').toLowerCase().includes(String(p.hotel.category).toLowerCase())
    ? p.hotel.category : '';
  const hotelLocation = type === 'Гостиница'
    ? [['Категория отеля', hotelCategory], ['Город', p.hotel.city], ['Страна', p.hotel.country]].filter(([, value]) => value)
    : [];
  const hotelContacts = type === 'Гостиница'
    ? [['Телефон', p.hotel.phone], ['Электронная почта', p.hotel.email], ['Карта / координаты', p.hotel.map]].filter(([, value]) => value)
    : [];
  const sourcePdfUrl = inlineSupplierDocumentUrl(originalUrl);
  const sourceOriginalPdfUrl = inlineSupplierDocumentUrl(sourceOriginalUrl);
  const freshSupplierPdfUrl = (url, nonce = Date.now()) => {
    if (!url || url.startsWith('blob:')) return url;
    return `${url}${url.includes('?') ? '&' : '?'}_pdf=${nonce}`;
  };
  const displayedSupplierPdfUrl = sourcePdfUrl ? freshSupplierPdfUrl(sourcePdfUrl, supplierPdfNonce || 'initial') : '';
  // Печать только этого окна. Слои удерживаются от закрытия: после закрытия
  // системного окна печати оператор обязан вернуться в тот же редактор, а не
  // в общий список загруженных документов.
  const printReceipt = () => {
    const printOverlay = printScopeRef.current?.closest('.drawer-overlay');
    if (printOverlay) printOverlay.classList.add('receipt-print-target');
    printOverlayScope(printScopeRef.current, {
      onDone: () => setPrintNotice('Печать завершена — вы остались в редакторе бланка.'),
    });
  };
  // Выгрузка фирменного бланка в PDF без системного окна печати: файл
  // сохраняется сразу, диалог печати вообще не открывается.
  const downloadBrandPdf = async () => {
    const node = documentRef.current;
    if (!node || typeof window === 'undefined' || !window.html2canvas || !window.jspdf) {
      printReceipt();
      return;
    }
    setPdfBusy(true);
    holdOverlaysDuringPrint(4000);
    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.left = '-99999px';
    host.style.top = '0';
    host.style.zIndex = '-1';
    host.style.background = '#ffffff';
    const clone = node.cloneNode(true);
    clone.style.maxWidth = 'none';
    clone.style.width = '900px';
    host.appendChild(clone);
    document.body.appendChild(host);
    try {
      const canvas = await window.html2canvas(clone, {
        scale: 2, backgroundColor: '#ffffff', useCORS: true, windowWidth: 900, width: 900,
      });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height], compress: true });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${TYPE_META[type]?.document || 'Документ'} · ${outputLabel}.pdf`);
      setPrintNotice('PDF сохранён. Редактор бланка остался открытым.');
    } catch (error) {
      setPrintNotice('Не удалось собрать PDF — используйте кнопку «Печать».');
    } finally {
      document.body.removeChild(host);
      holdOverlaysDuringPrint(1200);
      setPdfBusy(false);
    }
  };
  const downloadSupplierPdf = () => {
    if (!sourcePdfUrl) return;
    const downloadUrl = sourcePdfUrl.startsWith('blob:')
      ? sourcePdfUrl
      : sourcePdfUrl.replace(/([?&])disposition=inline(?:&|$)/, '$1disposition=attachment&').replace(/[?&]$/, '');
    const link = document.createElement('a');
    link.href = freshSupplierPdfUrl(downloadUrl);
    link.download = `${TYPE_META[type]?.document || 'Документ'} с корректировками.pdf`;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };
  return (
    <Drawer open={open} onClose={onClose} title="Предпросмотр клиентского документа"
      sub={`${outputLabel}${output.template ? ` · ${output.template}` : ''}`} width="min(860px,98vw)"
      className="receipt-brand-drawer"
      footer={<div className="receipt-supplier-footer-actions">
        {sourcePdfUrl && <Button variant="secondary" icon="eye" onClick={() => window.open(freshSupplierPdfUrl(sourcePdfUrl), '_blank', 'noopener,noreferrer')}>Оригинал поставщика с корректировками</Button>}
        {sourceOriginalPdfUrl && <Button variant="ghost" onClick={() => window.open(sourceOriginalPdfUrl, '_blank', 'noopener,noreferrer')}>Исходный файл поставщика</Button>}
        <Button variant="secondary" onClick={onClose}>Вернуться в редактор</Button>
        {output.mode !== 'original' && <Button variant="secondary" icon="printer" onClick={printReceipt}>Печать</Button>}
        {(output.mode !== 'original' || type === 'ЖД' || type === 'Авиа') && <Button icon="download" disabled={pdfBusy}
          onClick={output.mode === 'original' ? downloadSupplierPdf : downloadBrandPdf}>{output.mode === 'original'
            ? 'Скачать исправленный PDF'
            : pdfBusy ? 'Готовим PDF…' : 'Скачать фирменный PDF'}</Button>}
      </div>}>
      <div ref={printScopeRef} className="receipt-brand-print-scope">
      {printNotice && <div className="receipt-print-notice" role="status"><Icon name="checkCircle" />{printNotice}</div>}
      <div className="receipt-brand-variants" aria-label="Вариант бланка">
        {[
          ['original', 'Оригинал поставщика'],
          ['agency', 'Бланк агентства'],
          ['saas', 'Бланк SaaS-компании'],
        ].map(([mode, label]) => <button type="button" key={mode}
          className={output.mode === mode ? 'active' : ''} aria-pressed={output.mode === mode}
          onClick={() => setPreviewMode(mode)}>{label}</button>)}
      </div>
      <div ref={documentRef} className="receipt-brand-document-scope">
      {output.mode === 'original' ? (
        <section className="receipt-supplier-original" aria-label="Оригинал поставщика">
          <div className="receipt-source-notice"><Icon name="checkCircle" /><div><b>Оригинал поставщика · с сохранёнными корректировками</b>
            <span>Финансовые изменения перенесены прямо в копию исходного PDF с использованием его встроенного шрифта и исходной верстки. Загруженный оригинал хранится отдельно без изменений.</span></div></div>
          {sourcePdfUrl
            ? <iframe className="receipt-supplier-original-frame" src={displayedSupplierPdfUrl} title="Оригинал поставщика с правками" />
            : <div className="receipt-empty">Исходный PDF недоступен для предпросмотра</div>}
        </section>
      ) : type === 'Авиа' ? (
        <ReceiptAviaDocument draft={p} organization={organization} />
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
          {(type === 'Гостиница' || type === 'Трансфер') && terms.length > 0 && <><h4>Условия и важная информация</h4>
            <div className="receipt-brand-terms">{terms.map(([label, value]) => <div key={label}><b>{label}</b><span>{value}</span></div>)}</div></>}
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
      </div>
      </div>
    </Drawer>
  );
}

export function ReceiptSpecializedForm({
  type, value, onChange, correctionMode, onToggleCorrection, orders = [], services = [], companies = [],
}) {
  const p = useMemo(() => normalizeReceiptDraft(type, value), [type, value]);
  const user = (typeof window !== 'undefined' && window.CURRENT_USER?.name) || 'Оператор';
  // Какая строка разбивки только что добавлена: у неё сразу раскрывается
  // справочник, а после выбора кода фокус уходит в поле суммы.
  const [openPickerRow, setOpenPickerRow] = useState('');
  const [focusAmountRow, setFocusAmountRow] = useState('');
  const [pendingAddRow, setPendingAddRow] = useState('');
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
  // Выбор таксы из справочника: код проставляется, наименование подставляется
  // автоматически, сумма остаётся за оператором — её вводят следующим шагом.
  const setTaxCode = (key, index, code, title) => {
    const custom = code === CUSTOM_TAX_VALUE;
    const catalogTax = custom ? null : AVIA_TAX_BY_CODE[code];
    const rows = (p[key] || []).map((row, rowIndex) => rowIndex === index
      ? {
        ...row,
        code: custom ? '' : code,
        customCode: custom,
        label: custom ? (row.label || '') : (catalogTax?.name || row.label || ''),
      }
      : row);
    const nextDraft = synchronizeBreakdown({ ...p, [key]: rows }, key, rows);
    commit(nextDraft, `${title}: такса ${index + 1}`, p[key]?.[index]?.code, custom ? 'ручной код' : code);
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
  // Сразу после выбора кода фокус переходит в сумму: «выбрали — проставили
  // стоимость» без лишнего клика.
  useEffect(() => {
    if (!focusAmountRow || typeof document === 'undefined') return;
    const node = document.querySelector(`[data-amount-row="${focusAmountRow}"]`);
    if (node) { node.focus(); if (node.select) node.select(); }
    setFocusAmountRow('');
  }, [focusAmountRow]);

  // Кнопка «Добавить таксу» на защищённом бланке сначала включает режим
  // исправления, а строку добавляет уже следующим рендером — иначе правка
  // ушла бы в заблокированную форму и потерялась.
  useEffect(() => {
    if (!pendingAddRow || !correctionMode) return;
    const key = pendingAddRow;
    setPendingAddRow('');
    const nextIndex = (p[key] || []).length;
    addRow(key, { ...emptyCharge(), currency: p.currency },
      `Добавлена строка: ${key === 'taxBreakdown' ? 'Разбивка такс' : 'Разбивка'}`);
    setOpenPickerRow(`${key}:${nextIndex}`);
  }, [pendingAddRow, correctionMode]);

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
  const bindingTarget = p.crmBindingMode === 'company' || (p.crmCompany && !p.crmOrderNo)
    ? { mode: 'company', company: { id: p.crmCompanyId, name: p.crmCompany }, label: p.crmCompany || 'Выберите юр. лицо' }
    : p.crmBindingMode === 'person' || (p.crmPerson && !p.crmOrderNo)
    ? { mode: 'person', client: p.crmPerson, id: p.crmPersonId, label: p.crmPerson || 'Выберите физ. лицо' }
    : {
      mode: 'order',
      order: p.crmOrderNo ? { id: p.crmOrderId, no: p.crmOrderNo } : null,
      label: p.crmOrderNo ? `Заказ № ${p.crmOrderNo}` : 'Выберите заказ',
    };
  const setBindingTarget = (target) => {
    const before = p.crmBindingMode === 'person' ? p.crmPerson : (p.crmBindingMode === 'company' ? p.crmCompany : p.crmOrderNo);
    const next = target?.mode === 'person'
      ? {
        ...p, crmBindingMode: 'person', crmPerson: target.client || '', crmPersonId: target.id || '',
        crmCompany: '', crmCompanyId: '', crmOrderNo: '', crmOrderId: '', crmService: '', crmServiceId: '', crmTrip: '', crmTripId: '',
      }
      : target?.mode === 'company'
        ? {
          ...p, crmBindingMode: 'company', crmCompany: target.company?.name || target.label || '',
          crmCompanyId: target.company?.id || '', crmPerson: '', crmPersonId: '', crmOrderNo: '', crmOrderId: '',
          crmService: '', crmServiceId: '', crmTrip: '', crmTripId: '',
        }
      : {
        ...p, crmBindingMode: 'order', crmOrderNo: target?.order?.no || '',
        crmOrderId: target?.order?.id || '', crmPerson: '', crmPersonId: '', crmCompany: '', crmCompanyId: '',
        crmService: '', crmServiceId: '', crmTrip: '', crmTripId: '',
      };
    const after = target?.mode === 'person' ? target.client || ''
      : target?.mode === 'company' ? target.company?.name || target.label || '' : target?.order?.no || '';
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
        <Field label="Заказ CRM, юридическое или физическое лицо">
          <UnifiedBindField value={bindingTarget} onChange={setBindingTarget} modes={['order', 'company', 'person']}
            title="Куда привязать квитанцию"
            sub="Выберите существующий заказ, юридическое или физическое лицо"
            companyOptions={companies}
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
        {type === 'Гостиница' && source('Бронирование поставщика', 'supplierOrderNo', { placeholder: 'Не указано в ваучере' })}
        {type === 'Гостиница' && source('Бронирование отеля', 'hotelBookingNo', { placeholder: 'Не указано в ваучере' })}
        {type === 'ЖД' && source('Номер билета', 'ticketNo')}
        {type === 'ЖД' && p.supplierOrderNo && p.supplierOrderNo !== p.ticketNo && source('Номер заказа поставщика', 'supplierOrderNo')}
        {type === 'Трансфер' && source('Номер заказа поставщика', 'supplierOrderNo')}
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
            {(type === 'Авиа' || type === 'ЖД') && <Field label="Документ"><LockedInput correctionMode={correctionMode} value={row.document} onChange={(e) => setArray('passengers', index, 'document', e.target.value, `Документ участника ${index + 1}`)} /></Field>}
            {(type === 'Авиа' || type === 'ЖД') && <Field label="Номер билета"><LockedInput correctionMode={correctionMode} value={row.ticketNo} onChange={(e) => setArray('passengers', index, 'ticketNo', e.target.value, `Билет участника ${index + 1}`)} /></Field>}
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
            {type === 'Авиа' && <Field label="Ручная кладь"><LockedInput correctionMode={correctionMode} value={leg.handBaggage || p.handBaggage || ''} onChange={(e) => setArray('legs', index, 'handBaggage', e.target.value, `Ручная кладь сегмента ${index + 1}`)} /></Field>}
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

  const railConditionsBlock = type === 'ЖД' ? (
    <Section title="4. Условия билета">
      <Field label="Условия / примечания поставщика">
        <TextArea value={p.conditions || p.terms || p.fareRules || p.fare_rules || ''}
          disabled={!correctionMode}
          placeholder="Условия тарифа, возврата, обмена или другие примечания по этому билету"
          onChange={(event) => set('conditions', event.target.value, 'Условия билета')} />
      </Field>
    </Section>
  ) : null;

  // Разбивка тарифа / такс / сборов. Для такс код выбирается из справочника
  // (выпадающий список с поиском по первым буквам кода или названия), после
  // выбора наименование подставляется само, оператор проставляет только сумму.
  const breakdown = (key, title, locked, kind = 'fee') => {
    const isTax = kind === 'tax';
    const rows = p[key] || [];
    const editable = !locked || correctionMode;
    const rowsTotal = roundMoney(rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0));
    const addLabel = isTax ? 'Добавить таксу' : kind === 'fare' ? 'Добавить строку тарифа' : 'Добавить сбор';
    const addRowNow = () => {
      addRow(key, { ...emptyCharge(), currency: p.currency }, `Добавлена строка: ${title}`);
      setOpenPickerRow(`${key}:${rows.length}`);
    };
    const onAdd = () => {
      // Таксу можно добавить прямо из заблокированного бланка: режим
      // исправления включится сам, чтобы не искать отдельную кнопку.
      if (locked && !correctionMode && onToggleCorrection) {
        if (pendingAddRow) return;
        onToggleCorrection();
        setPendingAddRow(key);
        return;
      }
      addRowNow();
    };
    return (
      <div className="receipt-subcard">
        {editable
          ? <ListHeader title={title} onAdd={onAdd} addLabel={addLabel} />
          : <div className="receipt-list-head"><b>{title}</b>
            <span className="receipt-list-head-actions">
              <Pill tone="gray">Данные поставщика</Pill>
              {isTax && <Button size="sm" variant="ghost" icon="plus" onClick={onAdd}>{addLabel}</Button>}
            </span>
          </div>}
        {rows.length ? rows.map((row, index) => {
          const pickerKey = `${key}:${index}`;
          const useCatalog = isTax && !row.customCode;
          return (
            <div className={`receipt-inline-row ${index > 0 ? 'is-following ' : ''}${editable ? 'is-editable' : 'is-readonly'}`} key={index}>
              <Field label={isTax ? 'Код таксы' : kind === 'fare' ? 'Код составляющей' : 'Тип сбора'}>{isTax
                ? editable
                  ? useCatalog
                    ? <Combobox options={aviaTaxOptionsFor(row.code)}
                      value={row.code || ''} placeholder="Выберите таксу из списка"
                      searchPlaceholder="Код или название таксы…"
                      emptyText="Такса не найдена — выберите «Другой код»"
                      autoOpen={openPickerRow === pickerKey}
                      onChange={(code) => {
                        setOpenPickerRow('');
                        setTaxCode(key, index, code, title);
                        if (code !== CUSTOM_TAX_VALUE) setFocusAmountRow(pickerKey);
                      }} />
                    : <div className="receipt-tax-custom">
                      <Input value={row.code || ''} placeholder="Код"
                        onChange={(e) => setArray(key, index, 'code', e.target.value.toUpperCase(), `${title}: код ${index + 1}`)} />
                      <Button size="sm" variant="ghost" onClick={() => setArray(key, index, 'customCode', false, `${title}: возврат к справочнику`)}>Из справочника</Button>
                    </div>
                  : <LockedInput correctionMode={false} value={row.code || ''} />
                : <Input value={row.code || ''} onChange={(e) => setArray(key, index, 'code', e.target.value, `${title}: код ${index + 1}`)} />}</Field>
              <Field label="Наименование">{isTax
                ? <LockedInput correctionMode={editable} value={row.label || aviaTaxName(row.code) || ''} onChange={(e) => setArray(key, index, 'label', e.target.value, `${title}: название ${index + 1}`)} />
                : <Input value={row.label || ''} onChange={(e) => setArray(key, index, 'label', e.target.value, `${title}: название ${index + 1}`)} />}</Field>
              <Field label="Сумма">{isTax
                ? <LockedInput correctionMode={editable} type="number" step="0.01" value={row.amount || ''}
                  data-amount-row={pickerKey}
                  onChange={(e) => setArray(key, index, 'amount', e.target.value, `${title}: сумма ${index + 1}`)} />
                : <Input type="number" step="0.01" value={row.amount || ''} onChange={(e) => setArray(key, index, 'amount', e.target.value, `${title}: сумма ${index + 1}`)} />}</Field>
              {editable && <RowRemove label="" onClick={() => removeRow(key, index, `Удалена строка: ${title}`)} />}
            </div>
          );
        }) : <div className="receipt-empty">{isTax ? 'Таксы не добавлены — нажмите «Добавить таксу» и выберите код из справочника' : 'Нет строк'}</div>}
        {rows.length > 0 && <div className="receipt-breakdown-total">
          <span>Итого по разбивке</span>
          <b>{roundMoney(rowsTotal).toLocaleString('ru-RU')} {p.currency || ''}</b>
        </div>}
      </div>
    );
  };

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
        <div className="receipt-grid-2 receipt-breakdown-grid receipt-top-gap">
          {breakdown('fareBreakdown', 'Разбивка тарифа', true, 'fare')}
          {breakdown('taxBreakdown', 'Разбивка такс', true, 'tax')}
        </div>
        <div className="receipt-top-gap">{breakdown('feeBreakdown', 'Разбивка сборов', false, 'fee')}</div>
      </>}
      {type === 'ЖД' && <div className="receipt-top-gap">{breakdown('feeBreakdown', 'Разбивка сервисных сборов', false, 'fee')}</div>}
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

  const setAviaItFareMode = (enabled) => {
    const snapshot = p.output?.itFareSnapshot || {
      fare: p.fare,
      taxes: p.taxes,
      fees: p.fees,
    };
    const nextOutput = {
      ...p.output,
      priceMode: enabled ? 'it' : 'total',
      itFareSnapshot: snapshot,
    };
    commit({
      ...p,
      fare: p.fare,
      taxes: p.taxes,
      fees: p.fees,
      output: nextOutput,
    }, 'Отображение тарифа', p.output?.priceMode, nextOutput.priceMode);
  };

  const aviaItFareControl = type === 'Авиа' && (
    <label className="hp-check-row" style={{ border: '2px solid var(--blue)', borderRadius: 12, padding: '13px 14px', marginBottom: 16, background: 'var(--blue-soft)' }}>
      <Checkbox on={receiptUsesItFare(p)}
        onChange={setAviaItFareMode} />
      <span className="hp-check-label" style={{ flex: 1 }}>
        <b style={{ display: 'block', color: 'var(--ink)' }}>Закрыть тариф на IT</b>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>
          В клиентской квитанции вместо суммы тарифа будет показано «IT». Таксы и сборы останутся видимыми.
        </span>
      </span>
      <Pill tone={receiptUsesItFare(p) ? 'green' : 'gray'}>
        {receiptUsesItFare(p) ? 'IT включён' : 'Тариф открыт'}
      </Pill>
    </label>
  );

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
      {aviaItFareControl}
      {bindingBlock}
      {commonBooking}
      {type === 'Авиа' && <>{passengerBlock}{routeBlock}{financeBlock}{aviaBlocks}</>}
      {type === 'ЖД' && <>{passengerBlock}{routeBlock}{railConditionsBlock}{financeBlock}</>}
      {hotelBlocks}
      {transferBlocks}
      {outputBlock}
      <AuditLog rows={p.auditLog} />
    </div>
  );
}

export function ReceiptParticipantSummary({ draft, noun = 'пассажиров' }) {
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState({});
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);
  const names = receiptParticipantNames(draft);
  const blankCount = receiptBlankCount(draft);

  const updatePopoverPosition = () => {
    const button = buttonRef.current;
    if (!button || typeof window === 'undefined') return;
    const rect = button.getBoundingClientRect();
    const margin = 12;
    const gap = 6;
    const width = Math.min(320, Math.max(240, window.innerWidth - margin * 2));
    const left = Math.min(Math.max(margin, rect.left), Math.max(margin, window.innerWidth - width - margin));
    const estimatedHeight = Math.min(310, 58 + names.length * 38);
    const hasRoomBelow = window.innerHeight - rect.bottom >= Math.min(estimatedHeight, 220);
    if (hasRoomBelow || rect.top < estimatedHeight) {
      setPopoverStyle({ left, top: rect.bottom + gap, width });
    } else {
      setPopoverStyle({ left, bottom: window.innerHeight - rect.top + gap, width });
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    updatePopoverPosition();
    const closeOutside = (event) => {
      if (buttonRef.current?.contains(event.target) || popoverRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const closeEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const reposition = () => updatePopoverPosition();
    document.addEventListener('mousedown', closeOutside);
    window.addEventListener('keydown', closeEscape);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      window.removeEventListener('keydown', closeEscape);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, names.length]);

  if (!names.length) return <span>Участники не распознаны</span>;
  if (blankCount <= 1 && names.length === 1) return <span>{names[0]}</span>;

  const remaining = blankCount > 1 ? blankCount - 1 : names.length - 1;
  const participantLabel = blankCount > 1 ? receiptParticipantSurname(names[0]) : names[0];
  const participantCountLabel = '+' + remaining + ' ' + (blankCount > 1 ? receiptBlankWord(remaining) : noun);
  const summary = blankCount > 1
    ? blankCount + ' ' + receiptBlankWord(blankCount)
    : names.length + ' ' + noun;

  return <span className="receipt-participants">
    <button ref={buttonRef} type="button" className="receipt-participants-trigger"
      aria-haspopup="dialog" aria-expanded={open}
      onClick={() => {
        if (!open) requestAnimationFrame(updatePopoverPosition);
        setOpen((value) => !value);
      }}>
      <span className="receipt-participants-name">{participantLabel}</span>
      <span className="receipt-participants-count">{participantCountLabel}</span>
      <Icon name={open ? 'chevUp' : 'chevDown'} />
    </button>
    {open && typeof document !== 'undefined' && ReactDOM.createPortal(
      <div ref={popoverRef} className="receipt-participant-popover" role="dialog"
        aria-label="Участники документа" style={popoverStyle}>
        <div className="receipt-participant-popover-head">
          <span><b>Участники документа</b><small>{summary}</small></span>
          <button type="button" aria-label="Закрыть список участников" onClick={() => setOpen(false)}><Icon name="x" /></button>
        </div>
        <div className="receipt-participant-popover-list">
          {names.map((name, index) => (
            <div className="receipt-participant-popover-item" key={name + '-' + index}>
              <span>{index + 1}</span><b>{name}</b>
            </div>
          ))}
        </div>
      </div>,
      document.body,
    )}
  </span>;
}

export { TYPE_META };


/* Ticket-level rail supplier-order guard. */
// ((type === 'Гостиница' || type === 'Трансфер') ? value.ref

// Legacy hotel-guard regression marker: const fallbackSupplierOrder = (type === 'ЖД' || type === 'Трансфер')
