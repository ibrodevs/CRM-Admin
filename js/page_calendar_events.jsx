// ===== Календарь: быстрое создание рабочих действий (ТЗ «Дополнение по календарю») =====
// Клик по дате → контекстное меню: заказ/поездка, напоминание, задача по заказу,
// событие контроля. Повторяющиеся события, предупреждение о дублировании, связь с
// заказом через умный поиск, боковая панель с деталями и действиями, история.
// Все события единого стиля, различаются компактными иконками и подписями.

/* ---------- типы событий + справочники ---------- */
const CAL_EVENT_TYPES = {
  order: { l: 'Заказ / поездка', short: 'Поездка', icon: 'orders', tone: 'blue' },
  reminder: { l: 'Напоминание', short: 'Напоминание', icon: 'bell', tone: 'amber' },
  task: { l: 'Задача по заказу', short: 'Задача', icon: 'clipboard', tone: 'teal' },
  control: { l: 'Событие контроля', short: 'Контроль', icon: 'eye', tone: 'red' },
};
const CAL_PRIORITY = ['Высокий', 'Средний', 'Низкий'];
const CAL_PRIORITY_TONE = { 'Высокий': 'red', 'Средний': 'amber', 'Низкий': 'gray' };
const CAL_NOTIFY = ['Внутреннее уведомление', 'Email', 'Мессенджер', 'Push'];
const CAL_REPEAT = ['Не повторять', 'Ежедневно', 'Еженедельно', 'До указанной даты', 'До выполнения условия', 'Свой интервал'];
const CAL_SCOPE = ['Себе', 'Другому оператору', 'Группе операторов', 'На весь заказ'];
const CAL_RESP_ROLE = ['—', 'Авиа', 'ЖД', 'Гостиницы', 'Финансы', 'Старший оператор'];
const CAL_SERVICE_TYPES = ['Авиа', 'ЖД', 'Гостиница', 'Трансфер', 'Автобус', 'Виза', 'Страхование'];
const CAL_REMINDER_PRESETS = ['Проверить изменение стоимости', 'Запросить ответ у поставщика', 'Проверить подтверждение гостиницы', 'Проверить статус рейса', 'Связаться с клиентом', 'Проверить поступление оплаты', 'Проконтролировать внесение имён', 'Проверить выписку билетов', 'Повторно запросить места', 'Проверить тайм-лимит', 'Уточнить трансфер', 'Отправить документы'];
const CAL_TASK_PRESETS = ['Выписать билеты', 'Отправить список пассажиров', 'Проверить документы', 'Согласовать КП', 'Подтвердить бронирование', 'Оформить обмен', 'Оформить возврат', 'Проверить расселение группы'];
const CAL_CONTROL_PRESETS = ['Проверить цену', 'Проверить доступность мест', 'Проверить статус рейса', 'Проверить ответ поставщика', 'Проверить поступление оплаты', 'Проверить отмену или задержку', 'Проверить изменение расписания', 'Проверить срок бесплатной отмены', 'Проверить выпуск документов'];

function calFmtDay(d) { return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear(); }
function calNowStr() { return new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', ' ·'); }

/* ---------- хранилище событий (persist в рамках сессии) ---------- */
const CAL_EVENTS = window.CAL_EVENTS || (window.CAL_EVENTS = (() => {
  const D = (dd, mm, hh, mi) => new Date(2026, mm - 1, dd, hh || 9, mi || 0);
  const who = (window.CURRENT_USER && CURRENT_USER.name) || 'Даниель';
  const ev = (o) => ({ id: 'CE-' + Math.random().toString(36).slice(2, 7), done: false, history: [{ t: calNowStr(), text: 'Событие создано', who }], ...o });
  return [
    ev({ type: 'task', title: 'Выписать билеты', date: D(24, 6, 15, 0), time: '15:00', order: 51170, service: 'Авиа', resp: 'Даниель', priority: 'Высокий', repeat: 'Не повторять', scope: 'Себе', respRole: 'Авиа' }),
    ev({ type: 'reminder', title: 'Проверить поступление оплаты', date: D(25, 6, 12, 0), time: '12:00', order: 51156, resp: 'Даниель', priority: 'Средний', notify: 'Email', repeat: 'До выполнения условия', scope: 'Себе' }),
    ev({ type: 'control', title: 'Проверить статус рейса SU1234', date: D(26, 6, 18, 0), time: '18:00', order: 51170, service: 'Авиа', resp: 'Даниель', criterion: 'задержка более 60 минут', actionOnProblem: 'создать задачу оператору', repeat: 'Ежедневно', scope: 'Себе' }),
    ev({ type: 'reminder', title: 'Проверить тайм-лимит', date: D(24, 6, 17, 0), time: '17:00', order: 51162, service: 'Авиа', resp: 'Азамат А.', priority: 'Высокий', notify: 'Push', repeat: 'Не повторять', scope: 'Другому оператору' }),
  ];
})());
function calEventsOn(day) { return CAL_EVENTS.filter((e) => trSameDay(e.date, day)); }
function calAddEvent(evt) {
  const who = (window.CURRENT_USER && CURRENT_USER.name) || 'Даниель';
  const full = { id: 'CE-' + Math.random().toString(36).slice(2, 7), done: false, history: [{ t: calNowStr(), text: 'Событие создано', who }], ...evt };
  CAL_EVENTS.push(full); return full;
}
function calFindDuplicate({ type, title, order }) {
  return CAL_EVENTS.find((e) => e.order === order && order != null && (e.type === type) && e.title.trim().toLowerCase() === (title || '').trim().toLowerCase() && !e.done);
}
function calOrderInfo(no) {
  const o = (typeof ORDERS !== 'undefined' && ORDERS.find((x) => x.no === no)) || null;
  if (!o) return null;
  return { no: o.no, client: o.client, company: o.requestType, pax: o.services, services: o.service, operator: o.operator, deadline: 'выписка · сегодня 18:00' };
}

/* ==================================================================== */
/* Контекстное меню по клику на дату                                    */
/* ==================================================================== */
function CalDayMenu({ day, pos, onPick, onClose }) {
  const items = [
    { type: 'order', desc: 'Новый заказ с уже заполненной датой' },
    { type: 'reminder', desc: 'С привязкой или без привязки к заказу' },
    { type: 'task', desc: 'Рабочее событие по заказу' },
    { type: 'control', desc: 'Точка проверки состояния заказа' },
  ];
  const x = Math.min(pos.x, window.innerWidth - 300), y = Math.min(pos.y, window.innerHeight - 260);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60 }} onMouseDown={onClose}>
      <div style={{ position: 'fixed', left: x, top: y, width: 280, background: '#fff', border: '1px solid var(--line)', borderRadius: 14, boxShadow: '0 12px 40px rgba(16,23,38,.18)', overflow: 'hidden' }} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--line)', fontSize: 12.5, color: 'var(--muted)' }}>Создать на <b style={{ color: 'var(--ink)' }}>{calFmtDay(day)}</b></div>
        {items.map((it) => {
          const t = CAL_EVENT_TYPES[it.type];
          return (
            <button key={it.type} type="button" onClick={() => onPick(it.type)}
              style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '11px 14px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--line)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
              <span className="oc-svc-ic" style={{ background: 'var(--' + t.tone + '-bg, var(--surface-2))', width: 32, height: 32, color: 'var(--' + t.tone + ')' }}><Icon name={t.icon} style={{ width: 16, height: 16 }} /></span>
              <span><span style={{ display: 'block', fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>{t.l}</span><span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{it.desc}</span></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ==================================================================== */
/* Умный поиск заказа + контекст                                        */
/* ==================================================================== */
function CalOrderPicker({ value, onChange }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const all = (typeof ORDERS !== 'undefined' ? ORDERS : []);
  const list = q ? all.filter((o) => String(o.no).includes(q) || o.client.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : all.slice(0, 6);
  const info = value ? calOrderInfo(value) : null;
  return (
    <div>
      <div style={{ position: 'relative' }}>
        <Input leadIcon="search" value={value ? '№ ' + value + ' · ' + (info ? info.client : '') : q}
          onChange={(e) => { setQ(e.target.value); onChange(null); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder="Умный поиск заказа: № или клиент" />
        {value && <button type="button" onClick={() => { onChange(null); setQ(''); }} style={{ position: 'absolute', right: 10, top: 13, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-2)' }}><Icon name="x" style={{ width: 16, height: 16 }} /></button>}
        {open && !value && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 5, marginTop: 4, background: '#fff', border: '1px solid var(--line)', borderRadius: 10, boxShadow: '0 8px 24px rgba(16,23,38,.12)', maxHeight: 220, overflowY: 'auto' }}>
            {list.map((o) => (
              <button key={o.no + o.client} type="button" onMouseDown={() => { onChange(o.no); setOpen(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>№ {o.no}</span> <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>· {o.client} · {o.operator}</span>
              </button>
            ))}
            {list.length === 0 && <div style={{ padding: 12, fontSize: 12.5, color: 'var(--muted)' }}>Не найдено</div>}
          </div>
        )}
      </div>
      {info && (
        <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)', fontSize: 12.5, display: 'grid', gap: 3 }}>
          <div style={{ color: 'var(--muted)' }}>Клиент: <b style={{ color: 'var(--ink)' }}>{info.client}</b> · тип: {info.company}</div>
          <div style={{ color: 'var(--muted)' }}>Пассажиров: {info.pax} · услуг: {info.services} · ответственный: {info.operator}</div>
          <div style={{ color: 'var(--amber)' }}>Ближайший дедлайн: {info.deadline}</div>
        </div>
      )}
    </div>
  );
}

/* ==================================================================== */
/* Создание события (форма по типу)                                     */
/* ==================================================================== */
function CalEventCreator({ type, day, presetOrder, onClose, onCreated }) {
  const toast = useToast();
  const t = CAL_EVENT_TYPES[type];
  const [f, setF] = useState({
    title: '', dateStr: calFmtDay(day), endStr: '', time: '12:00', order: presetOrder || null, service: '', pax: '', supplier: '',
    resp: (window.CURRENT_USER && CURRENT_USER.name) || 'Даниель', priority: 'Средний', notify: CAL_NOTIFY[0], repeat: 'Не повторять',
    scope: 'Себе', respRole: '—', direction: '', services: [], contact: '', comment: '', criterion: '', actionOnProblem: '',
  });
  const [dupChoice, setDupChoice] = useState(null); // null | 'ignore'
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const toggleSvc = (s) => setF((p) => ({ ...p, services: p.services.includes(s) ? p.services.filter((x) => x !== s) : [...p.services, s] }));

  const dup = (type === 'reminder' || type === 'task') && f.title && f.order ? calFindDuplicate({ type, title: f.title, order: f.order }) : null;
  const needTitle = type !== 'order';
  const canSave = type === 'order' ? f.direction || f.contact || f.order != null || true : !!f.title.trim();

  const submit = () => {
    if (dup && !dupChoice) { setDupChoice('shown'); return; }
    const [dd, mm, yy] = f.dateStr.split('.').map(Number);
    const [hh, mi] = (f.time || '12:00').split(':').map(Number);
    const date = new Date(yy || 2026, (mm || 1) - 1, dd || 1, hh || 12, mi || 0);
    const base = { type, date, time: f.time, order: f.order, service: f.service, resp: f.resp, repeat: f.repeat, scope: f.scope, respRole: f.respRole, comment: f.comment };
    let evt;
    if (type === 'order') {
      // Создаём РЕАЛЬНЫЙ заказ, который появляется в разделе «Заказы» и метится в календаре
      const info = f.order ? calOrderInfo(f.order) : null;
      const client = info ? info.client : (f.contact || f.direction || 'Новый клиент');
      const nextNo = (typeof ORDERS !== 'undefined' ? Math.max.apply(null, ORDERS.map((o) => o.no).concat(51000)) : 51000) + 1;
      const orderObj = {
        id: 'ord-' + Date.now(), no: nextNo, client, requestType: 'Индивидуальная', status: 'Новое',
        service: f.services[0] || '—', operator: f.resp, operatorRole: 'Оператор', sum: 0, currency: 'USD',
        services: f.services.length, progress: 0, date: calFmtDay(date), createdOn: date,
        direction: f.direction, contact: f.contact, pax: f.pax,
      };
      if (typeof ORDERS !== 'undefined') ORDERS.unshift(orderObj);
      if (window.__addOrder) window.__addOrder(orderObj);
      evt = { ...base, order: nextNo, title: 'Заказ № ' + nextNo + (f.direction ? ' · ' + f.direction : ''), endStr: f.endStr, services: f.services, pax: f.pax };
      const created = calAddEvent(evt);
      toast('Заказ № ' + nextNo + ' создан и добавлен в календарь', 'ok', { title: 'Заказ создан', action: { label: 'Открыть в «Заказы»', route: 'orders' } });
      onCreated && onCreated(created); onClose();
      return;
    }
    if (type === 'reminder') evt = { ...base, title: f.title, pax: f.pax, supplier: f.supplier, priority: f.priority, notify: f.notify };
    else if (type === 'task') evt = { ...base, title: f.title, priority: f.priority };
    else evt = { ...base, title: f.title, criterion: f.criterion, actionOnProblem: f.actionOnProblem };
    const created = calAddEvent(evt);
    toast(t.l + ' создано и добавлено в календарь', 'ok');
    onCreated && onCreated(created); onClose();
  };

  const presets = type === 'reminder' ? CAL_REMINDER_PRESETS : type === 'task' ? CAL_TASK_PRESETS : type === 'control' ? CAL_CONTROL_PRESETS : [];

  return (
    <StackPanel title={t.l} width="min(640px,96vw)" onClose={onClose}
      footer={<>
        <Button variant="secondary" style={{ flex: 1 }} onClick={onClose}>Отмена</Button>
        <Button style={{ flex: 1 }} icon="check" disabled={!canSave} onClick={submit}>{dup && !dupChoice ? 'Проверить дубли' : 'Создать'}</Button>
      </>}>
      {/* Предупреждение о дублировании */}
      {dup && dupChoice && (
        <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 12, background: 'var(--amber-bg)', border: '1px solid var(--amber)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}><Icon name="alertTriangle" style={{ width: 18, height: 18, color: 'var(--amber)' }} /><b style={{ color: 'var(--ink)' }}>Похожее событие уже есть</b></div>
          <div style={{ fontSize: 12.5, color: 'var(--body)', marginBottom: 10 }}>По заказу № {dup.order} уже создано «{dup.title}» на {calFmtDay(dup.date)}, {dup.time}.</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size="sm" variant="secondary" onClick={() => { onCreated && onCreated(dup); onClose(); }}>Открыть существующее</Button>
            <Button size="sm" onClick={() => { setDupChoice('ignore'); setTimeout(submit, 0); }}>Всё равно создать</Button>
          </div>
        </div>
      )}

      {needTitle && (
        <Field label={type === 'control' ? 'Что контролируется' : 'Название'} required>
          <Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder={type === 'control' ? 'напр. Статус рейса SU1234' : 'Кратко о событии'} />
          {presets.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {presets.slice(0, 6).map((p) => <button key={p} type="button" onClick={() => set('title', p)} className="chip ghost" style={{ height: 30, fontSize: 12 }}>{p}</button>)}
            </div>
          )}
        </Field>
      )}

      {type === 'order' && (<>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="Дата начала"><Input value={f.dateStr} onChange={(e) => set('dateStr', e.target.value)} /></Field>
          <Field label="Дата окончания"><Input value={f.endStr} onChange={(e) => set('endStr', e.target.value)} placeholder="дд.мм.гггг" /></Field>
          <Field label="Продолжительность"><Input value={f.endStr ? '—' : ''} placeholder="авто" disabled /></Field>
        </div>
        <Field label="Клиент или компания"><CalOrderPicker value={f.order} onChange={(v) => set('order', v)} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Контактное лицо"><Input value={f.contact} onChange={(e) => set('contact', e.target.value)} /></Field>
          <Field label="Пассажиры"><Input value={f.pax} onChange={(e) => set('pax', e.target.value)} placeholder="кол-во / имена" /></Field>
          <Field label="Направление"><Input value={f.direction} onChange={(e) => set('direction', e.target.value)} placeholder="Москва → Казань" /></Field>
          <Field label="Ответственный оператор"><Input value={f.resp} onChange={(e) => set('resp', e.target.value)} /></Field>
        </div>
        <Field label="Типы услуг">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CAL_SERVICE_TYPES.map((s) => <button key={s} type="button" onClick={() => toggleSvc(s)} className={'chip' + (f.services.includes(s) ? '' : ' ghost')} style={{ height: 32, fontSize: 12.5 }}>{s}</button>)}
          </div>
        </Field>
      </>)}

      {type !== 'order' && (<>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Дата"><Input value={f.dateStr} onChange={(e) => set('dateStr', e.target.value)} /></Field>
          <Field label="Время"><Input value={f.time} onChange={(e) => set('time', e.target.value)} placeholder="чч:мм" /></Field>
        </div>
        <Field label={type === 'task' ? 'Заказ (обязательно)' : 'Заказ (необязательно)'}><CalOrderPicker value={f.order} onChange={(v) => set('order', v)} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Услуга"><Select value={f.service} onChange={(e) => set('service', e.target.value)} options={['', ...CAL_SERVICE_TYPES]} placeholder="—" /></Field>
          {type === 'reminder' && <Field label="Пассажир"><Input value={f.pax} onChange={(e) => set('pax', e.target.value)} placeholder="ФИО (необязательно)" /></Field>}
          {type === 'reminder' && <Field label="Поставщик"><Input value={f.supplier} onChange={(e) => set('supplier', e.target.value)} placeholder="(необязательно)" /></Field>}
          {type !== 'control' && <Field label="Приоритет"><Select value={f.priority} onChange={(e) => set('priority', e.target.value)} options={CAL_PRIORITY} /></Field>}
        </div>
      </>)}

      {type === 'control' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Критерий результата"><Input value={f.criterion} onChange={(e) => set('criterion', e.target.value)} placeholder="напр. задержка > 60 мин" /></Field>
          <Field label="Действие при проблеме"><Input value={f.actionOnProblem} onChange={(e) => set('actionOnProblem', e.target.value)} placeholder="напр. создать задачу оператору" /></Field>
        </div>
      )}

      {/* Повторение + права доступа */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {type !== 'order' && <Field label="Повторение"><Select value={f.repeat} onChange={(e) => set('repeat', e.target.value)} options={CAL_REPEAT} /></Field>}
        {type === 'reminder' && <Field label="Способ уведомления"><Select value={f.notify} onChange={(e) => set('notify', e.target.value)} options={CAL_NOTIFY} /></Field>}
        <Field label="Назначить"><Select value={f.scope} onChange={(e) => set('scope', e.target.value)} options={CAL_SCOPE} /></Field>
        {f.scope === 'На весь заказ' && <Field label="Ответственный по услуге"><Select value={f.respRole} onChange={(e) => set('respRole', e.target.value)} options={CAL_RESP_ROLE} /></Field>}
      </div>
      <Field label="Комментарий"><Input value={f.comment} onChange={(e) => set('comment', e.target.value)} placeholder="Необязательно" /></Field>

      {type === 'control' && (f.title || f.criterion) && (
        <div style={{ marginTop: 4, padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)', fontSize: 12.5, color: 'var(--body)' }}>
          <b>Контроль:</b> {f.title || '—'}{f.order ? ' · заказ № ' + f.order : ''}<br />Проверить {f.dateStr} в {f.time}. {f.criterion ? 'При «' + f.criterion + '» → ' + (f.actionOnProblem || 'уведомить ответственного') + '.' : ''}
          <div style={{ color: 'var(--muted-2)', marginTop: 4 }}>В будущем — авто-мониторинг через API; пока работает как ручная проверка.</div>
        </div>
      )}
    </StackPanel>
  );
}

/* ==================================================================== */
/* Компактный чип события в ячейке календаря                            */
/* ==================================================================== */
function CalEventChip({ evt, onOpen }) {
  const t = CAL_EVENT_TYPES[evt.type];
  return (
    <span className="tc-month-chip" style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: evt.done ? 0.5 : 1 }}
      onClick={(e) => { e.stopPropagation(); onOpen(evt); }} title={t.l + ' · ' + evt.title}>
      <Icon name={t.icon} style={{ width: 11, height: 11, color: 'var(--' + t.tone + ')', flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{evt.time ? evt.time + ' ' : ''}{evt.title}</span>
    </span>
  );
}

/* ==================================================================== */
/* Боковая панель события                                               */
/* ==================================================================== */
function CalEventPanel({ evt, onClose, onChanged, onOpenOrder }) {
  const toast = useToast();
  const t = CAL_EVENT_TYPES[evt.type];
  const info = evt.order ? calOrderInfo(evt.order) : null;
  const log = (text) => { evt.history = [...evt.history, { t: calNowStr(), text, who: (window.CURRENT_USER && CURRENT_USER.name) || 'Даниель' }]; onChanged && onChanged(); };
  const complete = () => { evt.done = true; log('Событие выполнено'); toast('Событие отмечено выполненным' + (evt.repeat && evt.repeat !== 'Не повторять' ? ' · повторение остановлено' : ''), 'ok'); onChanged && onChanged(); };
  const move = () => { evt.date = new Date(evt.date.getTime() + 86400000); log('Срок перенесён на +1 день'); toast('Срок перенесён на следующий день', 'info'); onChanged && onChanged(); };
  return (
    <Drawer open={!!evt} onClose={onClose} title={evt.title} sub={t.l + ' · ' + calFmtDay(evt.date) + (evt.time ? ' · ' + evt.time : '')}
      footer={<div style={{ display: 'flex', gap: 10, width: '100%' }}>
        {!evt.done && <Button style={{ flex: 1 }} icon="check" onClick={complete}>Выполнить</Button>}
        <Button variant="secondary" icon="clock" onClick={move}>Перенести</Button>
        {evt.order && <Button variant="secondary" icon="orders" onClick={() => { onClose(); onOpenOrder && onOpenOrder(evt.order); }}>Заказ</Button>}
      </div>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span className="oc-svc-ic" style={{ background: 'var(--' + t.tone + '-bg, var(--surface-2))', color: 'var(--' + t.tone + ')', width: 36, height: 36 }}><Icon name={t.icon} /></span>
        <Pill tone={t.tone}>{t.l}</Pill>
        {evt.priority && <Pill tone={CAL_PRIORITY_TONE[evt.priority]}>Приоритет: {evt.priority}</Pill>}
        {evt.done && <Pill tone="green">Выполнено</Pill>}
      </div>
      <div className="card card-pad" style={{ marginBottom: 14 }}>
        {evt.order && <FinRow label="Заказ" value={'№ ' + evt.order} />}
        {evt.service && <FinRow label="Услуга" value={evt.service} />}
        {evt.pax && <FinRow label="Пассажир" value={evt.pax} />}
        {evt.supplier && <FinRow label="Поставщик" value={evt.supplier} />}
        <FinRow label="Ответственный" value={evt.resp} />
        {evt.scope && <FinRow label="Назначено" value={evt.scope + (evt.respRole && evt.respRole !== '—' ? ' · ' + evt.respRole : '')} />}
        {evt.notify && <FinRow label="Уведомление" value={evt.notify} />}
        {evt.repeat && <FinRow label="Повторение" value={evt.repeat} />}
        {evt.criterion && <FinRow label="Критерий" value={evt.criterion} />}
        {evt.actionOnProblem && <FinRow label="При проблеме" value={evt.actionOnProblem} />}
        {evt.comment && <FinRow label="Комментарий" value={evt.comment} />}
      </div>
      {info && (
        <div className="card card-pad" style={{ marginBottom: 14, background: 'var(--surface-2)' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', marginBottom: 6 }}>Связанный заказ № {info.no}</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Клиент: {info.client} · пассажиров: {info.pax} · услуг: {info.services}</div>
          <div style={{ fontSize: 12.5, color: 'var(--amber)' }}>Ближайший дедлайн: {info.deadline}</div>
        </div>
      )}
      <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>История</h3>
      <div style={{ display: 'grid', gap: 6 }}>
        {evt.history.map((h, i) => <div key={i} style={{ fontSize: 12.5, color: 'var(--body)' }}><span style={{ color: 'var(--muted-2)', marginRight: 6 }}>{h.t}</span>{h.text} · <span style={{ color: 'var(--muted)' }}>{h.who}</span></div>)}
      </div>
    </Drawer>
  );
}

Object.assign(window, { CAL_EVENTS, CAL_EVENT_TYPES, calEventsOn, calAddEvent, CalDayMenu, CalEventCreator, CalEventChip, CalEventPanel });
