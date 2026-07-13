// =====================================================================
//  ЕДИНЫЕ ФОРМЫ (ТЗ · ТЗ-2): один источник правды для добавления и
//  редактирования физического лица, сотрудника компании (юр. лицо) и
//  документов — из любого раздела система обращается к ним же.
//  Раньше эти формы дублировались в 7 местах с разным составом полей
//  (page_people, page_orders, page_services, order_extras …). Теперь —
//  один компонент, одинаковая «начинка» и в создании, и в корректировке.
//  Загружается после data_tz2.jsx, до страниц.
// =====================================================================

/* ---------- Справочники (единые, без рукописного ввода где не нужно) ---------- */
const UF_DOC_TYPES = ['Загранпаспорт', 'Общегражданский паспорт', 'ID-карта', 'Свидетельство о рождении', 'Вид на жительство', 'Виза'];
const UF_CITIZENSHIP = ['Кыргызстан', 'Казахстан', 'Россия', 'Узбекистан', 'Таджикистан', 'Туркменистан', 'Азербайджан', 'Турция', 'Германия', 'Китай', 'ОАЭ', 'Другое'];
const UF_PAX_ROLES = ['Взрослый', 'Ребёнок', 'Младенец'];
const UF_GENDER = ['Мужской', 'Женский'];
const UF_CLIENT_STATUSES = (typeof CLIENT_STATUS !== 'undefined') ? Object.keys(CLIENT_STATUS) : ['Новый', 'Активный', 'VIP', 'Неактивный'];

/* ---------- Модель персоны (канонический вид) ----------
   Совместима с CLIENTS_DB ({name, doc, dob, phone…}) через ufFromClient / ufToClient. */
function ufBlankPerson(kind) {
  return {
    kind: kind || 'person',              // 'person' (физлицо) | 'employee' (сотрудник компании)
    lastName: '', firstName: '', middleName: '',
    dob: '', gender: '', citizenship: 'Кыргызстан',
    role: 'Взрослый',                    // для участника поездки
    docType: 'Загранпаспорт', docNo: '', docExpiry: '',
    phone: '', phone2: '', email: '', city: 'Бишкек',
    status: 'Новый', category: 'Физлицо',
    dept: '', position: '', inPolicy: true,   // только для сотрудника
    comment: '',
    documents: [],                        // список документов персоны
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
// CLIENTS_DB / участник → каноническая персона
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
// каноническая персона → строка, совместимая с CLIENTS_DB / участником
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
// Проверка персоны. Возвращает {} если ок.
function ufValidatePerson(p) {
  const er = {};
  if (!p.lastName.trim() && !p.firstName.trim()) er.name = 'Укажите фамилию и имя';
  if (p.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email)) er.email = 'Некорректный e-mail';
  if (p.kind === 'employee' && !p.position.trim()) er.position = 'Укажите должность';
  return er;
}

/* =====================================================================
   1) ЕДИНЫЙ БЛОК ПОЛЕЙ ПЕРСОНЫ — используется во всех формах
   ===================================================================== */
function UnifiedPersonFields({ value, onChange, errors = {}, departments = [], showRole = false, showStatus = true, showDocuments = false, onManageDocs }) {
  const p = value;
  const set = (k, v) => onChange({ ...p, [k]: v });
  const isEmp = p.kind === 'employee';
  return (
    <>
      <PanelSub style={{ marginTop: 0 }}>Личные данные</PanelSub>
      <div className="form-grid">
        <Field label="Фамилия" required error={errors.name}><Input value={p.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Иванов" error={errors.name} /></Field>
        <Field label="Имя" required><Input value={p.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Иван" /></Field>
        <Field label="Отчество"><Input value={p.middleName} onChange={(e) => set('middleName', e.target.value)} placeholder="Иванович" /></Field>
        <DateField label="Дата рождения" value={p.dob || null} onChange={(v) => set('dob', v)} placeholder="дд.мм.гггг" />
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
        <DateField label="Срок действия" value={p.docExpiry || null} onChange={(v) => set('docExpiry', v)} placeholder="дд.мм.гггг" />
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

/* =====================================================================
   2) ЕДИНАЯ ФОРМА ПЕРСОНЫ (создание / редактирование)
      kind: 'person' | 'employee'.  mode: 'create' | 'edit'.
      Одна и та же форма открывается из любого раздела.
   ===================================================================== */
function UnifiedPersonDrawer({ open, kind = 'person', mode = 'create', initial, company, departments = [], showRole = false, title, onClose, onSave }) {
  const toast = useToast();
  const [p, setP] = useState(ufBlankPerson(kind));
  const [errs, setErrs] = useState({});
  const [docFor, setDocFor] = useState(false);
  useEffect(() => {
    if (!open) return;
    const base = initial ? (initial.kind ? { ...ufBlankPerson(kind), ...initial } : ufFromClient(initial, kind)) : ufBlankPerson(kind);
    setP({ ...base, kind });
    setErrs({});
  }, [open, kind, initial]);
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
          showRole={showRole} showDocuments onManageDocs={() => setDocFor(true)} />
      </Drawer>
      <UnifiedDocumentDrawer open={docFor} person={{ name: ufFullName(p), citizenship: p.citizenship }}
        onClose={() => setDocFor(false)}
        onSave={(doc) => { setP((cur) => ({ ...cur, documents: [...(cur.documents || []), doc] })); setDocFor(false); toast('Документ добавлен', 'ok'); }} />
    </>
  );
}

/* =====================================================================
   3) ЕДИНАЯ ФОРМА ДОКУМЕНТА (OCR / вручную) — для физ и юр, из любого места.
      Заменяет DocumentPanel (page_orders) и DocUploadModal (page_fulfillment).
   ===================================================================== */
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
  const [mth, setMth] = useState('ocr');   // 'ocr' | 'manual'
  const [scanned, setScanned] = useState(false);
  const [d, setD] = useState(ufBlankDoc(person));
  const set = (k, v) => setD((s) => ({ ...s, [k]: v }));
  useEffect(() => {
    if (!open) return;
    setD(initial ? { ...ufBlankDoc(person), ...initial } : ufBlankDoc(person));
    setMth(initial ? 'manual' : 'ocr'); setScanned(!!initial);
  }, [open]);
  if (!open) return null;
  const runOcr = () => {
    setScanned(true);
    // демо-распознавание: подставляем данные владельца
    const nm = ufSplitName(person.name);
    setD((s) => ({ ...s, docNo: s.docNo || 'AC ' + (1000000 + Math.floor(Math.random() * 8999999)),
      latLast: s.latLast || translit(nm.lastName), latFirst: s.latFirst || translit(nm.firstName),
      latMiddle: s.latMiddle || translit(nm.middleName), file: 'passport_scan.jpg' }));
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
          <div onClick={runOcr} className="uf-drop">
            <Icon name="download" style={{ width: 28, height: 28, color: 'var(--muted-2)' }} />
            <div className="uf-drop-t">{d.file ? d.file : 'Перетащите файл или выберите'}</div>
            <div style={{ margin: '10px 0' }}><Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); runOcr(); }}>Выбрать файл</Button></div>
            <div className="uf-drop-s">JPG, PNG, PDF · до 10 МБ</div>
          </div>
          {scanned && (
            <div className="uf-ocr-ok">
              <Icon name="checkCircle" style={{ width: 18, height: 18, color: 'var(--green)', flex: '0 0 18px', marginTop: 1 }} />
              <span>Документ распознан. Проверьте данные ниже и при необходимости отредактируйте.</span>
            </div>
          )}
        </>
      )}

      <PanelSub style={{ marginTop: mth === 'ocr' ? 4 : 0 }}>Данные документа</PanelSub>
      <div className="form-grid">
        <Field label="Тип документа"><Select options={UF_DOC_TYPES} value={d.docType} onChange={(e) => set('docType', e.target.value)} /></Field>
        <Field label="Гражданство"><Select options={UF_CITIZENSHIP} value={d.citizenship} onChange={(e) => set('citizenship', e.target.value)} /></Field>
        <Field label="Номер документа" required><Input value={d.docNo} onChange={(e) => set('docNo', e.target.value)} placeholder="AC 1234567" /></Field>
        <DateField label="Срок действия" value={d.docExpiry || null} onChange={(v) => set('docExpiry', v)} placeholder="дд.мм.гггг" />
      </div>

      <PanelSub>Данные владельца (латиницей)</PanelSub>
      <div className="form-grid">
        <Field label="Фамилия (лат.)"><Input value={d.latLast} onChange={(e) => set('latLast', e.target.value)} placeholder="IVANOV" /></Field>
        <Field label="Имя (лат.)"><Input value={d.latFirst} onChange={(e) => set('latFirst', e.target.value)} placeholder="IVAN" /></Field>
        <Field label="Отчество (лат.)"><Input value={d.latMiddle} onChange={(e) => set('latMiddle', e.target.value)} placeholder="IVANOVICH" /></Field>
        <DateField label="Дата рождения" value={d.dob || null} onChange={(v) => set('dob', v)} placeholder="дд.мм.гггг" />
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

/* маленький транслитератор для демо-OCR */
function translit(s) {
  const map = { а: 'A', б: 'B', в: 'V', г: 'G', д: 'D', е: 'E', ё: 'E', ж: 'ZH', з: 'Z', и: 'I', й: 'I', к: 'K', л: 'L', м: 'M', н: 'N', о: 'O', п: 'P', р: 'R', с: 'S', т: 'T', у: 'U', ф: 'F', х: 'KH', ц: 'TS', ч: 'CH', ш: 'SH', щ: 'SCH', ъ: '', ы: 'Y', ь: '', э: 'E', ю: 'YU', я: 'YA' };
  return String(s || '').toLowerCase().split('').map((c) => map[c] != null ? map[c] : (/[a-z0-9]/.test(c) ? c : '')).join('').toUpperCase();
}

Object.assign(window, {
  UF_DOC_TYPES, UF_CITIZENSHIP, UF_PAX_ROLES, UF_GENDER, UF_CLIENT_STATUSES,
  ufBlankPerson, ufSplitName, ufFullName, ufFromClient, ufToClient, ufValidatePerson,
  UnifiedPersonFields, UnifiedPersonDrawer, UnifiedDocumentDrawer, ufBlankDoc, translit,
});
