import React from 'react';
import { flightServiceDetails } from './flight-service-details.js';

export function FlightFareSummary({ service, segments, loading = false, error = '' }) {
  const rows = flightServiceDetails(service, segments);
  return <section className="flight-fare-summary" aria-label="Условия перелёта">
    {loading && <span className="flight-fare-loading" role="status">Уточняем данные перелёта…</span>}
    {rows.map((row) => <div className="flight-fare-segment" key={row.key}>
      {row.route && <strong className="flight-fare-route">{row.route}</strong>}
      <dl className="flight-fare-fields">{[...row.primary, ...row.extra].map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>
    </div>)}
    {error && <span className="flight-fare-loading" role="status">Не удалось уточнить условия. Откройте «Действия» и обновите сведения.</span>}
  </section>;
}
