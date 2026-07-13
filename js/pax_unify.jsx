// ===== Унификация списка пассажиров (групповая выписка под требования поставщика/АК) =====
// Приводит список пассажиров к шаблону конкретной авиакомпании/поставщика/GDS без ручной
// работы оператора: порядок и состав полей, формат ФИО/дат/пола/гражданства/документов,
// авто-выбор документа под направление, проверка полноты, экспорт в разные форматы.

const PAX_TODAY = new Date(2026, 6, 13); // «сегодня» системы (13.07.2026)

/* ---------- Транслитерация РУС→LAT (ICAO/ГОСТ, упрощённо) ---------- */
const PAX_TR = { а:'A', б:'B', в:'V', г:'G', д:'D', е:'E', ё:'E', ж:'ZH', з:'Z', и:'I', й:'I', к:'K', л:'L', м:'M', н:'N', о:'O', п:'P', р:'R', с:'S', т:'T', у:'U', ф:'F', х:'KH', ц:'TS', ч:'CH', ш:'SH', щ:'SHCH', ъ:'', ы:'Y', ь:'', э:'E', ю:'IU', я:'IA' };
function paxTranslit(s) {
  return String(s || '').split('').map((ch) => {
    const low = ch.toLowerCase();
    const tr = PAX_TR[low];
    if (tr == null) return ch;
    return ch === low ? tr.toLowerCase() : tr.toUpperCase();
  }).join('');
}
function paxNameParts(name) {
  const p = String(name || '').trim().split(/\s+/);
  return { surname: p[0] || '', given: p[1] || '', patronymic: p[2] || '' };
}
function paxTitle(s) { return s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : ''; }

/* Часть ФИО (для колонок «Фамилия»/«Имя») под стиль шаблона */
function paxNamePart(part, style) {
  if (!part) return '';
  switch (style) {
    case 'LAT_SLASH': case 'LAT_SPACE': return paxTranslit(part).toUpperCase();
    case 'LAT_TITLE': return paxTitle(paxTranslit(part));
    default: return part; // CYR — как есть
  }
}
/* ФИО одной строкой */
function fmtPaxName(name, style) {
  const { surname, given } = paxNameParts(name);
  const S = paxTranslit(surname).toUpperCase();
  const G = paxTranslit(given).toUpperCase();
  switch (style) {
    case 'LAT_SLASH': return [S, G].filter(Boolean).join(' / ');   // IVANOV / IVAN
    case 'LAT_SPACE': return [S, G].filter(Boolean).join(' ');     // IVANOV IVAN
    case 'LAT_TITLE': return [paxTitle(paxTranslit(surname)), paxTitle(paxTranslit(given))].filter(Boolean).join(' '); // Ivanov Ivan
    default: return name; // ФИО одной строкой (кириллица)
  }
}

/* ---------- Даты ---------- */
const PAX_MON_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
function paxParseDate(d) {
  const m = String(d || '').match(/(\d{2})\.(\d{2})\.(\d{4})/);
  return m ? { d: m[1], m: m[2], y: m[3] } : null;
}
function fmtPaxDate(d, style) {
  const p = paxParseDate(d);
  if (!p) return d || '';
  switch (style) {
    case 'ISO': return `${p.y}-${p.m}-${p.d}`;                        // 1990-03-14
    case 'EN_MON': return `${p.d} ${PAX_MON_EN[+p.m - 1]} ${p.y}`;    // 14 MAR 1990
    case 'AVIA': return `${p.d}${PAX_MON_EN[+p.m - 1]}${p.y.slice(2)}`; // 14MAR90
    default: return `${p.d}.${p.m}.${p.y}`;                          // 14.03.1990
  }
}

/* ---------- Пол (эвристика по ФИО) + форматы ---------- */
const PAX_FEMALE_NAMES = new Set(['айгерим', 'назгуль', 'айпери', 'айсулуу', 'гульнара', 'нургуль', 'бегимай', 'жылдыз', 'алина', 'мария', 'анна']);
function guessPaxSex(name) {
  const { surname, given } = paxNameParts(name);
  const g = (given || '').toLowerCase();
  if (PAX_FEMALE_NAMES.has(g)) return 'F';
  if (/(ова|ева|ина|ская|ая)$/.test((surname || '').toLowerCase())) return 'F';
  if (/(а|я)$/.test(g)) return 'F';
  return 'M';
}
function fmtPaxSex(sex, style) {
  const s = sex || 'M';
  switch (style) {
    case 'MF': return s === 'F' ? 'F' : 'M';
    case 'WORD': return s === 'F' ? 'FEMALE' : 'MALE';
    default: return s === 'F' ? 'Ж' : 'М';
  }
}

/* ---------- Гражданство ---------- */
const PAX_NAT_MAP = {
  RU: { ISO2: 'RU', ISO3: 'RUS', RU: 'Россия', EN: 'Russian' },
  KG: { ISO2: 'KG', ISO3: 'KGZ', RU: 'Кыргызстан', EN: 'Kyrgyz' },
};
function fmtPaxNat(nat, style) {
  const m = PAX_NAT_MAP[nat] || null;
  return m ? (m[style] || m.ISO3) : '';
}

/* ---------- Шаблоны-пресеты (привязка к АК/поставщику/GDS/корп.клиенту) ---------- */
const PAX_COL_LABELS = {
  surname: 'Фамилия', given: 'Имя', patronymic: 'Отчество', fullname: 'ФИО одной строкой',
  dob: 'Дата рождения', sex: 'Пол', nationality: 'Гражданство',
  docType: 'Тип документа', docNo: 'Номер документа', docExpiry: 'Срок действия', phone: 'Телефон',
};
const PAX_NAME_STYLES = [['CYR', 'Кириллица (как есть)'], ['LAT_SLASH', 'IVANOV / IVAN'], ['LAT_SPACE', 'IVANOV IVAN'], ['LAT_TITLE', 'Ivanov Ivan']];
const PAX_DATE_STYLES = [['RU', '14.03.1990'], ['ISO', '1990-03-14'], ['EN_MON', '14 MAR 1990'], ['AVIA', '14MAR90']];
const PAX_SEX_STYLES = [['RU', 'М / Ж'], ['MF', 'M / F'], ['WORD', 'MALE / FEMALE']];
const PAX_NAT_STYLES = [['ISO3', 'RUS'], ['ISO2', 'RU'], ['RU', 'Россия'], ['EN', 'Russian']];
const PAX_DOC_OPTS = ['Загранпаспорт', 'Паспорт РФ', 'ID Card', 'Свидетельство о рождении', 'Виза'];

const PAX_TEMPLATE_PRESETS = [
  {
    id: 'aeroflot', name: 'Аэрофлот — группы', bind: 'Авиакомпания', bindTo: 'Аэрофлот', lang: 'RU',
    nameStyle: 'CYR', dateStyle: 'RU', sexStyle: 'RU', natStyle: 'RU',
    requiredDoc: 'Загранпаспорт', sort: 'surname', delimiter: ';', encoding: 'UTF-8', file: 'xlsx',
    columns: [
      { key: 'surname', label: 'Фамилия', req: true },
      { key: 'given', label: 'Имя', req: true },
      { key: 'dob', label: 'Дата рождения', req: true },
      { key: 'sex', label: 'Пол', req: true },
      { key: 'docNo', label: 'Номер загранпаспорта', req: true },
    ],
  },
  {
    id: 'turkish', name: 'Turkish Airlines', bind: 'Авиакомпания', bindTo: 'Turkish Airlines', lang: 'EN',
    nameStyle: 'LAT_TITLE', dateStyle: 'EN_MON', sexStyle: 'MF', natStyle: 'ISO3',
    requiredDoc: 'Загранпаспорт', sort: 'surname', delimiter: ',', encoding: 'UTF-8', file: 'xlsx',
    columns: [
      { key: 'surname', label: 'Last Name', req: true },
      { key: 'given', label: 'First Name', req: true },
      { key: 'patronymic', label: 'Middle Name', req: false },
      { key: 'docNo', label: 'Passport Number', req: true },
      { key: 'docExpiry', label: 'Passport Expiry', req: true },
      { key: 'nationality', label: 'Nationality', req: true },
    ],
  },
  {
    id: 's7', name: 'S7 Airlines', bind: 'Авиакомпания', bindTo: 'S7', lang: 'RU',
    nameStyle: 'CYR', dateStyle: 'RU', sexStyle: 'RU', natStyle: 'ISO2',
    requiredDoc: 'Паспорт РФ', sort: 'surname', delimiter: ';', encoding: 'Windows-1251', file: 'csv',
    columns: [
      { key: 'fullname', label: 'ФИО', req: true },
      { key: 'dob', label: 'Дата рождения', req: true },
      { key: 'sex', label: 'Пол', req: true },
      { key: 'docType', label: 'Тип документа', req: true },
      { key: 'docNo', label: 'Номер документа', req: true },
    ],
  },
  {
    id: 'pegasus', name: 'Pegasus', bind: 'Авиакомпания', bindTo: 'Pegasus', lang: 'EN',
    nameStyle: 'LAT_SPACE', dateStyle: 'AVIA', sexStyle: 'WORD', natStyle: 'ISO3',
    requiredDoc: 'Загранпаспорт', sort: 'none', delimiter: ',', encoding: 'UTF-8', file: 'txt',
    columns: [
      { key: 'fullname', label: 'PASSENGER', req: true },
      { key: 'dob', label: 'DOB', req: true },
      { key: 'sex', label: 'GENDER', req: true },
      { key: 'docNo', label: 'DOC', req: true },
      { key: 'docExpiry', label: 'EXP', req: true },
    ],
  },
  {
    id: 'corp-romashka', name: 'Корпоративный клиент ООО «Ромашка»', bind: 'Корпоративный клиент', bindTo: 'ООО «Ромашка»', lang: 'RU',
    nameStyle: 'CYR', dateStyle: 'RU', sexStyle: 'RU', natStyle: 'RU',
    requiredDoc: null, sort: 'surname', delimiter: ';', encoding: 'UTF-8', file: 'xlsx',
    columns: [
      { key: 'fullname', label: 'Сотрудник', req: true },
      { key: 'dob', label: 'Дата рождения', req: false },
      { key: 'docType', label: 'Документ', req: true },
      { key: 'docNo', label: 'Номер', req: true },
      { key: 'phone', label: 'Телефон', req: false },
    ],
  },
];

/* ---------- Подготовка пассажира: пол, гражданство, авто-выбор документа ---------- */
function paxDocsOf(p) {
  const docs = [];
  if (p.docType) docs.push({ type: p.docType, no: p.docNo || '', expiry: p.docExpiry || '' });
  (p.documents || []).forEach((d) => docs.push({ type: d.type || d.docType, no: d.no || d.docNo || '', expiry: d.expiry || d.docExpiry || '' }));
  return docs;
}
function preparePax(list, requiredDoc) {
  return (list || []).map((p) => {
    const _sex = guessPaxSex(p.name);
    const _nat = p.nationality || (p.docType === 'Паспорт РФ' ? 'RU' : (p.docType === 'Свидетельство о рождении' ? '' : 'KG'));
    const docs = paxDocsOf(p);
    const _useDoc = requiredDoc ? (docs.find((d) => d.type === requiredDoc) || null) : (docs[0] || null);
    return { ...p, _sex, _nat, _useDoc, _docs: docs };
  });
}

/* Значение ячейки под колонку шаблона */
function paxCell(p, key, tpl) {
  switch (key) {
    case 'surname': return paxNamePart(paxNameParts(p.name).surname, tpl.nameStyle);
    case 'given': return paxNamePart(paxNameParts(p.name).given, tpl.nameStyle);
    case 'patronymic': return paxNamePart(paxNameParts(p.name).patronymic, tpl.nameStyle);
    case 'fullname': return fmtPaxName(p.name, tpl.nameStyle);
    case 'dob': return fmtPaxDate(p.dob, tpl.dateStyle);
    case 'sex': return fmtPaxSex(p._sex, tpl.sexStyle);
    case 'nationality': return p._nat ? fmtPaxNat(p._nat, tpl.natStyle) : '';
    case 'docType': return (p._useDoc && p._useDoc.type) || '';
    case 'docNo': return (p._useDoc && p._useDoc.no) || '';
    case 'docExpiry': return fmtPaxDate(p._useDoc && p._useDoc.expiry, tpl.dateStyle);
    case 'phone': return p.phone && p.phone !== '—' ? p.phone : '';
    default: return '';
  }
}

/* Проверка полноты данных под шаблон */
function validatePaxRow(p, tpl, requiredDoc) {
  const issues = [];
  const need = new Set(tpl.columns.filter((c) => c.req).map((c) => c.key));
  if (need.has('dob') && !p.dob) issues.push('Не указана дата рождения');
  if (need.has('sex') && !p._sex) issues.push('Не указан пол');
  if (need.has('nationality') && !p._nat) issues.push('Не заполнено гражданство');
  if (requiredDoc && !p._useDoc) issues.push('Нет требуемого документа: ' + requiredDoc);
  if (need.has('docType') && !(p._useDoc && p._useDoc.type)) issues.push('Не указан тип документа');
  if (need.has('docExpiry') && !(p._useDoc && p._useDoc.expiry)) issues.push('Отсутствует срок действия документа');
  const exp = paxParseDate(p._useDoc && p._useDoc.expiry);
  if (exp) { const dt = new Date(+exp.y, +exp.m - 1, +exp.d); if (dt < PAX_TODAY) issues.push('Документ просрочен'); }
  return issues;
}

/* ---------- Экспорт ---------- */
function paxCsvEscape(v, delim) {
  const s = String(v == null ? '' : v);
  return (s.includes(delim) || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function paxXmlEscape(v) { return String(v == null ? '' : v).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c])); }
function paxHtmlTable(header, rows) {
  const th = header.map((h) => `<th style="border:1px solid #999;padding:4px 8px;background:#eef">${paxXmlEscape(h)}</th>`).join('');
  const trs = rows.map((r) => `<tr>${r.map((c) => `<td style="border:1px solid #999;padding:4px 8px">${paxXmlEscape(c)}</td>`).join('')}</tr>`).join('');
  return `<html><head><meta charset="utf-8"></head><body><table border="1" style="border-collapse:collapse"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></body></html>`;
}
function paxDownload(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
// Возвращает true, если файл реально сформирован и скачан; false — если это серверный/API-канал
function paxExport(fmt, tpl, header, rows, baseName) {
  const name = baseName || 'passenger-list';
  const delim = tpl.delimiter || ',';
  if (fmt === 'CSV') {
    const body = [header, ...rows].map((r) => r.map((c) => paxCsvEscape(c, delim)).join(delim)).join('\n');
    paxDownload(name + '.csv', '﻿' + body, 'text/csv;charset=utf-8'); return true;
  }
  if (fmt === 'Текст') {
    const body = [header, ...rows].map((r) => r.join('  ·  ')).join('\n');
    paxDownload(name + '.txt', body, 'text/plain;charset=utf-8'); return true;
  }
  if (fmt === 'JSON') {
    const arr = rows.map((r) => { const o = {}; header.forEach((h, i) => { o[h] = r[i]; }); return o; });
    paxDownload(name + '.json', JSON.stringify(arr, null, 2), 'application/json'); return true;
  }
  if (fmt === 'XML') {
    const body = '<?xml version="1.0" encoding="UTF-8"?>\n<passengers>\n' + rows.map((r) => '  <passenger>\n' +
      header.map((h, i) => `    <field name="${paxXmlEscape(h)}">${paxXmlEscape(r[i])}</field>`).join('\n') + '\n  </passenger>').join('\n') + '\n</passengers>';
    paxDownload(name + '.xml', body, 'application/xml'); return true;
  }
  if (fmt === 'Excel') { paxDownload(name + '.xls', paxHtmlTable(header, rows), 'application/vnd.ms-excel'); return true; }
  if (fmt === 'Word') { paxDownload(name + '.doc', paxHtmlTable(header, rows), 'application/msword'); return true; }
  return false; // PDF / API — серверный канал в этой демо
}

/* ==================================================================
   Редактор шаблона (админ): колонки, форматы, сортировка, файл
   ================================================================== */
function PaxTemplateEditor({ tpl, onClose, onSave }) {
  const toast = useToast();
  const base = tpl || { id: 'custom-' + Date.now(), name: '', bind: 'Поставщик', bindTo: '', lang: 'RU', nameStyle: 'CYR', dateStyle: 'RU', sexStyle: 'RU', natStyle: 'ISO3', requiredDoc: 'Загранпаспорт', sort: 'surname', delimiter: ';', encoding: 'UTF-8', file: 'xlsx', columns: [{ key: 'surname', label: 'Фамилия', req: true }, { key: 'given', label: 'Имя', req: true }] };
  const [f, setF] = useState(() => ({ ...base, columns: base.columns.map((c) => ({ ...c })) }));
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setCol = (i, k, v) => setF((p) => ({ ...p, columns: p.columns.map((c, j) => j === i ? { ...c, [k]: v } : c) }));
  const moveCol = (i, d) => setF((p) => { const cs = [...p.columns]; const j = i + d; if (j < 0 || j >= cs.length) return p; [cs[i], cs[j]] = [cs[j], cs[i]]; return { ...p, columns: cs }; });
  const addCol = () => setF((p) => ({ ...p, columns: [...p.columns, { key: 'dob', label: PAX_COL_LABELS.dob, req: false }] }));
  const delCol = (i) => setF((p) => ({ ...p, columns: p.columns.filter((_, j) => j !== i) }));
  const save = () => {
    if (!f.name.trim()) { toast('Введите название шаблона', 'err'); return; }
    if (!f.columns.length) { toast('Добавьте хотя бы одну колонку', 'err'); return; }
    onSave({ ...f, name: f.name.trim(), preset: true });
    toast('Шаблон «' + f.name.trim() + '» сохранён как пресет', 'ok');
    onClose();
  };
  return (
    <Drawer open onClose={onClose} title={tpl ? 'Редактирование шаблона' : 'Новый шаблон списка'} width="min(760px,96vw)"
      footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button icon="check" onClick={save}>Сохранить пресет</Button></>}>
      <div className="form-grid">
        <Field label="Название шаблона" required><Input placeholder="Напр. «Аэрофлот — группы»" value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Привязка"><Select options={['Авиакомпания', 'Поставщик', 'GDS', 'Корпоративный клиент', 'Заказ']} value={f.bind} onChange={(e) => set('bind', e.target.value)} /></Field>
        <Field label="Кому (название)"><Input placeholder="Напр. «Аэрофлот» / «Amadeus»" value={f.bindTo} onChange={(e) => set('bindTo', e.target.value)} /></Field>
        <Field label="Язык заполнения"><Select options={['RU', 'EN']} value={f.lang} onChange={(e) => set('lang', e.target.value)} /></Field>
        <Field label="Формат ФИО"><Select options={PAX_NAME_STYLES.map((s) => s[1])} value={(PAX_NAME_STYLES.find((s) => s[0] === f.nameStyle) || PAX_NAME_STYLES[0])[1]} onChange={(e) => set('nameStyle', (PAX_NAME_STYLES.find((s) => s[1] === e.target.value) || PAX_NAME_STYLES[0])[0])} /></Field>
        <Field label="Формат даты"><Select options={PAX_DATE_STYLES.map((s) => s[1])} value={(PAX_DATE_STYLES.find((s) => s[0] === f.dateStyle) || PAX_DATE_STYLES[0])[1]} onChange={(e) => set('dateStyle', (PAX_DATE_STYLES.find((s) => s[1] === e.target.value) || PAX_DATE_STYLES[0])[0])} /></Field>
        <Field label="Формат пола"><Select options={PAX_SEX_STYLES.map((s) => s[1])} value={(PAX_SEX_STYLES.find((s) => s[0] === f.sexStyle) || PAX_SEX_STYLES[0])[1]} onChange={(e) => set('sexStyle', (PAX_SEX_STYLES.find((s) => s[1] === e.target.value) || PAX_SEX_STYLES[0])[0])} /></Field>
        <Field label="Формат гражданства"><Select options={PAX_NAT_STYLES.map((s) => s[1])} value={(PAX_NAT_STYLES.find((s) => s[0] === f.natStyle) || PAX_NAT_STYLES[0])[1]} onChange={(e) => set('natStyle', (PAX_NAT_STYLES.find((s) => s[1] === e.target.value) || PAX_NAT_STYLES[0])[0])} /></Field>
        <Field label="Требуемый документ"><Select options={['— любой —', ...PAX_DOC_OPTS]} value={f.requiredDoc || '— любой —'} onChange={(e) => set('requiredDoc', e.target.value === '— любой —' ? null : e.target.value)} /></Field>
        <Field label="Сортировка"><Select options={['По фамилии', 'Без сортировки']} value={f.sort === 'surname' ? 'По фамилии' : 'Без сортировки'} onChange={(e) => set('sort', e.target.value === 'По фамилии' ? 'surname' : 'none')} /></Field>
        <Field label="Разделитель (CSV)"><Select options={[';', ',', 'TAB', '|']} value={f.delimiter === '\t' ? 'TAB' : f.delimiter} onChange={(e) => set('delimiter', e.target.value === 'TAB' ? '\t' : e.target.value)} /></Field>
        <Field label="Кодировка"><Select options={['UTF-8', 'Windows-1251']} value={f.encoding} onChange={(e) => set('encoding', e.target.value)} /></Field>
        <Field label="Формат файла"><Select options={['xlsx', 'csv', 'txt', 'xml', 'json', 'pdf', 'docx']} value={f.file} onChange={(e) => set('file', e.target.value)} /></Field>
      </div>

      <PanelSub>Колонки списка (порядок = порядок в файле)</PanelSub>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {f.columns.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button className="icon-btn btn-sm" style={{ width: 22, height: 18 }} onClick={() => moveCol(i, -1)} title="Выше"><Icon name="chevUp" style={{ width: 14, height: 14 }} /></button>
              <button className="icon-btn btn-sm" style={{ width: 22, height: 18 }} onClick={() => moveCol(i, 1)} title="Ниже"><Icon name="chevDown" style={{ width: 14, height: 14 }} /></button>
            </div>
            <div style={{ width: 190 }}><Select options={Object.keys(PAX_COL_LABELS).map((k) => ({ value: k, label: PAX_COL_LABELS[k] }))} value={c.key} onChange={(e) => setCol(i, 'key', e.target.value)} /></div>
            <Input style={{ flex: 1 }} placeholder="Заголовок колонки" value={c.label} onChange={(e) => setCol(i, 'label', e.target.value)} />
            <label className="hp-check-row" style={{ margin: 0, whiteSpace: 'nowrap' }}><Checkbox on={!!c.req} onChange={() => setCol(i, 'req', !c.req)} /><span className="hp-check-label">обяз.</span></label>
            <button className="icon-btn" onClick={() => delCol(i)} title="Удалить"><Icon name="trash" style={{ width: 16, height: 16 }} /></button>
          </div>
        ))}
      </div>
      <Button variant="secondary" size="sm" icon="plus" style={{ marginTop: 10 }} onClick={addCol}>Добавить колонку</Button>
    </Drawer>
  );
}

/* ==================================================================
   Главная панель унификации
   ================================================================== */
const PAX_ROUTE_OPTS = [
  { key: 'intl', label: 'Международный', doc: 'Загранпаспорт' },
  { key: 'dom', label: 'Внутренний (РФ)', doc: 'Паспорт РФ' },
];
const PAX_EXPORT_FMTS = [['Excel', 'download'], ['CSV', 'docs'], ['PDF', 'docs'], ['Word', 'docs'], ['Текст', 'docs'], ['XML', 'template'], ['JSON', 'template'], ['API', 'api']];

function PaxUnifyPanel({ list, orderNo, autoBind, onClose }) {
  const toast = useToast();
  const [userTpls, setUserTpls] = useState([]);
  const allTpls = [...PAX_TEMPLATE_PRESETS, ...userTpls];
  // авто-подбор шаблона по авиакомпании/поставщику заказа (если передан)
  const autoTpl = autoBind ? allTpls.find((t) => t.bindTo && autoBind.toLowerCase().includes(t.bindTo.toLowerCase())) : null;
  const [tplId, setTplId] = useState((autoTpl || allTpls[0]).id);
  const [routeKey, setRouteKey] = useState('intl');
  const [editorTpl, setEditorTpl] = useState(undefined); // undefined=закрыт, null=новый, obj=редактирование
  const [editorOpen, setEditorOpen] = useState(false);

  const tpl = allTpls.find((t) => t.id === tplId) || allTpls[0];
  const route = PAX_ROUTE_OPTS.find((r) => r.key === routeKey);
  const requiredDoc = tpl.requiredDoc || route.doc; // требование АК приоритетнее направления

  let pax = preparePax(list, requiredDoc);
  if (tpl.sort === 'surname') pax = [...pax].sort((a, b) => paxNameParts(a.name).surname.localeCompare(paxNameParts(b.name).surname, 'ru'));

  const withIssues = pax.map((p) => ({ p, issues: validatePaxRow(p, tpl, requiredDoc) }));
  const problems = withIssues.filter((x) => x.issues.length);
  const readyCount = pax.length - problems.length;

  const header = tpl.columns.map((c) => c.label);
  const rows = pax.map((p) => tpl.columns.map((c) => paxCell(p, c.key, tpl)));

  const doExport = (fmt) => {
    const baseName = 'Список_пассажиров_' + (tpl.bindTo || tpl.name).replace(/[^\wА-Яа-яЁё-]+/g, '_') + (orderNo ? '_заказ_' + orderNo : '');
    const real = paxExport(fmt, tpl, header, rows, baseName);
    if (real) toast('Список выгружен: ' + fmt + ' · шаблон «' + tpl.name + '»', 'ok');
    else if (fmt === 'API') toast('Список передан по API поставщику «' + (tpl.bindTo || tpl.name) + '»', 'ok');
    else toast(fmt + ' формируется на стороне сервера и придёт в «Документы»', 'info');
  };
  const saveTpl = (t) => { setUserTpls((cur) => [...cur.filter((x) => x.id !== t.id), t]); setTplId(t.id); };

  return (
    <StackPanel title="Унификация списка пассажиров" width="min(1180px,97vw)" onClose={onClose}
      footer={<>
        <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="idcard" style={{ width: 14, height: 14 }} />Формат под «{tpl.bindTo || tpl.name}» · {header.length} колонок · {pax.length} пасс.
        </div>
        <div style={{ flex: 1 }} />
        {PAX_EXPORT_FMTS.map(([fmt, ic]) => (
          <Button key={fmt} variant={fmt === 'Excel' ? 'primary' : 'secondary'} size="sm" icon={ic}
            disabled={problems.length > 0 && fmt !== 'Excel' && false}
            onClick={() => doExport(fmt)}>{fmt}</Button>
        ))}
      </>}>

      {/* выбор назначения / шаблона */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 300, flex: 1 }}>
            <div className="label" style={{ marginBottom: 6 }}>Шаблон / назначение</div>
            <Select value={tplId} onChange={(e) => setTplId(e.target.value)}
              options={allTpls.map((t) => ({ value: t.id, label: t.name + ' · ' + t.bind + (t.bindTo ? ' (' + t.bindTo + ')' : '') }))} />
          </div>
          <div style={{ minWidth: 220 }}>
            <div className="label" style={{ marginBottom: 6 }}>Направление (авто-выбор документа)</div>
            <div className="seg-toggle">
              {PAX_ROUTE_OPTS.map((r) => (
                <button key={r.key} type="button" className={'seg-btn' + (routeKey === r.key ? ' active' : '')} onClick={() => setRouteKey(r.key)}>{r.label}</button>
              ))}
            </div>
          </div>
          <Button variant="secondary" icon="edit" onClick={() => { setEditorTpl(tpl.preset ? tpl : null); setEditorOpen(true); }}>Настроить</Button>
          <Button variant="secondary" icon="plus" onClick={() => { setEditorTpl(null); setEditorOpen(true); }}>Новый шаблон</Button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <Pill tone="blue"><Icon name="idcard" style={{ width: 12, height: 12, verticalAlign: -2 }} /> Документ: {requiredDoc}</Pill>
          <Pill tone="gray">Язык: {tpl.lang}</Pill>
          <Pill tone="gray">ФИО: {(PAX_NAME_STYLES.find((s) => s[0] === tpl.nameStyle) || [])[1]}</Pill>
          <Pill tone="gray">Дата: {(PAX_DATE_STYLES.find((s) => s[0] === tpl.dateStyle) || [])[1]}</Pill>
          <Pill tone="gray">Файл: {tpl.file} · {tpl.encoding}</Pill>
          {autoTpl && autoTpl.id === tpl.id && <Pill tone="green"><Icon name="check" style={{ width: 12, height: 12, verticalAlign: -2 }} /> определён автоматически по заказу</Pill>}
        </div>
      </div>

      {/* проверка полноты */}
      <div className="card card-pad" style={{ marginBottom: 16, borderLeft: '4px solid ' + (problems.length ? 'var(--amber)' : 'var(--green)') }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: problems.length ? 12 : 0 }}>
          <Icon name={problems.length ? 'alertCircle' : 'checkCircle'} style={{ width: 20, height: 20, color: problems.length ? 'var(--amber)' : 'var(--green)' }} />
          <div style={{ fontWeight: 700, color: 'var(--ink)' }}>
            {problems.length ? `Проверка: ${problems.length} из ${pax.length} требуют внимания` : `Проверка пройдена — ${pax.length} пасс. готовы к выгрузке`}
          </div>
          <div style={{ flex: 1 }} />
          <Pill tone="green">Готово: {readyCount}</Pill>
          {problems.length > 0 && <Pill tone="amber">С ошибками: {problems.length}</Pill>}
        </div>
        {problems.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {problems.map(({ p, issues }, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: 'var(--ink)', minWidth: 180 }}>{p.name}</span>
                {issues.map((iss, j) => <Pill key={j} tone="amber">{iss}</Pill>)}
              </div>
            ))}
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>После исправления в карточках пассажиров список пересоберётся автоматически. Выгрузка Excel доступна всегда, остальные форматы — после устранения ошибок в бою.</div>
          </div>
        )}
      </div>

      {/* предпросмотр отформатированного списка */}
      <PanelSub style={{ marginTop: 0 }}>Предпросмотр — формат «{tpl.bindTo || tpl.name}»</PanelSub>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th style={{ width: 34 }}>#</th>{tpl.columns.map((c) => <th key={c.key}>{c.label}{c.req && <span style={{ color: 'var(--red)' }}> *</span>}</th>)}<th>Проверка</th></tr></thead>
          <tbody>
            {pax.map((p, i) => {
              const issues = validatePaxRow(p, tpl, requiredDoc);
              return (
                <tr key={i}>
                  <td className="t-muted">{i + 1}</td>
                  {tpl.columns.map((c) => { const v = paxCell(p, c.key, tpl); return <td key={c.key} className={v ? 't-strong' : 't-muted'}>{v || '—'}</td>; })}
                  <td>{issues.length ? <Pill tone="amber">{issues.length} прим.</Pill> : <Pill tone="green">OK</Pill>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editorOpen && <PaxTemplateEditor tpl={editorTpl} onClose={() => setEditorOpen(false)} onSave={saveTpl} />}
    </StackPanel>
  );
}

Object.assign(window, {
  PaxUnifyPanel, PaxTemplateEditor, PAX_TEMPLATE_PRESETS,
  paxTranslit, fmtPaxName, fmtPaxDate, fmtPaxSex, fmtPaxNat, guessPaxSex,
  preparePax, paxCell, validatePaxRow, paxExport,
});
