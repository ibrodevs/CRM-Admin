import { DEFAULT_CURRENCY, getRuntimePreferences } from '../preferences/preferences.js';

export const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', RUB: '₽', KGS: 'сом', KZT: '₸',
  CNY: '¥', GBP: '£', TRY: '₺', UZS: 'сўм', AED: 'AED', USDT: 'USDT',
};

// В части экранов валюта исторически хранится символом ('₽', '$'), а не кодом.
// Приводим такие значения к коду, чтобы сравнения и подстановка символа работали одинаково.
const SYMBOL_TO_CODE = { $: 'USD', '€': 'EUR', '₽': 'RUB', '₸': 'KZT', '¥': 'CNY', '£': 'GBP', '₺': 'TRY', с: 'KGS', сом: 'KGS', сум: 'UZS', сўм: 'UZS' };

/** Валюта по умолчанию из настроек пользователя («Профиль → Предпочтения → Валюта по умолчанию»). */
export function getDefaultCurrency() {
  const preference = getRuntimePreferences().base_currency;
  return typeof preference === 'string' && preference.trim() ? normalizeCurrencyCode(preference) : DEFAULT_CURRENCY;
}

/** Код валюты в верхнем регистре; символ ('₽') превращается в код ('RUB'). Пустое значение → null. */
export function normalizeCurrencyCode(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  return SYMBOL_TO_CODE[raw] || SYMBOL_TO_CODE[raw.toLowerCase()] || raw.toUpperCase();
}

/**
 * Первая непустая валюта из переданных; если своей валюты нет ни у одной сущности —
 * валюта по умолчанию из настроек пользователя, а не захардкоженный доллар.
 */
export function resolveCurrency(...candidates) {
  for (const candidate of candidates) {
    const code = normalizeCurrencyCode(candidate);
    if (code) return code;
  }
  return getDefaultCurrency();
}

/** Символ валюты для показа рядом с суммой. */
export function currencySymbol(currency) {
  const code = resolveCurrency(currency);
  return CURRENCY_SYMBOLS[code] || code;
}

/** Сумма с символом валюты: 1 720 ₽. */
export function formatMoney(amount, currency) {
  return Math.round(Number(amount) || 0).toLocaleString('ru-RU') + ' ' + currencySymbol(currency);
}

// Историческое имя формата: сохранено, чтобы не переписывать все вызовы разом.
export { formatMoney as fUsd };

// Курсы организации («Настройки → Курсы валют»): сколько единиц базовой валюты
// стоит одна единица данной. Заполняются при старте из настроек tenant'а —
// до этого конвертация недоступна и вызывающий код должен показать сумму как есть.
let currencyRates = {};
let ratesBase = null;

export function setCurrencyRates(rates = {}, base = null) {
  currencyRates = {};
  for (const [code, rate] of Object.entries(rates || {})) {
    const value = Number(String(rate).replace(',', '.'));
    const normalized = normalizeCurrencyCode(code);
    if (normalized && Number.isFinite(value) && value > 0) currencyRates[normalized] = value;
  }
  ratesBase = normalizeCurrencyCode(base);
  if (ratesBase) currencyRates[ratesBase] = 1;
}

export const getCurrencyRates = () => ({ ...currencyRates });

/**
 * Пересчёт суммы между валютами по курсам организации.
 * Возвращает null, если курса нет: показывать сумму по выдуманному курсу хуже,
 * чем показать её в исходной валюте.
 */
export function convertMoney(amount, from, to) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return null;
  const source = resolveCurrency(from);
  const target = resolveCurrency(to);
  if (source === target) return value;
  const fromRate = currencyRates[source];
  const toRate = currencyRates[target];
  if (!fromRate || !toRate) return null;
  return (value * fromRate) / toRate;
}
