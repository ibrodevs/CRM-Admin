const SERVICE_RULES = [
  ['avia', 'Авиаперелёт', /(авиа|авиабилет|перел[её]т|рейс|самол[её]т|билет(?:ы|а)?\s+на\s+самол[её]т)/i],
  ['rail', 'ЖД-билет', /(^|[\s,;])(жд|ж\/д|поезд|железнодорож|сапсан)/i],
  ['hotel', 'Гостиница', /(отел|гостиниц|проживан|номер)/i],
  ['transfer', 'Трансфер', /(трансфер|встреча\s+в\s+аэропорту|такси)/i],
  ['insurance', 'Страховка', /(страхов|полис)/i],
  ['visa', 'Виза', /(^|[\s,;])(виз[ауые]|визов)/i],
  ['tour', 'Тур', /(^|[\s,;])(тур|экскурси)/i],
];

const WORD_PASSENGERS = [
  [/(один|одна|одного)\s+(?:пассажир|человек)/i, 1],
  [/(^|[\s,;])(двое|двоих|два|двух)(?=$|[\s,;.!?])/i, 2],
  [/(^|[\s,;])(трое|троих|три|трех|трёх)(?=$|[\s,;.!?])/i, 3],
  [/(^|[\s,;])(четверо|четверых|четыре|четырех|четырёх)(?=$|[\s,;.!?])/i, 4],
  [/(^|[\s,;])(пятеро|пятерых|пять)(?=$|[\s,;.!?])/i, 5],
];

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function titleCase(value) {
  return clean(value).replace(/(^|[\s-])([а-яёa-z])/gi, (_, prefix, letter) => prefix + letter.toUpperCase());
}

function normalizeCity(value) {
  const city = titleCase(value);
  const knownForms = {
    Москвы: 'Москва',
    Бишкека: 'Бишкек',
    Стамбула: 'Стамбул',
    Алматы: 'Алматы',
  };
  return knownForms[city] || city;
}

function extractRoute(text) {
  const patterns = [
    /(?:^|[\s,;])[Ии]з\s+([А-ЯЁA-Z][А-ЯЁа-яёA-Za-z.-]*(?:\s+[А-ЯЁA-Z][А-ЯЁа-яёA-Za-z.-]*){0,2})\s+(?:в|до)\s+([А-ЯЁA-Z][А-ЯЁа-яёA-Za-z.-]*(?:\s+[А-ЯЁA-Z][А-ЯЁа-яёA-Za-z.-]*){0,2})/u,
    /(?:^|[\s,;])([А-ЯЁA-Z][А-ЯЁа-яёA-Za-z.-]*(?:\s+[А-ЯЁA-Z][А-ЯЁа-яёA-Za-z.-]*)?)\s*(?:→|—|–|->)\s*([А-ЯЁA-Z][А-ЯЁа-яёA-Za-z.-]*(?:\s+[А-ЯЁA-Z][А-ЯЁа-яёA-Za-z.-]*)?)/u,
    /\b([A-Z]{3})\s*[-–—/]\s*([A-Z]{3})\b/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return `${normalizeCity(match[1])} — ${normalizeCity(match[2])}`;
  }
  return '';
}

function extractDates(text) {
  const numeric = [...text.matchAll(/\b([0-3]?\d)[./-]([01]?\d)(?:[./-](\d{2,4}))?\b/g)]
    .slice(0, 2)
    .map((match) => [match[1].padStart(2, '0'), match[2].padStart(2, '0'), match[3]].filter(Boolean).join('.'));
  if (numeric.length) return numeric.join(' — ');
  const range = text.match(/\b(?:с\s+)?([0-3]?\d)\s*(?:по|[-–—])\s*([0-3]?\d)\s+([а-яё]+)(?:\s+(\d{4}))?/i);
  if (range) return `${range[1]}–${range[2]} ${range[3]}${range[4] ? ` ${range[4]}` : ''}`;
  const single = text.match(/\b(?:на|вылет|заезд|отправление)?\s*([0-3]?\d)\s+(январ[ья]|феврал[ья]|март[а]?|апрел[ья]|ма[йя]|июн[ья]|июл[ья]|август[а]?|сентябр[ья]|октябр[ья]|ноябр[ья]|декабр[ья])(?:\s+(\d{4}))?/i);
  return single ? `${single[1]} ${single[2]}${single[3] ? ` ${single[3]}` : ''}` : '';
}

function extractPassengers(text) {
  const numeric = text.match(/(?:^|[\s,;])(\d{1,2})\s*(?:пассажир(?:а|ов)?|человек(?:а)?|pax|взросл(?:ых|ого|ые)?)/i);
  if (numeric) return Number(numeric[1]);
  for (const [pattern, count] of WORD_PASSENGERS) {
    if (pattern.test(text)) return count;
  }
  return null;
}

function extractBudget(text) {
  const match = text.match(/(?:бюджет(?:ом)?|до|не\s+дороже)\s*[:—-]?\s*([\d\s.,]+)\s*(USD|EUR|RUB|KGS|сом(?:ов)?|руб(?:лей)?|доллар(?:ов)?|€|\$)/i);
  if (!match) return { budget: '', currency: '' };
  const currency = /сом|KGS/i.test(match[2]) ? 'KGS'
    : /руб|RUB/i.test(match[2]) ? 'RUB'
      : /EUR|€/i.test(match[2]) ? 'EUR' : 'USD';
  return { budget: clean(match[1]).replace(/\s/g, ''), currency };
}

function extractPreferences(text) {
  const rules = [
    ['Без пересадок', /(без\s+пересадок|прямой\s+рейс)/i],
    ['С багажом', /(с\s+багажом|багаж\s+(?:нужен|включен|включён))/i],
    ['Возвратный тариф', /(возвратн(?:ый|ые|ая)\s+тариф|с\s+возвратом)/i],
    ['Завтрак включён', /(с\s+завтраком|завтрак\s+включен|завтрак\s+включён)/i],
    ['В центре', /(в\s+центре|центр\s+город[а-я]*)/i],
    ['У окна', /(у\s+окна|место\s+у\s+окна)/i],
  ];
  return rules.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
}

export function parseKpRequest(rawText) {
  const text = clean(rawText);
  const services = SERVICE_RULES
    .filter(([, , pattern]) => pattern.test(text))
    .map(([kind, title]) => ({ kind, title }));
  const route = extractRoute(text);
  const dates = extractDates(text);
  const passengers = extractPassengers(text);
  const { budget, currency } = extractBudget(text);
  const preferences = extractPreferences(text);
  const contactMatch = text.match(/(?:^|[\s,;])(?:клиент|заказчик|для)\s*[:—-]\s*([^,;.\n]{2,60})/i);
  const contact = contactMatch ? clean(contactMatch[1]) : '';
  const recognized = [
    route && `Маршрут: ${route}`,
    dates && `Даты: ${dates}`,
    passengers && `Пассажиры: ${passengers}`,
    services.length && `Услуги: ${services.map((item) => item.title).join(', ')}`,
    budget && `Бюджет: ${budget} ${currency}`,
  ].filter(Boolean);
  const missing = [
    !route && services.some((item) => item.kind === 'avia' || item.kind === 'rail') && 'маршрут',
    !dates && 'даты',
    !passengers && 'количество пассажиров',
    !budget && 'бюджет',
  ].filter(Boolean);
  return {
    route,
    dates,
    passengers,
    services,
    budget,
    currency,
    preferences,
    contact,
    recognized,
    missing,
    hasData: recognized.length > 0 || preferences.length > 0,
  };
}

export function kpBriefItems(brief, currency = 'USD', sourceText = '') {
  return (brief?.services || []).map((service) => ({
    service_kind: service.kind,
    title: service.title,
    description: [
      brief.route,
      brief.dates,
      brief.passengers ? `${brief.passengers} пасс.` : '',
      brief.preferences?.join(', '),
      sourceText ? `Запрос: ${clean(sourceText).slice(0, 500)}` : '',
    ].filter(Boolean).join(' · '),
    quantity: 1,
    price_amount: '0',
    price_currency: currency,
  }));
}
