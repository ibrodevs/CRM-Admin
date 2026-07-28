import React from 'react';
import { Icon } from '../../icons';
import { technicalStopLabel } from './technical-stops';

function stopLocation(stop) {
  const place = stop.city || stop.airportName || stop.airportCode || 'Аэропорт';
  return stop.airportCode && place !== stop.airportCode ? `${place} (${stop.airportCode})` : place;
}

function TechnicalStopsDetails({ stops = [] }) {
  if (!stops.length) return null;
  return (
    <section className="technical-stops" aria-label={technicalStopLabel(stops.length)}>
      <div className="technical-stops-head">
        <Icon name="plane" />
        <span>{technicalStopLabel(stops.length)}</span>
        <span className="technical-stops-kind">без пересадки на другой рейс</span>
      </div>
      {stops.map((stop, index) => (
        <div className="technical-stop" key={`${stop.airportCode}-${stop.arrival}-${index}`}>
          <div className="technical-stop-place">
            <strong>{stopLocation(stop)}</strong>
            {(stop.airportName && stop.airportName !== stop.city) || stop.country ? (
              <span>{[stop.airportName !== stop.city ? stop.airportName : '', stop.country].filter(Boolean).join(' · ')}</span>
            ) : null}
          </div>
          <div className="technical-stop-facts">
            {(stop.arrival || stop.departure) && (
              <span><Icon name="clock" />{stop.arrival ? `прибытие ${stop.arrival}` : ''}{stop.arrival && stop.departure ? ' · ' : ''}{stop.departure ? `вылет ${stop.departure}` : ''}</span>
            )}
            {stop.duration && <span><Icon name="clock" />стоянка {stop.duration}</span>}
            {stop.reason && <span><Icon name="alertCircle" />{stop.reason}</span>}
            {stop.terminal && <span>Терминал {stop.terminal}</span>}
          </div>
          <div className="technical-stop-statuses">
            {stop.aircraftChange !== undefined && (
              <span className={stop.aircraftChange ? 'warn' : 'ok'}>
                {stop.aircraftChange ? 'Со сменой самолёта' : 'Без смены самолёта'}
              </span>
            )}
            {stop.deplane !== undefined && (
              <span>{stop.deplane ? 'Пассажиры выходят из самолёта' : 'Выход из самолёта не предусмотрен'}</span>
            )}
          </div>
          {stop.note && <div className="technical-stop-note">{stop.note}</div>}
        </div>
      ))}
    </section>
  );
}

export { TechnicalStopsDetails };
