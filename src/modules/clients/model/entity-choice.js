export const ENTITY_LABELS = { person: 'Физлицо', company: 'Юрлицо', order: 'Заказ', new: 'Новый заказ' };
export function entityRow(mode, value) {
  const row = typeof value === 'string' ? { name: value } : value;
  if (mode === 'person') {
    const person = row.person_detail || row.source || row;
    const name = row.name || person.full_name || [person.surname, person.given_name, person.middle_name].filter(Boolean).join(' ') || 'Без имени';
    return { id: row.person_detail?.id || row.person || row.id || person.id || name, name, hint: [row.phone || person.phone, row.email || person.email, row.dob || person.birth_date].filter(v => v && v !== '—').join(' · '), source: row };
  }
  if (mode === 'order') return { id: row.id || row.no || row.number, name: `Заказ ${row.no || row.number}`, hint: [row.client || row.client_name, row.route_summary || row.route, row.dates].filter(v => typeof v === 'string' && v).join(' · '), source: { ...row, no: row.no || row.number, client: row.client || row.client_name || '' } };
  const name = row.name || row.short_name || row.shortName || row.fullName || row.legal_name || 'Без названия';
  return { id: row.id || name, name, hint: [row.inn || row.tax_id ? `ИНН ${row.inn || row.tax_id}` : '', row.city, row.email].filter(Boolean).join(' · '), source: { ...row, name } };
}
export function entitySelection(mode, item) {
  return { mode, id: item.id, label: item.name, ...(mode === 'person' ? { client: item.name, person: item.source, personId: item.id } : mode === 'order' ? { order: item.source } : { company: item.source }) };
}
