import { hotelMoney, policyLines } from './hotelCapabilities.js';
export function HotelPolicy({ value }) {
  const lines = policyLines(value);
  return lines.length ? <ul style={{ margin: '8px 0', paddingLeft: 20 }}>{lines.map((line, index) => <li key={index} style={{ overflowWrap: 'anywhere' }}>{line}</li>)}</ul> : <p className="hint">Поставщик не передал условия отмены. Это не означает отсутствие штрафа.</p>;
}
export function HotelBookingSummary({ summary }) {
  const s = summary, f = s.financial;
  const rows = [
    ['Адрес', s.address], ['Поставщик', s.supplier], ['CRM service ID', s.service_id],
    ['Номер бронирования поставщика', s.supplier_booking_reference], ['Confirmation / reference ID', s.confirmation_references.join(', ')],
    ['Статус бронирования', s.booking_status], ['Статус услуги CRM', s.service_status], ['Заезд', s.check_in], ['Выезд', s.check_out],
    ['Ночей', s.nights], ['Номеров', s.room_count], ['Гостей', s.guest_count],
    ['Стоимость поставщика', hotelMoney(f.supplier_cost, f.currency)], ['Стоимость клиента', hotelMoney(f.client_cost, f.currency)],
    ['Сервисный сбор', hotelMoney(f.service_fee, f.currency)], ['Валюта', f.currency],
  ];
  return <section aria-label="Информация о гостиничной брони"><h3 style={{ marginTop: 0 }}>{s.hotel}</h3><dl className="hotel-actions-summary">
    {rows.map(([label, value]) => <div key={label}><dt className="hint">{label}</dt><dd>{value ?? 'Не указано'}{value === '' ? 'Не указано' : ''}</dd></div>)}
  </dl>{s.unassigned_guests?.length > 0 && <p className="hint">Гости без подтверждённого распределения по номерам: {s.unassigned_guests.map((g) => g.name || 'Имя не указано').join(', ')}.</p>}</section>;
}
