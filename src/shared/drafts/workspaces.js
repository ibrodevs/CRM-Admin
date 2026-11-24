const ROUTES = { flights: 'Авиабилеты', rail: 'ЖД билеты', hotels: 'Отели', transfers: 'Трансферы', buses: 'Автобусы', tours: 'Туры' };
const KINDS = { Авиа: 'Авиабилеты', Гостиница: 'Отели', ЖД: 'ЖД билеты', Трансфер: 'Трансферы', Автобус: 'Автобусы', Аэроэкспресс: 'Аэроэкспресс', Страховка: 'Страховка' };
const filled = (value) => value != null && value !== '' && value !== false;
export const DRAFT_STAGES = [
  { value: 'form', label: 'Заполнение формы' },
  { value: 'results', label: 'Результаты поиска' },
  { value: 'selection', label: 'Выбраны услуги' },
  { value: 'checkout', label: 'Оформление' },
];
function workStage(fields) {
  if (fields.bookingDraft || fields.workflow || fields.workflowState || fields.serverProposal || fields.proposal) return 'checkout';
  if (fields.draft?.length || fields.selected) return 'selection';
  if (fields.liveOffers?.length || fields.offers?.length || fields.results?.length) return 'results';
  return 'form';
}
export function filterDrafts(entries, { stage = '', service = '' } = {}) {
  return entries.filter(entry => (!stage || (entry.stage || 'form') === stage) && (!service || entry.services.includes(service)));
}
export function hasDraftWork(fields) {
  if (fields.liveOffers?.length || fields.offers?.length || fields.results?.length || fields.selected || fields.workflow || fields.workflowState || fields.proposal) return true;
  const insurance = fields.request;
  if (insurance && (insurance.countries?.trim() || insurance.start || insurance.end || insurance.citizenship?.trim() || insurance.travellers?.some((person) => person.birth_date) || insurance.purpose && insurance.purpose !== 'tourism')) return true;
  const params = fields.aviaParams || fields.params;
  const pax = params?.pax || fields.form?.pax;
  if (pax && typeof pax === 'object' && (Number(pax.adt) > 1 || Number(pax.chd) > 0 || Number(pax.infSeat) > 0 || Number(pax.infNoSeat) > 0)) return true;
  if (Number(fields.form?.pax) > 1 || Number(fields.pax) > 1) return true;
  if (params && (params.depDate || params.retDate || params.segments?.some((item) => item.date) || (params.from && params.from !== 'FRU') || (params.to && params.to !== 'IST'))) return true;
  if (['dest', 'checkin', 'checkout', 'date', 'retDate', 'start', 'specialReq', 'supplierComment', 'title', 'cost', 'bookingDraft', 'depDate', 'retDate'].some((key) => filled(fields[key]))) return true;
  if (fields.clientType === 'org' && fields.company?.id || Object.values(fields.svc || {}).some(Boolean) || fields.clientQuery?.trim() || fields.companyQuery?.trim()) return true;
  if (fields.draft?.length || fields.selClients?.length || fields.employees?.length || fields.pts?.some(Boolean)) return true;
  return fields.form && ['from', 'to', 'dep', 'date', 'dt', 'ret', 'title', 'first_name', 'last_name'].some((key) => filled(fields.form[key]));
}
// Dismissing search must depend on visible search inputs, not cached room
// placement or guest wishes left by a previously opened accommodation panel.
export function hasSearchWork(kind, fields) {
  if (kind !== 'Гостиница') return hasDraftWork(fields);
  const text = (value) => typeof value === 'string' && value.trim().length > 0;
  const date = (value) => (value instanceof Date || text(value)) && Number.isFinite(new Date(value).getTime());
  return text(fields.dest) || date(fields.checkin) || date(fields.checkout)
    || text(fields.earlyArrivalTime) || text(fields.lateDepartureTime)
    || text(fields.citizenship) || fields.freeCancelOnly === true
    || (text(fields.radius) && fields.radius !== '2 км')
    || (text(fields.meal) && fields.meal !== 'BB')
    || (Array.isArray(fields.occupancyRooms) && (fields.occupancyRooms.length !== 1
      || fields.occupancyRooms.some((room) => Number(room.adults) !== 2 || room.childrenAges?.length > 0)));
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
    if (!hasDraftWork(fields) && !(scope === 'proposal-create' && ['recipient', 'route', 'start', 'end', 'orderNo', 'note', 'createdId'].some(key => filled(fields[key])))) continue;
    let group;
    if (/^proposal-workspace\/[^/]+$/.test(scope)) {
      const proposalId = scope.split('/')[1];
      group = { id: `kp/${proposalId}`, scope, type: 'route', route: 'offers', proposalId, title: `КП · ${fields.form?.title || 'Предложение'}` };
    } else if (scope === 'proposal-create') {
      group = { id: scope, scope, type: 'new-proposal', route: 'offers', title: `Создание КП${fields.recipient ? ` · ${fields.recipient}` : ''}` };
    } else if (scope.startsWith('free-booking/')) {
      group = { id: 'free-booking', scope: 'free-booking', type: 'free-booking', title: 'Подбор услуг без заказа' };
    } else if (/^order\/[^/]+\//.test(scope)) {
      const orderId = scope.split('/')[1], order = contexts.get(orderId);
      group = { id: `order/${orderId}`, scope: `order/${orderId}`, type: 'order', orderId, title: `Заказ ${order?.no || order?.number || orderId.slice(0, 8)}` };
    } else if (scope.startsWith('OrderCreateModal/')) {
      const customer = fields.clientType === 'org' ? fields.company?.name : fields.selClients?.map((person) => person.name).filter(Boolean).join(', ');
      group = { id: scope, scope, type: 'new-order', title: `Создание ${fields.isGroup || scope.endsWith('/true') ? 'группового ' : 'нового '}заказа${customer ? ` · ${customer}` : ''}` };
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
    const stage = [previous?.stage || 'form', workStage(fields)].sort((a,b) => DRAFT_STAGES.findIndex(s => s.value === b) - DRAFT_STAGES.findIndex(s => s.value === a))[0];
    groups.set(group.id, { ...group, stage, services: [...services], savedAt: Math.max(previous?.savedAt || 0, record.savedAt), count: Math.max(previous?.count || 0, fields.draft?.length || 0) });
  }
  return [...groups.values()].sort((a, b) => b.savedAt - a.savedAt);
}

export function freeBookingFormScope(kind) {
  const scopes = { 'Авиа': 'DetailedSearchPanel', 'Гостиница': 'HotelPicker/free', 'ЖД': 'FreeBookingRailFlow', 'Трансфер': 'FreeBookingServiceAddFlow/transfers', 'Автобус': 'FreeBookingServiceAddFlow/buses', 'Аэроэкспресс': 'FreeBookingAeroAddFlow', 'Бизнес-зал': 'FreeBookingServiceAddFlow/lounge' };
  return scopes[kind] || `QuickAddForm/${kind}`;
}

// Only the desktop aggregates work from every section.
export function draftsForRoute(entries, route) {
  const section = route.split('/')[0];
  return entries.filter((entry) => section === 'dashboard'
    || (section === 'orders' && ['order', 'new-order'].includes(entry.type))
    || (['route', 'new-proposal'].includes(entry.type) && entry.route === section));
}

const PROPOSAL_KINDS = { avia: 'Авиабилеты', hotel: 'Отели', transfer: 'Трансферы', rail: 'ЖД билеты', insurance: 'Страхование', bus: 'Автобусы', lounge: 'Бизнес-залы', aeroexpress: 'Аэроэкспресс', tour: 'Туры', other: 'Другие услуги' };

export function proposalDraftEntries(proposals, onOpen) {
  return proposals.filter(p => p.interactive?.has_draft).map(p => ({
    id: `kp/${p.serverId || p.id}`, scope: `kp/${p.serverId || p.id}`, title: `КП ${p.number || p.id} · ${p.interactive.title || p.purpose || 'Предложение'}`,
    stage: 'form', services: (p.interactive.service_kinds || []).map(kind => PROPOSAL_KINDS[kind] || kind),
    savedAt: new Date(p.interactive.saved_at).getTime(), count: p.interactive.option_count,
    canDelete: false, onContinue: () => onOpen(p),
  }));
}
