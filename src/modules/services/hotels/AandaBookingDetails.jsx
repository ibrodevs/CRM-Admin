import { aandaHotelLines } from './aanda-details.js';

export function AandaBookingDetails({ details }) {
  const lines = aandaHotelLines(details);
  if (!lines.length) return null;
  return <section className="osrv-sec" aria-label="Данные гостиницы A&A">
    <div className="osrv-sec-t">Гостиница и условия поставщика</div>
    <dl style={{ margin: 0, display: 'grid', gap: 10 }}>
      {lines.map(([label, value], index) => <div key={`${label}-${index}`}>
        <dt style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</dt>
        <dd style={{ margin: '3px 0 0', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{value}</dd>
      </div>)}
    </dl>
  </section>;
}
