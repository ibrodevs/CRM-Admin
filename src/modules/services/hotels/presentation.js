import { currencySymbol } from '../../../shared/lib/money.js';
import { hotelCancellationDeadline } from './search-criteria.js';

export function hotelPlainText(value) {
  return String(value || '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?(?:p|div|br|li)\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:nbsp|amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, (entity) => {
      const named = { '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' };
      if (named[entity.toLowerCase()] != null) return named[entity.toLowerCase()];
      const hex = entity.toLowerCase().startsWith('&#x');
      const code = parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    })
    .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function hotelBedDescription(value) {
  const beds = hotelPlainText(value).split(/[,;]/).map((bed) => bed.trim())
    .filter((bed) => bed && !/^autobedtype\d+$/i.test(bed));
  return [...new Set(beds)].join(', ') || 'Тип кровати не указан';
}

export function hotelPaymentDescription(payAtHotel) {
  return payAtHotel === true ? 'Оплата в отеле' : payAtHotel === false ? 'Предоплата' : 'Оплата по условиям тарифа';
}

export function hotelCancellationDescription(fare = {}, fallback = '') {
  const rules = Array.isArray(fare.cancel) ? fare.cancel : [];
  if (rules.length) {
    const lines = rules.map((rule) => {
      const price = rule.price || rule.amount || {};
      const amount = Number(price.amount);
      const penalty = price.amount != null && Number.isFinite(amount)
        ? amount === 0 ? 'без штрафа' : `штраф ${amount.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${currencySymbol(price.currency) || price.currency || ''}`
        : 'размер штрафа уточняется у поставщика';
      return `${rule.from ? `С ${hotelCancellationDeadline(rule.from)}` : 'С момента бронирования'} — ${penalty}`;
    });
    return [...lines, ...(fare.cancellation_information || []).map(hotelPlainText)].filter(Boolean).join('\n');
  }
  const raw = hotelPlainText(fare.cancellation_rules || fare.cancellation || fallback);
  return raw.replace(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})): ([\d.]+) ([A-Z]{3})/g,
    (_, date, amount, currency) => `С ${hotelCancellationDeadline(date)} — штраф ${Number(amount).toLocaleString('ru-RU')} ${currencySymbol(currency) || currency}`);
}
