import { AIRPORT_PROFILES } from './airport-profiles.js';

// Public airport reference data; never send booking or passenger data upstream.
export const AIRPORT_DATA_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const TTL = 24 * 60 * 60 * 1000;
let cached, expiresAt = 0, pending;

function* csvRows(text) {
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (char === ',' || char === '\n')) {
      row.push(field.replace(/\r$/, '')); field = '';
      if (char === '\n') { yield row; row = []; }
    } else field += char;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, '')); yield row; }
}

export function parseAirportDirectory(text) {
  const rows = csvRows(text), headers = rows.next().value || [];
  const directory = new Map();
  for (const row of rows) {
    const item = Object.fromEntries(headers.map((key, index) => [key, row[index] || '']));
    if (!/^[A-Z]{3}$/.test(item.iata_code) || item.type === 'closed') continue;
    const latitude = item.latitude_deg === '' ? NaN : Number(item.latitude_deg);
    const longitude = item.longitude_deg === '' ? NaN : Number(item.longitude_deg);
    const coordinates = Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
    const airport = {
      code: item.iata_code, icao: item.icao_code || item.gps_code || '', name: item.name,
      city: item.municipality, countryCode: item.iso_country, regionCode: item.iso_region,
      latitude: coordinates ? latitude : null, longitude: coordinates ? longitude : null,
      elevationFt: item.elevation_ft === '' ? null : Number(item.elevation_ft),
      type: item.type, website: item.home_link,
      sourceUrl: `https://ourairports.com/airports/${encodeURIComponent(item.ident)}/`,
    };
    const previous = directory.get(airport.code);
    if (!previous || airport.type === 'large_airport') directory.set(airport.code, airport);
  }
  if (!directory.size) throw new Error('Airport directory is empty');
  return directory;
}

// FRU is retained in existing bookings; Manas now uses BSZ.
// Source: https://airport.kg/ru/news/15
export function lookupAirport(directory, code) {
  const currentCode = code === 'FRU' && !directory.has(code) ? 'BSZ' : code;
  const airport = directory.get(currentCode);
  return airport ? { ...airport, ...AIRPORT_PROFILES[airport.code], code, currentCode: airport.code } : null;
}

export async function airportDirectory() {
  if (cached && Date.now() < expiresAt) return cached;
  if (!pending) pending = (async () => {
    try {
      const response = await fetch(AIRPORT_DATA_URL, { cache: 'no-store', signal: AbortSignal.timeout(25000) });
      if (!response.ok) throw new Error('Airport directory unavailable');
      cached = parseAirportDirectory(await response.text());
      expiresAt = Date.now() + TTL;
      return cached;
    } catch (error) {
      if (cached) { expiresAt = Date.now() + 60000; return cached; }
      throw error;
    } finally { pending = null; }
  })();
  return pending;
}
