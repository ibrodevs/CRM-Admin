import { readFile, writeFile } from 'node:fs/promises';

const fileUrl = new URL('../js/page_services.jsx', import.meta.url);
let source = await readFile(fileUrl, 'utf8');

const replacements = [
  {
    from: `<Input value={form.from} onChange={(e) => setF('from', e.target.value)} />`,
    to: `<Input
          value={form.from}
          onChange={(e) => setF('from', e.target.value)}
          placeholder="Город или вокзал"
          locationAutocomplete
          locationScope="rail"
          data-field-label="Откуда"
        />`,
  },
  {
    from: `<Input value={form.to} onChange={(e) => setF('to', e.target.value)} />`,
    to: `<Input
          value={form.to}
          onChange={(e) => setF('to', e.target.value)}
          placeholder="Город или вокзал"
          locationAutocomplete
          locationScope="rail"
          data-field-label="Куда"
        />`,
  },
];

let changed = false;
for (const replacement of replacements) {
  if (source.includes(replacement.to)) continue;
  if (!source.includes(replacement.from)) {
    throw new Error('Не удалось найти поле ЖД-маршрута для подключения автокомплита.');
  }
  source = source.replace(replacement.from, replacement.to);
  changed = true;
}

if (changed) await writeFile(fileUrl, source, 'utf8');

const ready = source.includes('locationScope="rail"')
  && source.includes('data-field-label="Откуда"')
  && source.includes('data-field-label="Куда"');

if (!ready) throw new Error('Автокомплит ЖД-направлений не был подключён.');
console.log(changed
  ? 'Автокомплит городов и вокзалов подключён к ЖД-поиску.'
  : 'Автокомплит ЖД-поиска уже подключён.');
