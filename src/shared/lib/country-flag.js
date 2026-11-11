const regions = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });

export function countryFlag(value) {
  let code = String(value || '').trim().toUpperCase();
  if (code === 'UK') code = 'GB';
  if (!/^[A-Z]{2}$/.test(code) || code === 'ZZ' || !regions.of(code)) return '';
  return String.fromCodePoint(...[...code].map((letter) => letter.charCodeAt(0) + 127397));
}
