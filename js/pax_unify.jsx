import { useState, useRef } from 'react';
import { Icon } from './icons';
import { ActionMenu, Avatar, Button, Checkbox, Drawer, EmptyState, Field, Input, Modal, ModalHeader, Pill, Select, Toggle, plural, useToast } from './ui';
import { CURRENT_USER } from './data';
import { companyStaffStore } from './data/access-control';
import { nowStamp } from './data/service-cards';
import { UnifiedDocumentDrawer, UnifiedPersonFields, ufBlankPerson, ufFullName, ufValidatePerson } from './forms_unified';
import { PanelSub, StackPanel } from './components/shared-panels';
import { workspaceActionsApi } from './api/resources';






const PAX_TODAY = new Date(2026, 6, 13);


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


function paxNamePart(part, style) {
  if (!part) return '';
  switch (style) {
    case 'LAT_SLASH': case 'LAT_SPACE': return paxTranslit(part).toUpperCase();
    case 'LAT_TITLE': return paxTitle(paxTranslit(part));
    default: return part;
  }
}

function fmtPaxName(name, style) {
  const { surname, given } = paxNameParts(name);
  const S = paxTranslit(surname).toUpperCase();
  const G = paxTranslit(given).toUpperCase();
  switch (style) {
    case 'LAT_SLASH': return [S, G].filter(Boolean).join(' / ');
    case 'LAT_SPACE': return [S, G].filter(Boolean).join(' ');
    case 'LAT_TITLE': return [paxTitle(paxTranslit(surname)), paxTitle(paxTranslit(given))].filter(Boolean).join(' ');
    default: return name;
  }
}


const PAX_MON_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
function paxParseDate(d) {
  const m = String(d || '').match(/(\d{2})\.(\d{2})\.(\d{4})/);
  return m ? { d: m[1], m: m[2], y: m[3] } : null;
}
function fmtPaxDate(d, style) {
  const p = paxParseDate(d);
  if (!p) return d || '';
  switch (style) {
    case 'ISO': return `${p.y}-${p.m}-${p.d}`;
    case 'EN_MON': return `${p.d} ${PAX_MON_EN[+p.m - 1]} ${p.y}`;
    case 'AVIA': return `${p.d}${PAX_MON_EN[+p.m - 1]}${p.y.slice(2)}`;
    default: return `${p.d}.${p.m}.${p.y}`;
  }
}


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


const PAX_NAT_MAP = {
  RU: { ISO2: 'RU', ISO3: 'RUS', RU: 'Россия', EN: 'Russian' },
  KG: { ISO2: 'KG', ISO3: 'KGZ', RU: 'Кыргызстан', EN: 'Kyrgyz' },
};
function fmtPaxNat(nat, style) {
  const m = PAX_NAT_MAP[nat] || null;
  return m ? (m[style] || m.ISO3) : '';
}


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
  return false;
}




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


      <PanelSub>Предпросмотр шаблона</PanelSub>
      <div style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 8px' }}>Колонки идут в том же порядке, что и в файле. Данные показаны на примере двух пассажиров.</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {f.columns.map((c, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--body)', background: 'var(--surface-2)', border: '1px solid var(--field-line)', borderRadius: 8, padding: '4px 9px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', background: 'var(--blue)', color: '#fff', fontSize: 11 }}>{i + 1}</span>
            {c.label || PAX_COL_LABELS[c.key] || c.key}{c.req && <span style={{ color: 'var(--red)' }}>*</span>}
          </span>
        ))}
        {f.columns.length === 0 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Добавьте колонки, чтобы увидеть предпросмотр</span>}
      </div>
      {f.columns.length > 0 && (() => {
        const EXPORT_PASSENGERS = [
          { name: 'Иванов Иван Иванович', dob: '14.05.1988', docType: 'Загранпаспорт', docNo: '75 1234567', docExpiry: '01.05.2030', phone: '+7 900 111-22-33' },
          { name: 'Петрова Мария Сергеевна', dob: '03.11.1992', docType: 'Загранпаспорт', docNo: '75 7654321', docExpiry: '20.08.2029', phone: '+7 900 222-33-44' },
        ];
        const rows = preparePax(EXPORT_PASSENGERS, f.requiredDoc).map((p) => f.columns.map((c) => paxCell(p, c.key, f)));
        return (
          <div className="table-card" style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th style={{ width: 30 }}>#</th>{f.columns.map((c, i) => <th key={i}>{c.label || c.key}</th>)}</tr></thead>
              <tbody>{rows.map((r, ri) => (
                <tr key={ri}><td className="t-muted">{ri + 1}</td>{r.map((v, ci) => <td key={ci} className={v ? 't-strong' : 't-muted'}>{v || '—'}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
        );
      })()}
    </Drawer>
  );
}




const PAX_ROUTE_OPTS = [
  { key: 'intl', label: 'Международный', doc: 'Загранпаспорт' },
  { key: 'dom', label: 'Внутренний (РФ)', doc: 'Паспорт РФ' },
];
const PAX_EXPORT_FMTS = [['Excel', 'download'], ['CSV', 'docs'], ['PDF', 'docs'], ['Word', 'docs'], ['Текст', 'docs'], ['XML', 'template'], ['JSON', 'template'], ['API', 'api']];

function PaxUnifyPanel({ list, orderNo, autoBind, onClose, onApplyRoster }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [incoming, setIncoming] = useState(null);
  const [uploadName, setUploadName] = useState('');
  const [histOpen, setHistOpen] = useState(false);
  const mergeHist = (typeof PAX_MERGE_HISTORY !== 'undefined' && PAX_MERGE_HISTORY[orderNo]) || [];
  const [userTpls, setUserTpls] = useState([]);
  const allTpls = [...PAX_TEMPLATE_PRESETS, ...userTpls];

  const autoTpl = autoBind ? allTpls.find((t) => t.bindTo && autoBind.toLowerCase().includes(t.bindTo.toLowerCase())) : null;
  const [tplId, setTplId] = useState((autoTpl || allTpls[0]).id);
  const [routeKey, setRouteKey] = useState('intl');
  const [editorTpl, setEditorTpl] = useState(undefined);
  const [editorOpen, setEditorOpen] = useState(false);
  const [edits, setEdits] = useState({});
  const [editing, setEditing] = useState(null);
  const [docPreview, setDocPreview] = useState(false);
  const cellVal = (pi, p, c) => { const k = pi + ':' + c.key; return edits[k] != null ? edits[k] : paxCell(p, c.key, tpl); };

  const tpl = allTpls.find((t) => t.id === tplId) || allTpls[0];
  const route = PAX_ROUTE_OPTS.find((r) => r.key === routeKey);
  const requiredDoc = tpl.requiredDoc || route.doc;

  let pax = preparePax(list, requiredDoc);
  if (tpl.sort === 'surname') pax = [...pax].sort((a, b) => paxNameParts(a.name).surname.localeCompare(paxNameParts(b.name).surname, 'ru'));

  const withIssues = pax.map((p) => ({ p, issues: validatePaxRow(p, tpl, requiredDoc) }));
  const problems = withIssues.filter((x) => x.issues.length);
  const readyCount = pax.length - problems.length;

  const header = tpl.columns.map((c) => c.label);
  const rows = pax.map((p, pi) => tpl.columns.map((c) => cellVal(pi, p, c)));

  const doExport = async (fmt) => {
    const baseName = 'Список_пассажиров_' + (tpl.bindTo || tpl.name).replace(/[^\wА-Яа-яЁё-]+/g, '_') + (orderNo ? '_заказ_' + orderNo : '');
    const real = paxExport(fmt, tpl, header, rows, baseName);
    if (real) toast('Список выгружен: ' + fmt + ' · шаблон «' + tpl.name + '»', 'ok');
    else if (fmt === 'API') {
      try {
        await workspaceActionsApi.execute('passengers.roster.export_manual', { resourceType: 'order', resourceId: String(orderNo || ''), payload: { supplier: tpl.bindTo || tpl.name, format: fmt, rows } });
        toast('Создана ручная задача передачи списка поставщику «' + (tpl.bindTo || tpl.name) + '»', 'ok');
      } catch (error) { toast(error.message || 'Не удалось создать задачу передачи списка', 'err'); }
    }
    else toast(fmt + ' формируется на стороне сервера и придёт в «Документы»', 'info');
  };
  const saveTpl = (t) => { setUserTpls((cur) => [...cur.filter((x) => x.id !== t.id), t]); setTplId(t.id); };


  const pickFile = () => fileRef.current && fileRef.current.click();
  const onFile = (e) => { const f = e.target.files && e.target.files[0]; if (e.target) e.target.value = ''; if (!f) return; setUploadName(f.name); setIncoming(simulateIncomingList(list)); };
  const applyMerge = async (newRoster, summary) => {
    try {
      if (onApplyRoster) await onApplyRoster(newRoster);
    } catch (error) {
      toast(error.message || 'Не удалось сохранить список', 'err');
      return;
    }
    const store = (typeof PAX_MERGE_HISTORY !== 'undefined') ? PAX_MERGE_HISTORY : {};
    (store[orderNo] || (store[orderNo] = [])).unshift({ at: paxStamp(), user: (typeof CURRENT_USER !== 'undefined' && CURRENT_USER.name) || 'Оператор', ...summary });
    setIncoming(null);
    toast('Список сохранён: +' + summary.added + ' новых · ' + summary.changed + ' изменений' + (summary.errors ? ' · ' + summary.errors + ' с ошибками пропущено' : ''), 'ok');
  };
  const recon = incoming ? reconcilePax(list, incoming) : null;

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


      <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span className="oc-svc-ic" style={{ background: 'var(--blue)', width: 40, height: 40 }}><Icon name="download" style={{ width: 18, height: 18 }} /></span>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Дозагрузка обновлённого списка</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>Excel, Word, CSV или скан. Система сверит по <b>Имя + Отчество + Дата рождения</b> и покажет: новые · было → стало · без изменений · ошибки. Изменения сохраняются после подтверждения.</div>
        </div>
        {mergeHist.length > 0 && <Button variant="ghost" size="sm" icon="clock" onClick={() => setHistOpen(true)}>История ({mergeHist.length})</Button>}
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.doc,.docx,.pdf,image/*" style={{ display: 'none' }} onChange={onFile} />
        <Button icon="plus" onClick={pickFile}>Загрузить файл</Button>
      </div>


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


      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap', margin: '4px 0 8px' }}>
        <PanelSub style={{ marginTop: 0, marginBottom: 0, flex: 1 }}>Предпросмотр — формат «{tpl.bindTo || tpl.name}»</PanelSub>
        {Object.keys(edits).length > 0 && <Button variant="ghost" size="sm" icon="refund" onClick={() => setEdits({})}>Сбросить правки ({Object.keys(edits).length})</Button>}
        <Button variant="secondary" size="sm" icon="eye" onClick={() => setDocPreview(true)}>Предпросмотр документа</Button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 8px' }}>Нажмите на ячейку, чтобы внести корректировку перед выгрузкой — правки применятся к документу.</div>
      <div className="table-card" style={{ overflowX: 'auto' }}>
        <table className="tbl">
          <thead><tr><th style={{ width: 34 }}>#</th>{tpl.columns.map((c) => <th key={c.key}>{c.label}{c.req && <span style={{ color: 'var(--red)' }}> *</span>}</th>)}<th>Проверка</th></tr></thead>
          <tbody>
            {pax.map((p, i) => {
              const issues = validatePaxRow(p, tpl, requiredDoc);
              return (
                <tr key={i}>
                  <td className="t-muted">{i + 1}</td>
                  {tpl.columns.map((c) => {
                    const key = i + ':' + c.key;
                    const v = cellVal(i, p, c);
                    const isEdited = edits[key] != null;
                    if (editing === key) {
                      return (
                        <td key={c.key} style={{ padding: 4 }}>
                          <input className="input" autoFocus defaultValue={v} style={{ height: 32, fontSize: 13 }}
                            onBlur={(e) => { setEdits((m) => ({ ...m, [key]: e.target.value })); setEditing(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { setEdits((m) => ({ ...m, [key]: e.target.value })); setEditing(null); } if (e.key === 'Escape') setEditing(null); }} />
                        </td>
                      );
                    }
                    return (
                      <td key={c.key} className={v ? 't-strong' : 't-muted'} title="Нажмите, чтобы изменить"
                        onClick={() => setEditing(key)}
                        style={{ cursor: 'text', background: isEdited ? 'var(--amber-bg)' : undefined, position: 'relative' }}>
                        {v || '—'}{isEdited && <Icon name="edit" style={{ width: 11, height: 11, color: 'var(--amber)', marginLeft: 6, verticalAlign: -1 }} />}
                      </td>
                    );
                  })}
                  <td>{issues.length ? <Pill tone="amber">{issues.length} прим.</Pill> : <Pill tone="green">OK</Pill>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>


      {docPreview && (
        <Modal open onClose={() => setDocPreview(false)} className="pax-modal-xwide" ariaLabel="Предпросмотр документа">
          <div style={{ width: '100%' }}>
            <ModalHeader title="Предпросмотр документа" sub={'Формат «' + (tpl.bindTo || tpl.name) + '» · ' + tpl.file.toUpperCase() + ' · ' + tpl.encoding} onClose={() => setDocPreview(false)} />
            <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 24, maxHeight: '62vh', overflow: 'auto' }}>
              <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: 24, boxShadow: 'var(--shadow-card)' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 2 }}>Список пассажиров{orderNo ? ' · заказ №' + orderNo : ''}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>Назначение: {tpl.bindTo || tpl.name} · документ: {requiredDoc} · {pax.length} пасс.</div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="tbl" style={{ fontSize: 13 }}>
                    <thead><tr><th style={{ width: 30 }}>#</th>{header.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
                    <tbody>{rows.map((r, ri) => (
                      <tr key={ri}><td className="t-muted">{ri + 1}</td>{r.map((v, ci) => <td key={ci} className={v ? 't-strong' : 't-muted'}>{v || '—'}</td>)}</tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 0 2px' }}>
              <Button variant="secondary" onClick={() => setDocPreview(false)}>Закрыть</Button>
              <Button icon="download" onClick={() => { setDocPreview(false); doExport('Excel'); }}>Выгрузить Excel</Button>
            </div>
          </div>
        </Modal>
      )}

      {editorOpen && <PaxTemplateEditor tpl={editorTpl} onClose={() => setEditorOpen(false)} onSave={saveTpl} />}


      {recon && <PaxReconcileModal fileName={uploadName} current={list} res={recon}
        onCancel={() => setIncoming(null)} onConfirm={applyMerge} />}


      {histOpen && (
        <Drawer open onClose={() => setHistOpen(false)} title="История дозагрузок списка"
          sub={mergeHist.length + ' ' + plural(mergeHist.length, ['загрузка', 'загрузки', 'загрузок']) + (orderNo ? ' · заказ № ' + orderNo : '')}
          width="min(560px,94vw)"
          footer={<Button variant="secondary" onClick={() => setHistOpen(false)}>Закрыть</Button>}>
          {mergeHist.length === 0 ? <EmptyState icon="clock" title="Загрузок пока не было" sub="Здесь появятся дозагрузки обновлённого списка с итогами сверки" /> : (
            <div className="pxh-list">
              {mergeHist.map((h, i) => (
                <div key={i} className="pxh-item">
                  <span className="pxh-ic"><Icon name="download" style={{ width: 16, height: 16 }} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.fileName || 'Файл'}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{h.at} · {h.user}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>
                      <Pill tone="blue">+{h.added} новых</Pill>
                      <Pill tone="amber">{h.changed} изменений</Pill>
                      <Pill tone="green">{h.unchanged} без изменений</Pill>
                      {h.errors > 0 && <Pill tone="red">{h.errors} с ошибками</Pill>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Drawer>
      )}
    </StackPanel>
  );
}







function paxNorm(s) { return String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' '); }

function paxSamePerson(a, b) {
  const na = paxNameParts(a.name), nb = paxNameParts(b.name);
  if (paxNorm(na.given) !== paxNorm(nb.given)) return false;
  if (paxNorm(na.patronymic) !== paxNorm(nb.patronymic)) return false;
  if (a.dob && b.dob && paxNorm(a.dob) !== paxNorm(b.dob)) return false;
  return true;
}

const PAX_DIFF_FIELDS = [
  ['surname', 'Фамилия', (p) => paxNameParts(p.name).surname],
  ['dob', 'Дата рождения', (p) => p.dob || ''],
  ['role', 'Тип', (p) => p.role || ''],
  ['docType', 'Тип документа', (p) => p.docType || ''],
  ['docNo', 'Номер документа', (p) => p.docNo || ''],
  ['docExpiry', 'Срок действия', (p) => p.docExpiry || ''],
  ['phone', 'Телефон', (p) => p.phone || ''],
];

function reconcilePax(current, incoming) {
  const res = { news: [], changes: [], unchanged: [], errors: [] };
  const seen = [];
  incoming.forEach((inc) => {
    const parts = paxNameParts(inc.name);
    if (!parts.given) { res.errors.push({ inc, reason: 'Не распознаны имя/отчество — нечем сверить' }); return; }
    if (seen.some((s) => paxSamePerson(s, inc))) { res.errors.push({ inc, reason: 'Дубликат внутри загруженного списка' }); return; }
    seen.push(inc);
    const match = current.find((c) => paxSamePerson(c, inc));
    if (!match) {

      const clash = current.find((c) => { const nc = paxNameParts(c.name); return paxNorm(nc.given) === paxNorm(parts.given) && paxNorm(nc.patronymic) === paxNorm(parts.patronymic) && c.dob && inc.dob && paxNorm(c.dob) !== paxNorm(inc.dob); });
      if (clash) res.errors.push({ inc, reason: 'Совпадает имя и отчество, но другая дата рождения — проверьте, не однофамилец ли' });
      else res.news.push({ inc });
      return;
    }

    const diffs = PAX_DIFF_FIELDS.map(([field, label, get]) => {
      const was = get(match), now = get(inc);
      return (now && paxNorm(was) !== paxNorm(now)) ? { field, label, was: was || '—', now } : null;
    }).filter(Boolean);
    if (diffs.length) res.changes.push({ match, inc, diffs });
    else res.unchanged.push({ match });
  });
  return res;
}

function applyPaxMerge(current, res, accChanges, accNews) {
  const out = current.map((p) => ({ ...p }));
  res.changes.forEach((ch, i) => {
    if (!accChanges[i]) return;
    const p = out.find((x) => paxSamePerson(x, ch.inc));
    if (!p) return;
    ch.diffs.forEach((d) => {
      if (d.field === 'surname') { const np = paxNameParts(p.name); p.name = [d.now, np.given, np.patronymic].filter(Boolean).join(' '); }
      else p[d.field] = d.now;
      if (d.field === 'docNo' || d.field === 'docType' || d.field === 'docExpiry') p.docStatus = 'ok';
    });
  });
  res.news.forEach((n, i) => { if (accNews[i]) out.push({ ...n.inc, docStatus: n.inc.docStatus || 'ok' }); });
  return out;
}

function paxMergeAppend(current, add) {
  const out = current.slice(); let added = 0, dup = 0;
  add.forEach((m) => { if (out.some((p) => paxSamePerson(p, m))) dup++; else { out.push({ ...m }); added++; } });
  return { list: out, added, dup };
}

function paxSynthDob(name) { let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0; const d = (h % 28) + 1, m = (Math.floor(h / 28) % 12) + 1, y = 1980 + (Math.floor(h / 336) % 21); return String(d).padStart(2, '0') + '.' + String(m).padStart(2, '0') + '.' + y; }


function simulateIncomingList(current) {
  const inc = current.map((p) => ({ ...p }));
  const femIdx = inc.findIndex((p) => guessPaxSex(p.name) === 'F');
  const ci = femIdx >= 0 ? femIdx : 0;
  if (inc[ci]) { const np = paxNameParts(inc[ci].name); inc[ci] = { ...inc[ci], name: ['Асанова', np.given, np.patronymic].filter(Boolean).join(' '), dob: inc[ci].dob || paxSynthDob(inc[ci].name), docType: 'Загранпаспорт', docNo: 'AC7788990', docExpiry: '12.05.2034' }; }
  if (inc[1] && inc.indexOf(inc[1]) !== ci) inc[1] = { ...inc[1], docNo: 'AC5566778', docExpiry: '30.06.2035' };
  if (inc[2] && !inc[2].dob) inc[2] = { ...inc[2], dob: paxSynthDob(inc[2].name) };
  inc.push({ name: 'Осмонов Тимур Бакытович', role: 'Взрослый', dob: '19.02.1995', docType: 'Загранпаспорт', docNo: 'AC9012345', docExpiry: '19.02.2033', phone: '+996 700 908 070', docStatus: 'ok' });
  inc.push({ name: 'Осмонова Аружан Тимуровна', role: 'Ребёнок', dob: '05.09.2016', docType: 'Свидетельство о рождении', docNo: 'VII-556677', docExpiry: '05.09.2026', docStatus: 'check' });
  inc.push({ name: 'Бекова Асель', role: 'Взрослый', dob: '', docType: 'Паспорт РФ', docNo: '4500 111222' });
  return inc;
}
function paxStamp() { return (typeof nowStamp === 'function') ? nowStamp() : new Date().toLocaleString('ru-RU'); }

const PAX_MERGE_HISTORY = window.PAX_MERGE_HISTORY || (window.PAX_MERGE_HISTORY = {});


function PaxReconcileModal({ fileName, current, res, onCancel, onConfirm }) {
  const [accChanges, setAccChanges] = useState(() => res.changes.map(() => true));
  const [accNews, setAccNews] = useState(() => res.news.map(() => true));
  const nAcc = accChanges.filter(Boolean).length + accNews.filter(Boolean).length;
  const tgl = (arr, set, i) => set(arr.map((v, j) => j === i ? !v : v));
  const setAll = (set, arr, val) => set(arr.map(() => val));

  const SecHead = ({ tone, icon, title, count, allOn, onToggleAll }) => (
    <div className="pxr-sec-h">
      <Icon name={icon} style={{ width: 17, height: 17, color: 'var(--' + tone + ')' }} />
      <span className="t">{title}</span>
      <Pill tone={tone}>{count}</Pill>
      {onToggleAll && count > 0 && (
        <button type="button" className="pxr-selall" onClick={onToggleAll}>{allOn ? 'Снять все' : 'Выделить все'}</button>
      )}
    </div>
  );
  const confirm = () => onConfirm(applyPaxMerge(current, res, accChanges, accNews), {
    fileName, added: accNews.filter(Boolean).length, changed: accChanges.filter(Boolean).length,
    unchanged: res.unchanged.length, errors: res.errors.length,
  });
  return (
    <Drawer open onClose={onCancel} title="Сверка обновлённого списка"
      sub={'Файл: ' + fileName + ' · сверка по Имя + Отчество + Дата рождения'} width="min(760px,96vw)"
      footer={<>
        <div style={{ marginRight: 'auto', alignSelf: 'center', fontSize: 12.5, color: 'var(--muted)', minWidth: 0 }}>К сохранению: <b style={{ color: 'var(--ink)' }}>{nAcc}</b> из {res.changes.length + res.news.length} · снимите отметку, чтобы пропустить</div>
        <Button variant="secondary" onClick={onCancel}>Отмена</Button>
        <Button icon="check" disabled={nAcc === 0} onClick={confirm}>Подтвердить и сохранить ({nAcc})</Button>
      </>}>
      <div>

          <div className="pxr-sum">
            <div className="pxr-tile blue"><span className="n">{res.news.length}</span><span className="l"><Icon name="plus" style={{ width: 13, height: 13 }} />Новые</span></div>
            <div className="pxr-tile amber"><span className="n">{res.changes.length}</span><span className="l"><Icon name="edit" style={{ width: 13, height: 13 }} />Изменения</span></div>
            <div className="pxr-tile green"><span className="n">{res.unchanged.length}</span><span className="l"><Icon name="checkCircle" style={{ width: 13, height: 13 }} />Без изменений</span></div>
            {res.errors.length > 0 && <div className="pxr-tile red"><span className="n">{res.errors.length}</span><span className="l"><Icon name="alertCircle" style={{ width: 13, height: 13 }} />Ошибки</span></div>}
          </div>

          {res.changes.length > 0 && (
            <div className="pxr-sec">
              <SecHead tone="amber" icon="edit" title="Изменения" count={res.changes.length}
                allOn={accChanges.every(Boolean)} onToggleAll={() => setAll(setAccChanges, accChanges, !accChanges.every(Boolean))} />
              <div className="pxr-list">
                {res.changes.map((ch, i) => (
                  <div key={i} className={'pxr-card amber' + (accChanges[i] ? '' : ' off')} onClick={() => tgl(accChanges, setAccChanges, i)}>
                    <span style={{ paddingTop: 1, display: 'flex' }} onClick={(e) => e.stopPropagation()}><Checkbox on={accChanges[i]} onChange={() => tgl(accChanges, setAccChanges, i)} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="pxr-nm" style={{ marginBottom: 6 }}>{paxNameParts(ch.inc.name).given} {paxNameParts(ch.inc.name).patronymic} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· {ch.inc.dob || ch.match.dob || 'без даты'}</span></div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {ch.diffs.map((d, j) => (
                          <div key={j} className="pxr-diff">
                            <span className="dl">{d.label}</span>
                            <span className="pxr-was">{d.was}</span>
                            <Icon name="arrowRight" style={{ width: 13, height: 13, color: 'var(--muted-2)' }} />
                            <span className="pxr-now">{d.now}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {res.news.length > 0 && (
            <div className="pxr-sec">
              <SecHead tone="blue" icon="plus" title="Новые пассажиры" count={res.news.length}
                allOn={accNews.every(Boolean)} onToggleAll={() => setAll(setAccNews, accNews, !accNews.every(Boolean))} />
              <div className="pxr-list">
                {res.news.map((n, i) => (
                  <div key={i} className={'pxr-card blue' + (accNews[i] ? '' : ' off')} onClick={() => tgl(accNews, setAccNews, i)} style={{ alignItems: 'center' }}>
                    <span style={{ display: 'flex' }} onClick={(e) => e.stopPropagation()}><Checkbox on={accNews[i]} onChange={() => tgl(accNews, setAccNews, i)} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="pxr-nm">{n.inc.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{n.inc.dob || 'без даты'} · {n.inc.role || 'Взрослый'} · {n.inc.docType || 'без документа'} {n.inc.docNo || ''}</div>
                    </div>
                    <Pill tone="blue">добавить</Pill>
                  </div>
                ))}
              </div>
            </div>
          )}

          {res.errors.length > 0 && (
            <div className="pxr-sec">
              <SecHead tone="red" icon="alertCircle" title="Ошибки и спорные данные" count={res.errors.length} />
              <div className="pxr-list">
                {res.errors.map((e, i) => (
                  <div key={i} className="pxr-err">
                    <Icon name="alertCircle" style={{ width: 15, height: 15, color: 'var(--red)', flexShrink: 0, position: 'relative', top: 2 }} />
                    <div><span style={{ fontWeight: 600, color: 'var(--ink)' }}>{e.inc.name || '—'}</span> <span style={{ color: 'var(--red)' }}>— {e.reason}</span></div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Ошибочные и спорные строки не сохраняются — исправьте файл или заведите пассажира вручную.</div>
            </div>
          )}

          {res.unchanged.length > 0 && (
            <div className="pxr-sec" style={{ marginBottom: 4 }}>
              <SecHead tone="green" icon="checkCircle" title="Без изменений" count={res.unchanged.length} />
              <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>{res.unchanged.slice(0, 12).map((u) => u.match.name).join(', ')}{res.unchanged.length > 12 ? ' и ещё ' + (res.unchanged.length - 12) : ''}</div>
            </div>
          )}
      </div>
    </Drawer>
  );
}





const PAX_GROUP_KINDS = ['Спортивная команда', 'Делегация', 'Семья', 'Корпоративная группа', 'Прочее'];

const PAX_GROUPS = window.PAX_GROUPS || (window.PAX_GROUPS = [
  { id: 'grp-u17', name: 'Сборная U-17 (футбол)', kind: 'Спортивная команда',
    subgroups: [{ id: 'sg-players', name: 'Игроки' }, { id: 'sg-staff', name: 'Тренерский штаб' }], members: [
    { name: 'Асанов Данияр Русланович', role: 'Спортсмен', dob: '12.04.2009', docType: 'Загранпаспорт', docNo: 'AN1002003', docExpiry: '12.04.2030', docStatus: 'ok', subgroup: 'sg-players' },
    { name: 'Ибраев Тимур Азаматович', role: 'Спортсмен', dob: '03.07.2009', docType: 'Загранпаспорт', docNo: 'AN1002004', docExpiry: '03.07.2030', docStatus: 'ok', subgroup: 'sg-players' },
    { name: 'Сыдыков Алишер Маратович', role: 'Спортсмен', dob: '21.11.2009', docType: 'Загранпаспорт', docNo: 'AN1002005', docExpiry: '21.11.2030', docStatus: 'ok', subgroup: 'sg-players' },
    { name: 'Токтосунов Эрлан Бекович', role: 'Спортсмен', dob: '08.02.2010', docType: 'Загранпаспорт', docNo: 'AN1002006', docExpiry: '08.02.2031', docStatus: 'check', subgroup: 'sg-players' },
    { name: 'Жапаров Нурбек Асанович', role: 'Спортсмен', dob: '30.05.2009', docType: 'Загранпаспорт', docNo: 'AN1002007', docExpiry: '30.05.2030', docStatus: 'ok', subgroup: 'sg-players' },
    { name: 'Мамбетов Ислам Русланович', role: 'Спортсмен', dob: '17.09.2009', docType: 'Загранпаспорт', docNo: 'AN1002008', docExpiry: '17.09.2030', docStatus: 'ok', subgroup: 'sg-players' },
    { name: 'Осмонов Кайрат Бакытович', role: 'Тренер', dob: '05.06.1982', docType: 'Загранпаспорт', docNo: 'AN2003001', docExpiry: '05.06.2032', phone: '+996 700 111 222', docStatus: 'ok', subgroup: 'sg-staff' },
  ] },
  { id: 'grp-deleg', name: 'Делегация «Иссык-Куль Форум»', kind: 'Делегация',
    subgroups: [{ id: 'sg-lead', name: 'Руководство' }, { id: 'sg-support', name: 'Сопровождение' }], members: [
    { name: 'Абдырахманов Улан Темирович', role: 'Глава делегации', dob: '14.02.1975', docType: 'Загранпаспорт', docNo: 'DN5001001', docExpiry: '14.02.2031', phone: '+996 700 333 444', docStatus: 'ok', subgroup: 'sg-lead' },
    { name: 'Кыдырова Салтанат Жумабековна', role: 'Секретарь', dob: '22.08.1988', docType: 'Загранпаспорт', docNo: 'DN5001002', docExpiry: '22.08.2032', docStatus: 'ok', subgroup: 'sg-lead' },
    { name: 'Ниязов Марат Асанович', role: 'Советник', dob: '09.12.1980', docType: 'Загранпаспорт', docNo: 'DN5001003', docExpiry: '09.12.2030', docStatus: 'ok', subgroup: 'sg-lead' },
    { name: 'Бейшенова Айгуль Каримовна', role: 'Переводчик', dob: '30.03.1990', docType: 'Загранпаспорт', docNo: 'DN5001004', docExpiry: '30.03.2033', docStatus: 'check', subgroup: 'sg-support' },
    { name: 'Джолдошев Тилек Нурланович', role: 'Помощник', dob: '11.07.1993', docType: 'Загранпаспорт', docNo: 'DN5001005', docExpiry: '11.07.2031', docStatus: 'ok', subgroup: 'sg-support' },
  ] },
]);


function GroupNewMemberForm({ subgroups, defaultSub, companyId, companyName, onClose, onAdd }) {
  const toast = useToast();

  const [p, setP] = useState(() => ({ ...ufBlankPerson('person'), role: 'Взрослый' }));
  const [errs, setErrs] = useState({});
  const [subgroup, setSubgroup] = useState(defaultSub || '');
  const [toCompany, setToCompany] = useState(false);
  const [docFor, setDocFor] = useState(false);
  const save = async () => {
    const er = ufValidatePerson(p);
    setErrs(er);
    if (Object.keys(er).length) { toast('Проверьте обязательные поля', 'err'); return; }
    const name = ufFullName(p);
    const docStatus = (p.docNo && p.docExpiry) ? 'ok' : 'check';
    const m = {
      name, role: p.role, dob: p.dob || '', gender: p.gender, citizenship: p.citizenship,
      docType: p.docType, docNo: p.docNo, docExpiry: p.docExpiry,
      phone: p.phone, email: p.email, documents: p.documents || [], subgroup, docStatus,
    };
    try {
      await workspaceActionsApi.execute('passenger.group.member.add', { resourceType: 'company', resourceId: String(companyId || companyName || ''), payload: { member: m, toCompany } });
    } catch (error) { toast(error.message || 'Не удалось сохранить пассажира группы', 'err'); return; }
    onAdd(m);
    if (toCompany && companyId && typeof companyStaffStore === 'function') {
      const store = companyStaffStore(companyId);
      store.employees.push({
        id: 'E-' + Math.floor(1000 + Math.random() * 8999), name, dept: '',
        role: p.role, position: p.position || '', email: p.email || '', phone: p.phone || '',
        dob: p.dob || '—', doc: p.docNo || '—', docType: p.docType, docNo: p.docNo, docExpiry: p.docExpiry,
        docStatus, documents: p.documents || [], inPolicy: p.inPolicy !== false,
      });
      toast('Пассажир добавлен в группу и в сотрудники компании', 'ok');
    } else { toast('Пассажир добавлен в группу', 'ok'); }
    onClose();
  };
  return (
    <>
      <Drawer open onClose={onClose} title="Новый пассажир"
        sub={'Единая карточка · добавляется в группу' + (companyId ? '; при желании — и в сотрудники компании' : '')} width="min(720px,96vw)"
        footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><div style={{ flex: 1 }} /><Button icon="check" onClick={save}>Добавить</Button></>}>
        <UnifiedPersonFields value={p} onChange={setP} errors={errs} showRole showStatus={false}
          showDocuments onManageDocs={() => setDocFor(true)} />
        {subgroups.length > 0 && (
          <>
            <PanelSub>Размещение в группе</PanelSub>
            <div className="form-grid">
              <Field label="Подгруппа">
                <Select options={[{ value: '', label: 'Без подгруппы' }, ...subgroups.map((s) => ({ value: s.id, label: s.name }))]}
                  value={subgroup} onChange={(e) => setSubgroup(e.target.value)} />
              </Field>
            </div>
          </>
        )}
        {companyId && (
          <label className="uf-toggle-row" style={{ marginTop: 16 }}>
            <div style={{ flex: 1 }}>
              <div className="uf-toggle-t">Также добавить в сотрудники компании {companyName}</div>
              <div className="uf-toggle-s">Появится в разделе «Сотрудники» и будет доступен для будущих заказов</div>
            </div>
            <Toggle on={toCompany} onChange={setToCompany} />
          </label>
        )}
      </Drawer>
      <UnifiedDocumentDrawer open={docFor} person={{ name: ufFullName(p), citizenship: p.citizenship }}
        onClose={() => setDocFor(false)}
        onSave={(doc) => { setP((cur) => ({ ...cur, documents: [...(cur.documents || []), doc] })); setDocFor(false); toast('Документ добавлен в форму пассажира', 'info'); }} />
    </>
  );
}


function PaxGroupsDrawer({ current = [], companyId, companyName, onAddGroup, onClose }) {
  const toast = useToast();
  const [, force] = useState(0);
  const rerender = () => force((v) => v + 1);
  const [view, setView] = useState('list');
  const [activeId, setActiveId] = useState(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState(PAX_GROUP_KINDS[0]);
  const [fromOrder, setFromOrder] = useState(current.length > 0);
  const [newSub, setNewSub] = useState('');
  const [addOpen, setAddOpen] = useState(null);
  const [unifyOpen, setUnifyOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);

  const active = PAX_GROUPS.find((g) => g.id === activeId) || null;
  const uid = (p) => p + Math.random().toString(36).slice(2, 7);

  const addToOrder = async (g) => {
    try {
      const r = await onAddGroup(g.members);
      toast('Группа «' + g.name + '» добавлена: +' + r.added + ' пассажиров' + (r.dup ? ' · ' + r.dup + ' уже были в заказе' : ''), 'ok');
      onClose();
    } catch (error) {
      toast(error.message || 'Не удалось добавить группу', 'err');
    }
  };
  const openGroup = (g) => { setActiveId(g.id); setRenaming(false); setView('detail'); };
  const createGroup = async () => {
    if (!name.trim()) { toast('Введите название группы', 'err'); return; }
    const members = fromOrder ? current.map((p) => ({ ...p, subgroup: '' })) : [];
    const g = { id: 'grp-' + Date.now(), name: name.trim(), kind, subgroups: [], members };
    try {
      await workspaceActionsApi.execute('passenger.group.create', { resourceType: 'company', resourceId: String(companyId || companyName || ''), payload: g });
      PAX_GROUPS.push(g);
      toast('Группа «' + g.name + '» создана' + (members.length ? ' · ' + members.length + ' пассажиров' : ' (пустая)'), 'ok');
      setName(''); setFromOrder(current.length > 0); openGroup(g);
    } catch (error) { toast(error.message || 'Не удалось создать группу', 'err'); }
  };

  const removeMember = (idx) => { active.members.splice(idx, 1); rerender(); };
  const moveMember = (idx, sg) => { active.members[idx].subgroup = sg; rerender(); };
  const addExisting = (people) => {
    const have = new Set(active.members.map((m) => m.name));
    let added = 0;
    people.forEach((p) => { if (!have.has(p.name)) { active.members.push({ ...p, subgroup: '' }); added++; } });
    rerender(); toast(added ? ('Добавлено ' + added + ' пассажир(ов)') : 'Все уже в группе', added ? 'ok' : 'info');
  };
  const addSubgroup = () => { if (!newSub.trim()) return; (active.subgroups = active.subgroups || []).push({ id: uid('sg-'), name: newSub.trim() }); setNewSub(''); rerender(); };
  const removeSubgroup = (sgId) => { active.subgroups = (active.subgroups || []).filter((s) => s.id !== sgId); active.members.forEach((m) => { if (m.subgroup === sgId) m.subgroup = ''; }); rerender(); };
  const deleteGroup = () => { const i = PAX_GROUPS.findIndex((g) => g.id === activeId); if (i >= 0) PAX_GROUPS.splice(i, 1); toast('Группа удалена', 'info'); setView('list'); };


  if (view === 'create') return (
    <Drawer open onClose={onClose} title="Новая группа пассажиров" sub="Например «Сборная U-17» или «Делегация»" width="min(520px,96vw)"
      footer={<><Button variant="secondary" onClick={() => setView('list')}>Назад</Button><Button icon="check" onClick={createGroup}>Создать группу</Button></>}>
      <Field label="Название группы" required><Input placeholder="Напр. «Сборная U-17»" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <div style={{ marginTop: 14 }}><Field label="Тип группы"><Select options={PAX_GROUP_KINDS} value={kind} onChange={(e) => setKind(e.target.value)} /></Field></div>
      {current.length > 0 && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, cursor: 'pointer', fontSize: 14 }}>
          <Checkbox on={fromOrder} onChange={() => setFromOrder((v) => !v)} />
          Наполнить из текущих участников заказа ({current.length})
        </label>
      )}
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 14 }}>После создания можно добавлять участников, делить на подгруппы (как отделы) и добавлять группу в любой заказ.</div>
    </Drawer>
  );


  if (view === 'detail' && active) {
    const subs = active.subgroups || [];
    const rowsFor = (pred) => active.members.map((m, idx) => ({ m, idx })).filter(({ m }) => pred(m));
    const sections = [
      ...subs.map((sg) => ({ sg, rows: rowsFor((m) => m.subgroup === sg.id) })),
      { sg: null, rows: rowsFor((m) => !m.subgroup || !subs.some((s) => s.id === m.subgroup)) },
    ].filter((s) => s.sg || s.rows.length);
    const companyEmployees = (companyId && typeof companyStaffStore === 'function') ? companyStaffStore(companyId).employees : [];

    const memberRow = ({ m, idx }) => (
      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, border: '1px solid var(--field-line)', background: '#fff' }}>
        <Avatar name={m.name} size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{[m.role, m.dob].filter(Boolean).join(' · ') || '—'}</div>
        </div>
        <Pill tone={m.docStatus === 'check' ? 'amber' : 'green'}>{m.docStatus === 'check' ? 'проверить' : 'ок'}</Pill>
        <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
          items={[
            ...subs.map((sg) => ({ icon: 'users', label: 'В подгруппу: ' + sg.name, onClick: () => moveMember(idx, sg.id) })),
            { icon: 'users', label: 'Без подгруппы', onClick: () => moveMember(idx, '') },
            { sep: true },
            { icon: 'trash', label: 'Удалить из группы', danger: true, onClick: () => removeMember(idx) },
          ]} />
      </div>
    );

    return (
      <Drawer open onClose={onClose} width="min(600px,96vw)"
        title={active.name} sub={active.kind + ' · ' + active.members.length + ' ' + plural(active.members.length, ['пассажир', 'пассажира', 'пассажиров']) + (subs.length ? ' · ' + subs.length + ' ' + plural(subs.length, ['подгруппа', 'подгруппы', 'подгрупп']) : '')}
        footer={<>
          <Button variant="secondary" onClick={() => setView('list')}>Назад</Button>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" icon="idcard" onClick={() => setUnifyOpen(true)}>Унификация списка</Button>
          {onAddGroup && <Button icon="plus" onClick={() => addToOrder(active)}>В заказ</Button>}
        </>}>

        <div className="card card-pad" style={{ marginBottom: 14, background: 'var(--surface-2)' }}>
          {renaming ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}><Field label="Название"><Input value={active.name} onChange={(e) => { active.name = e.target.value; rerender(); }} /></Field></div>
              <div style={{ width: 190 }}><Field label="Тип"><Select options={PAX_GROUP_KINDS} value={active.kind} onChange={(e) => { active.kind = e.target.value; rerender(); }} /></Field></div>
              <Button size="sm" icon="check" onClick={() => setRenaming(false)}>Готово</Button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: 'var(--ink)' }}>{active.name}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{active.kind}</div></div>
              <Button variant="ghost" size="sm" icon="edit" onClick={() => setRenaming(true)}>Настройки</Button>
              <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
                items={[{ icon: 'trash', label: 'Удалить группу', danger: true, onClick: deleteGroup }]} />
            </div>
          )}
        </div>


        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <Button size="sm" icon="plus" onClick={() => setAddOpen('')}>Новый пассажир</Button>
          {current.length > 0 && <Button variant="secondary" size="sm" icon="users" onClick={() => addExisting(current)}>Из участников заказа ({current.length})</Button>}
          {companyEmployees.length > 0 && (
            <ActionMenu trigger={<Button variant="secondary" size="sm" icon="building">Из сотрудников компании</Button>}
              items={companyEmployees.slice(0, 30).map((e) => ({ icon: 'user', label: e.name, onClick: () => addExisting([e]) }))} />
          )}
        </div>


        {active.members.length === 0
          ? <EmptyState icon="users" title="В группе пока нет пассажиров" sub="Добавьте участников кнопками выше" />
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {sections.map((s) => (
                <div key={s.sg ? s.sg.id : '__rest'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Icon name={s.sg ? 'users' : 'user'} style={{ width: 15, height: 15, color: 'var(--muted)' }} />
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{s.sg ? s.sg.name : 'Без подгруппы'}</span>
                    <Pill tone="gray">{s.rows.length}</Pill>
                    <div style={{ flex: 1 }} />
                    {s.sg && <button type="button" onClick={() => setAddOpen(s.sg.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--blue)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="plus" style={{ width: 12, height: 12 }} />пассажир</button>}
                    {s.sg && <button type="button" title="Удалить подгруппу" onClick={() => removeSubgroup(s.sg.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-2)', padding: 2 }}><Icon name="x" style={{ width: 13, height: 13 }} /></button>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{s.rows.map(memberRow)}</div>
                </div>
              ))}
            </div>}


        <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
          <Input placeholder="Название подгруппы (напр. «Тренерский штаб»)" value={newSub} onChange={(e) => setNewSub(e.target.value)} style={{ flex: 1 }} />
          <Button variant="secondary" size="sm" icon="plus" disabled={!newSub.trim()} onClick={addSubgroup}>Подгруппа</Button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Подгруппы работают как отделы в компании: делите состав на игроков/штаб, руководство/сопровождение и т.д.</div>

        {addOpen !== null && <GroupNewMemberForm subgroups={subs} defaultSub={addOpen} companyId={companyId} companyName={companyName}
          onClose={() => setAddOpen(null)} onAdd={(m) => { active.members.push(m); rerender(); }} />}
        {unifyOpen && <PaxUnifyPanel list={active.members} orderNo={null} onApplyRoster={(newList) => { active.members = newList.map((m, i) => ({ ...m, subgroup: (active.members[i] && active.members[i].subgroup) || '' })); rerender(); }} onClose={() => setUnifyOpen(false)} />}
      </Drawer>
    );
  }


  return (
    <Drawer open onClose={onClose} title="Группы пассажиров" sub="Списки по группам — команды, делегации, с подгруппами" width="min(560px,96vw)"
      footer={<><div style={{ flex: 1 }} /><Button icon="plus" onClick={() => setView('create')}>Новая группа</Button></>}>
      {PAX_GROUPS.length === 0 ? <EmptyState icon="users" title="Групп пока нет" sub="Создайте первую группу пассажиров" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PAX_GROUPS.map((g) => (
            <button key={g.id} type="button" className="card card-pad" onClick={() => openGroup(g)}
              style={{ textAlign: 'left', width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="oc-svc-ic" style={{ background: 'var(--blue)', width: 38, height: 38, flexShrink: 0 }}><Icon name="users" style={{ width: 18, height: 18 }} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                  <Pill tone="gray">{g.kind}</Pill>
                  <span>{g.members.length} {plural(g.members.length, ['пассажир', 'пассажира', 'пассажиров'])}</span>
                  {g.subgroups && g.subgroups.length > 0 && <span>· {g.subgroups.length} {plural(g.subgroups.length, ['подгруппа', 'подгруппы', 'подгрупп'])}</span>}
                </div>
              </div>
              {onAddGroup && <Button size="sm" icon="plus" onClick={(e) => { e.stopPropagation(); addToOrder(g); }}>В заказ</Button>}
              <Icon name="chevRight" style={{ width: 18, height: 18, color: 'var(--muted-2)', flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}
    </Drawer>
  );
}

Object.assign(window, {
  PaxUnifyPanel, PaxTemplateEditor, PAX_TEMPLATE_PRESETS,
  paxSamePerson, reconcilePax, applyPaxMerge, paxMergeAppend, simulateIncomingList, PAX_MERGE_HISTORY,
  PaxReconcileModal, PaxGroupsDrawer, PAX_GROUPS, PAX_GROUP_KINDS,
  paxTranslit, fmtPaxName, fmtPaxDate, fmtPaxSex, fmtPaxNat, guessPaxSex,
  preparePax, paxCell, validatePaxRow, paxExport,
});



export { PAX_TODAY, PAX_TR, paxTranslit, paxNameParts, paxTitle, paxNamePart, fmtPaxName, PAX_MON_EN, paxParseDate, fmtPaxDate, PAX_FEMALE_NAMES, guessPaxSex, fmtPaxSex, PAX_NAT_MAP, fmtPaxNat, PAX_COL_LABELS, PAX_NAME_STYLES, PAX_DATE_STYLES, PAX_SEX_STYLES, PAX_NAT_STYLES, PAX_DOC_OPTS, PAX_TEMPLATE_PRESETS, paxDocsOf, preparePax, paxCell, validatePaxRow, paxCsvEscape, paxXmlEscape, paxHtmlTable, paxDownload, paxExport, PaxTemplateEditor, PAX_ROUTE_OPTS, PAX_EXPORT_FMTS, PaxUnifyPanel, paxNorm, paxSamePerson, PAX_DIFF_FIELDS, reconcilePax, applyPaxMerge, paxMergeAppend, paxSynthDob, simulateIncomingList, paxStamp, PAX_MERGE_HISTORY, PaxReconcileModal, PAX_GROUP_KINDS, PAX_GROUPS, GroupNewMemberForm, PaxGroupsDrawer };
