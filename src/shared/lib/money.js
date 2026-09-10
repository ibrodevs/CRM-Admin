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
