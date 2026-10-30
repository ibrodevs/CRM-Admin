import { useEffect, useRef, useState } from 'react';
import { hotelCoordinates, hotelMapHotels, hotelMapKey, hotelMapSuggestion } from './map-data.js';

export function HotelMap({ hotels, onPick }) {
  const container = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(null);
  const leafletRef = useRef(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const [ready, setReady] = useState(false);
  const [points, setPoints] = useState({});
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const cache = useRef(new Map());

  useEffect(() => {
    let disposed = false;
    import('leaflet').then((module) => {
      if (disposed) return;
      const L = module.default || module;
      leafletRef.current = L;
      const map = L.map(container.current).setView([40, 40], 3);
      mapRef.current = map;
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
      }).on('tileerror', () => setError('Не удалось загрузить фон карты. Список отелей и цены доступны рядом.')).addTo(map);
      markersRef.current = L.layerGroup().addTo(map);
      setReady(true);
    }).catch(() => { if (!disposed) setError('Не удалось загрузить карту. Закройте панель и попробуйте снова.'); });
    return () => { disposed = true; mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLocating(true);
    async function locate() {
      const unique = hotelMapHotels(hotels);
      // Reuse the existing location service and limit concurrent lookups.
      let index = 0;
      async function worker() {
        while (index < unique.length && !controller.signal.aborted) {
          const hotel = unique[index++];
          const key = hotelMapKey(hotel);
          const direct = hotelCoordinates(hotel.itinerary);
          if (direct) cache.current.set(key, direct);
          if (!cache.current.has(key)) {
            try {
              const query = [hotel.name, hotel.city, hotel.addr === '—' ? '' : hotel.addr].filter(Boolean).join(', ');
              const response = await fetch(`/api/locations?q=${encodeURIComponent(query)}`, { signal: controller.signal });
              if (!response.ok) throw new Error('location lookup failed');
              const payload = await response.json();
              const match = hotelMapSuggestion(hotel, payload.results || []);
              cache.current.set(key, match ? hotelCoordinates(match) : null);
            } catch { if (!controller.signal.aborted) cache.current.set(key, null); }
          }
          if (!controller.signal.aborted) setPoints(Object.fromEntries(cache.current));
        }
      }
      await Promise.all([worker(), worker(), worker()]);
      if (!controller.signal.aborted) setLocating(false);
    }
    locate();
    return () => controller.abort();
  }, [hotels]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const L = leafletRef.current;
    const layer = markersRef.current;
    layer.clearLayers();
    const bounds = [];
    for (const hotel of hotelMapHotels(hotels)) {
      const point = hotelCoordinates(hotel.itinerary) || points[hotelMapKey(hotel)];
      if (!point) continue;
      bounds.push(point);
      const label = document.createElement('button');
      label.type = 'button';
      label.className = 'hp-map-price-tag';
      label.textContent = Number(hotel.base).toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' ' + hotel.currency;
      label.title = `${hotel.name} · Выбрать номер`;
      label.setAttribute('aria-label', label.title + ' · ' + label.textContent);
      const marker = L.marker(point, { icon: L.divIcon({ html: label, className: 'hp-map-marker', iconSize: null }), keyboard: false });
      marker.on('click', () => pickRef.current(hotel)).addTo(layer);
    }
    if (bounds.length) mapRef.current.fitBounds(bounds, { padding: [65, 65], maxZoom: 15 });
    mapRef.current.invalidateSize();
  }, [ready, hotels, points]);

  const mapped = hotelMapHotels(hotels).filter((hotel) => hotelCoordinates(hotel.itinerary) || points[hotelMapKey(hotel)]).length;
  return <div className="hp-map-area">
    <div ref={container} className="hp-map-canvas" aria-label="Карта отелей с ценами" />
    <div className="hp-map-status" role="status">{error || (locating ? 'Определяем расположение отелей…' : `На карте: ${mapped}. Отели без подтверждённых координат доступны в списке.`)}</div>
  </div>;
}
