import { useEffect, useRef, useState } from 'react';
import { createHotelMapbox } from './hotel-mapbox.js';
import { hotelCoordinates, hotelMapHotels, hotelMapKey, hotelMapSuggestion } from './map-data.js';

export function HotelMap({ hotels, onPick }) {
  const container = useRef(null);
  const mapRef = useRef(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
  const configured = Boolean(accessToken?.startsWith('pk.'));
  const [points, setPoints] = useState({});
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const cache = useRef(new Map());

  useEffect(() => {
    if (!configured) return undefined;
    let disposed = false;
    let observer;
    setReady(false); setLoaded(false); setError('');
    import('mapbox-gl').then((module) => {
      if (disposed) return;
      const instance = createHotelMapbox(module.default || module, container.current, accessToken, {
        onLoad: () => { if (!disposed) { setLoaded(true); setError(''); } },
        onError: () => { if (!disposed) setError('Не удалось загрузить карту Mapbox. Список отелей и цены доступны рядом.'); },
      });
      mapRef.current = instance;
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(() => { if (!disposed) instance.map.resize(); });
        observer.observe(container.current);
      }
      setReady(true);
    }).catch(() => { if (!disposed) setError('Не удалось открыть карту Mapbox. Закройте панель и попробуйте снова.'); });
    return () => { disposed = true; observer?.disconnect(); mapRef.current?.destroy(); mapRef.current = null; };
  }, [accessToken, configured]);

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
    mapRef.current.setHotels(hotels, points, (hotel) => pickRef.current(hotel));
  }, [ready, hotels, points]);

  const mapped = hotelMapHotels(hotels).filter((hotel) => hotelCoordinates(hotel.itinerary) || points[hotelMapKey(hotel)]).length;
  return <div className="hp-map-area">
    <div ref={container} className="hp-map-canvas" aria-label="Карта отелей Mapbox с ценами" />
    {!configured && <div className="hp-map-unavailable" role="status"><strong>Карта Mapbox пока недоступна</strong><span>Обратитесь к администратору для подключения карты. Отели и цены доступны в списке слева.</span></div>}
    <div className="hp-map-status" role="status">{!configured ? 'Mapbox не подключён.' : error || (!loaded ? 'Загружаем карту Mapbox…' : locating ? 'Определяем расположение отелей…' : `На карте: ${mapped}. Отели без подтверждённых координат доступны в списке.`)}</div>
  </div>;
}
