import { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Icon } from './icons';
import { Avatar, Button, Drawer, EmptyState, Field, Input, SearchBox, Select, Toggle, fmtDate, useToast } from './ui';
import { CLIENTS, CLIENT_STATUS, ORDERS } from './data';
import { PanelSub } from './components/shared-panels';
import { crmApi } from './api/resources';
const UF_DOC_TYPES = ['Загранпаспорт', 'Общегражданский паспорт', 'ID-карта', 'Свидетельство о рождении', 'Вид на жительство', 'Виза'];
const UF_CITIZENSHIP = ['Кыргызстан', 'Казахстан', 'Россия', 'Узбекистан', 'Таджикистан', 'Туркменистан', 'Азербайджан', 'Турция', 'Германия', 'Китай', 'ОАЭ', 'Другое'];
const UF_PAX_ROLES = ['Взрослый', 'Ребёнок', 'Младенец'];
const UF_GENDER = ['Мужской', 'Женский'];
const UF_CLIENT_STATUSES = (typeof CLIENT_STATUS !== 'undefined') ? Object.keys(CLIENT_STATUS) : ['Новый', 'Активный', 'VIP', 'Неактивный'];



function ufBlankPerson(kind) {
  return {
    kind: kind || 'person',
    lastName: '', firstName: '', middleName: '',
    dob: '', gender: '', citizenship: 'Кыргызстан',
    role: 'Взрослый',
    docType: 'Загранпаспорт', docNo: '', docExpiry: '',
    phone: '', phone2: '', email: '', city: 'Бишкек',
    status: 'Новый', category: 'Физлицо',
    dept: '', position: '', inPolicy: true,
    comment: '',
    documents: [],
  };
}
function ufSplitName(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  return { lastName: parts[0] || '', firstName: parts[1] || '', middleName: parts.slice(2).join(' ') || '' };
}
function ufFullName(p) {
  if (!p) return '';
  const n = [p.lastName, p.firstName, p.middleName].filter(Boolean).join(' ').trim();
  return n || p.name || '';
}

function ufFromClient(c, kind) {
  if (!c) return ufBlankPerson(kind);
  const nm = ufSplitName(c.name);
  return {
    ...ufBlankPerson(kind || (c.type === 'Организация' ? 'employee' : 'person')),
    ...nm,
    id: c.id,
    dob: c.dob && c.dob !== '—' ? c.dob : '',
    citizenship: c.citizenship || 'Кыргызстан',
    docType: c.docType || 'Загранпаспорт',
    docNo: (c.doc && c.doc !== '—') ? c.doc : (c.docNo || ''),
    phone: c.phone || '', phone2: c.phone2 || '', email: c.email || '',
    city: c.city || 'Бишкек',
    status: c.status || 'Новый',
    category: c.type || 'Физлицо',
    role: c.role || 'Взрослый',
    position: c.position || '', dept: c.dept || '',
    documents: c.documents || [],
    comment: c.comment || '',
  };
}

function ufToClient(p) {
  return {
    id: p.id || ('CL-' + (1061 + Math.floor(Math.random() * 8999))),
    name: ufFullName(p),
    type: p.kind === 'employee' ? 'Сотрудник' : (p.category || 'Физлицо'),
    role: p.role,
    status: p.status,
    phone: p.phone || '—', phone2: p.phone2 || '', email: p.email || '',
    city: p.city || '—',
    doc: p.docNo || '—',
    docType: p.docType, docNo: p.docNo, docExpiry: p.docExpiry,
    citizenship: p.citizenship,
    dob: p.dob || '—',
    position: p.position, dept: p.dept, inPolicy: p.inPolicy,
    documents: p.documents || [],
    comment: p.comment || '',
  };
}

function ufValidatePerson(p) {
  const er = {};
  if (!p.lastName.trim() && !p.firstName.trim()) er.name = 'Укажите фамилию и имя';
  if (p.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email)) er.email = 'Некорректный e-mail';
  if (p.kind === 'employee' && !p.position.trim()) er.position = 'Укажите должность';
  return er;
}




const UF_MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const UF_DAYS = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
function ufParseDate(value) {
  if (!value || value === '—') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const m = String(value).match(/^(\d{2})\.(\d{2})\.(\d{2}|\d{4})$/);
  if (!m) return null;
  const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const dt = new Date(y, Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(dt.getTime()) ? null : dt;
}
function ufDateString(value) {
  const dt = ufParseDate(value);
  if (!dt) return '';
  return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
}
function ufDateIso(value) {
  const dt = ufParseDate(value);
  if (!dt) return '';
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
function ufDateFromIso(value) {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
}


function UFDateField(_uf) {
  const { value, onChange, label, required, error, minYear, maxYear } = _uf;
  const placeholder = _uf.placeholder != null ? _uf.placeholder : 'дд.мм.гггг';
  const props = {};
  const _skip = { value: 1, onChange: 1, label: 1, required: 1, error: 1, placeholder: 1, minYear: 1, maxYear: 1 };
  for (const k in _uf) { if (!_skip[k]) props[k] = _uf[k]; }
  const isBirthDate = /дата рождения/i.test(label || '');
  const currentYear = new Date().getFullYear();
  const minY = minYear || (isBirthDate ? 1900 : currentYear - 5);
  const maxY = maxYear || (isBirthDate ? currentYear : currentYear + 20);
  const parsed = ufParseDate(value);
  const base = parsed || new Date(isBirthDate ? 1990 : currentYear, 0, 1);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [month, setMonth] = useState(base.getMonth());
  const [year, setYear] = useState(Math.min(maxY, Math.max(minY, base.getFullYear())));
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const dt = ufParseDate(value) || base;
    setMonth(dt.getMonth());
    setYear(Math.min(maxY, Math.max(minY, dt.getFullYear())));
  }, [open]);
  useEffect(() => {
    const h = (e) => {
      const portal = document.getElementById('__uf_date_portal__');
      if ((ref.current && ref.current.contains(e.target)) || (portal && portal.contains(e.target))) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const years = useMemo(() => Array.from({ length: maxY - minY + 1 }, (_, i) => maxY - i), [minY, maxY]);
  const cells = useMemo(() => {
    const out = [];
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMo = new Date(year, month + 1, 0).getDate();
    const prevMonDays = new Date(year, month, 0).getDate();
    for (let i = firstDow - 1; i >= 0; i--) {
      const pm = month === 0 ? 11 : month - 1;
      const py = month === 0 ? year - 1 : year;
      out.push({ d: new Date(py, pm, prevMonDays - i), cur: false });
    }
    for (let d = 1; d <= daysInMo; d++) out.push({ d: new Date(year, month, d), cur: true });
    let nxt = 1;
    while (out.length < 42) {
      const nm = month === 11 ? 0 : month + 1;
      const ny = month === 11 ? year + 1 : year;
      out.push({ d: new Date(ny, nm, nxt++), cur: false });
    }
    return out;
  }, [year, month]);
  const openCal = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      const calH = 430, calW = 320, vh = window.innerHeight;
      let top = r.bottom + 6;
      if (top + calH > vh - 8) {
        const above = r.top - calH - 6;
        top = above >= 8 ? above : Math.max(8, vh - calH - 8);
      }
      setPos({ top, left: Math.max(8, Math.min(r.left, window.innerWidth - calW - 8)) });
    }
    setOpen((v) => !v);
  };
  const moveMonth = (delta) => {
    setMonth((m) => {
      const next = m + delta;
      if (next < 0) { setYear((y) => Math.max(minY, y - 1)); return 11; }
      if (next > 11) { setYear((y) => Math.min(maxY, y + 1)); return 0; }
      return next;
    });
  };
  const pick = (dt) => {
    onChange(ufDateString(dt));
    setOpen(false);
  };
  const cal = (
    <div id="__uf_date_portal__" style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: 16, boxShadow: '0 18px 54px rgba(16,23,38,.22)', border: '1px solid var(--line)', width: 318, userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <button type="button" onClick={() => moveMonth(-1)} className="icon-btn" style={{ width: 34, height: 34 }}><Icon name="chevLeft" style={{ width: 18, height: 18 }} /></button>
          <select className="select" value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ flex: 1, height: 36, padding: '0 9px', fontWeight: 700 }}>
            {UF_MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select className="select" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 92, height: 36, padding: '0 9px', fontWeight: 700 }}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button type="button" onClick={() => moveMonth(1)} className="icon-btn" style={{ width: 34, height: 34 }}><Icon name="chevRight" style={{ width: 18, height: 18 }} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
          {UF_DAYS.map((d) => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: 'var(--blue)', padding: '4px 0' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
          {cells.map(({ d, cur }, i) => {
            const active = cur && parsed && d.getFullYear() === parsed.getFullYear() && d.getMonth() === parsed.getMonth() && d.getDate() === parsed.getDate();
            return (
              <button key={i} type="button" onClick={() => cur && pick(d)}
                style={{ height: 38, border: 'none', background: 'transparent', cursor: cur ? 'pointer' : 'default', padding: 2 }}>
                <span style={{ width: 32, height: 32, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? 'var(--blue)' : 'transparent', color: active ? '#fff' : (cur ? 'var(--ink)' : 'var(--faint)'),
                  fontSize: 14, fontWeight: active ? 800 : 500 }}>{d.getDate()}</span>
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => setOpen(false)} style={{ width: '100%', border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, padding: '10px 0 2px', fontFamily: 'inherit' }}>Закрыть</button>
      </div>
    </div>
  );
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <Field label={label} required={required} error={error}>
        <div className={'input' + (error ? ' err' : '')} {...props}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }} onClick={openCal}>
          <Icon name="calendar" style={{ width: 18, height: 18, color: 'var(--muted-2)', flexShrink: 0 }} />
          <span style={{ color: value ? 'var(--ink)' : 'var(--faint)', fontSize: 15, flex: 1 }}>{value || placeholder}</span>
          <Icon name="chevDown" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />
        </div>
      </Field>
      {open && ReactDOM.createPortal(cal, document.body)}
    </div>
  );
}




// ——— Заполнение карточки по документу ————————————————————————————————————
// OCR — равноправная альтернатива ручному вводу, поэтому блок стоит в начале
// анкеты: оператор либо загружает скан и проверяет подставленные поля, либо
// заполняет карточку руками. Backend ничего не сохраняет — только распознаёт.

const UF_INTAKE_DOC_LABELS = {
  foreign_passport: 'Загранпаспорт',
  national_passport: 'Общегражданский паспорт',
  id_card: 'ID-карта',
  birth_certificate: 'Свидетельство о рождении',
  visa: 'Виза',
};

function ufDateFromRecognized(value) {
  const iso = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return iso ? `${iso[3]}.${iso[2]}.${iso[1]}` : '';
}

// Распознанные поля → карточка физлица. Заполняются только пустые поля:
// уже введённое оператором не затирается.
function ufApplyRecognizedFields(person, fields = {}) {
  const next = { ...person };
  const fill = (key, value) => {
    if (!value) return;
    if (String(next[key] || '').trim()) return;
    next[key] = value;
  };
  fill('lastName', fields.surname);
  fill('firstName', fields.given_name);
  fill('middleName', fields.middle_name);
  fill('dob', ufDateFromRecognized(fields.birth_date));
  fill('gender', fields.sex);
  fill('docNo', fields.number);
  fill('docExpiry', ufDateFromRecognized(fields.expiry_date));
  const docLabel = fields.document_label || UF_INTAKE_DOC_LABELS[fields.document_kind];
  if (docLabel && UF_DOC_TYPES.includes(docLabel)) next.docType = docLabel;
  if (fields.citizenship && UF_CITIZENSHIP.includes(fields.citizenship)) next.citizenship = fields.citizenship;
  const documentRow = {
    docType: next.docType,
    citizenship: next.citizenship,
    docNo: fields.number || next.docNo || '',
    docExpiry: ufDateFromRecognized(fields.expiry_date),
    latLast: fields.latin_surname || '',
    latFirst: fields.latin_given_name || '',
    latMiddle: fields.latin_middle_name || '',
    dob: ufDateFromRecognized(fields.birth_date),
    ownerName: [next.lastName, next.firstName, next.middleName].filter(Boolean).join(' '),
    phone: '', phone2: '', comment: '', file: fields.file_name || '',
    recognized: true,
  };
  if (documentRow.docNo) {
    const already = (next.documents || []).some((row) => String(row.docNo || '').replace(/\s+/g, '').toUpperCase()
      === String(documentRow.docNo).replace(/\s+/g, '').toUpperCase());
    if (!already) next.documents = [...(next.documents || []), documentRow];
  }
  return next;
}

const UF_INTAKE_STATUS_TEXT = {
  recognized: 'Документ распознан по машиночитаемой зоне. Проверьте подставленные поля.',
  partial: 'Распознана часть данных — машиночитаемая зона не прочиталась. Проверьте и дополните поля.',
  manual_required: 'Не удалось распознать документ. Заполните карточку вручную или загрузите более чёткий скан.',
};

function UnifiedPersonIntake({ mode, onMode, onApply, disabled }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState('');

  const recognize = async (file) => {
    if (!file) return;
    setBusy(true);
    setFileName(file.name);
    try {
      const recognized = await crmApi.recognizePersonDocument(file);
      setResult(recognized);
      if (recognized.status === 'manual_required') {
        toast('Документ не распознан — заполните карточку вручную', 'warn');
        return;
      }
      onApply(recognized.fields || {}, { ...recognized, file_name: file.name });
      toast(recognized.status === 'recognized' ? 'Документ распознан, поля заполнены' : 'Распознана часть данных — проверьте поля', recognized.status === 'recognized' ? 'ok' : 'info');
    } catch (error) {
      setResult({ status: 'manual_required', fields: {} });
      toast(error.message || 'Не удалось распознать документ', 'err');
    } finally {
      setBusy(false);
    }
  };

  const pick = () => { if (!busy) fileRef.current?.click(); };
  const drop = (event) => {
    event.preventDefault();
    if (disabled) return;
    recognize(event.dataTransfer?.files?.[0]);
  };

  return (
    <section className="uf-intake" aria-label="Способ заполнения карточки">
      <div className="uf-seg uf-intake-seg">
        <button type="button" className={mode === 'ocr' ? 'on' : ''} onClick={() => onMode('ocr')}>
          <Icon name="zap" />Заполнить по документу
        </button>
        <button type="button" className={mode === 'manual' ? 'on' : ''} onClick={() => onMode('manual')}>
          <Icon name="edit" />Заполнить вручную
        </button>
      </div>
      {mode === 'ocr' ? (
        <>
          <div className="uf-drop" onClick={pick} onDragOver={(event) => event.preventDefault()} onDrop={drop}>
            <Icon name={busy ? 'loader' : 'idcard'} style={{ width: 28, height: 28, color: 'var(--muted-2)' }} />
            <div className="uf-drop-t">{busy ? 'Распознаём документ…' : (fileName || 'Перетащите скан паспорта или ID-карты')}</div>
            <div style={{ margin: '10px 0' }}>
              <Button variant="secondary" size="sm" disabled={busy}
                onClick={(event) => { event.stopPropagation(); pick(); }}>Выбрать файл</Button>
            </div>
            <div className="uf-drop-s">JPG, PNG, PDF · до 25 МБ · данные подставятся в анкету ниже</div>
          </div>
          <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,application/pdf"
            onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; recognize(file); }} />
          {result && (
            <div className={'uf-ocr-ok' + (result.status === 'recognized' ? '' : ' is-partial')}>
              <Icon name={result.status === 'recognized' ? 'checkCircle' : 'alertCircle'}
                style={{ width: 18, height: 18, color: result.status === 'recognized' ? 'var(--green)' : 'var(--amber)', flex: '0 0 18px', marginTop: 1 }} />
              <span>
                {UF_INTAKE_STATUS_TEXT[result.status] || UF_INTAKE_STATUS_TEXT.manual_required}
                {result.confidence ? ` Точность распознавания: ${result.confidence}%.` : ''}
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="uf-intake-manual">
          <Icon name="edit" />
          <span>Заполняете карточку сами. Скан документа можно загрузить в любой момент — переключитесь на «Заполнить по документу», данные подставятся в пустые поля.</span>
        </div>
      )}
    </section>
  );
}

function UnifiedPersonFields({ value, onChange, errors = {}, departments = [], showRole = false, showStatus = true, showDocuments = false, onManageDocs, intake = null }) {
  const p = value;
  const set = (k, v) => onChange({ ...p, [k]: v });
  const isEmp = p.kind === 'employee';
  return (
    <>
      {intake}
      <PanelSub style={{ marginTop: 0 }}>Личные данные</PanelSub>
      <div className="form-grid">
        <Field label="Фамилия" required error={errors.name}><Input value={p.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Иванов" error={errors.name} /></Field>
        <Field label="Имя" required><Input value={p.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Иван" /></Field>
        <Field label="Отчество"><Input value={p.middleName} onChange={(e) => set('middleName', e.target.value)} placeholder="Иванович" /></Field>
        <UFDateField label="Дата рождения" value={p.dob || null} onChange={(v) => set('dob', v)} placeholder="дд.мм.гггг" />
        <Field label="Пол"><Select placeholder="Не указан" options={UF_GENDER} value={p.gender} onChange={(e) => set('gender', e.target.value)} /></Field>
        <Field label="Гражданство"><Select options={UF_CITIZENSHIP} value={p.citizenship} onChange={(e) => set('citizenship', e.target.value)} /></Field>
        {showRole && <Field label="Категория в поездке"><Select options={UF_PAX_ROLES} value={p.role} onChange={(e) => set('role', e.target.value)} /></Field>}
      </div>

      {isEmp && (
        <>
          <PanelSub>Место в компании</PanelSub>
          <div className="form-grid">
            <Field label="Подразделение">
              <Select placeholder={departments.length ? 'Выберите подразделение' : '— нет подразделений'}
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
                value={p.dept} onChange={(e) => set('dept', e.target.value)} />
            </Field>
            <Field label="Должность" required error={errors.position}><Input value={p.position} onChange={(e) => set('position', e.target.value)} placeholder="Менеджер по продажам" error={errors.position} /></Field>
          </div>
          <label className="uf-toggle-row">
            <div style={{ flex: 1 }}>
              <div className="uf-toggle-t">Учитывать в тревел-политике</div>
              <div className="uf-toggle-s">Сотрудник подчиняется правилам подбора и лимитам компании</div>
            </div>
            <Toggle on={p.inPolicy} onChange={(v) => set('inPolicy', v)} />
          </label>
        </>
      )}

      <PanelSub>Документ</PanelSub>
      <div className="form-grid">
        <Field label="Тип документа"><Select options={UF_DOC_TYPES} value={p.docType} onChange={(e) => set('docType', e.target.value)} /></Field>
        <Field label="Номер документа"><Input value={p.docNo} onChange={(e) => set('docNo', e.target.value)} placeholder="AC 1234567" leadIcon="idcard" /></Field>
        <UFDateField label="Срок действия" value={p.docExpiry || null} onChange={(v) => set('docExpiry', v)} placeholder="дд.мм.гггг" />
      </div>

      <PanelSub>Контакты</PanelSub>
      <div className="form-grid">
        <Field label="Основной телефон"><Input value={p.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+996 (___) __-__-__" leadIcon="phone" /></Field>
        <Field label="Дополнительный телефон"><Input value={p.phone2} onChange={(e) => set('phone2', e.target.value)} placeholder="+996 (___) __-__-__" leadIcon="phone" /></Field>
        <Field label="E-mail" error={errors.email}><Input value={p.email} onChange={(e) => set('email', e.target.value)} placeholder="mail@example.com" leadIcon="mail" error={errors.email} /></Field>
        <Field label="Город"><Input value={p.city} onChange={(e) => set('city', e.target.value)} placeholder="Бишкек" /></Field>
        {showStatus && !isEmp && <Field label="Статус клиента"><Select options={UF_CLIENT_STATUSES} value={p.status} onChange={(e) => set('status', e.target.value)} /></Field>}
      </div>

      {showDocuments && (
        <>
          <PanelSub>Документы персоны</PanelSub>
          <div className="uf-doclist">
            {(p.documents || []).length === 0 && <div className="uf-doclist-empty">Документов пока нет</div>}
            {(p.documents || []).map((doc, i) => (
              <div key={i} className="uf-doc-row">
                <span className="uf-doc-ic"><Icon name="idcard" /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="uf-doc-t">{doc.docType || 'Документ'} · {doc.docNo || '—'}</div>
                  <div className="uf-doc-s">{doc.citizenship || '—'}{doc.docExpiry ? ' · до ' + doc.docExpiry : ''}</div>
                </div>
                <button type="button" className="btn btn-ghost btn-icon btn-sm" title="Удалить документ"
                  onClick={() => set('documents', p.documents.filter((_, x) => x !== i))}><Icon name="trash" /></button>
              </div>
            ))}
          </div>
          <button type="button" className="oce-add" onClick={onManageDocs}><Icon name="plus" style={{ width: 16, height: 16 }} />Добавить документ</button>
        </>
      )}

      <PanelSub>Дополнительно <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--faint)' }}>(необязательно)</span></PanelSub>
      <textarea className="input" rows={3} placeholder="Комментарий" value={p.comment} onChange={(e) => set('comment', e.target.value)} style={{ resize: 'vertical', width: '100%' }} />
    </>
  );
}






function UnifiedPersonDrawer({ open, kind = 'person', mode = 'create', initial, company, departments = [], showRole = false, title, onClose, onSave }) {
  const toast = useToast();
  const [p, setP] = useState(ufBlankPerson(kind));
  const [errs, setErrs] = useState({});
  const [docFor, setDocFor] = useState(false);
  // Новая карточка по умолчанию предлагает распознавание документа: это
  // альтернатива ручному вводу, а не действие в конце анкеты. При
  // редактировании данные уже есть — там сразу ручной режим.
  const [intakeMode, setIntakeMode] = useState(mode === 'edit' ? 'manual' : 'ocr');
  useEffect(() => {
    if (!open) return;
    const base = initial ? (initial.kind ? { ...ufBlankPerson(kind), ...initial } : ufFromClient(initial, kind)) : ufBlankPerson(kind);
    setP({ ...base, kind });
    setErrs({});
    setIntakeMode(mode === 'edit' || initial ? 'manual' : 'ocr');
  }, [open, kind, initial, mode]);
  if (!open) return null;
  const submit = () => {
    const er = ufValidatePerson(p);
    setErrs(er);
    if (Object.keys(er).length) { toast('Проверьте обязательные поля', 'err'); return; }
    onSave && onSave(p, ufToClient(p));
  };
  const heading = title || (mode === 'edit'
    ? (kind === 'employee' ? 'Редактирование сотрудника' : 'Редактирование клиента')
    : (kind === 'employee' ? 'Новый сотрудник' : 'Новое физическое лицо'));
  const sub = company ? ('Компания: ' + (company.name || company)) : (kind === 'employee' ? 'Сотрудник компании' : 'Единая карточка физического лица');
  return (
    <>
      <Drawer open={open} onClose={onClose} title={heading} sub={sub} width="min(720px,96vw)"
        footer={<>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <div style={{ flex: 1 }} />
          <Button icon="check" onClick={submit}>{mode === 'edit' ? 'Сохранить изменения' : 'Сохранить'}</Button>
        </>}>
        <UnifiedPersonFields value={p} onChange={setP} errors={errs} departments={departments}
          showRole={showRole} showDocuments onManageDocs={() => setDocFor(true)}
          intake={<UnifiedPersonIntake mode={intakeMode} onMode={setIntakeMode}
            onApply={(fields, meta) => {
              setP((current) => ufApplyRecognizedFields(current, { ...fields, file_name: meta?.file_name || '' }));
              setErrs({});
            }} />} />
      </Drawer>
      <UnifiedDocumentDrawer open={docFor} person={{ name: ufFullName(p), citizenship: p.citizenship }}
        onClose={() => setDocFor(false)}
        onSave={(doc) => { setP((cur) => ({ ...cur, documents: [...(cur.documents || []), doc] })); setDocFor(false); toast('Документ добавлен', 'ok'); }} />
    </>
  );
}





function ufBlankDoc(person) {
  const nm = ufSplitName(person && person.name);
  return {
    docType: 'Загранпаспорт', citizenship: (person && person.citizenship) || 'Кыргызстан',
    docNo: '', docExpiry: '',
    latLast: '', latFirst: '', latMiddle: '', dob: '',
    ownerName: (person && person.name) || '', _nm: nm,
    phone: '', phone2: '', comment: '', file: '',
  };
}
function UnifiedDocumentDrawer({ open, person = {}, initial, mode = 'create', onClose, onSave }) {
  const toast = useToast();
  const [mth, setMth] = useState('ocr');
  const [scanned, setScanned] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrNote, setOcrNote] = useState('');
  const fileRef = useRef(null);
  const [d, setD] = useState(ufBlankDoc(person));
  const set = (k, v) => setD((s) => ({ ...s, [k]: v }));
  useEffect(() => {
    if (!open) return;
    setD(initial ? { ...ufBlankDoc(person), ...initial } : ufBlankDoc(person));
    setMth(initial ? 'manual' : 'ocr'); setScanned(!!initial);
    setOcrBusy(false); setOcrNote('');
  }, [open]);
  if (!open) return null;
  // Реальное распознавание: backend читает машиночитаемую зону документа.
  // Транслитерация ФИО владельца остаётся запасным вариантом, если в MRZ
  // латинских имён нет.
  const runOcr = async (file) => {
    if (!file) { fileRef.current?.click(); return; }
    setOcrBusy(true);
    try {
      const recognized = await crmApi.recognizePersonDocument(file);
      const fields = recognized.fields || {};
      const nm = ufSplitName(person.name);
      setScanned(recognized.status !== 'manual_required');
      setOcrNote(UF_INTAKE_STATUS_TEXT[recognized.status] || UF_INTAKE_STATUS_TEXT.manual_required);
      setD((s) => ({
        ...s,
        docType: (fields.document_label && UF_DOC_TYPES.includes(fields.document_label)) ? fields.document_label : s.docType,
        citizenship: (fields.citizenship && UF_CITIZENSHIP.includes(fields.citizenship)) ? fields.citizenship : s.citizenship,
        docNo: fields.number || s.docNo,
        docExpiry: ufDateFromRecognized(fields.expiry_date) || s.docExpiry,
        dob: ufDateFromRecognized(fields.birth_date) || s.dob,
        latLast: fields.latin_surname || s.latLast || translit(nm.lastName),
        latFirst: fields.latin_given_name || s.latFirst || translit(nm.firstName),
        latMiddle: fields.latin_middle_name || s.latMiddle || translit(nm.middleName),
        file: file.name,
      }));
      if (recognized.status === 'manual_required') toast('Документ не распознан — заполните поля вручную', 'warn');
    } catch (error) {
      setOcrNote(UF_INTAKE_STATUS_TEXT.manual_required);
      toast(error.message || 'Не удалось распознать документ', 'err');
    } finally {
      setOcrBusy(false);
    }
  };
  const submit = () => {
    if (!d.docNo.trim()) { toast('Укажите номер документа', 'err'); return; }
    onSave && onSave({ ...d });
  };
  return (
    <Drawer open={open} onClose={onClose} title={mode === 'edit' ? 'Редактирование документа' : 'Добавление документа'}
      sub={person.name ? ('Владелец: ' + person.name) : 'Документ участника'} width="min(680px,96vw)"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <div style={{ flex: 1 }} />
        <Button icon="check" onClick={submit}>{mode === 'edit' ? 'Сохранить документ' : 'Добавить документ'}</Button>
      </>}>
      {person.name && (
        <div className="oce-client" style={{ marginBottom: 18 }}>
          <Avatar name={person.name} size={34} />
          <div style={{ flex: 1 }}><div className="nm">{person.name}</div><div className="mt">Владелец документа</div></div>
        </div>
      )}
      <div className="uf-seg" style={{ marginBottom: 18 }}>
        <button type="button" className={mth === 'ocr' ? 'on' : ''} onClick={() => setMth('ocr')}><Icon name="zap" />Загрузить (OCR)</button>
        <button type="button" className={mth === 'manual' ? 'on' : ''} onClick={() => setMth('manual')}><Icon name="edit" />Вручную</button>
      </div>

      {mth === 'ocr' && (
        <>
          <div onClick={() => !ocrBusy && fileRef.current?.click()} className="uf-drop"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); runOcr(event.dataTransfer?.files?.[0]); }}>
            <Icon name={ocrBusy ? 'loader' : 'idcard'} style={{ width: 28, height: 28, color: 'var(--muted-2)' }} />
            <div className="uf-drop-t">{ocrBusy ? 'Распознаём документ…' : (d.file || 'Перетащите файл или выберите')}</div>
            <div style={{ margin: '10px 0' }}><Button variant="secondary" size="sm" disabled={ocrBusy}
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>Выбрать файл</Button></div>
            <div className="uf-drop-s">JPG, PNG, PDF · до 25 МБ</div>
          </div>
          <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,application/pdf"
            onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; runOcr(file); }} />
          {(scanned || ocrNote) && (
            <div className={'uf-ocr-ok' + (scanned ? '' : ' is-partial')}>
              <Icon name={scanned ? 'checkCircle' : 'alertCircle'} style={{ width: 18, height: 18, color: scanned ? 'var(--green)' : 'var(--amber)', flex: '0 0 18px', marginTop: 1 }} />
              <span>{ocrNote || 'Документ распознан. Проверьте данные ниже и при необходимости отредактируйте.'}</span>
            </div>
          )}
        </>
      )}

      <PanelSub style={{ marginTop: mth === 'ocr' ? 4 : 0 }}>Данные документа</PanelSub>
      <div className="form-grid">
        <Field label="Тип документа"><Select options={UF_DOC_TYPES} value={d.docType} onChange={(e) => set('docType', e.target.value)} /></Field>
        <Field label="Гражданство"><Select options={UF_CITIZENSHIP} value={d.citizenship} onChange={(e) => set('citizenship', e.target.value)} /></Field>
        <Field label="Номер документа" required><Input value={d.docNo} onChange={(e) => set('docNo', e.target.value)} placeholder="AC 1234567" /></Field>
        <UFDateField label="Срок действия" value={d.docExpiry || null} onChange={(v) => set('docExpiry', v)} placeholder="дд.мм.гггг" />
      </div>

      <PanelSub>Данные владельца (латиницей)</PanelSub>
      <div className="form-grid">
        <Field label="Фамилия (лат.)"><Input value={d.latLast} onChange={(e) => set('latLast', e.target.value)} placeholder="IVANOV" /></Field>
        <Field label="Имя (лат.)"><Input value={d.latFirst} onChange={(e) => set('latFirst', e.target.value)} placeholder="IVAN" /></Field>
        <Field label="Отчество (лат.)"><Input value={d.latMiddle} onChange={(e) => set('latMiddle', e.target.value)} placeholder="IVANOVICH" /></Field>
        <UFDateField label="Дата рождения" value={d.dob || null} onChange={(v) => set('dob', v)} placeholder="дд.мм.гггг" />
      </div>

      <PanelSub>Контакты</PanelSub>
      <div className="form-grid">
        <Field label="Основной телефон"><Input value={d.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+996 (___) __-__-__" leadIcon="phone" /></Field>
        <Field label="Дополнительный телефон"><Input value={d.phone2} onChange={(e) => set('phone2', e.target.value)} placeholder="+996 (___) __-__-__" leadIcon="phone" /></Field>
      </div>

      <PanelSub>Комментарий <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--faint)' }}>(необязательно)</span></PanelSub>
      <textarea className="input" rows={3} placeholder="Комментарий к документу" value={d.comment} onChange={(e) => set('comment', e.target.value)} style={{ resize: 'vertical', width: '100%' }} />
    </Drawer>
  );
}










function ufOrderPickRows(query) {
  const q = String(query || '').toLowerCase();
  return (typeof ORDERS !== 'undefined' ? ORDERS : [])
    .filter((o) => `${o.no} ${o.client}`.toLowerCase().includes(q))
    .slice()
    .sort((a, b) => (b.createdOn ? b.createdOn.getTime() : 0) - (a.createdOn ? a.createdOn.getTime() : 0))
    .slice(0, 20);
}
const UF_PICK_ROW_STYLE = { cursor: 'pointer', width: '100%', textAlign: 'left', border: '1px solid var(--line)', background: '#fff', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 };

function UfOrderRow({ order, icon = 'briefcase', tone = 'var(--blue)', onClick }) {
  return (
    <button type="button" className="oce-client" style={UF_PICK_ROW_STYLE} onClick={onClick}>
      <span className="oc-svc-ic" style={{ background: tone, width: 34, height: 34 }}><Icon name={icon} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="nm" style={{ fontWeight: 600 }}>Заказ № {order.no}</div>
        <div className="mt" style={{ fontSize: 12, color: 'var(--muted)' }}>{order.client}{order.requestType ? ' · ' + order.requestType : ''}</div>
      </div>
      {order.createdOn && <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="calendar" style={{ width: 13, height: 13 }} />{fmtDate(order.createdOn)}</div>}
      <Icon name="chevRight" style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />
    </button>
  );
}

function UfPersonRow({ name, hint, onClick }) {
  return (
    <button type="button" style={UF_PICK_ROW_STYLE} onClick={onClick}>
      <Avatar name={name} size={34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{name}</div>
        {hint && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{hint}</div>}
      </div>
      <Icon name="chevRight" style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />
    </button>
  );
}

const UF_BIND_MODE_LABEL = { new: 'Новый заказ', order: 'Существующий заказ', company: 'Юр. лицо', person: 'Физ. лицо' };

function ufBindLabel(t) {
  if (!t || t.mode === 'new') return 'Новый заказ';
  if (t.mode === 'order') return t.order ? ('Заказ № ' + t.order.no) : 'Существующий заказ';
  if (t.mode === 'company') return t.company?.name || t.company?.shortName || t.label || 'Юридическое лицо';
  if (t.mode === 'person') return t.client || 'Физ. лицо';
  return 'Новый заказ';
}

function UnifiedBindPicker({ open, title = 'Куда привязать', sub, modes = ['new', 'order', 'company', 'person'], orderOptions, clientOptions, companyOptions, onClose, onPick }) {
  const [tab, setTab] = useState(modes[0] || 'new');
  const [q, setQ] = useState('');
  useEffect(() => { if (open) { setTab(modes[0] || 'new'); setQ(''); } }, [open]);
  if (!open) return null;
  const ql = q.toLowerCase();
  const orders = Array.isArray(orderOptions)
    ? orderOptions.filter((order) => `${order.no} ${order.client || ''}`.toLowerCase().includes(ql))
    : ufOrderPickRows(q);
  const clients = (Array.isArray(clientOptions) ? clientOptions.map((client) => typeof client === 'string' ? client : client.name) : (typeof CLIENTS !== 'undefined' ? CLIENTS : []))
    .filter((c) => c.toLowerCase().includes(ql));
  const companies = (Array.isArray(companyOptions) ? companyOptions : [])
    .filter((company) => `${company.name || ''} ${company.shortName || ''} ${company.fullName || ''} ${company.inn || company.tax_id || ''}`.toLowerCase().includes(ql));
  return (
    <Drawer open={open} onClose={onClose} title={title} sub={sub}
      footer={<Button variant="secondary" style={{ width: '100%' }} onClick={onClose}>Отмена</Button>}>
      {modes.length > 1 && (
        <div className="seg-toggle" style={{ marginBottom: 14 }}>
          {modes.map((m) => (
            <button key={m} type="button" className={'seg-btn' + (tab === m ? ' active' : '')} onClick={() => { setTab(m); setQ(''); }}>{UF_BIND_MODE_LABEL[m]}</button>
          ))}
        </div>
      )}

      {tab === 'new' && (
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          <span className="oc-svc-ic" style={{ background: 'var(--blue)', width: 44, height: 44, borderRadius: 12, margin: '0 auto 10px' }}><Icon name="plus" style={{ width: 20, height: 20 }} /></span>
          <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>Создать новый заказ</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>Будет создан новый заказ, к которому привяжется подобранное.</div>
          <Button icon="check" style={{ width: '100%' }} onClick={() => onPick({ mode: 'new', label: 'Новый заказ' })}>Выбрать: новый заказ</Button>
        </div>
      )}

      {tab === 'order' && (
        <>
          <SearchBox value={q} onChange={setQ} placeholder="Поиск: № заказа или клиент" style={{ width: '100%', marginBottom: 12 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orders.map((o) => (
              <UfOrderRow key={o.id || o.no} order={o} onClick={() => onPick({ mode: 'order', order: o, label: 'Заказ № ' + o.no })} />
            ))}
            {!orders.length && <EmptyState icon="briefcase" title="Заказы не найдены" />}
          </div>
        </>
      )}

      {tab === 'person' && (
        <>
          <SearchBox value={q} onChange={setQ} placeholder="Поиск клиента" style={{ width: '100%', marginBottom: 12 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {clients.map((c) => (
              <UfPersonRow key={c} name={c} onClick={() => onPick({ mode: 'person', client: c, label: c })} />
            ))}
            {!clients.length && <EmptyState icon="user" title="Клиенты не найдены" />}
          </div>
        </>
      )}

      {tab === 'company' && (
        <>
          <SearchBox value={q} onChange={setQ} placeholder="Поиск по названию или ИНН" style={{ width: '100%', marginBottom: 12 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {companies.map((company) => {
              const name = company.name || company.shortName || company.fullName || company.legal_name || 'Юридическое лицо';
              const inn = company.inn || company.tax_id || '—';
              return (
                <button key={company.id || name} type="button" style={UF_PICK_ROW_STYLE}
                  onClick={() => onPick({ mode: 'company', company, label: name })}>
                  <span className="oc-svc-ic" style={{ background: 'var(--blue)', width: 34, height: 34, borderRadius: 10 }}><Icon name="building" style={{ width: 17, height: 17 }} /></span>
                  <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}><b style={{ display: 'block', color: 'var(--ink)' }}>{name}</b><small style={{ color: 'var(--muted)' }}>ИНН {inn}</small></span>
                  <Icon name="chevRight" style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />
                </button>
              );
            })}
            {!companies.length && <EmptyState icon="building" title="Юридические лица не найдены" />}
          </div>
        </>
      )}
    </Drawer>
  );
}


function UnifiedBindField({ value, onChange, modes, title, sub, style, orderOptions, clientOptions, companyOptions }) {
  const [open, setOpen] = useState(false);
  const t = value || { mode: 'new', label: 'Новый заказ' };
  const icon = t.mode === 'person' ? 'user' : (t.mode === 'company' ? 'building' : (t.mode === 'order' ? 'briefcase' : 'plus'));
  return (
    <>
      <button type="button" className="select unified-bind-field" onClick={() => setOpen(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer', ...(style || {}) }}>
        <Icon name={icon} style={{ width: 16, height: 16, color: 'var(--muted-2)', flexShrink: 0 }} />
        <span style={{ flex: 1, color: 'var(--ink)' }}>{ufBindLabel(t)}</span>
        <Icon name="chevDown" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />
      </button>
      <UnifiedBindPicker open={open} modes={modes} title={title || 'Заказ для привязки'} sub={sub} orderOptions={orderOptions} clientOptions={clientOptions} companyOptions={companyOptions}
        onClose={() => setOpen(false)} onPick={(next) => { onChange(next); setOpen(false); }} />
    </>
  );
}


function translit(s) {
  const map = { а: 'A', б: 'B', в: 'V', г: 'G', д: 'D', е: 'E', ё: 'E', ж: 'ZH', з: 'Z', и: 'I', й: 'I', к: 'K', л: 'L', м: 'M', н: 'N', о: 'O', п: 'P', р: 'R', с: 'S', т: 'T', у: 'U', ф: 'F', х: 'KH', ц: 'TS', ч: 'CH', ш: 'SH', щ: 'SCH', ъ: '', ы: 'Y', ь: '', э: 'E', ю: 'YU', я: 'YA' };
  return String(s || '').toLowerCase().split('').map((c) => map[c] != null ? map[c] : (/[a-z0-9]/.test(c) ? c : '')).join('').toUpperCase();
}

Object.assign(window, {
  UF_DOC_TYPES, UF_CITIZENSHIP, UF_PAX_ROLES, UF_GENDER, UF_CLIENT_STATUSES,
  ufBlankPerson, ufSplitName, ufFullName, ufFromClient, ufToClient, ufValidatePerson,
  UF_MONTHS, UF_DAYS, ufParseDate, ufDateString, ufDateIso, ufDateFromIso, UFDateField,
  UnifiedPersonFields, UnifiedPersonDrawer, UnifiedDocumentDrawer, ufBlankDoc, translit,
  ufOrderPickRows, UfOrderRow, UfPersonRow, ufBindLabel, UnifiedBindPicker, UnifiedBindField,
});



export { UF_DOC_TYPES, UF_CITIZENSHIP, UF_PAX_ROLES, UF_GENDER, UF_CLIENT_STATUSES, ufApplyRecognizedFields, ufDateFromRecognized, UnifiedPersonIntake, ufBlankPerson, ufSplitName, ufFullName, ufFromClient, ufToClient, ufValidatePerson, UF_MONTHS, UF_DAYS, ufParseDate, ufDateString, ufDateIso, ufDateFromIso, UFDateField, UnifiedPersonFields, UnifiedPersonDrawer, ufBlankDoc, UnifiedDocumentDrawer, ufOrderPickRows, UF_PICK_ROW_STYLE, UfOrderRow, UfPersonRow, UF_BIND_MODE_LABEL, ufBindLabel, UnifiedBindPicker, UnifiedBindField, translit };
