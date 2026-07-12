// ===== Suppliers: list + info modal (tabs) + add drawer (расширенная карточка по ТЗ) =====

function MiniLineChart() {
  // two smooth lines: Отмены (red), Успешные (green)
  const w = 420, h = 150, pad = 6;
  const mk = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${pad + (i / (pts.length - 1)) * (w - pad * 2)},${h - pad - (p / 100) * (h - pad * 2)}`).join(' ');
  const red = [22, 30, 28, 18, 44, 78, 60, 70, 84, 58];
  const green = [40, 52, 60, 56, 50, 38, 56, 64, 50, 30];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 170 }}>
      {[0, 20, 40, 60, 80, 100].map((g, i) => (
        <line key={i} x1={pad} x2={w - pad} y1={h - pad - (g / 100) * (h - pad * 2)} y2={h - pad - (g / 100) * (h - pad * 2)} stroke="#eef0f4" strokeWidth="1" />
      ))}
      <path d={mk(green)} fill="none" stroke="#2bb96a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d={mk(red)} fill="none" stroke="#ec4444" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ====================================================================
   Справочники расширенной карточки поставщика (ТЗ)
   ==================================================================== */
// Цветной бейдж поставщика (как «Островок» в отелях) — брендовая рамка, цвет стабилен по имени
const SUP_BRAND_COLORS = [
  { fg: '#0e9f6e', bg: '#e6f6ee', bd: '#a5ddc4' },
  { fg: '#2566ff', bg: '#e9f0ff', bd: '#bcd2ff' },
  { fg: '#b45309', bg: '#fdf1dd', bd: '#f1d09c' },
  { fg: '#7c3aed', bg: '#f2ebfe', bd: '#d6c2f8' },
  { fg: '#db2777', bg: '#fde8f1', bd: '#f7bcd6' },
  { fg: '#0891b2', bg: '#e2f5fa', bd: '#abe1ed' },
  { fg: '#4f46e5', bg: '#ecebfd', bd: '#c5c2f6' },
];
function supBrand(name) { let h = 0; const s = String(name || ''); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return SUP_BRAND_COLORS[h % SUP_BRAND_COLORS.length]; }
function SupplierBadge({ name, icon = 'suppliers', size = 'md' }) {
  const c = supBrand(name);
  const pad = size === 'sm' ? '3px 8px' : '5px 11px';
  const fs = size === 'sm' ? 12 : 13.5;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: pad, borderRadius: 9, fontSize: fs, fontWeight: 600, color: c.fg, background: c.bg, border: '1px solid ' + c.bd, width: 'fit-content', lineHeight: 1.2 }}>
      <Icon name={icon} style={{ width: 13, height: 13 }} />{name}
    </span>
  );
}

const SUPPLIER_TYPES = ['API', 'Локальный', 'Консолидатор', 'GDS'];
const SUP_SERVICE_KINDS = ['Авиа', 'ЖД', 'Гостиницы', 'Трансферы', 'Автобусы', 'Страхование', 'Визы', 'Прочее'];
const SUP_COMM_METHODS = ['Telegram', 'WhatsApp', 'Email', 'Телефон', 'Чат', 'Макс'];
// Страна/город — выпадающие списки (справочники); города зависят от выбранной страны
const SUP_COUNTRIES = ['Кыргызстан', 'Казахстан', 'Россия', 'Узбекистан', 'Таджикистан', 'Турция', 'ОАЭ', 'Другое'];
const SUP_CITIES = {
  'Кыргызстан': ['Бишкек', 'Ош', 'Джалал-Абад', 'Каракол', 'Токмок'],
  'Казахстан': ['Алматы', 'Астана', 'Шымкент', 'Караганда'],
  'Россия': ['Москва', 'Санкт-Петербург', 'Казань', 'Новосибирск', 'Екатеринбург'],
  'Узбекистан': ['Ташкент', 'Самарканд', 'Бухара'],
  'Таджикистан': ['Душанбе', 'Худжанд'],
  'Турция': ['Стамбул', 'Анкара', 'Анталья'],
  'ОАЭ': ['Дубай', 'Абу-Даби', 'Шарджа'],
  'Другое': ['—'],
};
function supCitiesFor(country) { return SUP_CITIES[country] || ['—']; }
// Часы работы — выборка (roll)
const SUP_WORK_HOURS = ['Круглосуточно', 'Пн–Пт 09:00–18:00', 'Пн–Сб 09:00–19:00', 'Пн–Вс 08:00–22:00', 'Пн–Пт 10:00–19:00'];
// Привязка мессенджеров: после отметки способа связи появляется поле привязки.
// Через привязанный канал сообщения из чата CRM уходят поставщику и ответы возвращаются в тот же тред.
const SUP_COMM_CONFIG = {
  'Telegram': { field: 'Аккаунт / бот', placeholder: '@username или номер', hint: 'Сообщения из чата уходят в Telegram через бота, ответы возвращаются в тред CRM.' },
  'WhatsApp': { field: 'Номер WhatsApp', placeholder: '+996 700 000 000', hint: 'Через WhatsApp Business API — переписка синхронизируется с чатом заказа.' },
  'Email': { field: 'E-mail', placeholder: 'mail@example.com', hint: 'Письма дублируются в тред чата, ответы подтягиваются обратно.' },
  'Телефон': { field: 'Номер телефона', placeholder: '+996 700 000 000', hint: 'Голосовой канал — звонки фиксируются в истории заказа.' },
  'Чат': { field: null, placeholder: '', hint: 'Внутренний чат CRM — привязка не требуется, поставщик отвечает прямо в системе.' },
  'Макс': { field: 'ID / номер в MAX', placeholder: 'ID или номер в MAX', hint: 'Мессенджер MAX через API — сообщения маршрутизируются в тред чата CRM.' },
};
const SUP_OPS = ['Бронирование', 'Выписка', 'Возврат', 'Обмен', 'Аннуляция', 'Дополнительные услуги'];
const SUP_DOC_KINDS = ['Договор', 'Дополнительные соглашения', 'Реквизиты', 'Сертификаты', 'Прочие файлы'];
const SUP_COMM_TYPES = ['%', 'Фиксированная', 'Смешанная'];
const SUP_SETTLEMENTS = ['Предоплата', 'Депозит', 'Отсрочка', 'По факту'];
const SUP_AUTOMATION = [
  { key: 'auto', label: 'Автоматически участвует в поиске', hint: 'Поставщик опрашивается при каждом поиске' },
  { key: 'manual', label: 'Только ручной запрос', hint: 'Показывается только по запросу оператора' },
  { key: 'reserve', label: 'Использовать как резервного поставщика', hint: 'Подключается, если основные не ответили' },
  { key: 'hidden', label: 'Не показывать при поиске', hint: 'Исключён из выдачи полностью' },
];
const SUP_AUTOMATION_LABEL = SUP_AUTOMATION.reduce((m, a) => (m[a.key] = a.label, m), {});
// Финансовые условия поставщика — по каждому виду услуг отдельно (заменяет поле «Комиссия/маржа»)
const SUP_FIN_KEYS = [
  { key: 'commission', label: 'Комиссионное вознаграждение' },
  { key: 'service', label: 'Сервисный сбор' },
  { key: 'exchange', label: 'Сбор за обмен' },
  { key: 'refund', label: 'Сбор за возврат' },
];
// Приоритеты поиска (ТЗ: ключевой блок — система выбирает поставщика по этому порядку)
const SUP_PRIORITY_SERVICES = ['Авиа', 'ЖД', 'Гостиницы', 'Трансферы'];
const SUP_SEARCH_ORDER = window.SUP_SEARCH_ORDER || (window.SUP_SEARCH_ORDER = {
  'Авиа': ['Sirena', 'NDC', 'Sabre', 'S7 Airlines', 'Emirates'],
  'ЖД': ['УФС', 'ИМ Перевозчика', 'Локальные поставщики'],
  'Гостиницы': ['Ratehawk', 'Островок', 'Локальные поставщики', 'Jannat Hotel'],
  'Трансферы': ['Karimov Transfer', 'Айбек Асылов', 'Локальные поставщики'],
});

function supEmptyFin(kinds) {
  const out = {};
  (kinds && kinds.length ? kinds : SUP_SERVICE_KINDS).forEach((k) => {
    out[k] = {};
    SUP_FIN_KEYS.forEach((f) => { out[k][f.key] = { type: f.key === 'commission' ? 'percent' : 'fixed', value: 0 }; });
  });
  return out;
}

/* Расширенный профиль поставщика. Существующие демо-записи достраиваются
   правдоподобными данными один раз и далее редактируются на месте. */
const SUP_EXT = window.SUP_EXT || (window.SUP_EXT = {});
function supExt(s) {
  if (s.ext) return s.ext;
  if (!SUP_EXT[s.no]) {
    const seed = s.no % 5;
    const isApi = s.type === 'Глобальный' || s.orgType === 'Авиакомпания';
    const kinds = s.service === 'Авиа' ? ['Авиа'] : s.service === 'Отель' ? ['Гостиницы'] : s.service === 'Трансфер' ? ['Трансферы'] : [s.service];
    const fin = supEmptyFin(kinds);
    kinds.forEach((k) => {
      fin[k].commission = { type: 'percent', value: 8 + seed };
      fin[k].service = { type: 'fixed', value: 10 + seed * 2 };
      fin[k].exchange = { type: 'fixed', value: 20 + seed * 2 };
      fin[k].refund = { type: 'fixed', value: 15 + seed };
    });
    SUP_EXT[s.no] = {
      supType: isApi ? 'API' : 'Локальный',
      kinds,
      priority: 1 + seed,
      useDefault: seed === 0,
      country: 'Кыргызстан',
      city: 'Бишкек',
      api: {
        url: 'https://api.' + s.org.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com/v2',
        apiKey: 'sk_' + String(s.no) + 'a9f3', login: 'psc_travelhub', password: '••••••••', token: 'tok_' + String(s.no) + 'x7',
        version: 'v2.4', status: seed === 3 ? 'Ошибка' : 'Подключено', lastSync: '05.07.2026 09:3' + seed,
      },
      local: { contact: 'Меркель Александр', comm: ['Telegram', 'Email', 'Телефон'], commBind: { 'Telegram': '@' + s.org.toLowerCase().replace(/[^a-z0-9]/g, ''), 'Email': 'sales@' + s.org.toLowerCase().replace(/[^a-z]/g, '') + '.com', 'Телефон': '+996 (555) 123-456' }, processing: 30 + seed * 10, hours: 'Пн–Сб 09:00–19:00' },
      fin: { currency: s.currency, commType: '%', commValue: 8 + seed, vat: seed % 2 ? '12%' : 'Без НДС', settlement: SUP_SETTLEMENTS[seed % SUP_SETTLEMENTS.length], payTerm: 5 + seed * 2, perService: fin },
      ops: { 'Бронирование': true, 'Выписка': true, 'Возврат': seed !== 2, 'Обмен': seed !== 4, 'Аннуляция': true, 'Дополнительные услуги': seed % 2 === 0 },
      automation: seed === 3 ? 'reserve' : 'auto',
      searchPriority: kinds.reduce((m, k) => (SUP_PRIORITY_SERVICES.includes(k) ? (m[k] = 1 + seed, m) : m), {}),
      stats: { bookings: 84 + s.no % 200, issues: 61 + s.no % 160, refunds: 3 + seed, avgResponse: (2 + seed) + ' мин', successRate: (91 + seed) + '%', lastUsed: '0' + (5 - (seed % 3)) + '.07.2026' },
      docs: { 'Договор': ['Договор оферты.pdf'], 'Дополнительные соглашения': ['ДС №2 от 03.2026.pdf'], 'Реквизиты': ['Реквизиты.pdf'], 'Сертификаты': s.orgType === 'Авиакомпания' ? ['Сертификат IATA.pdf'] : [], 'Прочие файлы': [] },
    };
  }
  return SUP_EXT[s.no];
}
function supFinSummary(ext) {
  return ext.fin.commType === '%' ? ext.fin.commValue + ' %' : ext.fin.commType === 'Фиксированная' ? ext.fin.commValue + ' ' + ext.fin.currency : ext.fin.commValue + ' % + сборы';
}

/* Редактор авиа-надбавок поставщика: авиакомпания → (внутри РФ / международные) + точечные маршруты.
   Наценка применяется к базовой цене тарифа и отражается в поиске. */
function AviaMarkupEditor({ supplierName }) {
  const toast = useToast();
  const [cfg, setCfg] = useState(() => JSON.parse(JSON.stringify(aviaMarkupsFor(supplierName))));
  const [addAir, setAddAir] = useState('');
  const airCodes = Object.keys(cfg);
  const available = Object.keys(AIRLINES).filter((c) => !cfg[c]);

  const persist = (next) => { setCfg(next); AVIA_MARKUPS[supplierName] = JSON.parse(JSON.stringify(next)); };
  const addAirline = () => { if (!addAir) return; persist({ ...cfg, [addAir]: { domestic: { type: 'percent', value: 0 }, intl: { type: 'percent', value: 0 }, routes: [] } }); setAddAir(''); toast('Добавлена ' + AIRLINES[addAir].name, 'ok'); };
  const removeAirline = (code) => { const n = { ...cfg }; delete n[code]; persist(n); };
  const setBucket = (code, bucket, patch) => persist({ ...cfg, [code]: { ...cfg[code], [bucket]: { ...cfg[code][bucket], ...patch } } });
  const addRoute = (code) => persist({ ...cfg, [code]: { ...cfg[code], routes: [...(cfg[code].routes || []), { from: '', to: '', type: 'fixed', value: 0 }] } });
  const setRoute = (code, i, patch) => persist({ ...cfg, [code]: { ...cfg[code], routes: cfg[code].routes.map((r, j) => (j === i ? { ...r, ...patch } : r)) } });
  const removeRoute = (code, i) => persist({ ...cfg, [code]: { ...cfg[code], routes: cfg[code].routes.filter((_, j) => j !== i) } });

  // inline-рендер (не компонент) — чтобы поля не теряли фокус при перерисовке
  const bucketRow = (code, bucket, label) => {
    const b = cfg[code][bucket];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ flex: 1, minWidth: 130, fontSize: 13, color: 'var(--body)' }}>{label}</span>
        <div className="seg-toggle" style={{ width: 150 }}>
          <button className={'seg-btn' + (b.type === 'percent' ? ' active' : '')} onClick={() => setBucket(code, bucket, { type: 'percent' })}>%</button>
          <button className={'seg-btn' + (b.type === 'fixed' ? ' active' : '')} onClick={() => setBucket(code, bucket, { type: 'fixed' })}>Фикс.</button>
        </div>
        <div style={{ width: 110 }}><Input type="number" value={b.value} onChange={(e) => setBucket(code, bucket, { value: parseFloat(e.target.value) || 0 })} /></div>
        <span style={{ width: 18, color: 'var(--muted)', fontSize: 13 }}>{b.type === 'percent' ? '%' : '$'}</span>
      </div>
    );
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
        Наценка задаётся по авиакомпании и маршруту. Базовые строки — внутри РФ и международные; точечные маршруты имеют приоритет. Наценка отражается в поиске уже с надбавкой.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {airCodes.length === 0 && <div className="card card-pad" style={{ color: 'var(--muted)' }}>Надбавки не заданы. Добавьте авиакомпанию ниже.</div>}
        {airCodes.map((code) => (
          <div className="card card-pad" key={code}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <AirlineLogo code={code} size="sm" />
              <div style={{ flex: 1, fontWeight: 700, color: 'var(--ink)' }}>{AIRLINES[code].name}</div>
              <Button variant="ghost" size="sm" icon="trash" onClick={() => removeAirline(code)}>Убрать</Button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bucketRow(code, 'domestic', 'Внутри РФ')}
              {bucketRow(code, 'intl', 'Международные')}
            </div>
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Точечные маршруты</span>
                <Button variant="ghost" size="sm" icon="plus" onClick={() => addRoute(code)}>Маршрут</Button>
              </div>
              {(cfg[code].routes || []).length === 0 && <div style={{ fontSize: 12, color: 'var(--muted-2)' }}>Нет точечных маршрутов.</div>}
              {(cfg[code].routes || []).map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <div style={{ width: 74 }}><Input value={r.from} onChange={(e) => setRoute(code, i, { from: e.target.value.toUpperCase() })} placeholder="FRU" /></div>
                  <Icon name="chevRight" style={{ width: 14, height: 14, color: 'var(--muted-2)' }} />
                  <div style={{ width: 74 }}><Input value={r.to} onChange={(e) => setRoute(code, i, { to: e.target.value.toUpperCase() })} placeholder="IST" /></div>
                  <div className="seg-toggle" style={{ width: 130 }}>
                    <button className={'seg-btn' + (r.type === 'percent' ? ' active' : '')} onClick={() => setRoute(code, i, { type: 'percent' })}>%</button>
                    <button className={'seg-btn' + (r.type === 'fixed' ? ' active' : '')} onClick={() => setRoute(code, i, { type: 'fixed' })}>Фикс.</button>
                  </div>
                  <div style={{ width: 90 }}><Input type="number" value={r.value} onChange={(e) => setRoute(code, i, { value: parseFloat(e.target.value) || 0 })} /></div>
                  <button className="icon-btn" onClick={() => removeRoute(code, i)}><Icon name="trash" /></button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {available.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <div style={{ width: 240 }}>
            <Select placeholder="Добавить авиакомпанию…" options={available.map((c) => ({ value: c, label: AIRLINES[c].name }))} value={addAir} onChange={(e) => setAddAir(e.target.value)} />
          </div>
          <Button variant="secondary" size="sm" icon="plus" disabled={!addAir} onClick={addAirline}>Добавить</Button>
        </div>
      )}
    </div>
  );
}

/* ---------- Финансовые условия поставщика: сборы по каждому виду услуг (ТЗ) ---------- */
function SupplierFinEditor({ ext, onSaved }) {
  const toast = useToast();
  const kinds = ext.kinds.length ? ext.kinds : SUP_SERVICE_KINDS.slice(0, 1);
  const [kind, setKind] = useState(kinds[0]);
  const [fin, setFin] = useState(() => JSON.parse(JSON.stringify(ext.fin)));
  const setBase = (k, v) => setFin((f) => ({ ...f, [k]: v }));
  const setFee = (svc, key, patch) => setFin((f) => {
    const per = JSON.parse(JSON.stringify(f.perService));
    if (!per[svc]) per[svc] = supEmptyFin([svc])[svc];
    per[svc][key] = { ...per[svc][key], ...patch };
    return { ...f, perService: per };
  });
  const save = () => { ext.fin = JSON.parse(JSON.stringify(fin)); onSaved && onSaved(); toast('Финансовые условия сохранены', 'ok'); };
  const fees = fin.perService[kind] || supEmptyFin([kind])[kind];

  return (
    <div>
      <div className="form-grid" style={{ marginBottom: 16 }}>
        <Field label="Валюта расчетов"><Select options={CURRENCIES.map((c) => c.code)} value={fin.currency} onChange={(e) => setBase('currency', e.target.value)} /></Field>
        <Field label="Тип комиссии"><Select options={SUP_COMM_TYPES} value={fin.commType} onChange={(e) => setBase('commType', e.target.value)} /></Field>
        <Field label="Размер комиссии"><Input type="number" value={fin.commValue} onChange={(e) => setBase('commValue', parseFloat(e.target.value) || 0)} /></Field>
        <Field label="НДС"><Select options={['Без НДС', '12%', '20%']} value={fin.vat} onChange={(e) => setBase('vat', e.target.value)} /></Field>
        <Field label="Способ взаиморасчетов"><Select options={SUP_SETTLEMENTS} value={fin.settlement} onChange={(e) => setBase('settlement', e.target.value)} /></Field>
        <Field label="Срок оплаты" hint="дней"><Input type="number" min="0" value={typeof fin.payTerm === 'number' ? fin.payTerm : parseInt(fin.payTerm) || 0} onChange={(e) => setBase('payTerm', parseInt(e.target.value) || 0)} placeholder="напр. 10" /></Field>
      </div>

      <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Сборы по видам услуг</div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>Комиссии, сервисные сборы, сборы за обмен и возврат настраиваются отдельно по каждому виду услуг — одна карточка поставщика для всех сценариев.</div>
      <div className="tabs" style={{ marginBottom: 12 }}>
        {kinds.map((k) => <button key={k} className={'tab' + (kind === k ? ' active' : '')} onClick={() => setKind(k)}>{k}</button>)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SUP_FIN_KEYS.map((f) => {
          const fee = fees[f.key];
          return (
            <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ flex: 1, minWidth: 170, fontSize: 13.5, color: 'var(--body)' }}>{f.label}</span>
              <div className="seg-toggle" style={{ width: 150 }}>
                <button className={'seg-btn' + (fee.type === 'percent' ? ' active' : '')} onClick={() => setFee(kind, f.key, { type: 'percent' })}>%</button>
                <button className={'seg-btn' + (fee.type === 'fixed' ? ' active' : '')} onClick={() => setFee(kind, f.key, { type: 'fixed' })}>Фикс.</button>
              </div>
              <div style={{ width: 110 }}><Input type="number" value={fee.value} onChange={(e) => setFee(kind, f.key, { value: parseFloat(e.target.value) || 0 })} /></div>
              <span style={{ width: 26, color: 'var(--muted)', fontSize: 13 }}>{fee.type === 'percent' ? '%' : fin.currency}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <Button icon="check" onClick={save}>Сохранить условия</Button>
      </div>
    </div>
  );
}

/* ---------- «Для поиска»: автоматизация + приоритеты по видам услуг (ТЗ, ключевой блок) ---------- */
function SupplierSearchEditor({ ext, supplierName }) {
  const toast = useToast();
  const [auto, setAuto] = useState(ext.automation);
  const [prio, setPrio] = useState({ ...ext.searchPriority });
  const save = () => { ext.automation = auto; ext.searchPriority = { ...prio }; toast('Настройки поиска сохранены', 'ok'); };
  return (
    <div>
      <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Автоматизация</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
        {SUP_AUTOMATION.map((a) => (
          <button key={a.key} onClick={() => setAuto(a.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12, border: '1px solid ' + (auto === a.key ? 'var(--blue)' : 'var(--field-line)'), background: auto === a.key ? 'var(--blue-soft)' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
            <Radio on={auto === a.key} onChange={() => setAuto(a.key)} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{a.label}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{a.hint}</div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Приоритет поиска по видам услуг</div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>1 — наивысший. По этим приоритетам система автоматически выбирает поставщика при поиске.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420 }}>
        {SUP_PRIORITY_SERVICES.map((svc) => (
          <div key={svc} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ flex: 1, fontSize: 13.5, color: 'var(--body)' }}>Приоритет по: {svc}</span>
            <div style={{ width: 110 }}>
              <Input type="number" min="1" value={prio[svc] != null ? prio[svc] : ''} placeholder="—"
                onChange={(e) => setPrio((p) => ({ ...p, [svc]: e.target.value === '' ? null : Math.max(1, parseInt(e.target.value) || 1) }))} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <Button icon="check" onClick={save}>Сохранить</Button>
      </div>
    </div>
  );
}

/* ---------- Общий порядок опроса поставщиков при поиске (по видам услуг) ---------- */
function SearchPriorityModal({ open, onClose }) {
  const toast = useToast();
  const [svc, setSvc] = useState(SUP_PRIORITY_SERVICES[0]);
  const [order, setOrder] = useState(() => JSON.parse(JSON.stringify(SUP_SEARCH_ORDER)));
  if (!open) return null;
  const move = (i, d) => setOrder((o) => {
    const list = [...o[svc]];
    const j = i + d;
    if (j < 0 || j >= list.length) return o;
    [list[i], list[j]] = [list[j], list[i]];
    return { ...o, [svc]: list };
  });
  const save = () => { Object.assign(SUP_SEARCH_ORDER, JSON.parse(JSON.stringify(order))); toast('Порядок поиска сохранён', 'ok'); onClose(); };
  return (
    <Drawer open={open} onClose={onClose} title="Приоритеты поиска" sub="Порядок, в котором система опрашивает поставщиков при автоматическом подборе"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button icon="check" onClick={save}>Сохранить порядок</Button>
      </>}>
        <Tabs tabs={SUP_PRIORITY_SERVICES.map((s) => ({ key: s, label: s }))} value={svc} onChange={setSvc} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          {order[svc].map((name, i) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, border: '1px solid var(--field-line)', background: '#fff' }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, background: i === 0 ? 'var(--blue)' : 'var(--surface-2)', color: i === 0 ? '#fff' : 'var(--muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{i + 1}</span>
              <span style={{ flex: 1, fontWeight: 600, color: 'var(--ink)' }}>{name}</span>
              <button className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} style={i === 0 ? { opacity: .35 } : null}><Icon name="chevUp" /></button>
              <button className="icon-btn" disabled={i === order[svc].length - 1} onClick={() => move(i, 1)} style={i === order[svc].length - 1 ? { opacity: .35 } : null}><Icon name="chevDown" /></button>
            </div>
          ))}
        </div>
    </Drawer>
  );
}

const SUP_TABS = [
  { key: 'general', label: 'Общие данные', icon: 'user' },
  { key: 'contacts', label: 'Контакты', icon: 'contacts' },
  { key: 'finance', label: 'Финансовые условия', icon: 'finance' },
  { key: 'search', label: 'Для поиска', icon: 'search' },
  { key: 'stats', label: 'Статистика', icon: 'pie' },
  { key: 'markups', label: 'Надбавки / таксы', icon: 'calc', airlineOnly: true },
  { key: 'api', label: 'Интеграция / API', icon: 'api' },
  { key: 'sla', label: 'SLA', icon: 'sla' },
  { key: 'docs', label: 'Документы', icon: 'docs' },
];

function SupplierModal({ supplier, onClose, onDelete }) {
  const toast = useToast();
  const [tab, setTab] = useState('general');
  const [apiStatus, setApiStatus] = useState(null); // null | 'checking' | 'ok'
  if (!supplier) return null;
  const s = supplier;
  const ext = supExt(s);
  const isAirline = s.orgType === 'Авиакомпания';
  const isApiType = ext.supType !== 'Локальный';
  const tabs = SUP_TABS.filter((t) => (!t.airlineOnly || isAirline) && (t.key !== 'api' || isApiType));
  const tabMeta = tabs.find((t) => t.key === tab) || tabs[0];

  const checkConn = () => {
    setApiStatus('checking');
    setTimeout(() => { setApiStatus('ok'); ext.api.status = 'Подключено'; ext.api.lastSync = 'только что'; toast('Подключение успешно', 'ok'); }, 1200);
  };

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingBottom: 18, borderBottom: '1px solid var(--line)', marginBottom: 20 }}>
      <Avatar name={s.name} size={64} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>{s.name}</div>
        <div style={{ color: 'var(--muted)' }}>{ext.supType} · {ext.kinds.join(', ')} · {ext.country}, {ext.city}</div>
      </div>
      {ext.useDefault && <Pill tone="blue">По умолчанию</Pill>}
      <Pill tone={SUPPLIER_STATUS[s.status]}>{s.status}</Pill>
    </div>
  );

  // Боковое окно (единообразно с формой добавления), а не модалка по центру.
  return (
    <Drawer open onClose={onClose} width="min(940px,97vw)"
      title="Информация поставщика" sub={tabMeta.label}
      footer={<>
        <Button variant="secondary" icon="edit" onClick={() => toast('Редактирование поставщика', 'info')}>Редактировать</Button>
        <Button variant="secondary" icon="trash" onClick={onDelete}>Удалить</Button>
        <Button variant="secondary" icon="share" onClick={() => toast('Ссылка скопирована', 'ok')}>Поделиться</Button>
      </>}>
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '232px 1fr', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: 13, border: '1px solid var(--field-line)', background: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 500, color: 'var(--ink)', textAlign: 'left' }}>
                <Icon name={t.icon} style={{ width: 19, height: 19, color: 'var(--blue)' }} />
                <span style={{ flex: 1 }}>{t.label}</span>
                <span className={'radio' + (tab === t.key ? ' on' : '')} />
              </button>
            ))}
          </div>
          <div style={{ minHeight: 320 }}>
            {header}
            {tab === 'general' && (
              <div className="kv">
                {[['Поставщик', s.name], ['Тип поставщика', ext.supType], ['Вид услуг', ext.kinds.join(', ')],
                  ['Организация', s.org], ['Страна / город', ext.country + ', ' + ext.city],
                  ['Приоритет поставщика', String(ext.priority)],
                  ['Использовать по умолчанию', ext.useDefault ? 'Да' : 'Нет'],
                  ['Валюта расчета', ext.fin.currency]].map(([k, v], i) => (
                  <div className="kv-row" key={i}><span className="k">{k}</span><span className="v">{v}</span></div>
                ))}
              </div>
            )}
            {tab === 'contacts' && (
              <div>
                <div className="kv">
                  {[['Контактное лицо', ext.local.contact],
                    ['Время обработки заявок', (typeof ext.local.processing === 'number' ? ext.local.processing + ' мин' : ext.local.processing)],
                    ['Часы работы', ext.local.hours],
                    ['Адрес', ext.city + ', ул. Киевская 124']].map(([k, v], i) => (
                    <div className="kv-row" key={i}><span className="k">{k}</span><span className="v">{v}</span></div>
                  ))}
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', margin: '16px 0 8px' }}>Каналы связи (привязка мессенджеров)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ext.local.comm.map((m) => {
                    const cfg = SUP_COMM_CONFIG[m] || {};
                    const bind = (ext.local.commBind && ext.local.commBind[m]) || (cfg.field ? '—' : 'встроенный чат CRM');
                    return (
                      <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--field-line)' }}>
                        <span style={{ width: 90, fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{m}</span>
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--body)' }}>{bind}</span>
                        <Pill tone="green">подключён</Pill>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <Icon name="chat" style={{ width: 14, height: 14, color: 'var(--blue)', flexShrink: 0, marginTop: 1 }} />
                  Сообщения из чата заказа уходят поставщику через привязанный канал, ответы возвращаются в тот же тред CRM.
                </div>
              </div>
            )}
            {tab === 'finance' && <SupplierFinEditor ext={ext} />}
            {tab === 'search' && <SupplierSearchEditor ext={ext} supplierName={s.name} />}
            {tab === 'stats' && (
              <div>
                <div className="grid-2" style={{ gap: 12, marginBottom: 16 }}>
                  {[['Бронирований', ext.stats.bookings], ['Выписок', ext.stats.issues], ['Возвратов', ext.stats.refunds],
                    ['Среднее время ответа', ext.stats.avgResponse], ['Успешных бронирований', ext.stats.successRate], ['Последнее использование', ext.stats.lastUsed]].map(([l, v], i) => (
                    <div className="stat-card" key={i}><div className="s-label">{l}</div><div className="s-value" style={{ fontSize: 22 }}>{v}</div></div>
                  ))}
                </div>
                <div className="card card-pad">
                  <MiniLineChart />
                  <div className="legend" style={{ marginTop: 8 }}>
                    <div className="legend-item" style={{ fontSize: 14 }}><span className="dot" style={{ background: '#ec4444', borderRadius: '50%' }} />Отмены</div>
                    <div className="legend-item" style={{ fontSize: 14 }}><span className="dot" style={{ background: '#2bb96a', borderRadius: '50%' }} />Успешные</div>
                  </div>
                </div>
              </div>
            )}
            {tab === 'markups' && isAirline && <AviaMarkupEditor supplierName={s.name} />}
            {tab === 'api' && (
              <div>
                <div className="kv">
                  {[['URL API', ext.api.url], ['API Key', ext.api.apiKey], ['Login', ext.api.login], ['Token', ext.api.token],
                    ['Версия API', ext.api.version], ['Последняя синхронизация', ext.api.lastSync]].map(([k, v], i) => (
                    <div className="kv-row" key={i}><span className="k">{k}</span><span className="v" style={{ maxWidth: 280, wordBreak: 'break-all' }}>{v}</span></div>
                  ))}
                  <div className="kv-row"><span className="k">Статус подключения</span><span className="v">
                    <Pill tone={apiStatus === 'ok' || ext.api.status === 'Подключено' ? 'green' : 'red'}>{apiStatus === 'checking' ? 'Проверка…' : (apiStatus === 'ok' ? 'Подключено' : ext.api.status)}</Pill>
                  </span></div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  <Button variant="secondary" icon="zap" disabled={apiStatus === 'checking'} onClick={checkConn}>{apiStatus === 'checking' ? 'Проверка…' : 'Проверить подключение'}</Button>
                  <Button variant="secondary" icon="api" onClick={() => toast('Синхронизация запущена', 'ok')}>Синхронизировать сейчас</Button>
                </div>
              </div>
            )}
            {tab === 'sla' && (
              <div className="kv">
                {[['Время ответа (мин)', '30 мин.'], ['Дедлайн подтверждения (часы)', '6 ч.'], ['Каналы уведомлений', ext.local.comm.join(', ')], ['Приоритет поставщика', String(ext.priority)], ['Условия оплаты', ext.fin.settlement + ' · ' + (typeof ext.fin.payTerm === 'number' ? ext.fin.payTerm + ' дн.' : ext.fin.payTerm)]].map(([k, v], i) => (
                  <div className="kv-row" key={i}><span className="k">{k}</span><span className="v" style={{ maxWidth: 240 }}>{v}</span></div>
                ))}
              </div>
            )}
            {tab === 'docs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {SUP_DOC_KINDS.map((kind) => (
                  <div key={kind}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>{kind}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(ext.docs[kind] || []).map((d, i) => (
                        <button key={i} className="doc-chip" onClick={() => toast('Открываю: ' + d, 'info')}><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Icon name="docs" />{d}</span><Icon name="download" /></button>
                      ))}
                      <button className="doc-chip" style={{ borderStyle: 'dashed', color: 'var(--blue)' }} onClick={() => toast('Загрузка файла: ' + kind, 'info')}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="plus" />Загрузить</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}

/* ====================================================================
   Добавление поставщика — расширенная форма (ТЗ):
   общая информация, API / локальный, финансовые условия по видам услуг,
   поддерживаемые операции, документы, автоматизация, приоритеты поиска.
   ==================================================================== */
function SupSection({ icon, title, sub, children }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--blue-soft)', color: 'var(--blue)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} style={{ width: 16, height: 16 }} /></span>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{title}</span>
      </div>
      {sub && <div style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 12px 40px' }}>{sub}</div>}
      <div style={{ marginLeft: 40, marginTop: sub ? 0 : 12 }}>{children}</div>
    </div>
  );
}

function SupplierAddDrawer({ open, onClose, onCreated }) {
  const toast = useToast();
  const empty = {
    name: '', org: '', supType: 'API', kinds: [], priority: 1, useDefault: false, country: 'Кыргызстан', city: 'Бишкек',
    status: 'Активный', orgType: 'Другое',
    api: { url: '', apiKey: '', login: '', password: '', token: '', version: '' },
    local: { contact: '', comm: [], commBind: {}, processing: '', hours: SUP_WORK_HOURS[2] },
    fin: { currency: 'USD', commType: '%', commValue: 0, vat: 'Без НДС', settlement: 'Предоплата', payTerm: '', perService: supEmptyFin(SUP_SERVICE_KINDS) },
    ops: { 'Бронирование': true, 'Выписка': true, 'Возврат': false, 'Обмен': false, 'Аннуляция': false, 'Дополнительные услуги': false },
    automation: 'auto',
    searchPriority: {},
    docsAttached: [],
  };
  const [f, setF] = useState(empty);
  const [finKind, setFinKind] = useState(null);
  const [errs, setErrs] = useState({});
  const [conn, setConn] = useState(null); // null | 'checking' | 'ok'
  useEffect(() => { if (open) { setF(JSON.parse(JSON.stringify(empty))); setErrs({}); setConn(null); setFinKind(null); } }, [open]);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e && e.target ? e.target.value : e }));
  const setSub = (grp, k, v) => setF((p) => ({ ...p, [grp]: { ...p[grp], [k]: v } }));
  const toggleKind = (k) => setF((p) => {
    const kinds = p.kinds.includes(k) ? p.kinds.filter((x) => x !== k) : [...p.kinds, k];
    return { ...p, kinds };
  });
  const toggleComm = (m) => setSub('local', 'comm', f.local.comm.includes(m) ? f.local.comm.filter((x) => x !== m) : [...f.local.comm, m]);
  const setFee = (svc, key, patch) => setF((p) => {
    const per = JSON.parse(JSON.stringify(p.fin.perService));
    per[svc][key] = { ...per[svc][key], ...patch };
    return { ...p, fin: { ...p.fin, perService: per } };
  });

  const isApiType = f.supType !== 'Локальный';
  const finKinds = f.kinds.length ? f.kinds : [];
  const activeFinKind = finKinds.includes(finKind) ? finKind : finKinds[0];

  const checkConn = () => {
    if (!f.api.url.trim()) { toast('Укажите URL API для проверки', 'err'); return; }
    setConn('checking');
    setTimeout(() => { setConn('ok'); toast('Подключение успешно', 'ok'); }, 1200);
  };

  const submit = () => {
    const er = {};
    if (!f.name.trim()) er.name = 'Введите название';
    if (!f.kinds.length) er.kinds = 'Выберите хотя бы один вид услуг';
    if (isApiType && !f.api.url.trim()) er.apiUrl = 'Укажите URL API';
    if (!isApiType && !f.local.contact.trim()) er.contact = 'Укажите контактное лицо';
    setErrs(er);
    if (Object.keys(er).length) { toast('Проверьте поля формы', 'err'); return; }
    const no = 51190 + Math.floor(Math.random() * 800);
    const ext = {
      supType: f.supType, kinds: f.kinds, priority: f.priority, useDefault: f.useDefault, country: f.country, city: f.city,
      api: { ...f.api, status: conn === 'ok' ? 'Подключено' : 'Не проверено', lastSync: '—' },
      local: { ...f.local, comm: f.local.comm.length ? f.local.comm : ['Email'], commBind: { ...(f.local.commBind || {}) }, processing: f.local.processing === '' ? 0 : f.local.processing },
      fin: { ...JSON.parse(JSON.stringify(f.fin)), payTerm: f.fin.payTerm === '' ? 0 : f.fin.payTerm },
      ops: { ...f.ops }, automation: f.automation, searchPriority: { ...f.searchPriority },
      stats: { bookings: 0, issues: 0, refunds: 0, avgResponse: '—', successRate: '—', lastUsed: '—' },
      docs: SUP_DOC_KINDS.reduce((m, k) => (m[k] = [], m), {}),
    };
    SUP_EXT[no] = ext;
    onCreated({
      no, name: f.name, org: f.org || f.name, status: f.status,
      service: f.kinds[0] === 'Гостиницы' ? 'Отель' : f.kinds[0] === 'Трансферы' ? 'Трансфер' : f.kinds[0],
      currency: f.fin.currency, commission: supFinSummary(ext), type: f.supType, orgType: f.orgType,
    });
    toast('Поставщик добавлен', 'ok'); onClose();
  };

  return (
    <Drawer open={open} onClose={onClose} title="Добавить поставщика" width="min(820px,96vw)"
      sub="Карточка поставщика: общие данные, интеграция, финансовые условия, приоритеты поиска"
      footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button variant="primary" iconRight="arrowRight" onClick={submit}>Добавить поставщика</Button></>}>

      {/* ---- Общая информация ---- */}
      <SupSection icon="user" title="Общая информация">
        <div className="form-grid">
          <div className="full"><Field label="Наименование" required error={errs.name}><Input placeholder="Введите название" value={f.name} onChange={set('name')} error={errs.name} /></Field></div>
          <Field label="Организация"><Input placeholder="Организация" value={f.org} onChange={set('org')} /></Field>
          <Field label="Тип организации"><Select options={Object.keys(ORG_TYPE)} value={f.orgType} onChange={set('orgType')} /></Field>
          <div className="full">
            <Field label="Тип поставщика" required>
              <div className="seg-toggle">
                {SUPPLIER_TYPES.map((t) => (
                  <button key={t} className={'seg-btn' + (f.supType === t ? ' active' : '')} onClick={() => set('supType')(t)}>{t}</button>
                ))}
              </div>
            </Field>
          </div>
          <div className="full">
            <Field label="Вид услуг" required error={errs.kinds}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SUP_SERVICE_KINDS.map((k) => (
                  <button key={k} className={'tab' + (f.kinds.includes(k) ? ' active' : '')} onClick={() => toggleKind(k)}>{k}</button>
                ))}
              </div>
            </Field>
          </div>
          <Field label="Приоритет поставщика"><Input type="number" min="1" value={f.priority} onChange={(e) => set('priority')(Math.max(1, parseInt(e.target.value) || 1))} /></Field>
          <Field label="Статус"><Select options={Object.keys(SUPPLIER_STATUS)} value={f.status} onChange={set('status')} /></Field>
          <Field label="Страна"><Select options={SUP_COUNTRIES} value={f.country} onChange={(e) => setF((p) => ({ ...p, country: e.target.value, city: supCitiesFor(e.target.value)[0] }))} /></Field>
          <Field label="Город"><Select options={supCitiesFor(f.country)} value={f.city} onChange={set('city')} /></Field>
          <div className="full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
            <div><div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14.5 }}>Использовать по умолчанию</div><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Предлагается первым при ручном выборе поставщика</div></div>
            <Toggle on={f.useDefault} onChange={(v) => set('useDefault')(v)} />
          </div>
        </div>
      </SupSection>

      {/* ---- API (только для API-типов) ---- */}
      {isApiType && (
        <SupSection icon="api" title="API" sub="Параметры подключения — для типов API, Консолидатор и GDS">
          <div className="form-grid">
            <div className="full"><Field label="URL API" required error={errs.apiUrl}><Input placeholder="https://api.example.com/v2" value={f.api.url} onChange={(e) => setSub('api', 'url', e.target.value)} error={errs.apiUrl} /></Field></div>
            <Field label="API Key"><Input placeholder="Ключ доступа" value={f.api.apiKey} onChange={(e) => setSub('api', 'apiKey', e.target.value)} /></Field>
            <Field label="Версия API"><Input placeholder="v2" value={f.api.version} onChange={(e) => setSub('api', 'version', e.target.value)} /></Field>
            <Field label="Login"><Input value={f.api.login} onChange={(e) => setSub('api', 'login', e.target.value)} /></Field>
            <Field label="Password"><Input type="password" value={f.api.password} onChange={(e) => setSub('api', 'password', e.target.value)} /></Field>
            <div className="full"><Field label="Token"><Input value={f.api.token} onChange={(e) => setSub('api', 'token', e.target.value)} /></Field></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <Button variant="secondary" icon="zap" disabled={conn === 'checking'} onClick={checkConn}>{conn === 'checking' ? 'Проверка…' : 'Проверить подключение'}</Button>
            <span style={{ fontSize: 13 }}>
              {conn === 'ok' ? <Pill tone="green">Подключено</Pill> : conn === 'checking' ? <Pill tone="amber">Проверка…</Pill> : <Pill tone="gray">Не проверено</Pill>}
            </span>
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Последняя синхронизация: —</span>
          </div>
        </SupSection>
      )}

      {/* ---- Для локального поставщика ---- */}
      {!isApiType && (
        <SupSection icon="contacts" title="Локальный поставщик" sub="Контакты и режим работы для ручного взаимодействия">
          <div className="form-grid">
            <div className="full"><Field label="Контактное лицо" required error={errs.contact}><Input placeholder="ФИО" value={f.local.contact} onChange={(e) => setSub('local', 'contact', e.target.value)} error={errs.contact} /></Field></div>
            <div className="full">
              <Field label="Способы коммуникации">
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: f.local.comm.length ? 12 : 0 }}>
                  {SUP_COMM_METHODS.map((m) => (
                    <label key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13.5, color: 'var(--body)' }}>
                      <Checkbox on={f.local.comm.includes(m)} onChange={() => toggleComm(m)} />{m}
                    </label>
                  ))}
                </div>
                {/* Привязка мессенджеров: после отметки способа связи появляется поле привязки + пояснение */}
                {f.local.comm.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 12 }}>
                    {f.local.comm.map((m) => {
                      const cfg = SUP_COMM_CONFIG[m] || {};
                      return (
                        <div key={m}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ width: 92, flexShrink: 0, fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{m}</span>
                            {cfg.field
                              ? <div style={{ flex: 1 }}><Input placeholder={cfg.placeholder} value={(f.local.commBind && f.local.commBind[m]) || ''}
                                  onChange={(e) => setSub('local', 'commBind', { ...(f.local.commBind || {}), [m]: e.target.value })} /></div>
                              : <span style={{ flex: 1, fontSize: 13, color: 'var(--muted)' }}>Привязка не требуется — встроенный чат CRM</span>}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginLeft: 102, marginTop: 3 }}>{cfg.hint}</div>
                        </div>
                      );
                    })}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                      <Icon name="chat" style={{ width: 15, height: 15, color: 'var(--blue)', flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 12, color: 'var(--body)' }}>Как работает чат: сообщения из треда заказа отправляются поставщику через привязанный канал (бот/API мессенджера), а его ответы автоматически возвращаются в тот же чат CRM — оператор ведёт всю переписку в одном окне.</span>
                    </div>
                  </div>
                )}
              </Field>
            </div>
            <Field label="Время обработки заявок" hint="минут"><Input type="number" min="0" placeholder="напр. 60" value={f.local.processing} onChange={(e) => setSub('local', 'processing', e.target.value === '' ? '' : (parseInt(e.target.value) || 0))} /></Field>
            <Field label="Часы работы"><Select options={SUP_WORK_HOURS} value={f.local.hours} onChange={(e) => setSub('local', 'hours', e.target.value)} /></Field>
          </div>
        </SupSection>
      )}

      {/* ---- Финансовые условия ---- */}
      <SupSection icon="finance" title="Финансовые условия" sub="Заменяет поле «Комиссия/маржа»: комиссии и сборы настраиваются отдельно по каждому виду услуг">
        <div className="form-grid">
          <Field label="Валюта расчетов"><Select options={CURRENCIES.map((c) => c.code)} value={f.fin.currency} onChange={(e) => setSub('fin', 'currency', e.target.value)} /></Field>
          <Field label="Тип комиссии"><Select options={SUP_COMM_TYPES} value={f.fin.commType} onChange={(e) => setSub('fin', 'commType', e.target.value)} /></Field>
          <Field label="Размер комиссии"><Input type="number" value={f.fin.commValue} onChange={(e) => setSub('fin', 'commValue', parseFloat(e.target.value) || 0)} /></Field>
          <Field label="НДС"><Select options={['Без НДС', '12%', '20%']} value={f.fin.vat} onChange={(e) => setSub('fin', 'vat', e.target.value)} /></Field>
          <Field label="Способ взаиморасчетов"><Select options={SUP_SETTLEMENTS} value={f.fin.settlement} onChange={(e) => setSub('fin', 'settlement', e.target.value)} /></Field>
          <Field label="Срок оплаты" hint="дней"><Input type="number" min="0" placeholder="напр. 10" value={f.fin.payTerm} onChange={(e) => setSub('fin', 'payTerm', e.target.value === '' ? '' : (parseInt(e.target.value) || 0))} /></Field>
        </div>
        {finKinds.length > 0 ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Сборы по видам услуг</div>
            <div className="tabs" style={{ marginBottom: 10 }}>
              {finKinds.map((k) => <button key={k} className={'tab' + (activeFinKind === k ? ' active' : '')} onClick={() => setFinKind(k)}>{k}</button>)}
            </div>
            {SUP_FIN_KEYS.map((fk) => {
              const fee = f.fin.perService[activeFinKind][fk.key];
              return (
                <div key={fk.key} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ flex: 1, minWidth: 160, fontSize: 13.5, color: 'var(--body)' }}>{fk.label}</span>
                  <div className="seg-toggle" style={{ width: 140 }}>
                    <button className={'seg-btn' + (fee.type === 'percent' ? ' active' : '')} onClick={() => setFee(activeFinKind, fk.key, { type: 'percent' })}>%</button>
                    <button className={'seg-btn' + (fee.type === 'fixed' ? ' active' : '')} onClick={() => setFee(activeFinKind, fk.key, { type: 'fixed' })}>Фикс.</button>
                  </div>
                  <div style={{ width: 100 }}><Input type="number" value={fee.value} onChange={(e) => setFee(activeFinKind, fk.key, { value: parseFloat(e.target.value) || 0 })} /></div>
                  <span style={{ width: 30, color: 'var(--muted)', fontSize: 13 }}>{fee.type === 'percent' ? '%' : f.fin.currency}</span>
                </div>
              );
            })}
          </div>
        ) : <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 10 }}>Выберите вид услуг выше, чтобы настроить сборы по каждому виду отдельно.</div>}
      </SupSection>

      {/* ---- Поддерживаемые услуги ---- */}
      <SupSection icon="check" title="Поддерживаемые услуги" sub="Какие операции доступны через этого поставщика">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
          {SUP_OPS.map((op) => (
            <label key={op} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13.5, color: 'var(--body)' }}>
              <Checkbox on={!!f.ops[op]} onChange={() => setF((p) => ({ ...p, ops: { ...p.ops, [op]: !p.ops[op] } }))} />{op}
            </label>
          ))}
        </div>
      </SupSection>

      {/* ---- Документы ---- */}
      <SupSection icon="docs" title="Документы" sub="Договор, дополнительные соглашения, реквизиты, сертификаты и прочие файлы">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {SUP_DOC_KINDS.map((d) => (
            <button key={d} className="doc-chip" style={{ borderStyle: 'dashed', color: f.docsAttached.includes(d) ? 'var(--green)' : 'var(--blue)' }}
              onClick={() => { setF((p) => ({ ...p, docsAttached: p.docsAttached.includes(d) ? p.docsAttached : [...p.docsAttached, d] })); toast('Файл прикреплён: ' + d, 'ok'); }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name={f.docsAttached.includes(d) ? 'check' : 'plus'} />{d}</span>
            </button>
          ))}
        </div>
      </SupSection>

      {/* ---- Автоматизация ---- */}
      <SupSection icon="zap" title="Автоматизация">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {SUP_AUTOMATION.map((a) => (
            <button key={a.key} onClick={() => set('automation')(a.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, border: '1px solid ' + (f.automation === a.key ? 'var(--blue)' : 'var(--field-line)'), background: f.automation === a.key ? 'var(--blue-soft)' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
              <Radio on={f.automation === a.key} onChange={() => set('automation')(a.key)} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{a.label}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{a.hint}</div>
              </div>
            </button>
          ))}
        </div>
      </SupSection>

      {/* ---- Для поиска ---- */}
      <SupSection icon="search" title="Для поиска" sub="Ключевой блок: по этим приоритетам система автоматически выбирает поставщика при поиске (1 — наивысший)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420 }}>
          {SUP_PRIORITY_SERVICES.map((svc) => (
            <div key={svc} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: f.kinds.includes(svc) || !f.kinds.length ? 1 : .45 }}>
              <span style={{ flex: 1, fontSize: 13.5, color: 'var(--body)' }}>Приоритет по: {svc}</span>
              <div style={{ width: 110 }}>
                <Input type="number" min="1" placeholder="—" value={f.searchPriority[svc] != null ? f.searchPriority[svc] : ''}
                  onChange={(e) => setF((p) => ({ ...p, searchPriority: { ...p.searchPriority, [svc]: e.target.value === '' ? null : Math.max(1, parseInt(e.target.value) || 1) } }))} />
              </div>
            </div>
          ))}
        </div>
      </SupSection>
    </Drawer>
  );
}

function SuppliersPage({ intent, onConsume, suppliers, addSupplier }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ supType: '', status: '', service: '' });
  const [modal, setModal] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const [prioOpen, setPrioOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const { sort, onSort, apply } = useSort(null);

  useEffect(() => { if (intent && intent.type === 'create') { setAddOpen(true); onConsume(); } }, [intent]);

  let rows = suppliers.filter((s) =>
    (s.name.toLowerCase().includes(search.toLowerCase()) || String(s.no).includes(search)) &&
    (!filters.supType || supExt(s).supType === filters.supType) &&
    (!filters.status || s.status === filters.status) &&
    (!filters.service || s.service === filters.service));
  rows = apply(rows, { no: (r) => r.no });
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, filters]);

  return (
    <div className="fade-in">
      <Topbar title="Поставщики">
        <div className="topbar-spacer" />
        <Button variant="secondary" icon="sla" onClick={() => setPrioOpen(true)}>Приоритеты поиска</Button>
        <Button variant="secondary" icon="building" onClick={() => setOrgOpen(true)}>Добавить организацию</Button>
        <Button variant="primary" icon="plus" onClick={() => setAddOpen(true)}>Добавить поставщика</Button>
      </Topbar>
      <div className="content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <FilterChip label="Типы поставщиков" options={SUPPLIER_TYPES} value={filters.supType} onChange={(v) => setFilters((f) => ({ ...f, supType: v }))} />
          <FilterChip label="Статусы" options={Object.keys(SUPPLIER_STATUS)} value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} />
          <FilterChip label="Типы услуг" options={['Авиа', 'ЖД', 'Отель', 'Трансфер', 'Автобусы', 'Страхование', 'Визы']} value={filters.service} onChange={(v) => setFilters((f) => ({ ...f, service: v }))} />
          <div className="topbar-spacer" />
          <SearchBox value={search} onChange={setSearch} style={{ width: 280 }} />
        </div>
        <div className="table-card">
          <table className="tbl">
            <thead>
              <tr>
                <Th label="№" col="no" sort={sort} onSort={onSort} style={{ width: 80 }} />
                <th>Поставщик</th><th>Тип</th><th>Статус</th><th>Виды услуг</th><th>Приоритет</th><th>Валюта</th><th>Фин. условия</th>
              </tr>
            </thead>
            {pageRows.length === 0
              ? <tbody><tr><td colSpan={8}><EmptyState title="Поставщики не найдены" /></td></tr></tbody>
              : (
                <tbody>
                  {pageRows.map((s, i) => {
                    const ext = supExt(s);
                    return (
                      <tr key={i} style={{ cursor: 'pointer' }} onClick={() => setModal(s)}>
                        <td className="t-strong">{s.no}</td>
                        <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><SupplierBadge name={s.name} />{ext.useDefault && <Pill tone="blue">по умолч.</Pill>}</span></td>
                        <td><Pill tone={ext.supType === 'Локальный' ? 'gray' : 'teal'}>{ext.supType}</Pill></td>
                        <td><Pill tone={SUPPLIER_STATUS[s.status]}>{s.status}</Pill></td>
                        <td>{ext.kinds.join(', ')}</td>
                        <td>{ext.priority}</td>
                        <td>{ext.fin.currency}</td>
                        <td>{supFinSummary(ext)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              )}
          </table>
          <Pagination page={page} pages={pages} onPage={setPage} />
        </div>
      </div>

      {modal && <SupplierModal supplier={modal} onClose={() => setModal(null)} onDelete={() => { setConfirm(modal); }} />}
      <SupplierAddDrawer open={addOpen} onClose={() => setAddOpen(false)} onCreated={addSupplier} />
      <NewOrgDrawer open={orgOpen} onClose={() => setOrgOpen(false)} />
      <SearchPriorityModal open={prioOpen} onClose={() => setPrioOpen(false)} />
      <ConfirmDialog open={!!confirm} message="Данное действие невозможно будет отменить!"
        onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); setModal(null); toast('Поставщик удалён', 'ok'); }} />
    </div>
  );
}

Object.assign(window, { SuppliersPage, SupplierModal, SupplierAddDrawer, SearchPriorityModal, supExt, SUP_SERVICE_KINDS, SupplierBadge, supBrand });
