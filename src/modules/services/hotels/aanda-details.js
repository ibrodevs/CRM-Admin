import { hotelPlainText, hotelCancellationDescription } from './presentation.js';

export function aandaHotelLines(details) {
  if (details?.provider !== 'aanda') return [];
  const itinerary = details.itinerary || {};
  const booking = details.booking || {};
  const lines = [
    ['Отель', itinerary.property_name], ['Номер', itinerary.room],
    ['Даты проживания', [itinerary.check_in, itinerary.check_out].filter(Boolean).join(' — ')],
    ['Стандартный заезд', itinerary.check_in_time], ['Стандартный выезд', itinerary.check_out_time],
    ['Питание', itinerary.meal_plan],
    ['Условия отмены', hotelCancellationDescription(details.fare)],
    ['Пожелания в отель', details.special_requests],
    ['Заказ A&A', booking.order_id], ['ReferenceNumber', booking.reference_number],
    ['Статус поставщика', [booking.raw_status_name, booking.raw_status].filter(Boolean).join(' · ')],
    ['Фактическая цена', booking.actual_price ? `${booking.actual_price.amount} ${booking.actual_price.currency}` : ''],
  ];
  for (const room of details.rooms || []) {
    if (room.room_amenities?.length) lines.push(['Удобства номера', room.room_amenities.join(', ')]);
    lines.push(['Тариф', room.rate_description], ['Оплата', room.payment_name]);
  }
  for (const info of details.fare?.information || []) lines.push([info.title || 'Важная информация', info.text]);
  const seenNews = new Set((details.fare?.information || []).map((info) => info.text));
  for (const info of booking.news || []) {
    if (!seenNews.has(info.NewsInfo)) lines.push([info.NewsTitle || 'Важная информация', info.NewsInfo]);
  }
  const notice = booking.checkin_notice || {};
  lines.push(['Правила заселения', notice.Checkin?.Type],
    ['Получение ключей', [notice.ObtainingKeys?.Type, notice.ObtainingKeys?.Address, notice.ObtainingKeys?.Time].filter(Boolean).join(' · ')],
    ['Информация о заселении', notice.ContactInfo?.AdditionalInfo],
    ['Дополнительные условия', notice.Availability?.AdditionalInfo]);
  if (String(notice.Deposit?.IsNeeded).toLowerCase() === 'true') {
    lines.push(['Депозит', [notice.Deposit.Price, notice.Deposit.Currency, notice.Deposit.PaymentType].filter(Boolean).join(' ')]);
  }
  for (const item of details.accommodations || []) {
    lines.push(['Подтверждение отеля', item.confirmation_number], ['Информация от поставщика', item.supplier_info],
      ['Комментарий к штрафу', item.penalty_note]);
    if (item.penalty != null) lines.push(['Текущий штраф', `${item.penalty} ${booking.actual_price?.currency || details.rooms?.[0]?.currency?.name || ''}`]);
    if (item.allow_cancel != null) lines.push(['Аннуляция разрешена', item.allow_cancel ? 'Да' : 'Нет']);
  }
  return lines.map(([label, value]) => [label, hotelPlainText(value)]).filter(([, value]) => value);
}
