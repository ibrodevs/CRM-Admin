import { useState, useEffect } from 'react';
import { Icon } from './icons';
import { Avatar, Button, Checkbox, Combobox, Drawer, EmptyState, Field, FilterChip, Input, Pagination, Pill, Radio, SearchBox, Select, Tabs, Th, Toggle, WorkHoursPicker, useSort, useToast } from './ui';
import { AIRLINES, AVIA_MARKUPS, CURRENCIES, ORG_TYPE, SUPPLIER_STATUS, aviaMarkupsFor } from './data';
import { Topbar } from './layout';
import { AirlineLogo } from './page_flights';
import { PAGE_SIZE } from './page_orders';
import { communicationsApi, documentsApi, servicesApi, suppliersApi, workspaceSettingsApi } from './api/resources';
import { toUiSupplier } from './api/adapters';
import { resultsOf } from './api/client';



function MiniLineChart() {

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

function useSupplierDocuments(s, ext) {
  const [, refresh] = useState(0);
  useEffect(() => {
    if (!s || !ext) return undefined;
    const controller = new AbortController();
    Promise.all([documentsApi.list({}, controller.signal), servicesApi.list({}, controller.signal)]).then(([payload, servicePayload]) => {
      const grouped = SUP_DOC_KINDS.reduce((result, kind) => ({ ...result, [kind]: [] }), {});
      resultsOf(payload).filter((doc) => String(doc.metadata?.supplier_id || '') === String(s.serverId || s.id)).forEach((doc) => {
        const kind = doc.metadata?.supplier_document_kind || 'Прочие файлы';
        if (!grouped[kind]) grouped[kind] = [];
        grouped[kind].push({ name: doc.title, documentId: doc.id, kind, versions: [{ v: `v${doc.current_version || 1}`, date: new Date(doc.created_at).toLocaleDateString('ru-RU'), author: 'CRM', note: 'Версия из backend', current: true }] });
      });
      const services = resultsOf(servicePayload).filter((service) => String(service.supplier) === String(s.serverId || s.id));
      const successful = services.filter((service) => ['booked', 'confirmed', 'issued', 'completed'].includes(service.status));
      ext.docs = grouped;
      ext.stats = { ...ext.stats, bookings: services.length, issues: services.filter((service) => service.status === 'issued').length,
        refunds: services.filter((service) => service.status === 'refunded').length,
        successRate: services.length ? `${Math.round(successful.length / services.length * 100)}%` : '0%',
        lastUsed: services[0]?.created_at ? new Date(services[0].created_at).toLocaleDateString('ru-RU') : '—' };
      refresh((value) => value + 1);
    }).catch(() => {});
    return () => controller.abort();
  }, [s?.serverId, s?.id]);
}




function DocPreviewDrawer({ open, doc, onClose }) {
  const toast = useToast();
  const [ver, setVer] = useState(0);
  useEffect(() => { setVer(0); }, [doc]);
  if (!open || !doc) return null;

  const versions = doc.versions || [
    { v: 'v3', date: '03.2026', author: 'Акимова А.', note: 'Продление на 2026 год', current: true },
    { v: 'v2', date: '08.2025', author: 'Мамажанов А.', note: 'Изменение реквизитов' },
    { v: 'v1', date: '01.2025', author: 'Акимова А.', note: 'Первичная редакция' },
  ];
  const active = versions[ver] || versions[0];
  const download = () => {
    if (doc.documentId) window.open(documentsApi.downloadUrl(doc.documentId), '_blank');
    else toast('У этого демонстрационного файла нет бинарной версии на сервере', 'info');
  };
  const addVersion = async (event) => {
    const file = event.target.files?.[0]; if (!file || !doc.documentId) return;
    try { await documentsApi.addVersion(doc.documentId, file, 'Новая версия договора поставщика'); toast('Новая версия загружена', 'ok'); }
    catch (error) { toast(error.message, 'err'); }
    finally { event.target.value = ''; }
  };
  return (
    <Drawer open={open} onClose={onClose} width="min(760px,96vw)"
      title={doc.name} sub={doc.kind + ' · версия ' + active.v}
      footer={<>
        <Button variant="secondary" icon="download" onClick={download}>Скачать {active.v}</Button>
        <label className={'btn btn-secondary' + (!doc.documentId ? ' disabled' : '')} style={{ cursor: doc.documentId ? 'pointer' : 'not-allowed' }}><Icon name="plus" />Загрузить новую версию<input type="file" hidden disabled={!doc.documentId} onChange={addVersion} /></label>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 22 }}>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 10 }}>ИСТОРИЯ ВЕРСИЙ</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {versions.map((vs, i) => (
              <button key={i} onClick={() => setVer(i)}
                style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 11, cursor: 'pointer',
                  border: '1px solid ' + (i === ver ? 'var(--blue)' : 'var(--field-line)'),
                  background: i === ver ? 'var(--blue-soft)' : '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>{vs.v}</span>
                  {vs.current && <Pill tone="green">актуальная</Pill>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{vs.date} · {vs.author}</div>
                <div style={{ fontSize: 12, color: 'var(--body)', marginTop: 2 }}>{vs.note}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 10 }}>ПРЕДПРОСМОТР</div>
          <div style={{ border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface-2)', padding: 28, minHeight: 420 }}>
            <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: '32px 34px', boxShadow: 'var(--shadow-card)', minHeight: 360 }}>
              <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 4 }}>{doc.name.replace(/\.[a-z]+$/i, '')}</div>
              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginBottom: 22 }}>Версия {active.v} · {active.date}</div>
              {[92, 78, 96, 64, 88, 40, 84, 72].map((wp, i) => (
                <div key={i} style={{ height: 9, width: wp + '%', borderRadius: 4, background: 'var(--line-strong)', margin: '11px 0' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}





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
      <Icon name={icon} style={{ width: 14, height: 14 }} />{name}
    </span>
  );
}

const SUPPLIER_TYPES = ['API', 'Локальный', 'Консолидатор', 'GDS'];
const SUP_SERVICE_KINDS = ['Авиа', 'ЖД', 'Гостиницы', 'Трансферы', 'Автобусы', 'Страхование', 'Визы', 'Прочее'];
const SUP_COMM_METHODS = ['Telegram', 'WhatsApp', 'Email', 'Телефон', 'Чат', 'Макс'];

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

const SUP_WORK_HOURS = ['Круглосуточно', 'Пн–Пт 09:00–18:00', 'Пн–Сб 09:00–19:00', 'Пн–Вс 08:00–22:00', 'Пн–Пт 10:00–19:00'];


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

const SUP_FIN_KEYS = [
  { key: 'commission', label: 'Комиссионное вознаграждение' },
  { key: 'service', label: 'Сервисный сбор' },
  { key: 'exchange', label: 'Сбор за обмен' },
  { key: 'refund', label: 'Сбор за возврат' },
];

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



const SUP_EXT = window.SUP_EXT || (window.SUP_EXT = {});
function supNumericSeed(value) {
  return Array.from(String(value || '')).reduce((sum, ch) => (sum + ch.charCodeAt(0)) % 10000, 0);
}
function supExt(s) {
  if (s.ext) return s.ext;
  if (!SUP_EXT[s.no]) {
    const numericSeed = supNumericSeed(s.no);
    const seed = numericSeed % 5;
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
      stats: { bookings: 84 + numericSeed % 200, issues: 61 + numericSeed % 160, refunds: 3 + seed, avgResponse: (2 + seed) + ' мин', successRate: (91 + seed) + '%', lastUsed: '0' + (5 - (seed % 3)) + '.07.2026' },
      docs: { 'Договор': ['Договор оферты.pdf'], 'Дополнительные соглашения': ['ДС №2 от 03.2026.pdf'], 'Реквизиты': ['Реквизиты.pdf'], 'Сертификаты': s.orgType === 'Авиакомпания' ? ['Сертификат IATA.pdf'] : [], 'Прочие файлы': [] },

      legal: {
        inn: '', kpp: '', ogrn: '', okpo: '', legalName: s.org, legalForm: 'ОсОО',
        director: '', address: '', phone: '', email: '', vat: seed % 2 ? '12%' : 'Без НДС',
        bank: '', bik: '', account: '', corr: '',
        contractNo: '', contractDate: '', signedBy: '', filled: false,
      },
    };
  }
  return SUP_EXT[s.no];
}

function supLookupByInn(inn, ext, s) {
  const bases = [
    { form: 'ОсОО', bank: 'Демир Банк', bik: '109000', addr: 'Бишкек, ул. Абдрахманова 170' },
    { form: 'ЗАО', bank: 'Оптима Банк', bik: '109001', addr: 'Бишкек, пр. Чуй 219' },
    { form: 'ИП', bank: 'РСК Банк', bik: '128005', addr: 'Ош, ул. Курманжан Датка 12' },
  ];
  const b = bases[(String(inn).length + supNumericSeed(s.no)) % bases.length];
  const tail = String(inn).replace(/\D/g, '').slice(-6).padStart(6, '0');
  return {
    ...ext.legal, inn: String(inn), legalForm: b.form,
    kpp: tail.slice(0, 3) + '01001', ogrn: '1' + tail + '00' + tail.slice(0, 3), okpo: tail.slice(0, 5) + '1',
    legalName: b.form + ' «' + s.org + '»', director: 'Директор ' + s.org, address: b.addr,
    phone: '+996 (312) ' + tail.slice(0, 2) + '-' + tail.slice(2, 4) + '-' + tail.slice(4, 6),
    email: 'office@' + String(s.org).toLowerCase().replace(/[^a-z0-9]/g, '') + '.kg',
    bank: b.bank, bik: b.bik, account: '124' + tail + tail.slice(0, 7), corr: '101' + tail + tail.slice(0, 7),
    filled: true,
  };
}
function supFinSummary(ext) {
  return ext.fin.commType === '%' ? ext.fin.commValue + ' %' : ext.fin.commType === 'Фиксированная' ? ext.fin.commValue + ' ' + ext.fin.currency : ext.fin.commValue + ' % + сборы';
}



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
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Точечные маршруты</span>
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


function SupplierFinEditor({ ext, onSaved, onSaveSettings }) {
  const toast = useToast();
  const kinds = ext.kinds.length ? ext.kinds : SUP_SERVICE_KINDS.slice(0, 1);
  const [kind, setKind] = useState(kinds[0]);
  const [fin, setFin] = useState(() => JSON.parse(JSON.stringify(ext.fin)));
  const [saving, setSaving] = useState(false);
  const setBase = (k, v) => setFin((f) => ({ ...f, [k]: v }));
  const setFee = (svc, key, patch) => setFin((f) => {
    const per = JSON.parse(JSON.stringify(f.perService));
    if (!per[svc]) per[svc] = supEmptyFin([svc])[svc];
    per[svc][key] = { ...per[svc][key], ...patch };
    return { ...f, perService: per };
  });
  const save = async () => {
    setSaving(true);
    try {
      const next = { ...ext, fin: JSON.parse(JSON.stringify(fin)) };
      if (onSaveSettings) await onSaveSettings(next);
      ext.fin = next.fin;
      onSaved && onSaved();
      toast('Финансовые условия сохранены', 'ok');
    } catch (error) { toast(error.message || 'Не удалось сохранить финансовые условия', 'err'); }
    finally { setSaving(false); }
  };
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
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Комиссии, сервисные сборы, сборы за обмен и возврат настраиваются отдельно по каждому виду услуг — одна карточка поставщика для всех сценариев.</div>
      <div className="tabs" style={{ marginBottom: 12 }}>
        {kinds.map((k) => <button key={k} className={'tab' + (kind === k ? ' active' : '')} onClick={() => setKind(k)}>{k}</button>)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SUP_FIN_KEYS.map((f) => {
          const fee = fees[f.key];
          return (
            <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ flex: 1, minWidth: 170, fontSize: 13, color: 'var(--body)' }}>{f.label}</span>
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
        <Button icon="check" disabled={saving} onClick={save}>{saving ? 'Сохранение…' : 'Сохранить условия'}</Button>
      </div>
    </div>
  );
}


function SupplierSearchEditor({ ext, supplierName, onSaveSettings }) {
  const toast = useToast();
  const [auto, setAuto] = useState(ext.automation);
  const [prio, setPrio] = useState({ ...ext.searchPriority });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const next = { ...ext, automation: auto, searchPriority: { ...prio } };
      if (onSaveSettings) await onSaveSettings(next);
      ext.automation = next.automation;
      ext.searchPriority = next.searchPriority;
      toast('Настройки поиска сохранены', 'ok');
    } catch (error) { toast(error.message || 'Не удалось сохранить настройки поиска', 'err'); }
    finally { setSaving(false); }
  };
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
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.hint}</div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Приоритет поиска по видам услуг</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>1 — наивысший. По этим приоритетам система автоматически выбирает поставщика при поиске.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420 }}>
        {SUP_PRIORITY_SERVICES.map((svc) => (
          <div key={svc} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--body)' }}>Приоритет по: {svc}</span>
            <div style={{ width: 110 }}>
              <Input type="number" min="1" value={prio[svc] != null ? prio[svc] : ''} placeholder="—"
                onChange={(e) => setPrio((p) => ({ ...p, [svc]: e.target.value === '' ? null : Math.max(1, parseInt(e.target.value) || 1) }))} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <Button icon="check" disabled={saving} onClick={save}>{saving ? 'Сохранение…' : 'Сохранить'}</Button>
      </div>
    </div>
  );
}


function SearchPriorityModal({ open, onClose }) {
  const toast = useToast();
  const [svc, setSvc] = useState(SUP_PRIORITY_SERVICES[0]);
  const [order, setOrder] = useState(() => JSON.parse(JSON.stringify(SUP_SEARCH_ORDER)));
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    workspaceSettingsApi.get('supplier-search-order', controller.signal)
      .then((setting) => {
        if (setting.value && Object.keys(setting.value).length) setOrder(setting.value);
      })
      .catch((error) => { if (error.name !== 'AbortError') console.error(error); });
    return () => controller.abort();
  }, [open]);
  if (!open) return null;
  const move = (i, d) => setOrder((o) => {
    const list = [...o[svc]];
    const j = i + d;
    if (j < 0 || j >= list.length) return o;
    [list[i], list[j]] = [list[j], list[i]];
    return { ...o, [svc]: list };
  });
  const save = async () => {
    setSaving(true);
    try {
      const next = JSON.parse(JSON.stringify(order));
      await workspaceSettingsApi.save('supplier-search-order', next);
      Object.assign(SUP_SEARCH_ORDER, next);
      toast('Порядок поиска сохранён', 'ok');
      onClose();
    } catch (error) { toast(error.message || 'Не удалось сохранить порядок поиска', 'err'); }
    finally { setSaving(false); }
  };
  return (
    <Drawer open={open} onClose={onClose} title="Приоритеты поиска" sub="Порядок, в котором система опрашивает поставщиков при автоматическом подборе"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button icon="check" disabled={saving} onClick={save}>{saving ? 'Сохранение…' : 'Сохранить порядок'}</Button>
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
  { key: 'legal', label: 'Реквизиты', icon: 'bank' },
  { key: 'contacts', label: 'Контакты', icon: 'contacts' },
  { key: 'finance', label: 'Финансовые условия', icon: 'finance' },
  { key: 'search', label: 'Для поиска', icon: 'search' },
  { key: 'stats', label: 'Статистика', icon: 'pie' },
  { key: 'markups', label: 'Надбавки / таксы', icon: 'calc', airlineOnly: true },
  { key: 'api', label: 'Интеграция / API', icon: 'api' },
  { key: 'sla', label: 'SLA', icon: 'sla' },
  { key: 'docs', label: 'Документы', icon: 'docs' },
];



function SupplierLegalEditor({ s, ext, onSaveSettings }) {
  const toast = useToast();
  const [, force] = useState(0);
  const [f, setF] = useState(() => ({ ...ext.legal }));
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const lookup = () => {
    if (!f.inn || String(f.inn).replace(/\D/g, '').length < 6) { toast('Введите ИНН (не менее 6 цифр)', 'err'); return; }
    setBusy(true);
    setTimeout(() => { setF(supLookupByInn(f.inn, ext, s)); setBusy(false); toast('Данные подтянуты по ИНН', 'ok'); }, 700);
  };
  const save = async () => {
    setSaving(true);
    try {
      const next = { ...ext, legal: { ...f, filled: true } };
      if (onSaveSettings) await onSaveSettings(next);
      ext.legal = next.legal;
      force((v) => v + 1);
      toast('Реквизиты поставщика сохранены', 'ok');
    } catch (error) { toast(error.message || 'Не удалось сохранить реквизиты поставщика', 'err'); }
    finally { setSaving(false); }
  };
  const F = ({ label, k, wide, ph }) => (
    <div style={{ gridColumn: wide ? '1 / -1' : 'auto' }}><Field label={label}><Input value={f[k] || ''} onChange={set(k)} placeholder={ph} /></Field></div>
  );
  return (
    <div>

      <div className="card card-pad" style={{ marginBottom: 16, background: 'var(--surface-2)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}><Field label="ИНН" hint="первичный ввод — остальные поля заполнятся автоматически"><Input value={f.inn || ''} onChange={set('inn')} leadIcon="bank" placeholder="Напр. 02208201810045" /></Field></div>
          <Button icon="api" disabled={busy} onClick={lookup}>{busy ? 'Запрос…' : 'Заполнить по ИНН'}</Button>
          {f.filled && <Pill tone="green"><Icon name="check" style={{ width: 12, height: 12, verticalAlign: -2 }} /> данные получены</Pill>}
        </div>
      </div>


      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', margin: '4px 0 10px' }}>Юридические данные</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div><Field label="Форма"><Select options={['ОсОО', 'ЗАО', 'ОАО', 'ИП', 'АО', 'ООО', 'Филиал']} value={f.legalForm || 'ОсОО'} onChange={set('legalForm')} /></Field></div>
        <F label="Юридическое название" k="legalName" />
        <F label="КПП" k="kpp" />
        <F label="ОГРН / ОГРНИП" k="ogrn" />
        <F label="ОКПО" k="okpo" />
        <div><Field label="НДС"><Select options={['Без НДС', '12%', '20%']} value={f.vat || 'Без НДС'} onChange={set('vat')} /></Field></div>
        <F label="Директор / подписант" k="director" />
        <F label="Юридический адрес" k="address" wide />
        <F label="Телефон" k="phone" />
        <F label="E-mail" k="email" />
      </div>


      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', margin: '18px 0 10px' }}>Банк и расчётный счёт</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <F label="Банк" k="bank" />
        <F label="БИК" k="bik" />
        <F label="Расчётный счёт" k="account" />
        <F label="Корреспондентский счёт" k="corr" />
      </div>


      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', margin: '18px 0 10px' }}>Договор и взаиморасчёты</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <F label="Номер договора" k="contractNo" ph="№ 2025-014" />
        <F label="Дата договора" k="contractDate" ph="14.01.2025" />
        <F label="Подписант со стороны компании" k="signedBy" />
        <div><Field label="Взаиморасчёты"><Select options={['Предоплата', 'Депозит', 'Отсрочка', 'По факту']} value={ext.fin.settlement} onChange={(e) => { ext.fin.settlement = e.target.value; force((v) => v + 1); }} /></Field></div>
        <div><Field label="Срок оплаты (дней)"><Input value={typeof ext.fin.payTerm === 'number' ? ext.fin.payTerm : (ext.fin.payTerm || '')} onChange={(e) => { ext.fin.payTerm = e.target.value === '' ? '' : (parseInt(e.target.value) || 0); force((v) => v + 1); }} /></Field></div>
        <div><Field label="Валюта расчёта"><Select options={(typeof CURRENCIES !== 'undefined' ? CURRENCIES.map((c) => c.code) : ['USD', 'EUR', 'RUB', 'KGS'])} value={ext.fin.currency} onChange={(e) => { ext.fin.currency = e.target.value; force((v) => v + 1); }} /></Field></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
        <Button icon="check" disabled={saving} onClick={save}>{saving ? 'Сохранение…' : 'Сохранить реквизиты'}</Button>
      </div>
    </div>
  );
}


function SupplierTabBody({ s, ext, tab, isAirline, apiStatus, checkConn, setPreviewDoc, toast, onSaveSettings }) {
  const [, forceDocs] = useState(0);
  const uploadDocument = async (kind, event) => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const created = await documentsApi.upload(file, { kind: 'contract', title: file.name, source: 'upload', metadata: { supplier_id: s.serverId || s.id, supplier_name: s.name, supplier_document_kind: kind } });
      ext.docs[kind] = [...(ext.docs[kind] || []), { name: created.title, documentId: created.id, kind, versions: [{ v: `v${created.current_version || 1}`, date: new Date().toLocaleDateString('ru-RU'), author: 'CRM', note: 'Загрузка из карточки поставщика', current: true }] }];
      forceDocs((value) => value + 1); toast('Документ поставщика загружен', 'ok');
    } catch (error) { toast(error.message, 'err'); }
    finally { event.target.value = ''; }
  };
  return (
    <>
      {tab === 'general' && (
        <div className="kv">
          {[['Поставщик', s.name], ['Тип поставщика', ext.supType], ['Вид услуг', ext.kinds.join(', ')],
            ['Организация', s.org], ['Тип организации', s.orgType || '—'],
            ['Страна / город', ext.country + ', ' + ext.city],
            ['Приоритет поставщика', String(ext.priority)],
            ['Использовать по умолчанию', ext.useDefault ? 'Да' : 'Нет'],
            ['Статус', s.status],
            ['Валюта расчета', ext.fin.currency],
            ext.ops ? ['Поддерживаемые операции', Object.keys(ext.ops).filter((o) => ext.ops[o]).join(', ') || '—'] : null,
            ext.automation ? ['Автоматизация', (SUP_AUTOMATION.find((a) => a.key === ext.automation) || {}).label || ext.automation] : null,
          ].filter(Boolean).map(([k, v], i) => (
            <div className="kv-row" key={i}><span className="k">{k}</span><span className="v">{v}</span></div>
          ))}
        </div>
      )}
      {tab === 'legal' && <SupplierLegalEditor s={s} ext={ext} onSaveSettings={onSaveSettings} />}
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
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '16px 0 8px' }}>Каналы связи (привязка мессенджеров)</div>
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
      {tab === 'finance' && <SupplierFinEditor ext={ext} onSaveSettings={onSaveSettings} />}
      {tab === 'search' && <SupplierSearchEditor ext={ext} supplierName={s.name} onSaveSettings={onSaveSettings} />}
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
            <Button variant="secondary" icon="api" onClick={checkConn}>Синхронизировать сейчас</Button>
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
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>{kind}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(ext.docs[kind] || []).map((d, i) => {
                  const document = typeof d === 'string' ? { name: d, kind } : d;
                  return <button key={document.documentId || i} className="doc-chip" onClick={() => setPreviewDoc(document)} title="Открыть предпросмотр с историей версий">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Icon name="docs" />{document.name}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--blue)', fontSize: 12.5, fontWeight: 600 }}><Icon name="eye" style={{ width: 15, height: 15 }} />Предпросмотр</span>
                  </button>;
                })}
                <label className="doc-chip" style={{ borderStyle: 'dashed', color: 'var(--blue)', cursor: 'pointer' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="plus" />Загрузить</span>
                  <input type="file" hidden onChange={(event) => uploadDocument(kind, event)} />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}



function SupplierCard({ supplier, onBack, onOpenOrder }) {
  const toast = useToast();
  const s = supplier;
  const ext = supExt(s);
  useSupplierDocuments(s, ext);
  const [, forceCard] = useState(0);
  const settingsNamespace = `supplier-ext-${s.serverId || s.id || s.no}`;
  useEffect(() => {
    const controller = new AbortController();
    workspaceSettingsApi.get(settingsNamespace, controller.signal)
      .then((setting) => {
        if (setting.value && Object.keys(setting.value).length) {
          Object.assign(ext, setting.value);
          forceCard((value) => value + 1);
        }
      })
      .catch((error) => { if (error.name !== 'AbortError') console.error(error); });
    return () => controller.abort();
  }, [settingsNamespace]);
  const saveSettings = async (next) => {
    const value = JSON.parse(JSON.stringify(next));
    await workspaceSettingsApi.save(settingsNamespace, value);
    Object.assign(ext, value);
    forceCard((current) => current + 1);
  };
  const isAirline = s.orgType === 'Авиакомпания';
  const isApiType = ext.supType !== 'Локальный';
  const tabs = SUP_TABS.filter((t) => (!t.airlineOnly || isAirline) && (t.key !== 'api' || isApiType));
  const [tab, setTab] = useState('general');
  const [apiStatus, setApiStatus] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const checkConn = async () => {
    setApiStatus('checking');
    try {
      await suppliersApi.checkConnection(s.serverId || s.id);
      setApiStatus('ok');
      toast('Подключение успешно', 'ok');
    } catch (error) { setApiStatus('error'); toast(error.message, 'err'); }
  };
  const openSupplierChat = async () => {
    try {
      await communicationsApi.createThread({ type: 'supplier', title: s.name, external_channel: 'CRM', status: 'active' });
      toast('Чат с поставщиком создан', 'ok');
    } catch (error) { toast(error.message, 'err'); }
  };
  const brand = supBrand(s.name);
  const ops = ext.ops ? Object.keys(ext.ops).filter((o) => ext.ops[o]) : [];

  const contacts = [
    { name: ext.local.contact, role: 'Менеджер по продажам', phone: (ext.local.commBind && ext.local.commBind['Телефон']) || '+996 (555) 123-456', email: (ext.local.commBind && ext.local.commBind['Email']) || 'sales@example.com' },
    { name: 'Бухгалтерия', role: 'Финансы и договоры', phone: '+996 (312) 90-12-34', email: 'buh@example.com' },
  ];

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button variant="secondary" size="sm" icon="chevLeft" onClick={onBack}>К реестру</Button>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>Поставщики / № {s.no}</span>
      </div>


      <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <span className="oc-svc-ic" style={{ background: brand, width: 56, height: 56, borderRadius: 16 }}><Icon name="suppliers" style={{ width: 26, height: 26 }} /></span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 className="card-title">{s.name}</h2>
            <Pill tone={SUPPLIER_STATUS[s.status]}>{s.status}</Pill>
            {ext.useDefault && <Pill tone="blue">По умолчанию</Pill>}
            <Pill tone={ext.supType === 'Локальный' ? 'gray' : 'teal'}>{ext.supType}</Pill>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>{ext.kinds.join(', ')} · {s.org} · {ext.country}, {ext.city}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Успешных бронирований</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>{ext.stats.successRate}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{ext.stats.bookings} бронирований</div>
        </div>
        {isApiType
          ? <Button icon="zap" disabled={apiStatus === 'checking'} onClick={checkConn}>{apiStatus === 'checking' ? 'Проверка…' : 'Проверить подключение'}</Button>
          : <Button icon="chat" onClick={openSupplierChat}>Открыть чат</Button>}
      </div>


      <div style={{ marginBottom: 18 }}>
        <Tabs tabs={tabs.map((t) => ({ key: t.key, label: t.key === 'general' ? 'Обзор' : t.label }))} value={tab} onChange={setTab} />
      </div>


      {tab === 'general' ? (<>
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div className="card card-pad">
            <h3 className="card-title" style={{ fontSize: 17, marginBottom: 14 }}>Основные данные</h3>
            <div className="kv">
              <div className="kv-row"><span className="k">Поставщик</span><span className="v">{s.name}</span></div>
              <div className="kv-row"><span className="k">Тип поставщика</span><span className="v">{ext.supType}</span></div>
              <div className="kv-row"><span className="k">Виды услуг</span><span className="v">{ext.kinds.join(', ')}</span></div>
              <div className="kv-row"><span className="k">Организация</span><span className="v">{s.org}</span></div>
              <div className="kv-row"><span className="k">Тип организации</span><span className="v">{s.orgType || '—'}</span></div>
              <div className="kv-row"><span className="k">Страна / город</span><span className="v">{ext.country}, {ext.city}</span></div>
              <div className="kv-row"><span className="k">Приоритет</span><span className="v">{ext.priority}</span></div>
              <div className="kv-row"><span className="k">По умолчанию</span><span className="v">{ext.useDefault ? 'Да' : 'Нет'}</span></div>
            </div>
          </div>
          <div className="card card-pad">
            <h3 className="card-title" style={{ fontSize: 17, marginBottom: 14 }}>Финансовые условия и операции</h3>
            <div className="kv">
              <div className="kv-row"><span className="k">Валюта расчёта</span><span className="v">{ext.fin.currency}</span></div>
              <div className="kv-row"><span className="k">Комиссия</span><span className="v">{supFinSummary(ext)}</span></div>
              <div className="kv-row"><span className="k">НДС</span><span className="v">{ext.fin.vat}</span></div>
              <div className="kv-row"><span className="k">Взаиморасчёты</span><span className="v">{ext.fin.settlement}</span></div>
              <div className="kv-row"><span className="k">Срок оплаты</span><span className="v">{typeof ext.fin.payTerm === 'number' ? ext.fin.payTerm + ' дн.' : ext.fin.payTerm}</span></div>
              <div className="kv-row"><span className="k">Операции</span><span className="v" style={{ maxWidth: 280 }}>{ops.join(', ') || '—'}</span></div>
              <div className="kv-row"><span className="k">Автоматизация</span><span className="v">{(SUP_AUTOMATION.find((a) => a.key === ext.automation) || {}).label || '—'}</span></div>
            </div>
          </div>
        </div>

        <h3 className="section-title" style={{ fontSize: 20, margin: '24px 0 14px' }}>Контактные лица</h3>
        <div className="grid-2">
          {contacts.map((p, i) => (
            <div className="card card-pad" key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={p.name} size={44} />
              <div style={{ flex: 1 }}><div style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.name}</div><div style={{ fontSize: 13, color: 'var(--muted)' }}>{p.role} · {p.phone}</div></div>
              <button className="icon-btn"><Icon name="mail" /></button><button className="icon-btn"><Icon name="phone" /></button>
            </div>
          ))}
        </div>
      </>) : (
        <div className="card card-pad">
          <SupplierTabBody s={s} ext={ext} tab={tab} isAirline={isAirline} apiStatus={apiStatus}
            checkConn={checkConn} setPreviewDoc={setPreviewDoc} toast={toast} onSaveSettings={saveSettings} />
        </div>
      )}

      <DocPreviewDrawer open={!!previewDoc} doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </div>
  );
}

function SupplierModal({ supplier, onClose, onDelete }) {
  const toast = useToast();
  const [tab, setTab] = useState('general');
  const [apiStatus, setApiStatus] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [, forceModal] = useState(0);
  const s = supplier;
  const ext = s ? supExt(s) : null;
  useSupplierDocuments(s, ext);
  const settingsNamespace = s ? `supplier-ext-${s.serverId || s.id || s.no}` : null;
  useEffect(() => {
    if (!settingsNamespace || !ext) return undefined;
    const controller = new AbortController();
    workspaceSettingsApi.get(settingsNamespace, controller.signal)
      .then((setting) => {
        if (setting.value && Object.keys(setting.value).length) {
          Object.assign(ext, setting.value);
          forceModal((value) => value + 1);
        }
      })
      .catch((error) => { if (error.name !== 'AbortError') console.error(error); });
    return () => controller.abort();
  }, [settingsNamespace]);
  const saveSettings = async (next) => {
    if (!settingsNamespace || !ext) return;
    const value = JSON.parse(JSON.stringify(next));
    await workspaceSettingsApi.save(settingsNamespace, value);
    Object.assign(ext, value);
    forceModal((current) => current + 1);
  };
  if (!s) return null;
  const isAirline = s.orgType === 'Авиакомпания';
  const isApiType = ext.supType !== 'Локальный';
  const tabs = SUP_TABS.filter((t) => (!t.airlineOnly || isAirline) && (t.key !== 'api' || isApiType));
  const tabMeta = tabs.find((t) => t.key === tab) || tabs[0];

  const checkConn = async () => {
    setApiStatus('checking');
    try {
      await suppliersApi.checkConnection(s.serverId || s.id);
      setApiStatus('ok');
      toast('Подключение успешно', 'ok');
    } catch (error) { setApiStatus('error'); toast(error.message, 'err'); }
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


  return (
    <>
    <Drawer open onClose={onClose} width="min(940px,97vw)"
      title="Информация поставщика" sub={tabMeta.label}
      footer={<>
        <Button variant="secondary" icon="edit" onClick={() => setTab('general')}>Редактировать</Button>
        <Button variant="secondary" icon="trash" onClick={onDelete}>Удалить</Button>
        <Button variant="secondary" icon="share" onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#supplier-${s.serverId || s.id}`); toast('Ссылка скопирована', 'ok'); }}>Поделиться</Button>
      </>}>
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '232px 1fr', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tabs.map((t) => {
              const on = tab === t.key;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: 13,
                    border: '1px solid ' + (on ? 'var(--blue)' : 'var(--field-line)'),
                    background: on ? 'var(--blue-soft)' : '#fff', cursor: 'pointer', fontSize: 15,
                    fontWeight: on ? 700 : 500, color: on ? 'var(--blue)' : 'var(--ink)', textAlign: 'left', transition: '.12s' }}>
                  <Icon name={t.icon} style={{ width: 20, height: 20, color: on ? 'var(--blue)' : 'var(--muted)' }} />
                  <span style={{ flex: 1 }}>{t.label}</span>
                  <span className={'radio' + (on ? ' on' : '')} />
                </button>
              );
            })}
          </div>
          <div style={{ minHeight: 320 }}>
            {header}
            <SupplierTabBody s={s} ext={ext} tab={tab} isAirline={isAirline} apiStatus={apiStatus}
              checkConn={checkConn} setPreviewDoc={setPreviewDoc} toast={toast} onSaveSettings={saveSettings} />
          </div>
        </div>
      </div>
    </Drawer>
    <DocPreviewDrawer open={!!previewDoc} doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </>
  );
}






function SupSection({ icon, title, sub, children }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--blue-soft)', color: 'var(--blue)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} style={{ width: 16, height: 16 }} /></span>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{title}</span>
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px 40px' }}>{sub}</div>}
      <div style={{ marginLeft: 40, marginTop: sub ? 0 : 12 }}>{children}</div>
    </div>
  );
}

function SupplierAddDrawer({ open, onClose, onCreated }) {
  const toast = useToast();
  const empty = {
    name: '', org: '', inn: '', supType: 'API', kinds: [], priority: 1, useDefault: false, country: 'Кыргызстан', city: 'Бишкек',
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
  const [conn, setConn] = useState(null);
  const [legalOpen, setLegalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [docFiles, setDocFiles] = useState({});
  useEffect(() => { if (open) { setF(JSON.parse(JSON.stringify(empty))); setErrs({}); setConn(null); setFinKind(null); setLegalOpen(false); setDocFiles({}); } }, [open]);

  const lookupInn = () => {
    const inn = (f.inn || '').trim();
    if (inn.replace(/\D/g, '').length < 8) { toast('Введите корректный ИНН (мин. 8 цифр)', 'err'); return; }
    setF((p) => ({ ...p, name: p.name || ('ОсОО по ИНН ' + inn.slice(0, 6)), org: p.org || ('ОсОО по ИНН ' + inn.slice(0, 6)) }));
    setLegalOpen(true);
    toast('Юридические данные подтянуты по ИНН', 'ok');
  };

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
    setConn('pending');
    toast('Подключение будет проверено backend после безопасного сохранения реквизитов', 'info');
  };

  const submit = async () => {
    const er = {};
    const adapterKey = process.env.NEXT_PUBLIC_DEFAULT_PROVIDER_ADAPTER || (process.env.NODE_ENV !== 'production' ? 'mock' : '');
    if (!f.name.trim()) er.name = 'Введите название';
    if (!f.kinds.length) er.kinds = 'Выберите хотя бы один вид услуг';
    if (isApiType && !f.api.url.trim()) er.apiUrl = 'Укажите URL API';
    if (isApiType && !adapterKey) er.adapter = 'Для production укажите NEXT_PUBLIC_DEFAULT_PROVIDER_ADAPTER';
    if (!isApiType && !f.local.contact.trim()) er.contact = 'Укажите контактное лицо';
    setErrs(er);
    if (er.name) setLegalOpen(true);
    if (Object.keys(er).length) { toast('Проверьте поля формы', 'err'); return; }
    const ext = {
      supType: f.supType, kinds: f.kinds, priority: f.priority, useDefault: f.useDefault, country: f.country, city: f.city,
      api: { ...f.api, status: conn === 'ok' ? 'Подключено' : 'Не проверено', lastSync: '—' },
      local: { ...f.local, comm: f.local.comm.length ? f.local.comm : ['Email'], commBind: { ...(f.local.commBind || {}) }, processing: f.local.processing === '' ? 0 : f.local.processing },
      fin: { ...JSON.parse(JSON.stringify(f.fin)), payTerm: f.fin.payTerm === '' ? 0 : f.fin.payTerm },
      ops: { ...f.ops }, automation: f.automation, searchPriority: { ...f.searchPriority },
      stats: { bookings: 0, issues: 0, refunds: 0, avgResponse: '—', successRate: '—', lastUsed: '—' },
      docs: SUP_DOC_KINDS.reduce((m, k) => (m[k] = [], m), {}),
    };
    const kindMap = { 'Авиа': 'avia', 'ЖД': 'rail', 'Гостиницы': 'hotel', 'Трансферы': 'transfer', 'Автобусы': 'bus', 'Страхование': 'insurance', 'Визы': 'visa', 'Прочее': 'other' };
    setSaving(true);
    try {
      const created = await suppliersApi.create({
        name: f.name, legal_name: f.org || f.name, tax_id: f.inn,
        status: { 'Активный': 'active', 'На паузе': 'paused', 'Заблокированный': 'archived' }[f.status] || 'active',
        organization_type: f.orgType, is_global: f.supType !== 'Локальный',
        service_kinds: f.kinds.map((kind) => kindMap[kind] || 'other'),
        countries: [f.country], cities: [f.city], currencies: [f.fin.currency],
        communication_methods: f.local.comm, work_hours: f.local.hours,
        settlement_type: { 'Предоплата': 'prepayment', 'Депозит': 'deposit', 'Отсрочка': 'credit', 'По факту': 'postpayment' }[f.fin.settlement] || '',
        contact_person: f.local.contact,
        automation_capabilities: { operations: f.ops, search_mode: f.automation, finance: f.fin, api_url: f.api.url },
      });
      SUP_EXT[created.id] = ext;
      if (isApiType) {
        const secrets = Object.fromEntries(Object.entries(f.api).filter(([, value]) => value));
        await suppliersApi.saveCredential(created.id, {
          provider_adapter: adapterKey,
          environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
          secrets,
        });
        await suppliersApi.checkConnection(created.id);
      }
      await Promise.all(Object.entries(docFiles).map(([kind, file]) => documentsApi.upload(file, {
        kind: 'contract', title: file.name, source: 'upload',
        metadata: { supplier_id: created.id, supplier_name: created.name, supplier_document_kind: kind },
      })));
      const supplier = toUiSupplier(created);
      onCreated(supplier);
      toast('Поставщик добавлен. Проверка интеграции поставлена в очередь.', 'ok'); onClose();
    } catch (error) {
      toast(error.message || 'Не удалось добавить поставщика', 'err');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Добавить поставщика" width="min(820px,96vw)"
      sub="Карточка поставщика: общие данные, интеграция, финансовые условия, приоритеты поиска"
      footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button variant="primary" iconRight="arrowRight" onClick={submit} disabled={saving}>{saving ? 'Сохранение…' : 'Добавить поставщика'}</Button></>}>


      <SupSection icon="user" title="Реквизиты поставщика">
        <div className="full">
          <Field label="ИНН" hint="ведущее поле — подтянет юридические данные">
            <div style={{ display: 'flex', gap: 8 }}>
              <Input placeholder="Введите ИНН" value={f.inn} onChange={set('inn')} style={{ flex: 1 }} />
              <Button variant="secondary" icon="search" onClick={lookupInn}>Заполнить по ИНН</Button>
            </div>
          </Field>
        </div>

        <button type="button" onClick={() => setLegalOpen((v) => !v)} className="doc-chip" style={{ width: '100%', marginTop: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="template" style={{ width: 16, height: 16 }} />Юридические данные{f.name ? ' · ' + f.name : ''}</span>
          <Icon name={legalOpen ? 'chevUp' : 'chevDown'} />
        </button>
        {legalOpen && (
          <div className="form-grid" style={{ marginTop: 12 }}>
            <div className="full"><Field label="Наименование" required error={errs.name}><Input placeholder="Введите название" value={f.name} onChange={set('name')} error={errs.name} /></Field></div>
            <Field label="Организация"><Input placeholder="Организация" value={f.org} onChange={set('org')} /></Field>
            <Field label="Тип организации"><Select options={Object.keys(ORG_TYPE)} value={f.orgType} onChange={set('orgType')} /></Field>
            <Field label="Страна"><Combobox options={SUP_COUNTRIES} value={f.country} placeholder="Начните вводить страну…" onChange={(v) => setF((p) => ({ ...p, country: v, city: supCitiesFor(v)[0] }))} /></Field>
            <Field label="Город"><Combobox options={supCitiesFor(f.country)} value={f.city} placeholder="Начните вводить город…" onChange={(v) => set('city')(v)} /></Field>
          </div>
        )}
      </SupSection>


      <SupSection icon="suppliers" title="Параметры поставщика">
        <div className="form-grid">
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
          <div className="full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
            <div><div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14 }}>Использовать по умолчанию</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>Предлагается первым при ручном выборе поставщика</div></div>
            <Toggle on={f.useDefault} onChange={(v) => set('useDefault')(v)} />
          </div>
        </div>
      </SupSection>


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
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Последняя синхронизация: —</span>
          </div>
        </SupSection>
      )}


      {!isApiType && (
        <SupSection icon="contacts" title="Локальный поставщик" sub="Контакты и режим работы для ручного взаимодействия">
          <div className="form-grid">
            <div className="full"><Field label="Контактное лицо" required error={errs.contact}><Input placeholder="ФИО" value={f.local.contact} onChange={(e) => setSub('local', 'contact', e.target.value)} error={errs.contact} /></Field></div>
            <div className="full">
              <Field label="Способы коммуникации">
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: f.local.comm.length ? 12 : 0 }}>
                  {SUP_COMM_METHODS.map((m) => (
                    <label key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, color: 'var(--body)' }}>
                      <Checkbox on={f.local.comm.includes(m)} onChange={() => toggleComm(m)} />{m}
                    </label>
                  ))}
                </div>

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
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 102, marginTop: 3 }}>{cfg.hint}</div>
                        </div>
                      );
                    })}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                      <Icon name="chat" style={{ width: 16, height: 16, color: 'var(--blue)', flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 12, color: 'var(--body)' }}>Как работает чат: сообщения из треда заказа отправляются поставщику через привязанный канал (бот/API мессенджера), а его ответы автоматически возвращаются в тот же чат CRM — оператор ведёт всю переписку в одном окне.</span>
                    </div>
                  </div>
                )}
              </Field>
            </div>
            <Field label="Время обработки заявок (мин)"><Input type="number" min="0" placeholder="напр. 60" value={f.local.processing} onChange={(e) => setSub('local', 'processing', e.target.value === '' ? '' : (parseInt(e.target.value) || 0))} /></Field>
            <div className="full"><Field label="Режим работы" hint="задаётся циферблатом"><WorkHoursPicker value={f.local.hours} onChange={(v) => setSub('local', 'hours', v)} /></Field></div>
          </div>
        </SupSection>
      )}


      <SupSection icon="finance" title="Финансовые условия" sub="Заменяет поле «Комиссия/маржа»: комиссии и сборы настраиваются отдельно по каждому виду услуг">
        <div className="form-grid">
          <Field label="Валюта расчетов"><Select options={CURRENCIES.map((c) => c.code)} value={f.fin.currency} onChange={(e) => setSub('fin', 'currency', e.target.value)} /></Field>
          <Field label="Тип комиссии"><Select options={SUP_COMM_TYPES} value={f.fin.commType} onChange={(e) => setSub('fin', 'commType', e.target.value)} /></Field>
          <Field label="Размер комиссии"><Input type="number" value={f.fin.commValue} onChange={(e) => setSub('fin', 'commValue', parseFloat(e.target.value) || 0)} /></Field>
          <Field label="НДС"><Select options={['Без НДС', '12%', '20%']} value={f.fin.vat} onChange={(e) => setSub('fin', 'vat', e.target.value)} /></Field>
          <Field label="Способ взаиморасчетов"><Select options={SUP_SETTLEMENTS} value={f.fin.settlement} onChange={(e) => setSub('fin', 'settlement', e.target.value)} /></Field>
          <Field label="Срок оплаты (дней)"><Input type="number" min="0" placeholder="напр. 10" value={f.fin.payTerm} onChange={(e) => setSub('fin', 'payTerm', e.target.value === '' ? '' : (parseInt(e.target.value) || 0))} /></Field>
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
                  <span style={{ flex: 1, minWidth: 160, fontSize: 13, color: 'var(--body)' }}>{fk.label}</span>
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
        ) : <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>Выберите вид услуг выше, чтобы настроить сборы по каждому виду отдельно.</div>}
      </SupSection>


      <SupSection icon="check" title="Поддерживаемые услуги" sub="Какие операции доступны через этого поставщика">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
          {SUP_OPS.map((op) => (
            <label key={op} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--body)' }}>
              <Checkbox on={!!f.ops[op]} onChange={() => setF((p) => ({ ...p, ops: { ...p.ops, [op]: !p.ops[op] } }))} />{op}
            </label>
          ))}
        </div>
      </SupSection>


      <SupSection icon="docs" title="Документы" sub="Договор, дополнительные соглашения, реквизиты, сертификаты и прочие файлы">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {SUP_DOC_KINDS.map((d) => (
            <label key={d} className="doc-chip" style={{ borderStyle: 'dashed', color: docFiles[d] ? 'var(--green)' : 'var(--blue)', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name={docFiles[d] ? 'check' : 'plus'} />{docFiles[d]?.name || d}</span>
              <input type="file" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) setDocFiles((current) => ({ ...current, [d]: file })); }} />
            </label>
          ))}
        </div>
      </SupSection>


      <SupSection icon="zap" title="Автоматизация">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {SUP_AUTOMATION.map((a) => (
            <button key={a.key} onClick={() => set('automation')(a.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, border: '1px solid ' + (f.automation === a.key ? 'var(--blue)' : 'var(--field-line)'), background: f.automation === a.key ? 'var(--blue-soft)' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
              <Radio on={f.automation === a.key} onChange={() => set('automation')(a.key)} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{a.label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.hint}</div>
              </div>
            </button>
          ))}
        </div>
      </SupSection>


      <SupSection icon="search" title="Для поиска" sub="По этим приоритетам система автоматически выбирает поставщика при поиске (1 — наивысший). Доступны только те виды услуг, которые поставщик обслуживает.">
        {!f.kinds.length && <div style={{ fontSize: 12, color: 'var(--amber)', marginBottom: 10 }}>Сначала выберите «Вид услуг» выше — приоритеты станут доступны только для выбранных услуг.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 460 }}>
          {SUP_PRIORITY_SERVICES.map((svc) => {
            const served = f.kinds.includes(svc);
            return (
              <div key={svc} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: served ? 1 : .5 }}>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--body)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  Приоритет по: {svc}
                  {!served && f.kinds.length > 0 && <Pill tone="gray">не обслуживается</Pill>}
                </span>
                <div style={{ width: 110 }}>
                  <Input type="number" min="1" placeholder="—" disabled={!served}
                    title={served ? '' : 'Поставщик не обслуживает этот вид услуг'}
                    value={served && f.searchPriority[svc] != null ? f.searchPriority[svc] : ''}
                    onChange={(e) => setF((p) => ({ ...p, searchPriority: { ...p.searchPriority, [svc]: e.target.value === '' ? null : Math.max(1, parseInt(e.target.value) || 1) } }))} />
                </div>
              </div>
            );
          })}
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
  const [active, setActive] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [prioOpen, setPrioOpen] = useState(false);
  const { sort, onSort, apply } = useSort(null);

  useEffect(() => { if (intent && intent.type === 'create') { setAddOpen(true); onConsume(); } }, [intent]);
  useEffect(() => { setPage(1); }, [search, filters]);

  if (active) return (
    <div className="fade-in">
      <Topbar title="Карточка поставщика" />
      <div className="content"><SupplierCard supplier={active} onBack={() => setActive(null)} /></div>
    </div>
  );

  let rows = suppliers.filter((s) =>
    (s.name.toLowerCase().includes(search.toLowerCase()) || String(s.no).includes(search)) &&
    (!filters.supType || supExt(s).supType === filters.supType) &&
    (!filters.status || s.status === filters.status) &&
    (!filters.service || s.service === filters.service));
  rows = apply(rows, { no: (r) => r.no });
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="fade-in">
      <Topbar title="Поставщики">
        <div className="topbar-spacer" />
        <Button variant="secondary" icon="sla" onClick={() => setPrioOpen(true)}>Приоритеты поиска</Button>
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
                      <tr key={i} style={{ cursor: 'pointer' }} onClick={() => setActive(s)}>
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

      <SupplierAddDrawer open={addOpen} onClose={() => setAddOpen(false)} onCreated={addSupplier} />
      <SearchPriorityModal open={prioOpen} onClose={() => setPrioOpen(false)} />
    </div>
  );
}

Object.assign(window, { SuppliersPage, SupplierCard, SupplierTabBody, SupplierModal, SupplierAddDrawer, SearchPriorityModal, DocPreviewDrawer, supExt, SUP_SERVICE_KINDS, SupplierBadge, supBrand });



export { MiniLineChart, DocPreviewDrawer, SUP_BRAND_COLORS, supBrand, SupplierBadge, SUPPLIER_TYPES, SUP_SERVICE_KINDS, SUP_COMM_METHODS, SUP_COUNTRIES, SUP_CITIES, supCitiesFor, SUP_WORK_HOURS, SUP_COMM_CONFIG, SUP_OPS, SUP_DOC_KINDS, SUP_COMM_TYPES, SUP_SETTLEMENTS, SUP_AUTOMATION, SUP_AUTOMATION_LABEL, SUP_FIN_KEYS, SUP_PRIORITY_SERVICES, SUP_SEARCH_ORDER, supEmptyFin, SUP_EXT, supExt, supLookupByInn, supFinSummary, AviaMarkupEditor, SupplierFinEditor, SupplierSearchEditor, SearchPriorityModal, SUP_TABS, SupplierLegalEditor, SupplierTabBody, SupplierCard, SupplierModal, SupSection, SupplierAddDrawer, SuppliersPage };
