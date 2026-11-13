import catalog from './airport-catalog.json' with { type: 'json' };

// Travelpayouts public reference data, retrieved 2026-11-13.
// https://support.travelpayouts.com/hc/en-us/articles/360018907280
const countries = new Intl.DisplayNames(['ru'], { type: 'region' });
const normalize = (value) => String(value || '').toLowerCase().replaceAll('ё', 'е');
const airports = catalog.map(([code, cityCode, city, name, countryCode, cityEnglish, nameEnglish]) => ({
  value: code, code, cityCode, city, name, country: countries.of(countryCode) || countryCode,
  kind: 'airport', search: normalize([code, cityCode, city, name, cityEnglish, nameEnglish].join(' ')),
}));
// Keep the old Manas code usable in existing search drafts and orders.
const manas = airports.find((airport) => airport.code === 'BSZ');
if (manas) airports.push({ ...manas, value: 'FRU', code: 'FRU', search: `${manas.search} fru` });
const groups = new Map();
for (const airport of airports) {
  if (airport.code === 'FRU') continue;
  const group = groups.get(airport.cityCode) || [];
  group.push(airport);
  groups.set(airport.cityCode, group);
}
const cities = [...groups.entries()].filter(([, group]) => group.length > 1).map(([code, group]) => ({
  value: `city:${code}`, code, cityCode: code, city: group[0].city,
  name: 'Все аэропорты', country: group[0].country, kind: 'city',
  airportCodes: group.map((airport) => airport.code),
  search: normalize(`${code} ${group.map((airport) => airport.search).join(' ')}`),
}));
const options = [...cities, ...airports];
const byValue = new Map(options.map((option) => [option.value, option]));

export function flightLocationCode(value) {
  return String(value || '').replace(/^city:/, '');
}
export function airportOption(value) {
  return byValue.get(value) || cities.find((city) => city.code === value);
}
export function searchAirportOptions(query) {
  const term = normalize(query).trim();
  if (!term) return ['city:MOW', 'LED', 'FRU', 'OSS', 'city:IST', 'city:LON', 'city:PAR', 'city:NYC', 'ALA', 'TAS', 'DXB', 'DOH'].map(airportOption).filter(Boolean);
  return options.filter((option) => option.search.includes(term)).sort((a, b) => {
    const exact = (option) => option.code.toLowerCase() === term ? 0 : normalize(option.city).startsWith(term) ? 1 : 2;
    return exact(a) - exact(b) || (a.kind === 'city' ? 0 : 1) - (b.kind === 'city' ? 0 : 1) || a.city.localeCompare(b.city, 'ru') || a.name.localeCompare(b.name, 'ru');
  });
}
