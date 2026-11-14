const ROUTES = { flights: 'Авиабилеты', rail: 'ЖД билеты', hotels: 'Отели', transfers: 'Трансферы', buses: 'Автобусы', tours: 'Туры' };
const KINDS = { Авиа: 'Авиабилеты', Гостиница: 'Отели', ЖД: 'ЖД билеты', Трансфер: 'Трансферы', Автобус: 'Автобусы', Аэроэкспресс: 'Аэроэкспресс', Страховка: 'Страховка' };
const filled = (value) => value != null && value !== '' && value !== false;
function hasWork(fields) {
  const params = fields.aviaParams || fields.params;
  if (params && (params.depDate || params.retDate || params.segments?.some((item) => item.date) || (params.from && params.from !== 'FRU') || (params.to && params.to !== 'IST'))) return true;
  if (['dest', 'checkin', 'checkout', 'date', 'retDate', 'start', 'specialReq', 'supplierComment', 'title', 'cost', 'bookingDraft', 'depDate', 'retDate'].some((key) => filled(fields[key]))) return true;
  if (fields.draft?.length || fields.selClients?.length || fields.employees?.length || fields.pts?.some(Boolean)) return true;
  return fields.form && ['from', 'to', 'dep', 'date', 'dt', 'ret', 'title', 'first_name', 'last_name'].some((key) => filled(fields.form[key]));
}
function serviceLabel(scope) {
  if (/Hotel|RoomPanel/.test(scope)) return 'Отели';
  if (/Flight|Avia|Aviation/.test(scope)) return 'Авиабилеты';
  if (/Rail/.test(scope)) return 'ЖД билеты';
  if (/Aero/.test(scope)) return 'Аэроэкспресс';
  const route = scope.match(/(?:ServiceAddFlow|ServiceFlow)\/([^/]+)/)?.[1];
  if (route) return ROUTES[route];
  return KINDS[scope.match(/QuickAddForm\/([^/]+)/)?.[1]];
}
// Navigation, cached directories and selected tabs are not unfinished work.
export function savedWorkspaces(records) {
  const groups = new Map();
  const contexts = new Map(records.filter((r) => /^order\/[^/]+\/context$/.test(r.scope)).map((r) => [r.scope.split('/')[1], r.fields.order]));
  const lastOrder = records.find((r) => r.scope === 'orders')?.fields.detail;
  if (lastOrder?.id && !contexts.has(String(lastOrder.id))) contexts.set(String(lastOrder.id), lastOrder);
  for (const record of records) {
    const { scope, fields } = record;
    if (!hasWork(fields)) continue;
    let group;
    if (scope.startsWith('free-booking/')) {
      group = { id: 'free-booking', scope: 'free-booking', type: 'free-booking', title: 'Подбор услуг без заказа' };
    } else if (/^order\/[^/]+\//.test(scope)) {
      const orderId = scope.split('/')[1], order = contexts.get(orderId);
      group = { id: `order/${orderId}`, scope: `order/${orderId}`, type: 'order', orderId, title: `Заказ ${order?.no || order?.number || orderId.slice(0, 8)}` };
    } else if (scope.startsWith('OrderCreateModal/')) {
      group = { id: 'new-order', scope, type: 'new-order', title: 'Создание нового заказа' };
    } else if (scope === 'FlightsPage') {
      group = { id: 'flights', scope, type: 'route', route: 'flights', title: 'Поиск авиабилетов' };
    } else if (/^HotelPicker\/free$/.test(scope)) {
      group = { id: 'hotels', scope, type: 'route', route: 'hotels', title: 'Поиск отелей' };
    } else if (/^ServiceFlow\/(rail|transfers|buses|tours)$/.test(scope)) {
      const route = scope.split('/')[1];
      group = { id: route, scope, type: 'route', route, title: `Поиск услуг · ${ROUTES[route]}` };
    }
    if (!group) continue;
    const previous = groups.get(group.id);
    const services = new Set(previous?.services || []);
    const orderService = group.orderId && contexts.get(group.orderId)?.service;
    if (typeof orderService === 'string' && orderService) services.add(KINDS[orderService] || orderService);
    const kind = fields.kind || fields.addKind;
    const label = serviceLabel(scope) || KINDS[kind];
    if (label) services.add(label);
    for (const item of fields.draft || []) if (KINDS[item.kind]) services.add(KINDS[item.kind]);
    groups.set(group.id, { ...group, services: [...services], savedAt: Math.max(previous?.savedAt || 0, record.savedAt), count: Math.max(previous?.count || 0, fields.draft?.length || 0) });
  }
  return [...groups.values()].sort((a, b) => b.savedAt - a.savedAt);
}
