import React from 'react';
import { Icon } from '../../../shared/icons/index.jsx';
import { flightServiceDetails } from './flight-service-details.js';

export function FlightFareSummary({ service, segments, loading = false, error = '' }) {
  const rows = flightServiceDetails(service, segments);
  return <section className="flight-fare-summary" aria-label="Условия перелёта">
    {loading && <span className="flight-fare-loading" role="status">Уточняем данные перелёта…</span>}
    {rows.map((row) => <div className="flight-fare-segment" key={row.key}>
      {row.route && <strong className="flight-fare-route">{row.route}</strong>}
      <dl className="flight-fare-primary">{row.primary.map((field) => <div key={field.label}><dt><Icon name={field.icon} />{field.label}</dt><dd>{field.value}</dd></div>)}</dl>
      {row.extra.length > 0 && <details className="flight-fare-extra"><summary>Подробнее о тарифе<Icon name="chevDown" /></summary><dl>{row.extra.map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl></details>}
    </div>)}
    {error && <span className="flight-fare-loading" role="status">Не удалось уточнить условия. Откройте «Действия» и обновите сведения.</span>}
  </section>;
}
