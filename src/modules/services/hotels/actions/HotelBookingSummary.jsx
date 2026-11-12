import { currencySymbol } from '../../../../shared/lib/money.js';
import { InfoNotice } from '../../../../shared/ui/InfoNotice.jsx';
import { Pill } from '../../../../shared/ui/Pill.jsx';
import { travelDate } from '../../../../shared/lib/service-presentation.js';
import { hotelMoney, hotelStatusLabel, policyLines } from './hotelCapabilities.js';

export function HotelPolicy({ value }) {
  const lines = policyLines(value);
  return lines.length ? <ul className="hotel-policy-lines">{lines.map((line, index) => <li key={index}>{line}</li>)}</ul> : <InfoNotice icon="alertCircle">Поставщик не передал условия отмены. Это не означает отсутствие штрафа.</InfoNotice>;
}

function Facts({ rows, className = 'hotel-actions-summary' }) {
  return <dl className={className}>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value === undefined || value === null || value === '' ? 'Не указано' : value}</dd></div>)}</dl>;
}

export function HotelBookingSummary({ summary: s }) {
  const f = s.financial || {};
  const status = s.booking_status || s.service_status;
  const tone = ['confirmed', 'issued', 'completed'].includes(status) ? 'green' : ['failed', 'rejected'].includes(status) ? 'red' : ['cancelled', 'canceled'].includes(status) ? 'gray' : 'blue';
  const endpoint = (date, time) => [travelDate(date) || 'Дата не указана', time].filter(Boolean).join(' • ');
  return <section className="flight-booking-summary hotel-booking-summary" aria-label="Информация о гостиничной брони">
      <div><span className="flight-booking-eyebrow">Гостиница</span><Pill tone={tone}>{hotelStatusLabel(status)}</Pill></div>
      <h3>{s.hotel || 'Гостиница не указана'}</h3>
      <p>{endpoint(s.check_in, s.check_in_time)} → {endpoint(s.check_out, s.check_out_time)}</p>
      <Facts rows={[
        ['Адрес', s.address], ['Статус услуги', hotelStatusLabel(s.service_status)],
      ]} />
      <Facts className="hotel-booking-stay" rows={[
        ['Ночей', s.nights], ['Номеров', s.room_count], ['Гостей', s.guest_count],
        ['Стоимость для клиента', hotelMoney(f.client_cost, f.currency ? currencySymbol(f.currency) : '')],
      ]} />
      {s.hotel_operator_request && <aside className="hotel-remarks-saved hotel-internal-only"><b>Запрос оператору · требует согласования</b><p>{s.hotel_operator_request}</p><small>Сохранён в CRM. Автоматически в отель не отправляется.</small></aside>}
      {s.unassigned_guests?.length > 0 && <InfoNotice icon="alertCircle">Гости без подтверждённого распределения по номерам: {s.unassigned_guests.map((g) => g.name || 'Имя не указано').join(', ')}.</InfoNotice>}
    </section>;
}

export function HotelBookingDetails({ summary: s }) {
  const f = s.financial || {};
  const technical = [
    ['Поставщик', s.supplier], ['Номер бронирования поставщика', s.supplier_booking_reference],
    ['Идентификатор услуги CRM', s.service_id],
    ['Номера подтверждения поставщика', (s.confirmation_references || []).join(', ')],
    ['Номер заказа CRM', s.order_number],
    ...(s.provider_adapter === 'hotelbook' ? [
      ['Идентификатор заказа Hotelbook', s.client_order_id],
      ['Идентификаторы позиций Hotelbook', (s.supplier_item_ids || []).join(', ')],
    ] : []),
    ['Код статуса у поставщика', s.booking_status], ['Код статуса услуги CRM', s.service_status],
  ];
  return <>
    <details className="hotel-booking-disclosure hotel-internal-only"><summary>Стоимость и расчёты · только для сотрудников</summary><Facts rows={[
      ['Стоимость поставщика', hotelMoney(f.supplier_cost, f.currency ? currencySymbol(f.currency) : '')], ['Стоимость клиента', hotelMoney(f.client_cost, f.currency ? currencySymbol(f.currency) : '')],
      ['Сервисный сбор', hotelMoney(f.service_fee, f.currency ? currencySymbol(f.currency) : '')], ['Валюта', f.currency],
    ]} /></details>
    <details className="hotel-booking-disclosure hotel-booking-technical hotel-internal-only"><summary>Технические сведения о бронировании</summary><Facts rows={technical} /></details>
  </>;
}
