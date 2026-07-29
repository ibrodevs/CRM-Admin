function receiptDay(value) {
  const raw = String(value || '').trim();
  let match = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (match) return Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])) / 86400000;
  match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000 : null;
}

function receiptMinutes(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

export function segmentLayoverMinutes(current, next) {
  const arrival = receiptMinutes(current?.arr);
  const departure = receiptMinutes(next?.dep);
  if (arrival === null || departure === null) return null;
  const arrivalDay = receiptDay(current?.date);
  const departureDay = receiptDay(next?.date);
  let total = departure - arrival;
  if (arrivalDay !== null && departureDay !== null) total += (departureDay - arrivalDay) * 1440;
  if (total < 0 && (arrivalDay === null || departureDay === null || arrivalDay === departureDay)) total += 1440;
  return total >= 0 ? total : null;
}

export function segmentLayoverLabel(current, next) {
  const total = segmentLayoverMinutes(current, next);
  if (total === null) return '';
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const duration = [hours ? `${hours} ч` : '', minutes ? `${minutes} мин` : '', !hours && !minutes ? '0 мин' : '']
    .filter(Boolean).join(' ');
  return `Ожидание между рейсами: ${duration}`;
}
