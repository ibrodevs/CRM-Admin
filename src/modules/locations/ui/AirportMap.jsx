import { useEffect, useRef, useState } from 'react';

export function AirportMap({ airport, name, fallbackUrl }) {
  const container = useRef(null);
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
  const configured = Boolean(accessToken?.startsWith('pk.'));
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const { latitude, longitude, code } = airport;
  useEffect(() => {
    if (!configured) return undefined;
    let disposed = false, map, marker, observer;
    setLoaded(false); setFailed(false);
    import('mapbox-gl').then((module) => {
      if (disposed) return;
      const mapbox = module.default || module;
      map = new mapbox.Map({
        container: container.current, accessToken, style: 'mapbox://styles/mapbox/streets-v12',
        center: [longitude, latitude], zoom: 11, language: 'ru',
        locale: { 'NavigationControl.ZoomIn': 'Приблизить', 'NavigationControl.ZoomOut': 'Отдалить', 'NavigationControl.ResetBearing': 'Повернуть на север', 'Map.Title': `Расположение аэропорта ${code}` },
      });
      map.addControl(new mapbox.NavigationControl({ showCompass: false }), 'top-right');
      marker = new mapbox.Marker({ color: '#2b5eff' }).setLngLat([longitude, latitude]).addTo(map);
      map.on('load', () => { if (!disposed) { map.resize(); setLoaded(true); } });
      map.on('error', () => { if (!disposed && !map.loaded()) setFailed(true); });
      observer = new ResizeObserver(() => { if (!disposed) map.resize(); });
      observer.observe(container.current);
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => { disposed = true; observer?.disconnect(); marker?.remove(); map?.remove(); };
  }, [accessToken, configured, latitude, longitude, code]);
  const fallback = !configured || failed;
  return <div className="airport-map-visual">
    <div ref={container} className="airport-map-canvas" aria-label={`Карта аэропорта ${code}`} style={fallback ? { display: 'none' } : undefined} />
    {fallback && <iframe title={`Расположение аэропорта ${code} на карте`} src={fallbackUrl} loading="eager" referrerPolicy="no-referrer" />}
    {!fallback && !loaded && <div className="airport-map-loading" role="status">Загружаем карту аэропорта…</div>}
    {!fallback && loaded && <div className="airport-map-label"><strong>{code}</strong><span>{name}</span></div>}
  </div>;
}
