import { KP_KINDS } from './interactive.js';
import { readableServiceTitle } from './presentation.js';
export const PICKER_KIND = { avia:'Авиа', hotel:'Гостиница', transfer:'Трансфер', rail:'ЖД', insurance:'Страховка', bus:'Автобус', lounge:'Бизнес-зал', aeroexpress:'Аэроэкспресс', other:'Доп. услуга' };
export function presentProposalDescription(value = '') {
  return String(value).replace(/(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?/g, '$3.$2.$1 $4').replace(/(\d{4})-(\d{2})-(\d{2})/g, '$3.$2.$1');
}
export function compositionRows(items = []) {
  return items.filter(item => item.title?.trim() || item.offer || item.service).map(item => {
    const description = presentProposalDescription(item.description);
    const dates = [...new Set(description.match(/\d{2}\.\d{2}\.\d{4}/g) || [])];
    return { ...item, label: KP_KINDS[item.kind] || 'Услуга', title: readableServiceTitle(item.title) || KP_KINDS[item.kind], description, brief: dates.length ? dates[0] + (dates.length > 1 ? ` — ${dates.at(-1)}` : '') : description.slice(0, 140), hasPrice: item.price !== '' && item.price != null && Number.isFinite(Number(item.price)) };
  });
}
