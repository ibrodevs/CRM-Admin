import { readFile, writeFile } from 'node:fs/promises';

async function applyReplacements(fileUrl, replacements, required) {
  let source = await readFile(fileUrl, 'utf8');
  let changed = false;

  for (const [from, to] of replacements) {
    if (source.includes(to)) continue;
    if (!source.includes(from)) {
      throw new Error(`Не найден ожидаемый счётчик или параметр: ${from}`);
    }
    source = source.replace(from, to);
    changed = true;
  }

  for (const token of required) {
    if (!source.includes(token)) {
      throw new Error(`Не подтверждена поддержка нулевого значения: ${token}`);
    }
  }

  if (changed) await writeFile(fileUrl, source, 'utf8');
  return changed;
}

const servicesChanged = await applyReplacements(
  new URL('../js/page_services.jsx', import.meta.url),
  [
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
  ],
  [
    'disabled={n <= 0}',
    'Math.max(0, n - 1)',
    'disabled={pax <= 0}',
    'Math.max(0, pax - 1)',
    'disabled={form.pax <= 0}',
    "Math.max(0, form.pax - 1)",
    'guests: form.guests ?? 0',
    'rooms: form.rooms ?? 0',
    'passengers: form.pax ?? 0',
  ],
);

const hotelChanged = await applyReplacements(
  new URL('../js/page_hotel_picker.jsx', import.meta.url),
  [
    [
      "disabled={searchRooms <= 1} onClick={() => setSearchRooms((n) => Math.max(1, n - 1))}",
      "disabled={searchRooms <= 0} onClick={() => setSearchRooms((n) => Math.max(0, n - 1))}",
    ],
    [
      "disabled={searchGuests <= 1} onClick={() => setSearchGuests((n) => Math.max(1, n - 1))}",
      "disabled={searchGuests <= 0} onClick={() => setSearchGuests((n) => Math.max(0, n - 1))}",
    ],
    [
      "const guestsLabel = `${searchRooms} ${searchRooms === 1 ? 'номер' : 'номера'} для ${searchGuests} ${searchGuests === 1 ? 'гостя' : 'гостей'}`;",
      "const guestsLabel = `${searchRooms} ${searchRooms === 0 ? 'номеров' : searchRooms === 1 ? 'номер' : 'номера'} для ${searchGuests} ${searchGuests === 1 ? 'гостя' : 'гостей'}`;",
    ],
  ],
  [
    'disabled={searchRooms <= 0}',
    'setSearchRooms((n) => Math.max(0, n - 1))',
    'disabled={searchGuests <= 0}',
    'setSearchGuests((n) => Math.max(0, n - 1))',
    "searchRooms === 0 ? 'номеров'",
  ],
);

console.log(servicesChanged || hotelChanged
  ? 'Счётчики пассажиров, гостей и номеров теперь уменьшаются до нуля во всех формах.'
  : 'Нулевое минимальное значение счётчиков уже настроено во всех формах.');
