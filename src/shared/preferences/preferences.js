export const DATE_FORMATS = { 'ДД.ММ.ГГГГ': 'DD.MM.YYYY', 'ММ/ДД/ГГГГ': 'MM/DD/YYYY', 'ГГГГ-ММ-ДД': 'YYYY-MM-DD' };
export const TIME_FORMATS = { '24 часа': '24h', '12 часов (AM/PM)': '12h' };
export const START_PAGES = { 'Главное': 'dashboard', 'Заказы': 'orders', 'Оформление': 'fulfillment', 'Чаты': 'chats' };
export const LANGUAGES = { 'Русский': 'ru', 'Кыргызча': 'ky', English: 'en' };
export const THEMES = { 'Светлая': 'light', 'Тёмная': 'dark', 'Системная': 'system' };
const label = (map, value, fallback) => Object.keys(map).find((key) => map[key] === value) || (value in map ? value : fallback);
export function preferencesToForm(value = {}) {
  return {
    theme: label(THEMES, value.theme, 'Светлая'), dateFmt: label(DATE_FORMATS, value.date_format, 'ДД.ММ.ГГГГ'),
    timeFmt: label(TIME_FORMATS, value.time_format, '24 часа'), currency: value.base_currency || 'USD',
    lang: label(LANGUAGES, value.language, 'Русский'), pageSize: String(value.page_size || 25),
    startPage: label(START_PAGES, value.start_page, 'Главное'),
  };
}
export function preferencesFromForm(value) {
  return { theme: THEMES[value.theme], date_format: DATE_FORMATS[value.dateFmt], time_format: TIME_FORMATS[value.timeFmt],
    base_currency: value.currency, language: LANGUAGES[value.lang], page_size: Number(value.pageSize), start_page: START_PAGES[value.startPage] };
}
export function formatProfileDate(value, preferences = {}, time = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const locale = preferences.language === 'ky' ? 'ky-KG' : preferences.language === 'en' ? 'en-US' : 'ru-RU';
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: preferences.timezone }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  const y = part('year'), m = part('month'), d = part('day');
  const result = preferences.date_format === 'MM/DD/YYYY' ? `${m}/${d}/${y}` : preferences.date_format === 'YYYY-MM-DD' ? `${y}-${m}-${d}` : `${d}.${m}.${y}`;
  return time ? `${result}, ${date.toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit', hour12: preferences.time_format === '12h', timeZone: preferences.timezone})}` : result;
}

let runtimePreferences = {};
export const getRuntimePreferences = () => runtimePreferences;
export const setRuntimePreferences = (value = {}) => { runtimePreferences = value; };
