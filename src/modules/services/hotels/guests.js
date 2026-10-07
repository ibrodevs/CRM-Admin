import { resultsOf } from '../../../shared/api/client.js';

export function hotelPersonToGuest(person) {
  return { id: person.id, person: person.id,
    name: [person.surname, person.given_name, person.patronymic].filter(Boolean).join(' ') || person.full_name || 'Гость',
    dob: person.birth_date || '', role: 'Гость', docType: '', docNo: '' };
}

export function hotelGuestSelection(guests, selection, mainGuest) {
  const indices = guests.map((_, index) => index).filter((index) => selection[index]);
  if (indices.includes(mainGuest)) indices.sort((a, b) => a === mainGuest ? -1 : b === mainGuest ? 1 : a - b);
  return indices.map((index) => guests[index]);
}

export async function resolveHotelParticipants(orderId, service, api) {
  if (!Array.isArray(service.guestPersonIds)) return undefined;
  const existing = resultsOf(await api.participants(orderId));
  const ids = [];
  for (const person of [...new Set(service.guestPersonIds)]) {
    let participant = existing.find((item) => String(item.person) === String(person) && item.status !== 'removed');
    if (!participant) {
      participant = await api.addParticipant(orderId, { person, role: 'passenger' });
      existing.push(participant);
    }
    ids.push(participant.id);
  }
  return ids;
}
