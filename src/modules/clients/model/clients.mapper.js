import { asDate } from '../../../shared/lib/adapter-dates.js';

function toUiClient(profile) {
  const person = profile.person_detail || {};
  const created = asDate(profile.created_at);
  return {
    ...profile,
    id: person.id || profile.person,
    profileId: profile.id,
    name: person.full_name || [person.surname, person.given_name, person.middle_name].filter(Boolean).join(' '),
    type: profile.client_type === 'corporate' ? 'Корпоративный' : 'Физлицо',
    status: { active: 'Активный', vip: 'VIP', inactive: 'Неактивный', new: 'Новый' }[profile.status] || profile.status,
    phone: person.phone || '—', phone2: person.secondary_phone || '', email: person.email || '—', city: person.city || '—',
    doc: '—', dob: person.birth_date || '—', citizenship: person.citizenship || '', company: '—',
    since: created ? created.toLocaleDateString('ru-RU') : '—', orders: profile.metrics?.orders ?? 0, spent: profile.metrics?.spent || {}, debt: profile.metrics?.debt || {},
    source: person,
  };
}

export { toUiClient };
