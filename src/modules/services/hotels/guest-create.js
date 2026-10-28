import { resultsOf } from '../../../shared/api/client.js';
import { hotelPersonToGuest } from './guests.js';

const FORM_FIELDS = { surname: 'lastName', given_name: 'firstName', latin_surname: 'latLast', latin_given_name: 'latFirst', birth_date: 'dob', gender: 'gender', citizenship: 'citizenship', number: 'docNo', expires_at: 'docExpiry' };

// Additional booking requirements complement the shared CRM person validation.
export function hotelGuestErrors(person, { dob, today = new Date() } = {}) {
  const errors = {};
  for (const [key, label] of [['surname', 'фамилию'], ['given_name', 'имя'], ['latin_surname', 'фамилию латиницей'], ['latin_given_name', 'имя латиницей']]) {
    const value = String(person[key] || '').trim();
    if (!value) errors[FORM_FIELDS[key]] = `Укажите ${label}`;
    else if (key.startsWith('latin_') && (!/^[A-Za-z][A-Za-z '\-]*$/.test(value) || value.length > 50)) errors[FORM_FIELDS[key]] = 'Используйте латинские буквы, пробел, дефис или апостроф; не более 50 символов';
  }
  const iso = String(person.birth_date || '');
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
  const valid = date && date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3]);
  const expected = match ? `${match[3]}.${match[2]}.${match[1]}` : '';
  if (!valid || date > today || (typeof dob === 'string' && dob !== iso && dob !== expected)) errors.dob = 'Укажите корректную дату рождения, не позднее сегодняшней';
  if (!['male', 'female'].includes(person.gender)) errors.gender = 'Укажите пол';
  if (!/^[A-Z]{2}$/.test(person.citizenship || '')) errors.citizenship = 'Выберите гражданство с кодом страны';
  return errors;
}

export function hotelGuestApiErrors(error) {
  const fields = error.fields?.person_data || error.fields || {};
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [FORM_FIELDS[key] || key, Array.isArray(value) ? value.join(' ') : String(value)]));
}

export async function persistHotelGuest({ payload, api, orderId, orderApi, savedPerson, editPersonId, documentRequired = false, checkout, onPersonSaved = () => {} }) {
  let person = savedPerson;
  if (!person) {
    if (editPersonId) {
      const { documents, ...body } = payload;
      person = await api.updatePerson(editPersonId, body);
      for (const document of documents || []) {
        if (!document.id) await api.addPersonDocument(editPersonId, document);
      }
    } else {
      const { documents = [], ...person_data } = payload;
      const profile = await api.createClient({ client_type: 'individual', person_data, documents });
      person = profile.person_detail || await api.person(profile.person);
    }
    // Cache the saved person before linking: a failed link must never create a second person on retry.
    onPersonSaved(person);
  }
  if (!person?.id) throw new Error('CRM не вернула идентификатор гостя');
  const guest = hotelPersonToGuest(person);
  const document = documentRequired ? suitableHotelDocument(resultsOf(await api.personDocuments(person.id)), checkout) : null;
  if (documentRequired && !document) throw new Error('Добавьте действующий документ гостя');
  if (!orderId) return { ...guest, ...(document ? { bookingDocument: document.id } : {}) };
  const existing = resultsOf(await orderApi.participants(orderId));
  let participant = existing.find((row) => String(row.person) === String(person.id) && row.status !== 'removed');
  if (!participant) participant = await orderApi.addParticipant(orderId, { person: person.id, role: 'passenger', ...(document ? { booking_document: document.id } : {}) });
  else if (document && participant.booking_document !== document.id) await orderApi.updateParticipant(orderId, participant.id, { booking_document: document.id });
  return { ...guest, id: participant.id, serverId: participant.id, person: person.id };
}

// Preserve indices: selection, primary guest and room assignments all refer to them.
export function mergeHotelGuests(current, incoming) {
  const merged = [...current];
  for (const guest of incoming) {
    const index = merged.findIndex((row) => String(row.id) === String(guest.id) || (row.person && guest.person && String(row.person) === String(guest.person)));
    if (index < 0) merged.push(guest);
    else merged[index] = { ...merged[index], ...guest };
  }
  return merged;
}

export function selectCreatedHotelGuest(guests, selection, mainGuest, guest) {
  const next = mergeHotelGuests(guests, [guest]);
  const index = next.findIndex((row) => String(row.id) === String(guest.id));
  return { guests: next, selection: { ...selection, [index]: true }, mainGuest: Object.keys(selection).some((key) => selection[key]) ? mainGuest : index };
}

export async function validateHotelBookingGuests(guests, api, { documentRequired = false, checkout } = {}) {
  for (const guest of guests) {
    const person = guest.person ? await api.person(guest.person) : guest.guest_snapshot || {};
    const errors = hotelGuestErrors(person);
    if (Object.keys(errors).length) throw new Error(`${guest.name}: ${Object.values(errors).join('. ')}. Дополните данные гостя перед бронированием HBPRO.`);
    if (documentRequired && guest.person && !suitableHotelDocument(resultsOf(await api.personDocuments(guest.person)), checkout)) throw new Error(`${guest.name}: добавьте действующий документ для бронирования.`);
  }
}

export function suitableHotelDocument(documents, checkout = '') {
  return documents.find((doc) => (!doc.status || doc.status === 'active') && (!doc.expires_at || doc.expires_at >= checkout));
}

export function hotelGuestDocumentErrors(payload, { required = false, checkout = '' } = {}) {
  if (!required) return {};
  const documents = payload.documents || [];
  if (!documents.some((doc) => doc.id || String(doc.number || '').trim())) return { docNo: 'Укажите документ для бронирования' };
  if (documents.every((doc) => doc.expires_at && doc.expires_at < checkout)) return { docExpiry: 'Документ должен действовать до даты выезда' };
  return {};
}
