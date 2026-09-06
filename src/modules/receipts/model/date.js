const MONTHS = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

function pad2(value) {
  return String(value).padStart(2, '0');
}

export function normalizeReceiptDisplayDate(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  let match = raw.toUpperCase().replace(/\s+/g, '').match(/^(\d{1,2})[-./]?([A-Z]{3})[-./]?(\d{4})$/);
  if (match) {
    const month = MONTHS[match[2]];
    if (month) return `${pad2(match[1])}.${month}.${match[3]}`;
  }

  match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) return `${pad2(match[3])}.${pad2(match[2])}.${match[1]}`;

  match = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (match) return `${pad2(match[1])}.${pad2(match[2])}.${match[3]}`;

  return raw;
}
