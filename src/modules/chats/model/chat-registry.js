import { serviceSummary } from '../../../shared/lib/service-presentation.js';

const known = (value) => value && value !== '—';
const nameOf = (person) => person?.name || person?.full_name || [person?.surname, person?.given_name, person?.middle_name].filter(Boolean).join(' ');
export function enrichChatThread(thread, { orders = [], services = [], users = [], clients = [], participants } = {}) {
  const order = orders.find((row) => (thread.orderId && String(row.id) === String(thread.orderId)) || (known(thread.order) && String(row.no || row.number) === String(thread.order)));
  const related = services.filter((service) => (thread.relatedServices || []).some((id) => String(id) === String(service.id)) || (thread.orderId && String(service.orderId || service.order) === String(thread.orderId)) || (order && String(service.orderId || service.order) === String(order.id)));
  const people = (participants ?? thread.participants ?? []).filter((person) => !person.left_at).map((person) => {
    const user = person.user && users.find((row) => String(row.id) === String(person.user));
    const client = person.person && clients.find((row) => String(row.id) === String(person.person));
    return { ...person, name: nameOf(user) || nameOf(client) || nameOf(person) || person.external_identity || 'Участник', role: ({ operator: 'Оператор', client: 'Клиент', admin: 'Администратор', owner: 'Владелец', member: 'Участник', observer: 'Наблюдатель' })[person.role] || person.role || (person.user ? 'Сотрудник' : 'Клиент') };
  });
  const client = known(thread.client) ? thread.client : known(order?.client) ? order.client : '';
  const summaries = related.map((service) => serviceSummary(service));
  const route = [...new Set(summaries.map((summary) => summary.title).filter(known))].join(' · ') || order?.title || '';
  const tripDates = [...new Set(summaries.map((summary) => summary.dates).filter((value) => value && /\d/.test(value)))].join(' · ');
  const genericTitle = !thread.name || /^Заказ\s*№?\s*/i.test(thread.name);
  const customer = clients.find((row) => order && [order.client_person, order.contact_person].filter(Boolean).some((id) => String(row.id) === String(id)));
  return { ...thread, name: genericTitle && client ? client : thread.name, client, route, tripDates,
    contact: [customer?.phone, customer?.email].filter(known).join(' · '),
    responsibleOperator: thread.responsibleOperator || order?.operator || '', participants: people, participantsLoaded: participants !== undefined || Boolean(thread.participants?.length),
    relatedServices: related.length ? related.map((service) => service.id) : thread.relatedServices || [] };
}

export function chatUnread(thread) {
  const value = thread.unread ?? thread.unread_count ?? 0;
  return typeof value === 'number' ? Math.max(0, value) : Object.values(value).reduce((sum, count) => sum + (Number(count) || 0), 0);
}

// Keep a message sent while a refresh is in flight; server delivery updates win.
export function mergeChatMessages(current, incoming) {
  const byId = new Map(current.map((message) => [String(message.id), message]));
  for (const message of incoming) {
    if (message.deleted) byId.delete(String(message.id));
    else {
      const previous = byId.get(String(message.id));
      const merged = { ...previous, ...message };
      byId.set(String(message.id), previous && JSON.stringify(previous) === JSON.stringify(merged) ? previous : merged);
    }
  }
  const next = [...byId.values()].sort((a, b) => (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0));
  return current.length === next.length && next.every((message, index) => message === current[index]) ? current : next;
}


const shortMonth = date => date.toLocaleDateString('ru-RU', { month: 'short', timeZone: 'UTC' }).replace(/\.$/, '');
export function chatRegistryContext(thread) {
  const title = String(thread.route || '').split(' · ').filter(part => !/^Город(?: вылета| прилёта)? не указан$/i.test(part.trim())).join(' · ');
  const dates = [...new Set(String(thread.tripDates || '').match(/\b\d{2}\.\d{2}\.\d{4}\b/g) || [])]
    .map(value => new Date(value.replace(/(\d{2})\.(\d{2})\.(\d{4})/, '$3-$2-$1') + 'T00:00:00Z'))
    .filter(date => Number.isFinite(date.getTime())).sort((a,b) => a-b);
  let dateLabel = '';
  if (dates.length) {
    const first = dates[0], last = dates.at(-1);
    const day = date => date.getUTCDate();
    const full = date => `${day(date)} ${shortMonth(date)} ${date.getUTCFullYear()}`;
    dateLabel = +first === +last ? full(first) : first.getUTCFullYear() !== last.getUTCFullYear() ? `${full(first)} — ${full(last)}`
      : first.getUTCMonth() === last.getUTCMonth() ? `${day(first)}–${day(last)} ${shortMonth(last)} ${last.getUTCFullYear()}`
      : `${day(first)} ${shortMonth(first)} — ${full(last)}`;
  }
  return { title, dates: dateLabel || thread.tripDates || '' };
}

export function chatActivityLabel(value, now = new Date()) {
  const date = new Date(value);
  if (!value || !Number.isFinite(date.getTime())) return '';
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'});
  return date.toLocaleDateString('ru-RU', {day:'numeric',month:'short', ...(date.getFullYear() !== now.getFullYear() ? { year:'numeric' } : {})});
}
