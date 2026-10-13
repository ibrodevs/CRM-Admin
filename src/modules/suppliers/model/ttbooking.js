export const TTBOOKING_DEFAULTS = {
  url: 'https://www.ttbooking.ru/api/scbs/json', agency: '', user: '', password_key: '',
  locale: 'ru', environment: 'sandbox',
};

export function ttbookingCredential(config) {
  return {
    provider_adapter: 'ttbooking', environment: config.environment,
    secrets: Object.fromEntries(['url', 'agency', 'user', 'password_key', 'locale']
      .filter((key) => config[key] !== '').map((key) => [key, config[key]])),
  };
}

export function publicSupplierApi(config) {
  return { url: config.url || '', version: config.version || '' };
}
