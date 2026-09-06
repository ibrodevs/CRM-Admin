import { NAV_ITEMS } from '../shell/AppShell';

const SERVICE_LABELS = { flights: 'Авиабилеты', rail: 'ЖД билеты', hotels: 'Гостиницы', transfers: 'Трансферы', buses: 'Автобусы', tours: 'Туры' };

const ORDER_OPS_LABELS = { documents: 'Документы', fulfillment: 'Оформление', returns: 'Возвраты и обмены' };

const ROUTE_LABELS = (() => {
  const m = { dashboard: 'Главное', calendar: 'Календарь поездок', profile: 'Мой профиль', account: 'Настройки аккаунта', ...SERVICE_LABELS, ...ORDER_OPS_LABELS };
  NAV_ITEMS.forEach((it) => {
    if (it.group) { m[it.group] = it.label; it.children.forEach((c) => { m[c.key] = c.label; }); }
    else m[it.key] = it.label;
  });
  return m;
})();

const SERVICE_PARENT = { flights: 1, rail: 1, hotels: 1, transfers: 1, buses: 1, tours: 1 };

const ORDER_OPS_PARENT = { documents: 1, fulfillment: 1, returns: 1 };

export { SERVICE_LABELS, ORDER_OPS_LABELS, ROUTE_LABELS, SERVICE_PARENT, ORDER_OPS_PARENT };
