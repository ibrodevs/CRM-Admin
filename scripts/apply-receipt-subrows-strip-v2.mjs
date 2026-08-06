import { readFile, writeFile } from 'node:fs/promises';

const sourceUrl = new URL('./apply-receipt-subrows-strip.mjs', import.meta.url);
const runtimeUrl = new URL('./.apply-receipt-subrows-strip-runtime.mjs', import.meta.url);
let code = await readFile(sourceUrl, 'utf8');

code = code.replace(
  "  'className=\"receipt-subrows-strip-row',",
  "  \"className={'receipt-subrows-strip-row\",",
);

await writeFile(runtimeUrl, code, 'utf8');
try {
  await import(`${runtimeUrl.href}?run=${Date.now()}`);
} finally {
  await writeFile(runtimeUrl, '// Generated only while applying the receipt blank strip patch.\n', 'utf8');
}
