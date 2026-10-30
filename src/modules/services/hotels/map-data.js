// Never place an offer at a city centre when the hotel's position is unknown.
export function hotelCoordinates(value = {}) {
  const point = value.coordinates || value.geo || value;
  const lat = point.latitude ?? point.lat;
  const lon = point.longitude ?? point.lon ?? point.lng;
  if (lat == null || lon == null || lat === '' || lon === '') return null;
  const pair = [Number(lat), Number(lon)];
  return pair.every(Number.isFinite) && Math.abs(pair[0]) <= 90 && Math.abs(pair[1]) <= 180 ? pair : null;
}

export function hotelMapKey(hotel) {
  return [hotel.supplier, hotel.itinerary?.hotel_id || hotel.name, hotel.addr, hotel.city].join('|');
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
  return suggestions.find((place) => normalize(place.title) === normalize(hotel.name) && hotelCoordinates(place));
}
