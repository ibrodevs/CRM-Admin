import { AsYouType, getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js';

const names = new Intl.DisplayNames(['ru'], { type: 'region' });
export const PHONE_COUNTRIES = getCountries().map((country) => ({ country, code: getCountryCallingCode(country), name: names.of(country) || country })).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
export function phoneCountry(value, preferred = 'RU') {
  const text = String(value || '');
  const parsed = parsePhoneNumberFromString(text);
  if (parsed?.country) return parsed.country;
  const digits = text.replace(/\D/g, '');
  if (text.startsWith('+')) {
    const matches = PHONE_COUNTRIES.filter((row) => digits.startsWith(row.code)).sort((a, b) => b.code.length - a.code.length);
    if (matches.some((row) => row.country === preferred && row.code === matches[0]?.code)) return preferred;
    const primary = { '1': 'US', '7': 'RU', '44': 'GB', '61': 'AU', '358': 'FI', '39': 'IT', '47': 'NO', '64': 'NZ' }[matches[0]?.code];
    return primary || matches[0]?.country || preferred;
  }
  return preferred;
}
export function phoneValue(value, country = 'RU') {
  const text = String(value || '').trim();
  if (!text) return '';
  const digits = text.replace(/\D/g, '');
  if (!digits) return text === '+' ? '+' : '';
  if (text.startsWith('+')) return `+${digits}`;
  if (text.startsWith('00')) return `+${digits.slice(2)}`;
  const parsed = parsePhoneNumberFromString(text, country);
  return parsed?.number || `+${getCountryCallingCode(country)}${digits}`;
}
export function phoneDisplay(value, country = 'RU') {
  const text = String(value || '');
  return text ? new AsYouType(country).input(text) || text : '';
}
export function changePhoneCountry(value, from, to) {
  if (!value || value === '+') return '';
  const canonical = phoneValue(value, from);
  const prefix = `+${getCountryCallingCode(from)}`;
  const national = canonical.startsWith(prefix) ? canonical.slice(prefix.length) : canonical.replace(/^\+/, '');
  return `+${getCountryCallingCode(to)}${national}`;
}
export function isPhoneInput(props) {
  const context = [props['aria-label'], props.name, props.placeholder, props.id].filter(Boolean).join(' ').toLowerCase();
  if (props.phoneInput === false || /внутренн|добавоч|internal|extension/.test(context)) return false;
  if (props.phoneInput !== true && (!['text', 'tel'].includes(props.type || 'text') || /поиск|search|email|e-mail|электронн/.test(context))) return false;
  return props.phoneInput === true || props.type === 'tel' || props.leadIcon === 'phone' || /телефон|(?:^|\s)(?:phone|mobile|whatsapp)(?:\s|$)/.test(context);
}
