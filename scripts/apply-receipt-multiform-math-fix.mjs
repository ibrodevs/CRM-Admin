import { readFile, writeFile } from 'node:fs/promises';

const fileUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
let source = await readFile(fileUrl, 'utf8');
let changed = false;

// The current editor has the ticket-level calculation table plus an explicit
// confirmation step.  It is a strict superset of this legacy build patch.
if (source.includes('const pricingRows = doneRows.filter')
  && source.includes('const mathForFile = (file) =>')
  && source.includes('const requestBulkApply = () =>')) {
  console.log('Математика отдельных бланков и подтверждение массового применения уже настроены.');
  process.exit(0);
}

const replaceOnce = (from, to, label) => {
  if (source.includes(to)) return;
  if (!source.includes(from)) throw new Error(`Не найден фрагмент для изменения: ${label}`);
  source = source.replace(from, to);
  changed = true;
};

const replaceInSection = (startMarker, endMarker, from, to, label) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  // On a repeated build the old section marker may already have been replaced.
  // Treat the requested target as proof that this patch is already applied.
  if (start < 0 || end < 0) {
    if (source.includes(to)) return;
    throw new Error(`Не найдена секция: ${label}`);
  }
  const section = source.slice(start, end);
  if (section.includes(to)) return;
  if (!section.includes(from)) throw new Error(`Не найден фрагмент в секции: ${label}`);
  source = source.slice(0, start) + section.replace(from, to) + source.slice(end);
  changed = true;
};

replaceOnce(
`  const getMath = (id, p) => math[id] || { tariff: supplierNet(p), fee: Math.round(Number(p && p.fees) || 0), markup: 0, commission: 0 };
  const setMathFor = (id, p, patch) => setMath((m) => ({ ...m, [id]: { ...getMath(id, p), ...patch } }));
  const clientTotal = (m) => Math.round((Number(m.tariff) || 0) + (Number(m.fee) || 0) + (Number(m.markup) || 0));`,
`  const getMath = (id, p) => math[id] || { tariff: supplierNet(p), fee: Math.round(Number(p && p.fees) || 0), markup: 0, commission: 0 };
  const setMathFor = (id, p, patch) => setMath((m) => ({ ...m, [id]: { ...getMath(id, p), ...patch } }));
  const clientTotal = (m) => Math.round((Number(m.tariff) || 0) + (Number(m.fee) || 0) + (Number(m.markup) || 0));
  const subReceiptMathKey = (fileId, index) => fileId + '::blank::' + index;
  const mathForFile = (file) => {
    if (!file?.subReceipts?.length) return getMath(file.id, file?.parsed);
    return file.subReceipts.reduce((total, receipt, index) => {
      const row = getMath(subReceiptMathKey(file.id, index), receipt);
      return {
        tariff: total.tariff + (Number(row.tariff) || 0),
        fee: total.fee + (Number(row.fee) || 0),
        markup: total.markup + (Number(row.markup) || 0),
        commission: total.commission + (Number(row.commission) || 0),
      };
    }, { tariff: 0, fee: 0, markup: 0, commission: 0 });
  };`,
  'математика отдельных бланков',
);

replaceOnce(
`  const mathFile = files.find((f) => f.id === mathId) || null;`,
`  const mathFile = files.find((f) => f.id === mathId)
    || files.flatMap((file) => (file.subReceipts || []).map((receipt, index) => ({
      ...file,
      id: subReceiptMathKey(file.id, index),
      parsed: receipt,
      name: 'Билет ' + (index + 1) + ' · ' + (receipt.passenger || file.name),
      parentFileId: file.id,
      blankIndex: index,
    }))).find((file) => file.id === mathId)
    || null;`,
  'виртуальный бланк для математики',
);

replaceOnce(
`  const selIds = doneRows.filter((r) => sel[r.f.id]).map((r) => r.f.id);
  const applyBulk = () => {`,
`  const selIds = doneRows.filter((r) => sel[r.f.id]).map((r) => r.f.id);
  const pricingRows = doneRows.filter((row) => !excluded[row.f.id]).flatMap((row) => {
    if (!row.f.subReceipts?.length) return [{ ...row, parsed: row.f.parsed, mathKey: row.f.id, blankIndex: null }];
    return row.f.subReceipts.map((receipt, index) => ({
      ...row,
      parsed: receipt,
      mathKey: subReceiptMathKey(row.f.id, index),
      blankIndex: index,
    }));
  });
  const applyBulk = () => {`,
  'строки расчёта по бланкам',
);

replaceOnce(
`  const applyBulk = () => {
    const targets = (selIds.length ? doneRows.filter((r) => sel[r.f.id]) : doneRows.filter((r) => !excluded[r.f.id] && r.status !== 'Ошибка' && (reviewed[r.f.id] || r.status === 'Распознано')));
    const patch = {};
    if (bulk.fee !== '') patch.fee = Number(bulk.fee) || 0;
    if (bulk.markup !== '') patch.markup = Number(bulk.markup) || 0;
    if (bulk.commission !== '') patch.commission = Number(bulk.commission) || 0;
    if (!Object.keys(patch).length) { toast('Укажите сбор, надбавку или комиссию', 'err'); return; }
    setMath((m) => { const n = { ...m }; targets.forEach((r) => { n[r.f.id] = { ...getMath(r.f.id, r.f.parsed), ...patch }; }); return n; });
    toast('Математика применена к ' + targets.length + ' квитанц. в форме. Нажмите финальное сохранение, чтобы зафиксировать backend-документы.', 'info');
  };`,
`  const applyBulk = () => {
    const targets = (selIds.length ? doneRows.filter((r) => sel[r.f.id]) : doneRows.filter((r) => !excluded[r.f.id] && r.status !== 'Ошибка' && (reviewed[r.f.id] || r.status === 'Распознано')));
    const patch = {};
    if (bulk.fee !== '') patch.fee = Number(bulk.fee) || 0;
    if (bulk.markup !== '') patch.markup = Number(bulk.markup) || 0;
    if (bulk.commission !== '') patch.commission = Number(bulk.commission) || 0;
    if (!Object.keys(patch).length) { toast('Укажите сбор, надбавку или комиссию', 'err'); return; }
    let blankCount = 0;
    setMath((current) => {
      const next = { ...current };
      targets.forEach((row) => {
        const units = row.f.subReceipts?.length
          ? row.f.subReceipts.map((receipt, index) => ({ id: subReceiptMathKey(row.f.id, index), parsed: receipt }))
          : [{ id: row.f.id, parsed: row.f.parsed }];
        units.forEach((unit) => {
          next[unit.id] = { ...getMath(unit.id, unit.parsed), ...patch };
          blankCount += 1;
        });
      });
      return next;
    });
    toast('Математика применена отдельно к ' + blankCount + ' бланк. Нажмите финальное сохранение, чтобы зафиксировать backend-документы.', 'info');
  };`,
  'массовая математика по отдельным бланкам',
);

source = source.replaceAll(
  'const p = r.f.parsed; const m = getMath(r.f.id, p);',
  'const p = r.f.parsed; const m = mathForFile(r.f);',
);
if (source.includes('const p = r.f.parsed; const m = getMath(r.f.id, p);')) {
  throw new Error('Не все агрегатные расчёты заменены');
}

replaceInSection(
  `<tbody>{doneRows.filter((r) => !excluded[r.f.id]).map((r) => {`,
  `})}</tbody>`,
  `<tbody>{doneRows.filter((r) => !excluded[r.f.id]).map((r) => {`,
  `<tbody>{pricingRows.map((r) => {`,
  'таблица клиентской математики',
);
replaceInSection(
  `<tbody>{pricingRows.map((r) => {`,
  `})}</tbody>`,
  `const p = r.f.parsed; const m = mathForFile(r.f); const t = recType(r.f.type);`,
  `const p = r.parsed; const m = getMath(r.mathKey, p); const t = recType(r.f.type);`,
  'данные отдельного бланка',
);
replaceInSection(
  `<tbody>{pricingRows.map((r) => {`,
  `})}</tbody>`,
  `<tr key={r.f.id}>`,
  `<tr key={r.mathKey}>`,
  'ключ отдельного бланка',
);
replaceInSection(
  `<tbody>{pricingRows.map((r) => {`,
  `})}</tbody>`,
  `onClick={() => setMathId(r.f.id)}`,
  `onClick={() => setMathId(r.mathKey)}`,
  'открытие математики отдельного бланка',
);
replaceInSection(
  `<tbody>{pricingRows.map((r) => {`,
  `})}</tbody>`,
  `<b>{p.passenger || r.f.name}</b>`,
  `<b>{p.passenger || r.f.name}{r.blankIndex !== null ? ' · билет ' + (r.blankIndex + 1) : ''}</b>`,
  'название строки отдельного бланка',
);

const required = [
  "const subReceiptMathKey = (fileId, index) => fileId + '::blank::' + index;",
  'const pricingRows = doneRows.filter',
  'mathForFile(r.f)',
  'getMath(r.mathKey, p)',
  'setMathId(r.mathKey)',
  "Математика применена отдельно к",
];
for (const token of required) {
  if (!source.includes(token)) throw new Error(`Не подтверждена отдельная математика ЖД-бланков: ${token}`);
}

if (changed) await writeFile(fileUrl, source, 'utf8');
console.log(changed
  ? 'Стоимость и клиентская математика рассчитываются отдельно для каждого бланка.'
  : 'Отдельная математика бланков уже настроена.');
