// CRM search criteria; credentials stay on the backend.
export function hotelDateOnly(value) {
  if (!value) return undefined;
  const pad = (part) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function hotelCitizenship(value) {
  return ({ 'РФ': 'RU', 'Кыргызстан': 'KG', 'Казахстан': 'KZ' })[value] || undefined;
}

export function revalidationNeedsConfirmation(previous, result) {
  return result.revalidation?.status === 'price_changed' || Boolean(result.revalidation?.terms_changed)
    || (previous.cost != null && Number(previous.cost) !== Number(result.offer?.price?.amount))
    || (previous.currency && previous.currency !== result.offer?.price?.currency);
}

export function hotelBreakfastIncluded(mealPlan) {
  const value = String(mealPlan || '').trim().toLowerCase();
  return /^(bb|hb|fb|ai)$/.test(value)
    || /завтрак|полупансион|полный пансион|всё включено|все включено|breakfast|half board|full board|all inclusive/.test(value);
}

export function hotelCancellationDeadline(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?(Z|[+-]\d{2}:\d{2})$/);
  if (!match) return value || '';
  const [, year, month, day, hour, minute, offset] = match;
  const zone = offset === 'Z' ? 'UTC' : `UTC${offset}`;
  return `${day}.${month}.${year}, ${hour}:${minute} (${zone})`;
}

export function hotelMatchesQuery(hotel, query) {
  const normalize = (text) => String(text || '').toLowerCase().replace(/ё/g, 'е').replace(/[-–—]/g, ' ').replace(/\s+/g, ' ').trim();
  const text = normalize([hotel.name, hotel.addr, hotel.district, hotel.city].filter(Boolean).join(' '));
  return normalize(query).split(' ').every((word) => text.includes(word));
}

export function hotelDateError(checkin, checkout, today = new Date()) {
  if (!checkin || !checkout) return 'Выберите даты заезда и выезда';
  if (hotelDateOnly(checkin) < hotelDateOnly(today)) return 'Дата заезда не может быть в прошлом';
  if (hotelDateOnly(checkout) <= hotelDateOnly(checkin)) return 'Дата выезда должна быть позже даты заезда';
  return '';
}

export function hotelOccupancy(rooms) {
  return {
    rooms: rooms.map((room) => ({ adults: room.adults, childrenAges: [...room.childrenAges], quantity: 1 })),
    guests: rooms.reduce((total, room) => total + room.adults + room.childrenAges.length, 0),
    children: rooms.reduce((total, room) => total + room.childrenAges.length, 0),
    valid: rooms.length >= 1 && rooms.length <= 5 && rooms.every((room) => Number.isInteger(room.adults) && room.adults >= 1 && room.adults <= 9
      && room.childrenAges.length <= 4 && room.childrenAges.every((age) => Number.isInteger(age) && age >= 0 && age <= 17)),
  };
}


export function hotelProviderCriteria(location, text) {
  if (['aanda', 'ostrovok'].includes(location?.source) && location.value === text && /^\d{1,20}$/.test(String(location.city_code || ''))) {
    return {
      [location.source]: location.source === 'ostrovok' ? { region_id: String(location.city_code) } : { city_code: String(location.city_code) },
      ...(location.supplier_id ? { provider_selection: { provider_adapter: location.source, supplier_id: location.supplier_id } } : {}),
    };
  }
  return {};
}
