export const normalizeContactName = (value) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

export function contactPersonForDraft(draft = {}) {
  if (draft.contact_person !== undefined) return draft.contact_person;
  const contacts = (draft.participants || []).filter((person) => person.is_contact && person.person);
  if (contacts.length === 1) return contacts[0].person;
  return draft.client_person || null;
}

export function orderContact(order = {}, participants = [], people = []) {
  if (order.booking_contact) {
    const contact = order.booking_contact;
    return { ...contact, name: normalizeContactName(contact.name) };
  }
  let source = 'contact_person';
  let id = order.contact_person;
  let person;
  if (!id) {
    const marked = participants.filter((row) => (row.is_contact || row.isContact || row.lead) && row.status !== 'removed');
    if (marked.length === 1) { person = marked[0]; id = person.person; source = 'participant'; }
    else if (!marked.length && order.client_person) { id = order.client_person; source = 'client_person'; }
  }
  person = person || people.find((row) => String(row.id) === String(id));
  const selected = !!id || !!person;
  const name = normalizeContactName(person?.person_name || person?.name);
  return { person: id || null, name, email: person?.email || '', phone: person?.phone || '', selected, valid: !!name, source: selected ? source : 'none', message: name ? '' : selected ? 'У контактного лица не заполнено имя.' : 'Укажите контактное лицо заказа.' };
}
