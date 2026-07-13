// ===== Тревел-политика компании (ТЗ): разделы Авиа / ЖД / Гостиницы / Трансферы /
//        Доп. услуги / Согласование + Контроль соответствия + подразделения/сотрудники +
//        импорт документом + история изменений. Все справочники — выпадающими списками. =====

/* Проверка услуги на соответствие тревел-политике (демо). ok | overLimit | class | supplier | approval */
function checkTravelPolicy(kind, offer, policy) {
  if (!policy) return 'ok';
  if (kind === 'Авиа' && policy.avia) {
    if (offer.airline && (policy.avia.airlinesForbidden || []).includes(offer.airline)) return 'supplier';
    if (offer.airline && (policy.avia.airlinesAllowed || []).length && !policy.avia.airlinesAllowed.includes(offer.airline)) return 'supplier';
    if (offer.cls && policy.avia.classAllowed && TP_CLASSES_AVIA.indexOf(offer.cls) > TP_CLASSES_AVIA.indexOf(policy.avia.classAllowed)) return 'class';
    if (offer.price != null && policy.avia.maxPrice && offer.price > policy.avia.maxPrice) return 'overLimit';
  }
  if (kind === 'Гостиницы' && policy.hotels) {
    if (offer.night != null && policy.hotels.maxNight && offer.night > policy.hotels.maxNight) return 'overLimit';
  }
  if (offer.needsApproval) return 'approval';
  return 'ok';
}

function ComplianceBadge({ status }) {
  const c = TP_COMPLIANCE[status] || TP_COMPLIANCE.ok;
  return <Pill tone={c.tone}><Icon name={c.icon} style={{ width: 12, height: 12, verticalAlign: -2, marginRight: 4 }} />{c.label}</Pill>;
}

/* ---------- Контролы ---------- */
function TpNum({ label, value, onChange, suffix }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
      <span style={{ flex: 1, fontSize: 13, color: 'var(--body)' }}>{label}</span>
      <div style={{ width: 120 }}><Input type="number" min="0" value={value} onChange={(e) => onChange(e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))} /></div>
      {suffix && <span style={{ width: 46, fontSize: 12, color: 'var(--muted)' }}>{suffix}</span>}
    </div>
  );
}
// число + валюта (для лимитов стоимости — валюта выбирается, а не хардкод $)
function TpNumCur({ label, value, onChange, cur, onCur }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
      <span style={{ flex: 1, fontSize: 13, color: 'var(--body)' }}>{label}</span>
      <div style={{ width: 120 }}><Input type="number" min="0" value={value} onChange={(e) => onChange(e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))} /></div>
      <div style={{ width: 92 }}><Select options={TP_CURRENCIES} value={cur} onChange={(e) => onCur(e.target.value)} /></div>
    </div>
  );
}
function TpSelect({ label, options, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
      <span style={{ flex: 1, fontSize: 13, color: 'var(--body)' }}>{label}</span>
      <div style={{ width: 200 }}><Select options={options} value={value} onChange={(e) => onChange(e.target.value)} /></div>
    </div>
  );
}
function TpToggle({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0' }}>
      <span style={{ flex: 1, fontSize: 13, color: 'var(--body)' }}>{label}</span>
      <Toggle on={!!value} onChange={onChange} />
    </div>
  );
}
// множественный выбор из справочника (чипы + дропдаун с чекбоксами) — вместо рукописного ввода
function TpMultiSelect({ label, options, values, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const vals = values || [];
  const toggle = (o) => onChange(vals.includes(o) ? vals.filter((x) => x !== o) : [...vals, o]);
  return (
    <div style={{ padding: '7px 0' }}>
      <div style={{ fontSize: 13, color: 'var(--body)', marginBottom: 5 }}>{label}</div>
      <div ref={ref} style={{ position: 'relative' }}>
        <button className="input" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minHeight: 44, width: '100%', cursor: 'pointer', textAlign: 'left' }} onClick={() => setOpen((o) => !o)}>
          {vals.length ? vals.map((v) => <span key={v} className="off-tag">{v}</span>) : <span style={{ color: 'var(--muted-2)' }}>{placeholder || 'Выберите из списка…'}</span>}
          <span style={{ flex: 1 }} />
          <Icon name="chevDown" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />
        </button>
        {open && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 60, background: '#fff', border: '1px solid var(--line)', borderRadius: 12, boxShadow: 'var(--shadow-modal)', maxHeight: 260, overflowY: 'auto', padding: 6 }}>
            {options.map((o) => (
              <div key={o} onClick={() => toggle(o)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: 'var(--ink)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                <Checkbox on={vals.includes(o)} onChange={() => toggle(o)} />{o}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
// поиск человека по вводу (как поиск пассажира) — для согласующих и выбора сотрудника
function TpPersonSearch({ placeholder, exclude, onPick }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const ex = exclude || [];
  const list = TP_EMPLOYEES.filter((n) => !ex.includes(n) && n.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <Input leadIcon="search" placeholder={placeholder || 'Поиск сотрудника по ФИО'} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
      {open && q.trim() && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 60, background: '#fff', border: '1px solid var(--line)', borderRadius: 12, boxShadow: 'var(--shadow-modal)', maxHeight: 260, overflowY: 'auto', padding: 6 }}>
          {list.length ? list.map((n) => (
            <div key={n} onClick={() => { onPick(n); setQ(''); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              <Avatar name={n} size={26} /><span style={{ fontSize: 13, color: 'var(--ink)' }}>{n}</span>
            </div>
          )) : <div style={{ padding: '10px', color: 'var(--muted)', fontSize: 13 }}>Не найдено</div>}
        </div>
      )}
    </div>
  );
}
// цепочка согласующих — упорядоченный список сотрудников
function TpApproverChain({ approvers, onChange }) {
  const list = approvers || [];
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= list.length) return; const n = [...list]; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  const remove = (i) => onChange(list.filter((_, j) => j !== i));
  const add = (name) => { if (!list.includes(name)) onChange([...list, name]); };
  return (
    <div style={{ padding: '7px 0' }}>
      <div style={{ fontSize: 13, color: 'var(--body)', marginBottom: 6 }}>Цепочка согласующих (по порядку)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
        {list.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted-2)' }}>Согласующие не добавлены.</div>}
        {list.map((name, i) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--field-line)' }}>
            <span style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--blue)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
            <Avatar name={name} size={26} />
            <span style={{ flex: 1, fontWeight: 600, color: 'var(--ink)', fontSize: 13 }}>{name}</span>
            <button className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} style={i === 0 ? { opacity: .35 } : null}><Icon name="chevUp" /></button>
            <button className="icon-btn" disabled={i === list.length - 1} onClick={() => move(i, 1)} style={i === list.length - 1 ? { opacity: .35 } : null}><Icon name="chevDown" /></button>
            <button className="icon-btn" onClick={() => remove(i)}><Icon name="x" /></button>
          </div>
        ))}
      </div>
      <TpPersonSearch placeholder="Добавить согласующего…" exclude={list} onPick={add} />
    </div>
  );
}

/* ---------- Подразделения и сотрудники (создаются в тревел-политике) ---------- */
function DepartmentsManager({ companyId }) {
  const toast = useToast();
  const [, setTick] = useState(0);
  const rerender = () => setTick((n) => n + 1);
  const store = companyStaffStore(companyId);
  const depts = store.departments;
  const empsOf = (d) => store.employees.filter((e) => e.dept === d.id);
  const [newDept, setNewDept] = useState('');

  const addDept = () => {
    if (!newDept.trim()) { toast('Введите название подразделения', 'info'); return; }
    depts.push({ id: 'd' + Date.now(), name: newDept.trim(), head: '', policy: '' });
    setNewDept(''); toast('Подразделение создано', 'ok'); rerender();
  };
  const removeDept = (id) => {
    const i = depts.findIndex((d) => d.id === id); if (i >= 0) depts.splice(i, 1);
    store.employees.forEach((e) => { if (e.dept === id) e.dept = ''; }); // сотрудники остаются в компании (без отдела)
    rerender();
  };
  const invite = (dept, name) => {
    if (store.employees.some((e) => e.name === name && e.dept === dept.id)) return;
    store.employees.push({ id: 'E-' + Math.floor(1000 + Math.random() * 8999), name, dept: dept.id, position: '', phone: '', email: '', doc: '—', dob: '—', inPolicy: true });
    toast('Приглашён: ' + name, 'ok'); rerender();
  };
  const removeEmp = (emp) => { const i = store.employees.findIndex((e) => e.id === emp.id); if (i >= 0) store.employees.splice(i, 1); rerender(); };

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Создавайте отделы и подразделения и приглашайте в них сотрудников. Список общий с вкладкой «Сотрудники» компании. На подразделения можно назначать отдельную тревел-политику (область применения «Подразделение»).</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}><Input placeholder="Название подразделения" value={newDept} onChange={(e) => setNewDept(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addDept(); }} /></div>
        <Button icon="plus" onClick={addDept}>Создать подразделение</Button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {depts.map((d) => { const emps = empsOf(d); return (
          <div className="card card-pad" key={d.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span className="oc-svc-ic" style={{ width: 34, height: 34, background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="building" style={{ width: 18, height: 18 }} /></span>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: 'var(--ink)' }}>{d.name}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{emps.length} сотрудник(ов){d.policy ? ' · политика: ' + d.policy : (d.head ? ' · руководитель ' + d.head : '')}</div></div>
              <Button variant="ghost" size="sm" icon="trash" onClick={() => removeDept(d.id)}>Удалить</Button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {emps.map((e) => (
                <span key={e.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 8px 5px 5px', borderRadius: 999, border: '1px solid var(--field-line)', fontSize: 12 }}>
                  <Avatar name={e.name} size={22} />{e.name}
                  <button className="icon-btn" style={{ width: 20, height: 20 }} onClick={() => removeEmp(e)}><Icon name="x" style={{ width: 12, height: 12 }} /></button>
                </span>
              ))}
              {!emps.length && <span style={{ fontSize: 12, color: 'var(--muted-2)' }}>Сотрудники не приглашены.</span>}
            </div>
            <div style={{ maxWidth: 360 }}><TpPersonSearch placeholder="Пригласить сотрудника…" exclude={emps.map((e) => e.name)} onPick={(n) => invite(d, n)} /></div>
          </div>
        ); })}
      </div>
    </div>
  );
}

/* ---------- Импорт (сотрудники / политика документом) ---------- */
function TpImportDrawer({ open, kind, companyId, onClose }) {
  const toast = useToast();
  if (!open) return null;
  const isEmp = kind === 'employees';
  const doImport = () => {
    if (isEmp) {
      const store = companyStaffStore(companyId);
      let target = store.departments[0];
      if (!target) { target = { id: 'd' + Date.now(), name: 'Импортированные', head: '', policy: '' }; store.departments.push(target); }
      ['Импортов Импорт А.', 'Импортов Импорт Б.'].forEach((n) => {
        if (!store.employees.some((e) => e.name === n && e.dept === target.id)) store.employees.push({ id: 'E-' + Math.floor(1000 + Math.random() * 8999), name: n, dept: target.id, position: '', phone: '', email: '', doc: '—', dob: '—', inPolicy: true });
      });
      toast('Сотрудники импортированы в «' + target.name + '»', 'ok');
    } else {
      toast('Тревел-политика импортирована из документа', 'ok');
    }
    onClose();
  };
  return (
    <Drawer open={open} onClose={onClose} title={isEmp ? 'Импорт сотрудников' : 'Импорт тревел-политики'} width="min(560px,96vw)"
      footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button icon="check" onClick={doImport}>Импортировать</Button></>}>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
        {isEmp ? 'Загрузите файл со списком сотрудников (XLSX / CSV). Сотрудники будут добавлены в подразделения компании.' : 'Загрузите документ тревел-политики (PDF / DOCX / XLSX). Параметры будут распознаны и применены к компании.'}
      </div>
      <label className="doc-chip" style={{ borderStyle: 'dashed', color: 'var(--blue)', height: 120, flexDirection: 'column', gap: 8, cursor: 'pointer', justifyContent: 'center' }}>
        <Icon name="download" style={{ width: 26, height: 26 }} />
        <span style={{ fontWeight: 600 }}>Выберите файл или перетащите сюда</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{isEmp ? 'XLSX, CSV — до 5 МБ' : 'PDF, DOCX, XLSX — до 10 МБ'}</span>
      </label>
    </Drawer>
  );
}

function TravelPolicyBlock({ co }) {
  const toast = useToast();
  const store = travelPolicyFor(co.id);
  const [pol, setPol] = useState(() => JSON.parse(JSON.stringify(store.policy)));
  const [histOpen, setHistOpen] = useState(false);
  const [importKind, setImportKind] = useState(null);
  const [showDepts, setShowDepts] = useState(false);
  const s = (section, key, v) => setPol((p) => ({ ...p, [section]: { ...p[section], [key]: v } }));

  const diffFields = () => {
    const out = [];
    const base = store.policy;
    ['avia', 'rail', 'hotels', 'transfers', 'extras', 'approval'].forEach((sec) => {
      Object.keys(pol[sec]).forEach((k) => { if (JSON.stringify(pol[sec][k]) !== JSON.stringify(base[sec][k])) out.push(sec + ' · ' + k); });
    });
    if (pol.scope !== base.scope || pol.scopeValue !== base.scopeValue) out.push('Область применения');
    return out;
  };
  const save = () => {
    const fields = diffFields();
    if (!fields.length) { toast('Изменений нет', 'info'); return; }
    store.policy = JSON.parse(JSON.stringify(pol));
    store.history.push({ date: window.cfNow ? window.cfNow() : new Date().toLocaleString('ru-RU'), user: (CURRENT_USER && CURRENT_USER.name) || 'Оператор', title: 'Изменение тревел-политики', fields });
    toast('Тревел-политика сохранена (новая версия)', 'ok');
  };

  const deptNames = departmentsFor(co.id).map((d) => d.name);

  return (
    <div className="fade-in">
      {/* Заголовок + область применения + импорт */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 className="card-title" style={{ fontSize: 17, margin: 0 }}>Тревел-политика</h3>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Правила оформления командировок. Проверяются автоматически при подборе и бронировании.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" icon="download" onClick={() => setImportKind('employees')}>Импорт сотрудников</Button>
            <Button variant="secondary" size="sm" icon="download" onClick={() => setImportKind('policy')}>Импорт политики</Button>
            <Button variant="secondary" size="sm" icon="clock" onClick={() => setHistOpen(true)}>История</Button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Применяется к:</span>
          <div className="seg-toggle" style={{ maxWidth: 480 }}>
            {TP_SCOPES.map((t) => (
              <button key={t} className={'seg-btn' + (pol.scope === t ? ' active' : '')} onClick={() => setPol((p) => ({ ...p, scope: t, scopeValue: '' }))}>{t}</button>
            ))}
          </div>
          {pol.scope === 'Подразделение' && (
            <div style={{ width: 240 }}><Select placeholder="Выберите подразделение" options={deptNames} value={pol.scopeValue} onChange={(e) => setPol((p) => ({ ...p, scopeValue: e.target.value }))} /></div>
          )}
          {pol.scope === 'Должность' && (
            <div style={{ width: 240 }}><Input placeholder="Название должности" value={pol.scopeValue} onChange={(e) => setPol((p) => ({ ...p, scopeValue: e.target.value }))} /></div>
          )}
          {pol.scope === 'Сотрудник' && (
            <div style={{ width: 280 }}>
              {pol.scopeValue
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 10, border: '1px solid var(--field-line)' }}><Avatar name={pol.scopeValue} size={24} />{pol.scopeValue}<button className="icon-btn" onClick={() => setPol((p) => ({ ...p, scopeValue: '' }))}><Icon name="x" /></button></span>
                : <TpPersonSearch placeholder="Найдите сотрудника…" onPick={(n) => setPol((p) => ({ ...p, scopeValue: n }))} />}
            </div>
          )}
        </div>
      </div>

      {/* Подразделения и сотрудники */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer' }} onClick={() => setShowDepts((v) => !v)}>
          <span className="oc-svc-ic" style={{ width: 34, height: 34, background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="users" style={{ width: 18, height: 18 }} /></span>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: 'var(--ink)' }}>Подразделения и сотрудники</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>Создание отделов и приглашение сотрудников</div></div>
          <Icon name={showDepts ? 'chevUp' : 'chevDown'} style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />
        </div>
        {showDepts && <div style={{ borderTop: '1px solid var(--line)', padding: '16px 18px', background: 'var(--surface-2)' }}><DepartmentsManager companyId={co.id} /></div>}
      </div>

      {/* Авиа */}
      <CollapseSection title="Авиа" note="Класс, авиакомпании, пересадки, лимиты стоимости" defaultOpen>
        <TpSelect label="Разрешённый класс обслуживания" options={TP_CLASSES_AVIA} value={pol.avia.classAllowed} onChange={(v) => s('avia', 'classAllowed', v)} />
        <TpMultiSelect label="Разрешённые авиакомпании" options={TP_AIRLINES} values={pol.avia.airlinesAllowed} onChange={(v) => s('avia', 'airlinesAllowed', v)} placeholder="Выберите авиакомпании" />
        <TpMultiSelect label="Запрещённые авиакомпании" options={TP_AIRLINES} values={pol.avia.airlinesForbidden} onChange={(v) => s('avia', 'airlinesForbidden', v)} placeholder="Выберите авиакомпании" />
        <TpToggle label="Разрешены рейсы с пересадками" value={pol.avia.stops} onChange={(v) => s('avia', 'stops', v)} />
        <TpNum label="Максимум пересадок" value={pol.avia.maxStops} onChange={(v) => s('avia', 'maxStops', v)} suffix="шт." />
        <TpNum label="Макс. продолжительность пересадки" value={pol.avia.maxLayoverH} onChange={(v) => s('avia', 'maxLayoverH', v)} suffix="ч" />
        <TpNum label="Мин. время пересадки" value={pol.avia.minLayoverMin} onChange={(v) => s('avia', 'minLayoverMin', v)} suffix="мин" />
        <TpNumCur label="Максимальная стоимость билета" value={pol.avia.maxPrice} onChange={(v) => s('avia', 'maxPrice', v)} cur={pol.avia.maxPriceCur} onCur={(v) => s('avia', 'maxPriceCur', v)} />
        <TpNum label="Допустимое отклонение от самого дешёвого" value={pol.avia.deviationPct} onChange={(v) => s('avia', 'deviationPct', v)} suffix="%" />
        <TpToggle label="Разрешены невозвратные тарифы" value={pol.avia.nonRefundable} onChange={(v) => s('avia', 'nonRefundable', v)} />
        <TpToggle label="Разрешены доп. услуги (багаж, место, бизнес-зал)" value={pol.avia.extrasAllowed} onChange={(v) => s('avia', 'extrasAllowed', v)} />
        <TpNum label="Мин. срок оформления до вылета" value={pol.avia.minLeadDays} onChange={(v) => s('avia', 'minLeadDays', v)} suffix="дн." />
      </CollapseSection>

      {/* ЖД */}
      <CollapseSection title="ЖД" note="Классы вагонов, лимиты, типы поездов">
        <TpSelect label="Разрешённый класс вагона" options={TP_RAIL_CLASSES} value={pol.rail.wagonClass} onChange={(v) => s('rail', 'wagonClass', v)} />
        <TpMultiSelect label="Разрешённые типы вагонов" options={TP_RAIL_TYPES} values={pol.rail.wagonTypes} onChange={(v) => s('rail', 'wagonTypes', v)} placeholder="Выберите типы вагонов" />
        <TpNumCur label="Максимальная стоимость билета" value={pol.rail.maxPrice} onChange={(v) => s('rail', 'maxPrice', v)} cur={pol.rail.maxPriceCur} onCur={(v) => s('rail', 'maxPriceCur', v)} />
        <TpToggle label="Разрешено СВ" value={pol.rail.svAllowed} onChange={(v) => s('rail', 'svAllowed', v)} />
        <TpToggle label="Разрешено купе" value={pol.rail.kupeAllowed} onChange={(v) => s('rail', 'kupeAllowed', v)} />
        <TpToggle label="Разрешены скоростные поезда" value={pol.rail.highSpeed} onChange={(v) => s('rail', 'highSpeed', v)} />
        <TpNum label="Мин. срок оформления" value={pol.rail.minLeadDays} onChange={(v) => s('rail', 'minLeadDays', v)} suffix="дн." />
      </CollapseSection>

      {/* Гостиницы */}
      <CollapseSection title="Гостиницы" note="Категория, стоимость за ночь, сети, услуги">
        <TpNumCur label="Максимальная стоимость за ночь" value={pol.hotels.maxNight} onChange={(v) => s('hotels', 'maxNight', v)} cur={pol.hotels.maxNightCur} onCur={(v) => s('hotels', 'maxNightCur', v)} />
        <TpSelect label="Максимальная категория гостиницы" options={TP_HOTEL_CATEGORIES} value={pol.hotels.maxCategory} onChange={(v) => s('hotels', 'maxCategory', v)} />
        <TpMultiSelect label="Разрешённые сети гостиниц" options={TP_HOTEL_CHAINS} values={pol.hotels.chainsAllowed} onChange={(v) => s('hotels', 'chainsAllowed', v)} placeholder="Выберите сети" />
        <TpMultiSelect label="Запрещённые гостиницы / сети" options={TP_HOTEL_CHAINS} values={pol.hotels.forbidden} onChange={(v) => s('hotels', 'forbidden', v)} placeholder="Выберите сети" />
        <TpNum label="Допустимое расстояние до места назначения" value={pol.hotels.maxDistanceKm} onChange={(v) => s('hotels', 'maxDistanceKm', v)} suffix="км" />
        <TpMultiSelect label="Разрешённые типы питания" options={TP_BOARD} values={pol.hotels.boardAllowed} onChange={(v) => s('hotels', 'boardAllowed', v)} placeholder="Выберите питание" />
        <TpToggle label="Разрешено раннее заселение" value={pol.hotels.earlyCheckIn} onChange={(v) => s('hotels', 'earlyCheckIn', v)} />
        <TpToggle label="Разрешён поздний выезд" value={pol.hotels.lateCheckOut} onChange={(v) => s('hotels', 'lateCheckOut', v)} />
        <TpToggle label="Разрешено повышение категории номера" value={pol.hotels.upgrade} onChange={(v) => s('hotels', 'upgrade', v)} />
      </CollapseSection>

      {/* Трансферы */}
      <CollapseSection title="Трансферы" note="Классы авто, такси, лимиты">
        <TpMultiSelect label="Разрешённые классы автомобилей" options={TP_CAR_CLASSES} values={pol.transfers.carClasses} onChange={(v) => s('transfers', 'carClasses', v)} placeholder="Выберите классы" />
        <TpToggle label="Разрешены индивидуальные трансферы" value={pol.transfers.individual} onChange={(v) => s('transfers', 'individual', v)} />
        <TpToggle label="Разрешено такси" value={pol.transfers.taxi} onChange={(v) => s('transfers', 'taxi', v)} />
        <TpNumCur label="Максимальная стоимость" value={pol.transfers.maxPrice} onChange={(v) => s('transfers', 'maxPrice', v)} cur={pol.transfers.maxPriceCur} onCur={(v) => s('transfers', 'maxPriceCur', v)} />
      </CollapseSection>

      {/* Доп. услуги */}
      <CollapseSection title="Дополнительные услуги" note="Что разрешено оформлять">
        <TpToggle label="Страхование" value={pol.extras.insurance} onChange={(v) => s('extras', 'insurance', v)} />
        <TpToggle label="Визовая поддержка" value={pol.extras.visa} onChange={(v) => s('extras', 'visa', v)} />
        <TpToggle label="VIP-залы" value={pol.extras.vipLounge} onChange={(v) => s('extras', 'vipLounge', v)} />
        <TpToggle label="Fast Track" value={pol.extras.fastTrack} onChange={(v) => s('extras', 'fastTrack', v)} />
        <TpToggle label="Дополнительные услуги аэропорта" value={pol.extras.airportExtra} onChange={(v) => s('extras', 'airportExtra', v)} />
      </CollapseSection>

      {/* Согласование */}
      <CollapseSection title="Согласование" note="Кто и когда согласовывает поездку · цепочка согласующих">
        <TpToggle label="Требуется согласование поездки" value={pol.approval.required} onChange={(v) => s('approval', 'required', v)} />
        <TpApproverChain approvers={pol.approval.approvers} onChange={(v) => s('approval', 'approvers', v)} />
        <TpToggle label="Согласование при превышении лимитов" value={pol.approval.onOverLimit} onChange={(v) => s('approval', 'onOverLimit', v)} />
        <TpToggle label="Автосогласование при соблюдении политики" value={pol.approval.autoIfCompliant} onChange={(v) => s('approval', 'autoIfCompliant', v)} />
        <TpToggle label="Возможность оформления без согласования" value={pol.approval.allowWithout} onChange={(v) => s('approval', 'allowWithout', v)} />
      </CollapseSection>

      {/* Контроль */}
      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h3 className="card-title" style={{ fontSize: 16, marginBottom: 8 }}>Контроль соответствия при подборе</h3>
        <div style={{ fontSize: 13, color: 'var(--body)', marginBottom: 12 }}>При подборе услуг система автоматически проверяет тревел-политику и помечает каждый вариант. Оформление не блокируется — при нарушении указывается причина и, при необходимости, заявка отправляется по цепочке согласующих.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.keys(TP_COMPLIANCE).map((k) => (<div key={k}><ComplianceBadge status={k} /></div>))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 18 }}>
        <Button icon="check" onClick={save}>Сохранить тревел-политику</Button>
      </div>

      <Drawer open={histOpen} onClose={() => setHistOpen(false)} title="История изменений тревел-политики"
        footer={<Button variant="secondary" style={{ width: '100%' }} onClick={() => setHistOpen(false)}>Закрыть</Button>}>
        <div className="timeline">
          {[...store.history].reverse().map((v, i) => (
            <div className="tl-item" key={i}><span className="tl-dot" /><span className="tl-line" />
              <div style={{ paddingBottom: 8 }}>
                <div className="tl-time">{v.date} · {v.user}</div>
                <div className="tl-text" style={{ fontWeight: 600 }}>{v.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{v.fields.join(', ')}</div>
              </div>
            </div>
          ))}
        </div>
      </Drawer>

      <TpImportDrawer open={!!importKind} kind={importKind} companyId={co.id} onClose={() => setImportKind(null)} />
    </div>
  );
}

Object.assign(window, { TravelPolicyBlock, checkTravelPolicy, ComplianceBadge, DepartmentsManager });
