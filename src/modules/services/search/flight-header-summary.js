import { airportOption, flightLocationCode } from '../flights/airport-options.js';
import { searchHeaderDate, searchPassengerCount } from './search-header.js';

export function flightLocationLabel(value) {
  const option = airportOption(value);
  if (!option) return flightLocationCode(value);
  return `${option.city} · ${option.kind === 'city' ? 'все аэропорты' : option.code}`;
}

export function flightHeaderSummary(values, fixedPassengers) {
  const segments = values.segments || [];
  const multiple = values.trip === 'mc';
  const trip = multiple ? 'Сложный маршрут' : values.trip === 'rt' ? 'Туда и обратно' : 'В одну сторону';
  const route = multiple
    ? segments.map((segment) => `${flightLocationLabel(segment.from) || 'Откуда'} → ${flightLocationLabel(segment.to) || 'Куда'}`).join('; ')
    : `${flightLocationLabel(values.from) || 'Откуда'} → ${flightLocationLabel(values.to) || 'Куда'}`;
  const dates = multiple ? segments.map((segment) => searchHeaderDate(segment.date)).join(' · ')
    : searchHeaderDate(values.depDate) + (values.trip === 'rt' ? ` — ${searchHeaderDate(values.retDate)}` : '');
  return {
    route: `${route} · ${trip}`,
    fields: [
      { key: 'dates', label: multiple || values.trip === 'rt' ? 'Даты поездки' : 'Дата вылета', value: dates, icon: 'calendar' },
      { key: 'passengers', label: 'Пассажиры и класс', value: `${fixedPassengers ?? searchPassengerCount(values.pax)} пасс. · ${values.cabin || 'Эконом'}`, icon: 'users' },
    ],
  };
}
