import { getRuntimePreferences, formatProfileDate } from '../preferences/preferences.js';


function asDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
  const parsed = asDate(value);
  return parsed ? formatProfileDate(parsed, getRuntimePreferences()) : '';
}

function formatTime(value) {
  const parsed = asDate(value);
  return parsed ? parsed.toLocaleTimeString(({en:'en-US',ky:'ky-KG'})[getRuntimePreferences().language] || 'ru-RU', { hour: '2-digit', minute: '2-digit', hour12: getRuntimePreferences().time_format === '12h', timeZone: getRuntimePreferences().timezone }) : '';
}

export { asDate, formatDate, formatTime };
