export function participantsForService(participants, service) {
  if (!service) return [];
  const ids = (service.participantIds || []).map(String);
  const names = (service.passengers || []).map((p) => typeof p === 'string' ? p : p.name).filter(Boolean);
  if (ids.length) return participants.filter((p) => ids.includes(String(p.serverId || p.id)));
  if (names.length) return participants.filter((p) => names.includes(p.name || p.person_name));
  return participants;
}

export function validateManualQuote(amounts, exchange = false) {
  const keys = ['paid', 'penalty', 'fee', ...(exchange ? ['difference'] : [])];
  return keys.every((key) => amounts[key] !== '' && amounts[key] != null && Number.isFinite(Number(amounts[key])) && (key === 'difference' || Number(amounts[key]) >= 0));
}
