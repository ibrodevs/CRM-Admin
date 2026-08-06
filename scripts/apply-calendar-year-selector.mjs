import { readFile, writeFile } from 'node:fs/promises';

const fileUrl = new URL('../js/ui.jsx', import.meta.url);
let source = await readFile(fileUrl, 'utf8');

const oldHeader = `        <span style={{ fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>{CAL_MONTHS[month]}</span>`;
const newHeader = `        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 178 }}>
          <select aria-label="Месяц" value={month} onChange={(e) => setMonth(Number(e.target.value))}
            style={{ border: '1px solid var(--line)', borderRadius: 9, background: '#fff', color: 'var(--ink)', fontWeight: 700, fontSize: 14, padding: '6px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
            {CAL_MONTHS.map((name, index) => <option key={name} value={index}>{name}</option>)}
          </select>
          <select aria-label="Год" value={year} onChange={(e) => setYear(Number(e.target.value))}
            style={{ border: '1px solid var(--line)', borderRadius: 9, background: '#fff', color: 'var(--ink)', fontWeight: 800, fontSize: 14, padding: '6px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
            {Array.from(new Set([...Array.from({ length: 101 }, (_, i) => now.getFullYear() - 80 + i), year]))
              .sort((a, b) => a - b)
              .map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>`;

let changed = false;
if (!source.includes(newHeader)) {
  if (!source.includes(oldHeader)) throw new Error('Не найден заголовок общего календаря');
  source = source.replace(oldHeader, newHeader);
  changed = true;
}

const required = [
  'aria-label="Год"',
  'onChange={(e) => setYear(Number(e.target.value))}',
  'aria-label="Месяц"',
  'now.getFullYear() - 80 + i',
];
for (const token of required) {
  if (!source.includes(token)) throw new Error(`Не подтверждён выбор года в календаре: ${token}`);
}

if (changed) await writeFile(fileUrl, source, 'utf8');
console.log(changed
  ? 'В общий календарь добавлен выбор месяца и года.'
  : 'Выбор года в общем календаре уже настроен.');
