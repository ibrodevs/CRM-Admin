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
  const route = [...new Set(related.map((service) => serviceSummary(service).title).filter(known))].join(' · ') || order?.title || '';
  const genericTitle = !thread.name || /^Заказ\s*№?\s*/i.test(thread.name);
  const customer = clients.find((row) => order && [order.client_person, order.contact_person].filter(Boolean).some((id) => String(row.id) === String(id)));
  return { ...thread, name: genericTitle && client ? client : thread.name, client, route,
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
