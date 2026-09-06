const TECHNICAL_STOP_REASONS = {
  refueling: 'Дозаправка',
  fuel: 'Дозаправка',
  operational: 'Техническое обслуживание',
  maintenance: 'Техническое обслуживание',
  crew_change: 'Смена экипажа',
  weather: 'Погодные условия',
  security: 'Проверка безопасности',
};

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function optionalBoolean(...values) {
  const value = firstDefined(...values);
  if (value === undefined) return undefined;
  if (typeof value === 'string') {
    if (['true', '1', 'yes'].includes(value.toLowerCase())) return true;
    if (['false', '0', 'no'].includes(value.toLowerCase())) return false;
  }
  return Boolean(value);
}

function durationFromMinutes(value) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes < 0) return '';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} мин`;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

function technicalStopTime(value) {
  if (!value) return '';
  const text = String(value);
  const isoTime = text.match(/T(\d{2}:\d{2})/);
  if (isoTime) return isoTime[1];
  const plainTime = text.match(/^(\d{1,2}:\d{2})/);
  return plainTime ? plainTime[1] : text;
}

function normalizeTechnicalStop(stop = {}) {
  const reasonValue = firstDefined(stop.reason, stop.reason_code, stop.type);
  const durationValue = firstDefined(stop.duration, stop.stop_duration);
  return {
    airportCode: firstDefined(stop.airportCode, stop.airport_code, stop.at, stop.code) || '',
    airportName: firstDefined(stop.airportName, stop.airport_name, stop.name) || '',
    city: stop.city || '',
    country: stop.country || '',
    terminal: stop.terminal || '',
    arrival: technicalStopTime(firstDefined(stop.arrival, stop.arrival_time)),
    departure: technicalStopTime(firstDefined(stop.departure, stop.departure_time)),
    duration: durationValue
      ? String(durationValue)
      : durationFromMinutes(firstDefined(stop.durationMinutes, stop.duration_minutes)),
    reason: TECHNICAL_STOP_REASONS[reasonValue] || reasonValue || '',
    deplane: optionalBoolean(stop.deplane, stop.disembarkation, stop.passengers_disembark),
    aircraftChange: optionalBoolean(stop.aircraftChange, stop.aircraft_change),
    note: stop.note || '',
  };
}

function technicalStopsOf(segment = {}) {
  const raw = segment.technicalStops || segment.technical_stops || [];
  return Array.isArray(raw) ? raw.map(normalizeTechnicalStop) : [];
}

function technicalStopCount(leg = {}) {
  if (Array.isArray(leg.segs) && leg.segs.length) {
    return leg.segs.reduce((total, segment) => total + technicalStopsOf(segment).length, 0);
  }
  return technicalStopsOf(leg).length;
}

function technicalStopLabel(count) {
  const n = Math.max(0, Number(count) || 0);
  const lastTwo = n % 100;
  const last = n % 10;
  if (last === 1 && lastTwo !== 11) return `${n} тех. посадка`;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${n} тех. посадки`;
  return `${n} тех. посадок`;
}

export {
  durationFromMinutes,
  normalizeTechnicalStop,
  technicalStopCount,
  technicalStopLabel,
  technicalStopsOf,
};
