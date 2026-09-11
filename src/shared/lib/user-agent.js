// Человекочитаемое название устройства из строки User-Agent.
// В списке сессий сырой UA нечитаем, а до проброса заголовка через прокси там
// вообще стояло «node» — User-Agent серверного fetch.

const BROWSERS = [
  [/edg(?:e|a|ios)?\/([\d.]+)/i, 'Edge'],
  [/opr\/|opera/i, 'Opera'],
  [/yabrowser/i, 'Яндекс.Браузер'],
  [/firefox\/|fxios\//i, 'Firefox'],
  [/chrome\/|crios\//i, 'Chrome'],
  [/safari\//i, 'Safari'],
];

const PLATFORMS = [
  [/windows nt 10|windows nt 11/i, 'Windows'],
  [/windows/i, 'Windows'],
  [/iphone/i, 'iPhone'],
  [/ipad/i, 'iPad'],
  [/android/i, 'Android'],
  [/mac os x|macintosh/i, 'macOS'],
  [/linux/i, 'Linux'],
];

function match(list, value) {
  for (const [pattern, label] of list) if (pattern.test(value)) return label;
  return '';
}

/** «Chrome · macOS». Пустой или служебный UA → «Неизвестное устройство». */
export function describeUserAgent(userAgent, fallback = 'Неизвестное устройство') {
  const raw = String(userAgent || '').trim();
  // 'node' и 'undici' — это сам сервер, а не устройство пользователя.
  if (!raw || /^(node|undici|python-requests|curl)[/\s]?/i.test(raw)) return fallback;
  const browser = match(BROWSERS, raw);
  const platform = match(PLATFORMS, raw);
  if (browser && platform) return `${browser} · ${platform}`;
  if (browser || platform) return browser || platform;
  // Незнакомый агент показываем как есть, но обрезаем — это лучше, чем прятать.
  return raw.length > 60 ? `${raw.slice(0, 60)}…` : raw;
}
