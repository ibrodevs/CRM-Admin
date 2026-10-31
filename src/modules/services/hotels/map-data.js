// Never place an offer at a city centre when the hotel's position is unknown.
export function hotelCoordinates(value = {}) {
  if (!value || typeof value !== 'object') return null;
  const point = value.coordinates || value.geo || value;
  const lat = point.latitude ?? point.lat;
  const lon = point.longitude ?? point.lon ?? point.lng;
  if (lat == null || lon == null || typeof lat === 'boolean' || typeof lon === 'boolean'
    || String(lat).trim() === '' || String(lon).trim() === '') return null;
  const pair = [Number(lat), Number(lon)];
  return pair.every(Number.isFinite) && Math.abs(pair[0]) <= 90 && Math.abs(pair[1]) <= 180 ? pair : null;
}

export function hotelMapKey(hotel) {
  return [hotel.supplierId || hotel.supplier_id || hotel.supplier, hotel.itinerary?.hotel_id || hotel.name, hotel.addr, hotel.city].join('|');
}

export function hotelMapHotels(hotels) {
  const unique = new Map();
  for (const hotel of hotels) {
    // Keep separate currencies; the lowest available tariff represents each hotel.
    const key = `${hotelMapKey(hotel)}|${hotel.currency}`;
    if (!unique.has(key) || hotel.base < unique.get(key).base) unique.set(key, hotel);
  }
  return [...unique.values()];
}

export function hotelMapSuggestion(hotel, suggestions) {
  const normalize = (value) => String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]/gu, '');
  return suggestions.find((place) => place.kind !== 'Город' && normalize(place.title) === normalize(hotel.name) && hotelCoordinates(place));
}

export async function resolveHotelMapPoint(hotel, { getHotelContent, searchLocations, signal }) {
  const direct = hotelCoordinates(hotel.itinerary) || hotelCoordinates(hotel);
  if (direct) return direct;
  const offerId = hotel._backendOfferId || hotel.id;
  if (hotel.provider_adapter === 'hotelbook' && offerId && getHotelContent) {
    try {
      const content = await getHotelContent({ offerId }, signal);
      if (signal?.aborted) return null;
      const sameHotel = !hotel.itinerary?.hotel_id || String(content.hotel?.id) === String(hotel.itinerary.hotel_id);
      const point = sameHotel && hotelCoordinates(content.hotel);
      if (point) return point;
    } catch (error) { if (signal?.aborted) throw error; }
  }
  if (signal?.aborted || !searchLocations) return null;
  const query = [hotel.name, hotel.city, hotel.addr === '—' ? '' : hotel.addr].filter(Boolean).join(', ');
  const suggestions = await searchLocations(query, signal);
  if (signal?.aborted) return null;
  const match = hotelMapSuggestion(hotel, suggestions);
  return match ? hotelCoordinates(match) : null;
}
