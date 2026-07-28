import React, { useMemo, useState } from 'react';
import { Icon } from '../../icons';
import { Button, Drawer, Field, Input, Pill, Select, TimeField } from '../../ui';
import { UFDateField } from '../../forms_unified';

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
  flightNo: '', cls: '', status: '', dir: 'out',
});
const emptyRoom = () => ({
  category: '', name: '', bedType: '', adults: 1, children: 0, meal: 'Без питания',
  earlyCheckIn: '', lateCheckOut: '', conditions: '', guestIds: [],
});
const emptyCharge = () => ({ code: '', label: '', amount: '', currency: '' });
const emptyExtra = () => ({ name: '', details: '', amount: '' });

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
    document: value.docNo || '', ticketNo: value.ticketNo || '' }] : [emptyPassenger()];
  const passengers = asArray(value.passengers, passengerFallback).map((row) => ({ ...emptyPassenger(), ...row }));
  const supplierTotal = Number(value.total) || ((Number(value.fare) || 0) + (Number(value.taxes) || 0) + (Number(value.fees) || 0));
  const supplierBase = Number(value.fare) || supplierTotal;
  const draft = {
    carrier: '', carrierCode: '', passenger: passengers[0]?.name || '', passengers,
    dob: passengers[0]?.dob || '', docNo: passengers[0]?.document || '', ticketNo: passengers[0]?.ticketNo || '',
    ref: '', supplierOrderNo: '', hotelBookingNo: '', crmOrderNo: '', crmPassenger: '', crmService: '', crmTrip: '',
    issueDate: '', bookingStatus: '', currency: 'RUB', tripType: type === 'Гостиница' ? 'stay' : 'oneway',
    legs: [emptyLeg()], fare: '', taxes: '', fees: '', total: '', originalTotal: supplierTotal || '', supplierFees: '',
    ticketCost: value.fare || '', reservedSeatCost: '', agencyServiceFee: value.fees || '',
    additionalFees: '', supplierCost: supplierBase || '', markup: '', discount: '',
    taxBreakdown: [], feeBreakdown: [], extras: [], fareInfo: {
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
  draft.taxBreakdown = Array.isArray(value.taxBreakdown) ? value.taxBreakdown : [];
  draft.feeBreakdown = Array.isArray(value.feeBreakdown) ? value.feeBreakdown : [];
  draft.extras = Array.isArray(value.extras) ? value.extras : [];
  draft.rooms = asArray(value.rooms, [emptyRoom()]).map((row) => ({ ...emptyRoom(), ...row }));
  draft.fareInfo = { code: '', name: '', bookingClass: draft.cls || '', exchangeRules: '', refundRules: '', ...(value.fareInfo || {}) };
  draft.hotel = { name: value.carrier || '', category: '', country: '', city: '', address: '', phone: '', email: '', map: '', ...(value.hotel || {}) };
  draft.hotelTerms = { deposit: '', cityTax: '', resortFee: '', registrationFee: '', cancellation: '', noShow: '', amendment: '', important: '', guestComment: '', ...(value.hotelTerms || {}) };
  draft.vehicle = { className: '', category: '', passengers: '', luggage: '', requirements: '', ...(value.vehicle || {}) };
  draft.transferTerms = { cancellation: '', freeWaiting: '', meetAndGreet: '', baggageHelp: '', supportContacts: '', supplierComment: '', driverComment: '', passengerComment: '', ...(value.transferTerms || {}) };
  draft.output = { mode: 'original', template: '', priceMode: type === 'Гостиница' || type === 'Трансфер' ? 'hidden' : 'total', ...(value.output || {}) };
  draft.auditLog = Array.isArray(value.auditLog) ? value.auditLog : [];
  if (value.originalTotal === undefined || value.originalTotal === '') draft.originalTotal = supplierTotal || '';
  if (type === 'ЖД' && (value.ticketCost === undefined || value.ticketCost === '')) draft.ticketCost = value.fare || '';
  if (type === 'ЖД' && (value.agencyServiceFee === undefined || value.agencyServiceFee === '')) draft.agencyServiceFee = value.fees || '';
  if ((type === 'Гостиница' || type === 'Трансфер') && (value.supplierCost === undefined || value.supplierCost === '')) draft.supplierCost = supplierBase || '';
  if ((type === 'Гостиница' || type === 'Трансфер') && (value.agencyServiceFee === undefined || value.agencyServiceFee === '')) draft.agencyServiceFee = value.fees || '';
  return withFinancialAliases(type, draft);
}

export function receiptParticipantNames(draft) {
  return (draft.passengers || []).map((row) => row.name).filter(Boolean);
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
    return [route || 'Маршрут не распознан', first.date || 'Дата не распознана', first.flightNo ? `Поезд ${first.flightNo}` : 'Поезд не распознан'];
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
  return <Button type="button" size="sm" variant="ghost" icon="trash" className="receipt-remove" onClick={onClick}>{label}</Button>;
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
        {type === 'ЖД' && draft.crmOrderNo && <div className="receipt-rail-footer">Заказ в CRM: № {draft.crmOrderNo}</div>}
      </div>
    </div>
  );
}

export function ReceiptBrandDocumentDrawer({ open, type, draft, originalUrl, onClose }) {
  if (!open || !draft) return null;
  const p = normalizeReceiptDraft(type, draft);
  const participants = receiptParticipantNames(p);
  const output = p.output || {};
  const organization = output.mode === 'saas' ? 'Компания клиента' : 'ПСЦ Travel Hub';
  const outputLabel = output.mode === 'saas' ? 'Фирменный ваучер SaaS-компании' : output.mode === 'agency' ? 'Фирменный бланк агентства' : 'Оригинал поставщика';
  const price = output.priceMode === 'paid' ? 'Оплачено'
    : output.priceMode === 'hidden' ? '' : `${receiptFinancialTotal(type, p).toLocaleString('ru-RU')} ${p.currency || ''}`;
  const terms = type === 'Гостиница'
    ? [['Депозит', p.hotelTerms.deposit], ['Городской налог', p.hotelTerms.cityTax], ['Курортный сбор', p.hotelTerms.resortFee],
      ['Условия отмены', p.hotelTerms.cancellation], ['Штраф при незаезде', p.hotelTerms.noShow], ['Важная информация', p.hotelTerms.important],
      ['Комментарий для гостя', p.hotelTerms.guestComment]]
    : [['Условия отмены', p.transferTerms.cancellation], ['Бесплатное ожидание', p.transferTerms.freeWaiting],
      ['Встреча с табличкой', p.transferTerms.meetAndGreet], ['Помощь с багажом', p.transferTerms.baggageHelp],
      ['Контакты поддержки', p.transferTerms.supportContacts], ['Комментарий пассажиру', p.transferTerms.passengerComment]];
  const printReceipt = () => {
    const cleanup = () => document.body.classList.remove('receipt-printing');
    document.body.classList.add('receipt-printing');
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
    cleanup();
  };
  return (
    <Drawer open={open} onClose={onClose} title="Предпросмотр клиентского документа"
      sub={`${outputLabel}${output.template ? ` · ${output.template}` : ''}`} width="min(860px,98vw)"
      footer={<>
        {originalUrl && <Button variant="secondary" icon="eye" onClick={() => window.open(originalUrl, '_blank')}>Оригинал поставщика</Button>}
        <Button variant="secondary" onClick={onClose}>Закрыть</Button>
        {output.mode !== 'original' && <Button icon="download" onClick={printReceipt}>Печать / сохранить PDF</Button>}
      </>}>
      {output.mode === 'original' ? (
        <div className="receipt-source-notice"><Icon name="lock" /><div><b>Будет использован оригинал поставщика</b>
          <span>Исходный файл хранится и отправляется без изменений.</span></div></div>
      ) : (
        <article className="receipt-brand-document">
          <header><div className="receipt-brand-logo">P</div><div><b>{organization}</b><span>{TYPE_META[type]?.document || 'Документ'}</span></div>
            <div><small>Заказ CRM</small><b>{p.crmOrderNo || '—'}</b></div></header>
          <div className="receipt-brand-meta">
            <div><small>Бронь поставщика</small><b>{p.supplierOrderNo || p.ref || p.ticketNo || '—'}</b></div>
            <div><small>Дата оформления</small><b>{p.issueDate || '—'}</b></div>
            <div><small>Статус</small><b>{p.bookingStatus || 'Подтверждено'}</b></div>
          </div>

          {type === 'Гостиница' && <>
            <h3>{p.hotel.name || 'Отель'}</h3>
            <p>{[p.hotel.category, p.hotel.city, p.hotel.country].filter(Boolean).join(' · ')}</p>
            <p>{p.hotel.address || ''}</p>
            <p>{[p.hotel.phone, p.hotel.email].filter(Boolean).join(' · ')}</p>
            <div className="receipt-brand-period"><b>{p.legs[0]?.date || '—'} → {p.legs[0]?.endDate || '—'}</b><span>{p.nights || '—'} ноч.</span></div>
            <h4>Размещение</h4>
            <div className="receipt-brand-list">{p.rooms.map((room, index) => <div key={index}>
              <b>{room.category || room.name || `Номер ${index + 1}`}</b>
              <span>{[room.name, room.bedType, `${room.adults || 0} взр.`, room.children ? `${room.children} дет.` : '', room.meal].filter(Boolean).join(' · ')}</span>
              {!!room.guestIds?.length && <span>Гости: {room.guestIds.join(', ')}</span>}
              {(room.earlyCheckIn || room.lateCheckOut) && <span>{[room.earlyCheckIn && `Ранний заезд: ${room.earlyCheckIn}`, room.lateCheckOut && `Поздний выезд: ${room.lateCheckOut}`].filter(Boolean).join(' · ')}</span>}
              {room.conditions && <span>{room.conditions}</span>}
            </div>)}</div>
          </>}

          {(type === 'Авиа' || type === 'ЖД' || type === 'Трансфер') && <>
            <h3>{receiptDetailsLines(type, p)[0]}</h3>
            <h4>{type === 'Трансфер' ? 'Поездки' : 'Маршрут'}</h4>
            <div className="receipt-brand-list">{p.legs.map((leg, index) => <div key={index}>
              <b>{leg.from || leg.fromCode || '—'} → {leg.to || leg.toCode || '—'}</b>
              <span>{[leg.date, leg.dep, leg.arr, leg.flightNo].filter(Boolean).join(' · ')}</span>
              {(leg.fromAddress || leg.toAddress) && <span>{[leg.fromAddress, leg.toAddress].filter(Boolean).join(' → ')}</span>}
              {type === 'Авиа' && <span>{[leg.carrier || p.carrier, leg.cls, leg.status].filter(Boolean).join(' · ')}</span>}
            </div>)}</div>
          </>}

          <h4>{type === 'Гостиница' ? 'Гости' : 'Пассажиры'}</h4>
          <div className="receipt-brand-names">{participants.map((name) => <span key={name}>{name}</span>)}</div>

          {type === 'Трансфер' && <div className="receipt-brand-callout"><b>Автомобиль</b>
            <span>{[p.vehicle.className, p.vehicle.category, p.vehicle.passengers && `${p.vehicle.passengers} пассаж.`, p.vehicle.luggage && `${p.vehicle.luggage} багажа`].filter(Boolean).join(' · ')}</span>
            {p.vehicle.requirements && <span>{p.vehicle.requirements}</span>}
          </div>}
          {type === 'Авиа' && p.extras.length > 0 && <><h4>Дополнительные услуги</h4>
            <div className="receipt-brand-names">{p.extras.map((row, index) => <span key={index}>{row.name}{row.details ? ` · ${row.details}` : ''}</span>)}</div></>}
          {(type === 'Гостиница' || type === 'Трансфер') && terms.some(([, value]) => value) && <><h4>Условия и важная информация</h4>
            <div className="receipt-brand-terms">{terms.filter(([, value]) => value).map(([label, value]) => <div key={label}><b>{label}</b><span>{value}</span></div>)}</div></>}
          {price && <div className="receipt-brand-total"><span>{output.priceMode === 'paid' ? 'Статус оплаты' : 'Итого для клиента'}</span><b>{price}</b></div>}
          <footer>{organization} · Сформировано в PSC Travel Hub</footer>
        </article>
      )}
    </Drawer>
  );
}

export function ReceiptSpecializedForm({ type, value, onChange, correctionMode, onToggleCorrection }) {
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

  const commonBooking = (
    <Section title="1. Информация о документе">
      <div className="receipt-form-grid">
        {type === 'Авиа' && source('Номер билета', 'ticketNo')}
        {type === 'Авиа' && source('Код бронирования (PNR)', 'ref')}
        {type === 'Гостиница' && source('Бронирование поставщика', 'supplierOrderNo')}
        {type === 'Гостиница' && source('Бронирование отеля', 'hotelBookingNo')}
        {(type === 'ЖД' || type === 'Трансфер') && source('Номер заказа поставщика', 'supplierOrderNo')}
        {source('Дата оформления', 'issueDate')}
        {source('Статус бронирования', 'bookingStatus')}
        <Field label="Внутренний номер заказа CRM"><Input value={p.crmOrderNo || ''} onChange={(e) => set('crmOrderNo', e.target.value, 'Привязка к заказу CRM')} placeholder="PSC-2026-000125" /></Field>
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
            {correctionMode && p.passengers.length > 1 && <RowRemove onClick={() => removeRow('passengers', index, 'Удалён участник')} />}</div>
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
            <Field label="Привязка к пассажиру CRM"><Input value={row.crmPassenger} onChange={(e) => setArray('passengers', index, 'crmPassenger', e.target.value, `Привязка участника ${index + 1}`)} placeholder="Выберите или укажите ФИО" /></Field>
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
            {correctionMode && p.legs.length > 1 && <RowRemove onClick={() => removeRow('legs', index, 'Удалён сегмент маршрута')} />}</div>
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
            {type === 'Авиа' && <ProtectedTime correctionMode={correctionMode} label="Время прибытия" value={leg.arr}
              onChange={(next) => setArray('legs', index, 'arr', next, `Время прибытия ${index + 1}`)} />}
            {(type === 'Авиа' || type === 'ЖД' || type === 'Трансфер') && <Field label={type === 'ЖД' ? 'Номер поезда' : type === 'Трансфер' ? 'Рейс или поезд' : 'Номер рейса'}><LockedInput correctionMode={correctionMode} value={leg.flightNo} onChange={(e) => setArray('legs', index, 'flightNo', e.target.value, `Рейс/поезд сегмента ${index + 1}`)} /></Field>}
            {type === 'Авиа' && <Field label="Авиакомпания"><LockedInput correctionMode={correctionMode} value={leg.carrier || p.carrier} onChange={(e) => setArray('legs', index, 'carrier', e.target.value, `Авиакомпания сегмента ${index + 1}`)} /></Field>}
            {type === 'Авиа' && <Field label="Класс бронирования"><LockedInput correctionMode={correctionMode} value={leg.cls} onChange={(e) => setArray('legs', index, 'cls', e.target.value, `Класс сегмента ${index + 1}`)} /></Field>}
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
      {type === 'Авиа' && <div className="receipt-grid-2 receipt-top-gap">{breakdown('taxBreakdown', 'Разбивка такс', true)}{breakdown('feeBreakdown', 'Разбивка сборов', false)}</div>}
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
        <div className="receipt-subcard-title"><b>Номер {index + 1}</b>{correctionMode && p.rooms.length > 1 && <RowRemove onClick={() => removeRow('rooms', index, 'Удалён номер размещения')} />}</div>
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

  const crmAndOutput = <>
    <Section title={type === 'Гостиница' ? '10. Привязка к CRM' : type === 'Трансфер' ? '7. Привязка к CRM' : type === 'ЖД' ? 'Привязка к заказу CRM' : '9. Привязка к CRM'}>
      <div className="receipt-form-grid">
        <Field label="Заказ CRM"><Input value={p.crmOrderNo || ''} onChange={(e) => set('crmOrderNo', e.target.value, 'Заказ CRM')} /></Field>
        <Field label={type === 'Гостиница' ? 'Услуга размещения' : type === 'Трансфер' ? 'Услуга трансфера' : 'Услуга'}><Input value={p.crmService || ''} onChange={(e) => set('crmService', e.target.value, 'Привязка к услуге')} /></Field>
        {type === 'Авиа' && <Field label="Соответствующий перелёт"><Input value={p.crmTrip || ''} onChange={(e) => set('crmTrip', e.target.value, 'Привязка к перелёту')} /></Field>}
      </div>
    </Section>
    <Section title={type === 'Гостиница' ? '11. Формирование документа' : type === 'Трансфер' ? '8. Формирование документа' : type === 'ЖД' ? 'Вывод документа' : '10. Вывод документа'}>
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
  </>;

  return (
    <div className="receipt-editor-form">
      <SourceNotice correctionMode={correctionMode} onToggle={onToggleCorrection} />
      {commonBooking}
      {type === 'Авиа' && <>{passengerBlock}{routeBlock}{financeBlock}{aviaBlocks}</>}
      {type === 'ЖД' && <>{passengerBlock}{routeBlock}{financeBlock}</>}
      {hotelBlocks}
      {transferBlocks}
      {crmAndOutput}
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
