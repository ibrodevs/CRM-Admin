import { hotelCoordinates, hotelMapHotels, hotelMapKey } from './map-data.js';

export const HOTEL_MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v12';

// Keep SDK coordinates (longitude, latitude) separate from provider coordinates.
export function createHotelMapbox(mapbox, container, accessToken, { onLoad, onError, style = HOTEL_MAPBOX_STYLE } = {}) {
  const map = new mapbox.Map({
    container, accessToken, style, center: [40, 40], zoom: 3, language: 'ru',
    locale: { 'NavigationControl.ZoomIn': 'Приблизить', 'NavigationControl.ZoomOut': 'Отдалить', 'NavigationControl.ResetBearing': 'Повернуть на север', 'Map.Title': 'Карта отелей' },
  });
  map.addControl(new mapbox.NavigationControl(), 'top-right');
  if (onLoad) map.on('load', onLoad);
  if (onError) map.on('error', onError);
  let markers = [];
  return {
    map,
    setHotels(hotels, points, onPick) {
      markers.forEach((marker) => marker.remove());
      markers = [];
      const bounds = new mapbox.LngLatBounds();
      for (const hotel of hotelMapHotels(hotels)) {
        const cached = points[hotelMapKey(hotel)];
        const point = hotelCoordinates(hotel.itinerary) || (cached && hotelCoordinates({ lat: cached[0], lon: cached[1] }));
        if (!point) continue;
        const coordinates = [point[1], point[0]];
        const element = document.createElement('div');
        element.className = 'hp-map-marker';
        const label = document.createElement('button');
        label.type = 'button'; label.className = 'hp-map-price-tag';
        label.textContent = Number(hotel.base).toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' ' + hotel.currency;
        label.title = `${hotel.name} · Выбрать номер`;
        label.setAttribute('aria-label', label.title + ' · ' + label.textContent);
        label.addEventListener('click', (event) => { event.stopPropagation(); onPick(hotel); });
        element.append(label);
        markers.push(new mapbox.Marker({ element, anchor: 'center' }).setLngLat(coordinates).addTo(map));
        bounds.extend(coordinates);
      }
      if (markers.length) map.fitBounds(bounds, { padding: 65, maxZoom: 15, duration: 0 });
      map.resize();
    },
    destroy() {
      markers.forEach((marker) => marker.remove());
      markers = [];
      map.remove();
    },
  };
}
