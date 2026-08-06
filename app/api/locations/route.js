import { NextResponse } from 'next/server';

const POPULAR_LOCATIONS = [
  ['Бишкек', 'Кыргызстан', ['bishkek', 'фрунзе']],
  ['Ош', 'Кыргызстан', ['osh']],
  ['Каракол', 'Кыргызстан', ['przhevalsk', 'пржевальск']],
  ['Чолпон-Ата', 'Кыргызстан', ['cholpon ata', 'чолпон ата']],
  ['Нарын', 'Кыргызстан', ['naryn']],
  ['Талас', 'Кыргызстан', ['talas']],
  ['Джалал-Абад', 'Кыргызстан', ['jalal abad', 'жалал абад']],
  ['Баткен', 'Кыргызстан', ['batken']],
  ['Москва', 'Россия', ['moscow', 'москва']],
  ['Санкт-Петербург', 'Россия', ['saint petersburg', 'st petersburg', 'питер', 'санкт петербург', 'спб']],
  ['Сочи', 'Россия', ['sochi']],
  ['Казань', 'Россия', ['kazan']],
  ['Новосибирск', 'Россия', ['novosibirsk']],
  ['Екатеринбург', 'Россия', ['yekaterinburg', 'ekaterinburg']],
  ['Алматы', 'Казахстан', ['almaty', 'алма ата', 'алма-ата']],
  ['Астана', 'Казахстан', ['astana', 'нур султан', 'нур-султан']],
  ['Ташкент', 'Узбекистан', ['tashkent']],
  ['Самарканд', 'Узбекистан', ['samarkand']],
  ['Душанбе', 'Таджикистан', ['dushanbe']],
  ['Дубай', 'ОАЭ', ['dubai']],
  ['Абу-Даби', 'ОАЭ', ['abu dhabi', 'абу даби']],
  ['Стамбул', 'Турция', ['istanbul', 'константинополь']],
  ['Анталья', 'Турция', ['antalya', 'анталия']],
  ['Париж', 'Франция', ['paris']],
  ['Лондон', 'Великобритания', ['london']],
  ['Амстердам', 'Нидерланды', ['amsterdam']],
  ['Берлин', 'Германия', ['berlin']],
  ['Рим', 'Италия', ['rome', 'roma']],
  ['Милан', 'Италия', ['milan', 'milano']],
  ['Барселона', 'Испания', ['barcelona']],
  ['Мадрид', 'Испания', ['madrid']],
  ['Нью-Йорк', 'США', ['new york', 'nyc', 'нью йорк']],
  ['Лос-Анджелес', 'США', ['los angeles', 'ла']],
  ['Торонто', 'Канада', ['toronto']],
  ['Ванкувер', 'Канада', ['vancouver']],
  ['Сеул', 'Южная Корея', ['seoul']],
  ['Токио', 'Япония', ['tokyo']],
  ['Пекин', 'Китай', ['beijing', 'peking']],
  ['Шанхай', 'Китай', ['shanghai']],
  ['Бангкок', 'Таиланд', ['bangkok']],
  ['Пхукет', 'Таиланд', ['phuket']],
  ['Бали', 'Индонезия', ['bali', 'денпасар', 'denpasar']],
  ['Сингапур', 'Сингапур', ['singapore']],
  ['Дели', 'Индия', ['delhi', 'new delhi', 'нью дели']],
  ['Мале', 'Мальдивы', ['male', 'maldives', 'мальдивы']],
  ['Тбилиси', 'Грузия', ['tbilisi']],
  ['Баку', 'Азербайджан', ['baku']],
  ['Ереван', 'Армения', ['yerevan']],
];

const CACHE = globalThis.__crmLocationCache || new Map();
globalThis.__crmLocationCache = CACHE;

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[‐‑‒–—−-]/g, ' ')
    .replace(/[^a-zа-я0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  if (!a) return b.length;
  if (!b) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const saved = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      previous = saved;
    }
  }
  return row[b.length];
}

function localSuggestions(query) {
  const q = normalize(query);
  if (q.length < 2) return [];
  return POPULAR_LOCATIONS
    .map(([name, country, aliases]) => {
      const variants = [name, ...(aliases || [])].map(normalize);
      let score = 100;
      for (const variant of variants) {
        if (variant === q) score = Math.min(score, 0);
        else if (variant.startsWith(q)) score = Math.min(score, 1);
        else if (variant.includes(q)) score = Math.min(score, 2);
        else if (q.length >= 4) {
          const prefix = variant.slice(0, Math.max(q.length, Math.min(variant.length, q.length + 3)));
          const distance = levenshtein(q, prefix);
          if (distance <= 2) score = Math.min(score, 3 + distance);
        }
      }
      return { name, country, score };
    })
    .filter((item) => item.score < 100)
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name, 'ru'))
    .slice(0, 8)
    .map((item) => ({
      id: `local:${item.name}:${item.country}`,
      value: item.name,
      label: `${item.name}, ${item.country}`,
      title: item.name,
      subtitle: item.country,
      kind: 'Город',
      source: 'local',
    }));
}

function photonKind(properties) {
  const type = String(properties.type || properties.osm_value || '').toLowerCase();
  if (['city', 'town', 'village', 'hamlet', 'municipality'].includes(type)) return 'Город';
  if (['airport', 'aerodrome'].includes(type)) return 'Аэропорт';
  if (['hotel', 'hostel', 'guest_house', 'resort', 'motel'].includes(type)) return 'Отель';
  if (['station', 'halt', 'railway_station'].includes(type)) return 'Вокзал';
  if (['attraction', 'museum', 'monument', 'viewpoint', 'theme_park'].includes(type)) return 'Достопримечательность';
  if (properties.street || properties.housenumber || type === 'house') return 'Адрес';
  return 'Локация';
}

function photonSuggestion(feature, index) {
  const properties = feature?.properties || {};
  const coordinates = feature?.geometry?.coordinates || [];
  const name = properties.name || properties.city || properties.town || properties.village || properties.street;
  if (!name) return null;
  const locality = properties.city || properties.town || properties.village || properties.district || properties.county;
  const country = properties.country || '';
  const address = [properties.street, properties.housenumber].filter(Boolean).join(' ');
  const detailParts = [address && address !== name ? address : '', locality && locality !== name ? locality : '', properties.state, country]
    .filter(Boolean)
    .filter((item, position, items) => items.indexOf(item) === position);
  const subtitle = detailParts.join(', ');
  const kind = photonKind(properties);
  const value = kind === 'Город' ? name : [name, locality && locality !== name ? locality : '', country].filter(Boolean).join(', ');
  return {
    id: `photon:${properties.osm_type || ''}:${properties.osm_id || index}`,
    value,
    label: subtitle ? `${name}, ${subtitle}` : name,
    title: name,
    subtitle,
    kind,
    source: 'photon',
    lat: Number(coordinates[1]) || null,
    lon: Number(coordinates[0]) || null,
    countryCode: properties.countrycode || '',
  };
}

function mergeSuggestions(local, remote) {
  const seen = new Set();
  return [...local, ...remote].filter((item) => {
    if (!item) return false;
    const key = normalize(`${item.value}|${item.subtitle}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
}

async function remoteSuggestions(query) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const params = new URLSearchParams({ q: query, limit: '10', lang: 'ru' });
    const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'TravelHubCRM/1.0 location-autocomplete',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Photon returned ${response.status}`);
    const payload = await response.json();
    return (payload.features || []).map(photonSuggestion).filter(Boolean);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request) {
  const query = String(new URL(request.url).searchParams.get('q') || '').trim().slice(0, 120);
  if (query.length < 2) {
    return NextResponse.json({ results: [], query, source: 'empty' });
  }

  const key = normalize(query);
  const cached = CACHE.get(key);
  if (cached && Date.now() - cached.savedAt < 24 * 60 * 60 * 1000) {
    return NextResponse.json(cached.payload, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800' },
    });
  }

  const local = localSuggestions(query);
  const remote = await remoteSuggestions(query);
  const results = mergeSuggestions(local, remote);
  const payload = { results, query, source: remote.length ? 'photon+local' : 'local' };
  CACHE.set(key, { savedAt: Date.now(), payload });

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800' },
  });
}
