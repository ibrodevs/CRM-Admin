import ReactDOM from 'react-dom';
import { useEffect, useState } from 'react';
import { AIRPORTS } from '../../../legacy/data/index.jsx';
import { Icon } from '../../../shared/icons/index.jsx';
import { EmptyState } from '../../../shared/ui/EmptyState.jsx';
import { SearchBox } from '../../../shared/ui/SearchBox.jsx';
import { useOverlayLayer, useOverlayZIndex } from '../../../shared/ui/Overlays.jsx';

function StackPanel({ title, onClose, footer, children, width }) {
  // Панель участвует в общем стеке оверлеев: Escape закрывает только верхний
  // слой, а z-index ставит открытый изнутри Drawer поверх этой панели.
  useOverlayLayer(true, onClose);
  const zIndex = useOverlayZIndex(true);

  const node = (
    <div className="drawer-stack" style={{ zIndex }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="drawer-stack-panel scroll" style={width ? { width } : undefined}>
        <div style={{ padding: '20px 26px 16px', position: 'sticky', top: 0, background: '#fff', zIndex: 2, borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть панель"><Icon name="x" /></button>
        </div>
        <div style={{ padding: '20px 26px', flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: '14px 26px', borderTop: '1px solid var(--line)', position: 'sticky', bottom: 0, background: '#fff', display: 'flex', gap: 10 }}>{footer}</div>}
      </div>
    </div>
  );

  return (typeof document !== 'undefined') ? ReactDOM.createPortal(node, document.body) : node;
}

function PanelSub({ children, style }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.02em', margin: '20px 2px 10px', ...style }}>
      {children}
    </div>
  );
}

// location_code в backend — короткое поле (8 символов). Для мест без IATA-кода
// собираем компактный код, а полное название передаём отдельно в location_name.
function placeCode(place) {
  const source = String(place.title || place.value || '').trim();
  const latin = source.replace(/[^A-Za-z]/g, '');
  return (latin || source).slice(0, 8).toUpperCase() || 'PLACE';
}

function CityPickPanel({ value, onPick, onClose }) {
  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState([]);
  const [searching, setSearching] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const popularAirportCodes = ['SVO', 'DME', 'IST', 'DXB', 'ALA', 'TAS'];
  const airports = AIRPORTS.filter((airport) => (
    !normalizedQuery
    || airport.city.toLowerCase().includes(normalizedQuery)
    || airport.code.toLowerCase().includes(normalizedQuery)
    || airport.name.toLowerCase().includes(normalizedQuery)
  ));

  // Список известных аэропортов короткий и покрывает только частые направления.
  // Остальные ищем в общем справочнике мест, иначе оператор не может выбрать
  // город, которого нет в этом списке.
  useEffect(() => {
    const search = query.trim();
    if (search.length < 2) { setRemote([]); setSearching(false); return undefined; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/locations?q=${encodeURIComponent(search)}`, {
          signal: controller.signal, headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('lookup failed');
        const payload = await response.json();
        if (!controller.signal.aborted) setRemote(Array.isArray(payload.results) ? payload.results : []);
      } catch (error) {
        if (!controller.signal.aborted) setRemote([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 280);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  const knownCities = new Set(airports.map((airport) => airport.city.toLowerCase()));
  const extraPlaces = remote.filter((place) => !knownCities.has(String(place.title || place.value || '').toLowerCase()));
  const cityGroups = [];

  airports.forEach((airport) => {
    let group = cityGroups.find((item) => item.city === airport.city);
    if (!group) {
      group = { city: airport.city, country: airport.country, items: [] };
      cityGroups.push(group);
    }
    group.items.push(airport);
  });

  return (
    <StackPanel title="Добавление города" onClose={onClose}>
      <SearchBox value={query} onChange={setQuery} placeholder="Город или аэропорт" />
      {!normalizedQuery && (
        <>
          <PanelSub>Популярные города</PanelSub>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            {popularAirportCodes.map((code) => AIRPORTS.find((airport) => airport.code === code)).filter(Boolean).map((airport) => (
              <button type="button" key={airport.code} className={'city-chip' + (value === airport.code ? ' sel' : '')} onClick={() => onPick(airport.code, { name: `${airport.city} (${airport.code})`, type: 'airport' })}>{airport.city} ({airport.code})</button>
            ))}
          </div>
        </>
      )}
      <PanelSub style={{ margin: '20px 0 6px' }}>Все направления</PanelSub>
      {cityGroups.map((group) => (
        <div key={group.city} style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '8px 12px 4px' }}>
            <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>{group.city}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{group.country}</span>
          </div>
          {group.items.map((airport) => (
            <button type="button" key={airport.code} className="city-row" onClick={() => onPick(airport.code, { name: `${airport.city} (${airport.code})`, type: 'airport' })}>
              <span className="code">{airport.code}</span>
              <span style={{ flex: 1 }}><span style={{ fontWeight: 600 }}>{airport.name}</span></span>
              {value === airport.code && <Icon name="check" style={{ width: 18, height: 18, color: 'var(--blue)' }} />}
            </button>
          ))}
        </div>
      ))}
      {extraPlaces.length > 0 && (
        <>
          <PanelSub style={{ margin: '20px 0 6px' }}>Найдено в справочнике мест</PanelSub>
          {extraPlaces.map((place) => (
            <button type="button" key={place.id} className="city-row" onClick={() => onPick(placeCode(place), { name: place.label || place.value, type: place.kind === 'Город' ? 'city' : 'place' })}>
              <span className="code">{placeCode(place).slice(0, 3)}</span>
              <span style={{ flex: 1 }}>
                <span style={{ fontWeight: 600 }}>{place.title || place.value}</span>
                {place.subtitle && <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 8 }}>{place.subtitle}</span>}
              </span>
            </button>
          ))}
        </>
      )}
      {searching && <div style={{ padding: '10px 12px', fontSize: 13, color: 'var(--muted)' }}>Идёт поиск…</div>}
      {!airports.length && !extraPlaces.length && !searching && <EmptyState icon="search" title="Ничего не найдено" />}
    </StackPanel>
  );
}

export { CityPickPanel, PanelSub, StackPanel };
