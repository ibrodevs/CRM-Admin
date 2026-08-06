import { readFile, writeFile } from 'node:fs/promises';

const sourceUrl = new URL('./apply-receipt-multiform-editor-fix.mjs', import.meta.url);
const runtimeUrl = new URL('./.apply-receipt-multiform-editor-runtime.mjs', import.meta.url);
let code = await readFile(sourceUrl, 'utf8');

code = code
  .replace(
    '<section key={`${guests.join(\'|\')}-${index}`} className="receipt-hotel-preview-room">',
    '<section key={(guests.join(\'|\') || \'room\') + \'-\' + index} className="receipt-hotel-preview-room">',
  )
  .replace(
    "{guests.join(', ') || `Гость ${index + 1}`}",
    "{guests.join(', ') || ('Гость ' + (index + 1))}",
  );

await writeFile(runtimeUrl, code, 'utf8');
try {
  await import(`${runtimeUrl.href}?run=${Date.now()}`);
} finally {
  await writeFile(runtimeUrl, '// Generated only while applying the receipt editor patch.\n', 'utf8');
}
