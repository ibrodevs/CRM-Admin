import { useEffect, useState } from 'react';
import { AIRPORTS } from '../data';
import { Icon } from '../icons';
import { EmptyState, SearchBox } from '../ui';

function StackPanel({ title, onClose, footer, children, width }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="drawer-stack" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
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
}

function PanelSub({ children, style }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.02em', margin: '20px 2px 10px', ...style }}>
      {children}
    </div>
  );
}

function CityPickPanel({ value, onPick, onClose }) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const popularAirportCodes = ['SVO', 'DME', 'IST', 'DXB', 'ALA', 'TAS'];
  const airports = AIRPORTS.filter((airport) => (
    !normalizedQuery
    || airport.city.toLowerCase().includes(normalizedQuery)
    || airport.code.toLowerCase().includes(normalizedQuery)
    || airport.name.toLowerCase().includes(normalizedQuery)
  ));
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
              <button type="button" key={airport.code} className={'city-chip' + (value === airport.code ? ' sel' : '')} onClick={() => onPick(airport.code)}>{airport.city} ({airport.code})</button>
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
            <button type="button" key={airport.code} className="city-row" onClick={() => onPick(airport.code)}>
              <span className="code">{airport.code}</span>
              <span style={{ flex: 1 }}><span style={{ fontWeight: 600 }}>{airport.name}</span></span>
              {value === airport.code && <Icon name="check" style={{ width: 18, height: 18, color: 'var(--blue)' }} />}
            </button>
          ))}
        </div>
      ))}
      {!airports.length && <EmptyState icon="search" title="Ничего не найдено" />}
    </StackPanel>
  );
}

export { CityPickPanel, PanelSub, StackPanel };
