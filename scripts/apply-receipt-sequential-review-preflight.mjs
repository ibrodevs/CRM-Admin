import { readFile, writeFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
let source = await readFile(pageUrl, 'utf8');
let changed = false;

const canonical = `                                      }}>{st.action}</button>`;
if (!source.includes(canonical)) {
  const pattern = /[ \t]*\}\}>\{st\.action\}<\/button>/;
  if (!pattern.test(source)) throw new Error('Не найден action-контрол проверки квитанции.');
  source = source.replace(pattern, canonical);
  changed = true;
}

if (changed) await writeFile(pageUrl, source, 'utf8');
console.log(changed ? 'Anchor последовательной проверки нормализован.' : 'Anchor последовательной проверки уже нормализован.');
