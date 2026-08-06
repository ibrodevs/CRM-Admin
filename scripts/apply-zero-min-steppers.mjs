import { readFile, writeFile } from 'node:fs/promises';

const fileUrl = new URL('../js/page_services.jsx', import.meta.url);
let source = await readFile(fileUrl, 'utf8');

const replacements = [
  [
    "const n = v == null ? 1 : v;",
    "const n = Math.max(0, Number(v == null ? 1 : v) || 0);",
  ],
  [
    "disabled={n <= 1} onClick={() => set(f.k, n - 1)}",
    "disabled={n <= 0} onClick={() => set(f.k, Math.max(0, n - 1))}",
  ],
  [
    "disabled={pax <= 1} onClick={() => setPax(pax - 1)}",
    "disabled={pax <= 0} onClick={() => setPax(Math.max(0, pax - 1))}",
  ],
  [
    "disabled={form.pax <= 1} onClick={() => setF('pax', form.pax - 1)}",
    "disabled={form.pax <= 0} onClick={() => setF('pax', Math.max(0, form.pax - 1))}",
  ],
  [
    "guests: form.guests || 1, rooms: form.rooms || 1",
    "guests: form.guests ?? 0, rooms: form.rooms ?? 0",
  ],
  [
    "passengers: form.pax || 1, meal_plan: form.board",
    "passengers: form.pax ?? 0, meal_plan: form.board",
  ],
  [
    "passengers: form.pax || 1, class: form.cls",
    "passengers: form.pax ?? 0, class: form.cls",
  ],
];

let changed = false;
for (const [from, to] of replacements) {
  if (source.includes(to)) continue;
  if (!source.includes(from)) {
    throw new Error(`Не найден ожидаемый счётчик или параметр: ${from}`);
  }
  source = source.replace(from, to);
  changed = true;
}

if (changed) await writeFile(fileUrl, source, 'utf8');

const required = [
  'disabled={n <= 0}',
  'Math.max(0, n - 1)',
  'disabled={pax <= 0}',
  'Math.max(0, pax - 1)',
  'disabled={form.pax <= 0}',
  "Math.max(0, form.pax - 1)",
  'guests: form.guests ?? 0',
  'rooms: form.rooms ?? 0',
  'passengers: form.pax ?? 0',
];

for (const token of required) {
  if (!source.includes(token)) throw new Error(`Не подтверждена поддержка нулевого значения: ${token}`);
}

console.log(changed
  ? 'Счётчики пассажиров, гостей и номеров теперь уменьшаются до нуля.'
  : 'Нулевое минимальное значение счётчиков уже настроено.');
