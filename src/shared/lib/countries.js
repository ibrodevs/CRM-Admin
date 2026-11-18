import { getCountries } from 'libphonenumber-js';

const ru = new Intl.DisplayNames(['ru'], { type: 'region' });
const en = new Intl.DisplayNames(['en'], { type: 'region' });
const names = { KG: 'Кыргызстан', AE: 'ОАЭ', US: 'США', GB: 'Великобритания' };
const aliases = { РФ: 'RU', RUS: 'RU', UK: 'GB', USA: 'US', UAE: 'AE', Киргизия: 'KG', 'Российская Федерация': 'RU', 'Соединённые Штаты Америки': 'US', 'Соединенные Штаты': 'US', 'Объединённые Арабские Эмираты': 'AE', 'Объединенные Арабские Эмираты': 'AE' };
const normalize = (value) => String(value || '').trim().toLocaleLowerCase('ru').replaceAll('ё', 'е');
// Include territories without public telephone numbering as well as the phone
// library's country reference. Display names come from the runtime CLDR data.
export const COUNTRY_OPTIONS = [...new Set([...getCountries(), 'AQ', 'BV', 'GS', 'HM', 'PN', 'TF', 'UM'])].map((code) => ({
  code, label: names[code] || ru.of(code), keywords: `${code} ${ru.of(code)} ${en.of(code)}`,
})).sort((a, b) => a.label.localeCompare(b.label, 'ru'));
const byCode = new Map(COUNTRY_OPTIONS.map((country) => [country.code, country]));
const byName = new Map(COUNTRY_OPTIONS.flatMap((country) => [country.label, ru.of(country.code), en.of(country.code), country.code].map((value) => [normalize(value), country.code])));
for (const [name, code] of Object.entries(aliases)) byName.set(normalize(name), code);
export function countryCode(value) { return byName.get(normalize(value)) || ''; }
export function countryName(value) { return byCode.get(countryCode(value))?.label || ''; }
export function countrySelection(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(/[,;\n]/);
  return [...new Set(values.map((item) => countryCode(item)).filter(Boolean))];
}
export function searchCountries(query = '') {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const alias = countryCode(query);
  return COUNTRY_OPTIONS.filter((country) => country.code === alias || terms.every((term) => normalize(`${country.label} ${country.keywords}`).includes(term)))
    .sort((a, b) => Number(b.code === alias) - Number(a.code === alias));
}
