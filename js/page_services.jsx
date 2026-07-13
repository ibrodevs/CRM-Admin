// ===== Сервисные модули (ЖД / гостиницы / трансферы / автобусы / туры) =====
// Единый каркас на шаблоне авиамодуля: реестр → поиск → выдача → карточка.

function svM(n) { return Math.round(n).toLocaleString('ru-RU') + ' $'; }

/* Аэроэкспресс — направления (аэропорт ⇄ городской терминал) и вариации проезда.
   Тариф флотовый: от направления не зависит, отличается видом проезда (разово / туда-обратно / абонемент). */
const AERO_DIRS = [
  { id: 'svo', label: 'Шереметьево (SVO) ⇄ Белорусский вокзал' },
  { id: 'dme', label: 'Домодедово (DME) ⇄ Павелецкий вокзал' },
  { id: 'vko', label: 'Внуково (VKO) ⇄ Киевский вокзал' },
];
const AERO_FARES = [['single', 'Разовый'], ['rt', 'Туда и обратно'], ['pass', 'Абонемент']];

const SVC_CFG = {
  rail: { title: 'ЖД билеты', kind: 'ЖД', searchTitle: 'Поиск ЖД билетов', mainLabel: 'Маршрут', qtyLabel: 'Пасс.',
    fields: [{ k: 'from', l: 'Откуда', t: 'text', w: 190 }, { k: 'to', l: 'Куда', t: 'text', w: 190 }, { k: 'date', l: 'Дата', t: 'date', w: 156 }, { k: 'pax', l: 'Пассажиры', t: 'stepper', w: 150 }, { k: 'cls', l: 'Класс', t: 'select', w: 150, o: ['Плацкарт', 'Купе', 'СВ'] }] },
  hotels: { title: 'Гостиницы', kind: 'Гостиница', searchTitle: 'Поиск гостиниц', mainLabel: 'Отель', qtyLabel: 'Гостей',
    fields: [{ k: 'city', l: 'Город', t: 'text', w: 210 }, { k: 'dates', l: 'Заезд — выезд', t: 'daterange', w: 230 }, { k: 'guests', l: 'Гостей', t: 'stepper', w: 140 }, { k: 'rooms', l: 'Номеров', t: 'stepper', w: 140 }, { k: 'stars', l: 'Категория', t: 'select', w: 140, o: ['3★', '4★', '5★'] }] },
  transfers: { title: 'Трансферы', kind: 'Трансфер', searchTitle: 'Поиск трансфера', mainLabel: 'Маршрут', qtyLabel: 'Пасс.',
    fields: [{ k: 'from', l: 'Откуда', t: 'text', w: 210 }, { k: 'to', l: 'Куда', t: 'text', w: 210 }, { k: 'dt', l: 'Дата', t: 'date', w: 156 }, { k: 'pax', l: 'Пассажиров', t: 'stepper', w: 150 }, { k: 'cls', l: 'Класс авто', t: 'select', w: 150, o: ['Эконом', 'Комфорт', 'Минивэн', 'VIP'] }] },
  buses: { title: 'Автобусы', kind: 'Автобус', searchTitle: 'Поиск автобусов', mainLabel: 'Маршрут', qtyLabel: 'Мест',
    fields: [{ k: 'from', l: 'Откуда', t: 'text', w: 210 }, { k: 'to', l: 'Куда', t: 'text', w: 210 }, { k: 'date', l: 'Дата', t: 'date', w: 156 }, { k: 'pax', l: 'Пассажиров', t: 'stepper', w: 150 }] },
  tours: { title: 'Групповые поездки', kind: 'Группа', searchTitle: 'Подбор тура', mainLabel: 'Тур', qtyLabel: 'Чел.',
    fields: [{ k: 'dest', l: 'Направление', t: 'text', w: 230 }, { k: 'dates', l: 'Даты', t: 'daterange', w: 230 }, { k: 'pax', l: 'Туристов', t: 'stepper', w: 150 }, { k: 'board', l: 'Питание', t: 'select', w: 170, o: ['Завтрак', 'Полупансион', 'All Inclusive'] }] },
  aero: { title: 'Аэроэкспресс', kind: 'Аэроэкспресс', searchTitle: 'Поиск билетов Аэроэкспресс', mainLabel: 'Направление', qtyLabel: 'Пасс.',
    fields: [{ k: 'dir', l: 'Направление', t: 'select', w: 300, o: AERO_DIRS.map((d) => d.label) }, { k: 'date', l: 'Дата', t: 'date', w: 156 }, { k: 'pax', l: 'Пассажиров', t: 'stepper', w: 150 }] },
};

/* ---------- search field renderer ---------- */
function SvcField({ f, form, set }) {
  const v = form[f.k];
  if (f.t === 'date') return <div className="av-field" style={{ width: f.w }}><span className="label">{f.l}</span><DateField value={v} onChange={(d) => set(f.k, d)} placeholder="Выбрать" /></div>;
  if (f.t === 'daterange') return <div className="av-field" style={{ width: f.w }}><span className="label">{f.l}</span><DateRangeField startVal={v && v.s} endVal={v && v.e} onChange={(s, e) => set(f.k, { s, e })} /></div>;
  if (f.t === 'select') return <div className="av-field" style={{ width: f.w }}><span className="label">{f.l}</span><Select options={f.o} value={v || f.o[0]} onChange={(e) => set(f.k, e.target.value)} /></div>;
  if (f.t === 'stepper') {
    const n = v == null ? 1 : v;
    return <div className="av-field" style={{ width: f.w }}><span className="label">{f.l}</span>
      <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <button className="btn btn-secondary btn-icon btn-sm" disabled={n <= 1} onClick={() => set(f.k, n - 1)}>−</button>
        <span style={{ fontWeight: 700 }}>{n}</span>
        <button className="btn btn-secondary btn-icon btn-sm" onClick={() => set(f.k, n + 1)}>+</button>
      </div></div>;
  }
  return <div className="av-field" style={{ width: f.w }}><span className="label">{f.l}</span><Input value={v || ''} onChange={(e) => set(f.k, e.target.value)} placeholder={f.l} /></div>;
}

/* ---------- offer card (reuses off-card) ---------- */
function SvcOfferCard({ o, kind, onSelect, onSave, selectLabel }) {
  const k = SERVICE_KIND[kind];
  const total = o.cost + o.fee;
  const fmt = o.currency === 'RUB' ? rub : svM;
  return (
    <div className="off-card" style={{ marginBottom: 14 }}>
      <div className="off-main">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="oc-svc-ic" style={{ background: k.color, width: 44, height: 44 }}><Icon name={k.icon} /></span>
          <div><div style={{ fontWeight: 700, color: 'var(--ink)' }}>{o.title}</div><div style={{ fontSize: 13, color: 'var(--muted)' }}>{o.sub}</div></div>
        </div>
        <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap' }}>
          {o.info.map((r, i) => (<div key={i}><div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.l}</div><div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14 }}>{r.v}</div></div>))}
        </div>
        <div className="off-meta">{o.tags.map((t, i) => <span key={i} className="off-tag">{t}</span>)}</div>
      </div>
      <div className="off-side">
        <div>
          <div className="off-supplier"><Icon name="api" style={{ width: 14, height: 14, verticalAlign: -2 }} /> {o.supplier}</div>
          <div className="off-price-line"><span>Тариф</span><span>{fmt(o.cost)}</span></div>
          <div className="off-price-line"><span>Сервисный сбор</span><span>{fmt(o.fee)}</span></div>
          <div className="off-total">{Math.round(total).toLocaleString('ru-RU')} <small>{o.currency === 'RUB' ? '₽' : '$'}</small></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button size="sm" onClick={() => onSelect(o)}>{selectLabel || 'Выбрать'}</Button>
          <Button variant="secondary" size="sm" icon="star" onClick={() => onSave(o)}>Сохранить</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- service card — единая структура с авиа-карточкой (вкладки: участники / детали /
   поставщик / финансы / документы / комментарии / история), чтобы все услуги выглядели одинаково ---------- */
/* Строки внутренних финполей, которые компания РАЗРЕШИЛА показывать клиенту (настройка видимости). */
function clientFinRows(fin, vis, fmt) {
  const rows = [
    ['supplierPrice', 'Цена поставщика', fin.supplierPrice],
    ['cost', 'Себестоимость', fin.cost],
    ['commission', 'Комиссия поставщика', fin.commission],
    ['serviceFee', 'Сервисный сбор', fin.fee],
    ['markup', 'Наценка', fin.markup],
    ['profit', 'Прибыль', fin.profit],
  ].filter(([k]) => vis && vis[k]);
  return rows.map(([k, label, val]) => (<div className="kv-row" key={k}><span className="k">{label}</span><span className="v">{fmt(val)}</span></div>));
}

/* ---------- Карточка услуги: индикатор жизненного цикла (создана → … → оформлена) ---------- */
function CardLifecycle({ current }) {
  const done = CARD_STATUS_FLOW.indexOf(current);
  return (
    <div className="timeline">
      {CARD_STATUS_FLOW.map((s, i) => {
        const st = CARD_STATUS[s];
        const state = i < done ? 'past' : i === done ? 'cur' : 'future';
        return (
          <div className="tl-item" key={s}>
            <span className="tl-dot" style={{ background: state === 'future' ? 'var(--line)' : (state === 'cur' ? 'var(--blue)' : 'var(--green)') }} />
            {i < CARD_STATUS_FLOW.length - 1 && <span className="tl-line" />}
            <div><div className="tl-text" style={{ fontWeight: state === 'cur' ? 700 : 500, color: state === 'future' ? 'var(--muted-2)' : 'var(--ink)' }}>
              {st.label}{state === 'cur' ? ' · текущий' : ''}</div></div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Отправка карточки услуги клиенту по закреплённому каналу ----------
   Оператор не пишет сообщение вручную: система формирует карточку и адаптирует её под канал.
   Слева — что получит клиент; справа — внутренняя информация, которая клиенту НЕ отправляется. */
function ServiceCardSendPanel({ item, kind, participants = [], orderNo, currency, onSent, onClose }) {
  const defChannel = orderClientChannel(orderNo || item.order);
  const [channel, setChannel] = useState(defChannel);
  const meta = sendChannelMeta(channel);
  const fmt = (n) => (currency === 'RUB' || currency === '₽') ? rub(n) : svM(n);
  const fin = cardInternals(item);
  const vis = (typeof CARD_CLIENT_VISIBILITY !== 'undefined') ? CARD_CLIENT_VISIBILITY : {};
  const info = (item.info || []).filter((r) => r && r.v != null);
  const extras = item.tags || [];
  const validity = item.validUntil || '3 дня с момента отправки';
  const k = SERVICE_KIND[kind] || { icon: 'briefcase', color: 'var(--blue)' };

  const send = () => { onSent && onSent(channel); onClose && onClose(); };

  return (
    <StackPanel title="Отправка карточки услуги клиенту" width="min(1080px,96vw)" onClose={onClose}
      footer={<>
        <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="lock" style={{ width: 14, height: 14 }} />Внутренние расчёты клиенту не отправляются
        </div>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button icon="send" onClick={send}>Отправить по каналу «{channel}»</Button>
      </>}>
      {/* канал, закреплённый за заказом/клиентом */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Канал связи, закреплённый за заказом</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Pill tone={meta.tone}><Icon name={meta.icon} style={{ width: 14, height: 14, verticalAlign: -2 }} /> {channel}</Pill>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>· {meta.adapt}</span>
            </div>
          </div>
          <div className="seg-toggle" style={{ flexWrap: 'wrap' }}>
            {Object.keys(SEND_CHANNELS).map((c) => (
              <button key={c} type="button" className={'seg-btn' + (channel === c ? ' active' : '')} style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 13 }} onClick={() => setChannel(c)}>
                <Icon name={SEND_CHANNELS[c].icon} style={{ width: 14, height: 14 }} />{c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start', gap: 16 }}>
        {/* ЧТО ПОЛУЧИТ КЛИЕНТ */}
        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Icon name="eye" style={{ width: 16, height: 16, color: 'var(--blue)' }} />
            <h3 className="card-title" style={{ fontSize: 15, margin: 0 }}>Что получит клиент</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span className="oc-svc-ic" style={{ background: k.color, width: 40, height: 40 }}><Icon name={k.icon} /></span>
            <div><div style={{ fontWeight: 700, color: 'var(--ink)' }}>{item.title || item.main}</div><div style={{ fontSize: 13, color: 'var(--muted)' }}>{item.sub}</div></div>
          </div>
          <div className="kv">
            {info.map((r, i) => (<div className="kv-row" key={i}><span className="k">{r.l}</span><span className="v">{r.v}</span></div>))}
            {extras.length > 0 && <div className="kv-row"><span className="k">Доп. услуги / условия</span><span className="v">{extras.join(', ')}</span></div>}
            {participants.length > 0 && <div className="kv-row"><span className="k">{kind === 'Гостиница' ? 'Гости' : 'Пассажиры'}</span><span className="v">{participants.map((p) => p.name).join(', ')}</span></div>}
            <div className="kv-row"><span className="k">Срок действия предложения</span><span className="v">{validity}</span></div>
            {clientFinRows(fin, vis, fmt)}
            {vis.clientTotal !== false && <div className="kv-row"><span className="k" style={{ fontWeight: 700, color: 'var(--ink)' }}>Итоговая стоимость</span><span className="v" style={{ fontSize: 17, fontWeight: 700 }}>{fmt(fin.clientTotal)}</span></div>}
          </div>
        </div>

        {/* ВНУТРЕННЯЯ ИНФОРМАЦИЯ (не для клиента) */}
        <div className="card card-pad" style={{ background: 'var(--surface-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Icon name="lock" style={{ width: 16, height: 16, color: 'var(--muted)' }} />
            <h3 className="card-title" style={{ fontSize: 15, margin: 0 }}>Внутренняя информация</h3>
            <Pill tone="gray">не для клиента</Pill>
          </div>
          <div className="kv">
            <div className="kv-row"><span className="k">Цена поставщика</span><span className="v">{fmt(fin.supplierPrice)}</span></div>
            <div className="kv-row"><span className="k">Себестоимость</span><span className="v">{fmt(fin.cost)}</span></div>
            <div className="kv-row"><span className="k">Комиссия поставщика</span><span className="v" style={{ color: 'var(--green)' }}>+ {fmt(fin.commission)}</span></div>
            <div className="kv-row"><span className="k">Сервисный сбор</span><span className="v">{fmt(fin.fee)}</span></div>
            {fin.markup ? <div className="kv-row"><span className="k">Наценка</span><span className="v">{fmt(fin.markup)}</span></div> : null}
            <div className="kv-row"><span className="k" style={{ fontWeight: 700, color: 'var(--ink)' }}>Прибыль</span><span className="v" style={{ fontWeight: 700, color: 'var(--green)' }}>{fmt(fin.profit)}</span></div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>Клиент получит только разрешённые настройками компании поля (Настройки → Карточки услуг → «Видимость полей для клиента»).</div>
        </div>
      </div>
    </StackPanel>
  );
}

/* Боковое окно загрузки документа в карточку услуги. Демонстрационное: файл выбирается через
   системный диалог (или перетаскивается), но не отправляется на сервер. */
function SvcDocUploadDrawer({ open, isHotel, participants = [], orderNo, onClose, onUploaded }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);        // { name, size } | null
  const docTypes = [isHotel ? 'Ваучер на отель' : 'Ваучер / билет', 'Счёт на оплату', 'Подтверждение', 'Прочее'];
  const [type, setType] = useState(docTypes[0]);
  const [participant, setParticipant] = useState('—');
  const [drag, setDrag] = useState(false);
  // при каждом открытии — сброс формы
  useEffect(() => { if (open) { setFile(null); setType(docTypes[0]); setParticipant('—'); setDrag(false); } }, [open, isHotel]);

  const fmtSize = (bytes) => (bytes / 1024 < 1024 ? Math.max(1, Math.round(bytes / 1024)) + ' КБ' : (bytes / 1048576).toFixed(1) + ' МБ');
  const takeFile = (f) => { if (f) setFile({ name: f.name, size: fmtSize(f.size) }); };
  const onFile = (e) => { takeFile(e.target.files && e.target.files[0]); e.target.value = ''; };
  const onDrop = (e) => { e.preventDefault(); setDrag(false); takeFile(e.dataTransfer.files && e.dataTransfer.files[0]); };
  const pickFile = () => fileRef.current && fileRef.current.click();

  const submit = () => {
    if (!file) return;
    onUploaded({
      id: 'u' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      name: file.name, size: file.size, type,
      participant: participant !== '—' ? participant : null,
      date: new Date().toLocaleDateString('ru-RU'),
    });
  };

  const paxOptions = ['—', ...participants.map((p) => p.name)];
  return (
    <Drawer open={open} onClose={onClose} title="Загрузка документа" sub={orderNo ? 'Заказ № ' + orderNo : 'Документ карточки услуги'}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button icon="plus" disabled={!file} onClick={submit}>Загрузить</Button>
      </>}>
      <div>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={onFile} />
        <button type="button" className="doc-preview" onClick={pickFile}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
          style={{ width: '100%', cursor: 'pointer', border: '1px dashed ' + (drag ? 'var(--blue)' : 'var(--line)'), background: drag ? 'var(--hover)' : undefined, textAlign: 'center' }}>
          <Icon name={file ? 'docs' : 'plus'} style={{ width: 40, height: 40 }} strokeWidth={1.4} />
          <span style={{ fontSize: 13, color: file ? 'var(--ink)' : 'var(--blue)', fontWeight: 600 }}>
            {file ? file.name : 'Выберите файл или перетащите сюда'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{file ? file.size : 'PDF, JPG, PNG · до 15 МБ'}</span>
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: participants.length ? '1fr 1fr' : '1fr', gap: 12, marginTop: 16 }}>
          <div>
            <label className="lbl" style={{ display: 'block', marginBottom: 6 }}>Тип документа</label>
            <Select options={docTypes} value={type} onChange={(e) => setType(e.target.value)} />
          </div>
          {participants.length > 0 && (
            <div>
              <label className="lbl" style={{ display: 'block', marginBottom: 6 }}>Участник</label>
              <Select options={paxOptions} value={participant} onChange={(e) => setParticipant(e.target.value)} />
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

function SvcCard({ item, kind, participants = [], hideBackRow, onBack }) {
  const toast = useToast();
  const [tab, setTab] = useState('details');
  const [corrOpen, setCorrOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);   // документы, загруженные вручную в карточку услуги
  const [pax, setPax] = useState(participants);           // участники/гости услуги — можно добавлять прямо из карточки (ТЗ #5)
  const [addPaxOpen, setAddPaxOpen] = useState(false);    // боковая форма «Добавить пассажира»
  // Жизненный цикл карточки услуги — свой, независимый от статуса услуги в заказе.
  const initCard = (item.status === 'Выписано' || item.status === 'Подтверждено') ? 'issued' : (item.cardStatus || 'created');
  const [cardSt, setCardSt] = useState(initCard);
  const [version, setVersion] = useState(item.version || 1);
  const [versions, setVersions] = useState(item.versions || []);
  const [cardLog, setCardLog] = useState(() => [{ t: 'сейчас', txt: 'Карточка услуги создана' }]);
  const k = SERVICE_KIND[kind] || { icon: 'briefcase', color: 'var(--blue)' };
  const isOffer = !!item.cost;
  const cur = item.currency || (item.svcOffer && item.svcOffer.currency);
  const fmt = (n) => (cur === 'RUB' || cur === '₽') ? rub(n) : svM(n);
  const title = item.title || item.main;
  const sub = item.sub;
  const status = item.status || (isOffer ? 'Предложение' : '—');
  const total = isOffer ? item.cost + item.fee : item.sum;
  const info = (item.info || [{ l: 'Описание', v: item.sub }, { l: 'Дата', v: item.date }, { l: 'Количество', v: item.qty }]).filter((r) => r.v != null);
  const supplier = item.supplier || '—';
  const no = item.no || item.id || (String(kind).slice(0, 2).toUpperCase() + '-00000');
  const calc = item.calc || {};
  const tariff = calc.tariff != null ? calc.tariff : (isOffer ? item.cost : total);
  const fee = calc.fee != null ? calc.fee : (isOffer ? item.fee : 0);
  const isHotel = kind === 'Гостиница';
  const paxLabel = isHotel ? 'Гости' : 'Участники';

  // Корректировка документов доступна не только для авиа, но и для прочих услуг (запрос клиента).
  const corrCfg = docCorrKind(kind);
  const corrSubjects = (pax.length ? pax : [{ name: 'Основной заказчик', role: '—' }]).map((pp, i) => ({
    name: pp.name, type: pp.role || 'Взрослый',
    docNo: (no || 'DOC') + '-' + String(i + 1).padStart(2, '0'),
    ref: item.pnr || item.ref || (no || '—'),
  }));
  const corrMeta = { cfg: corrCfg, supplier, route: sub || title, dates: item.date || '—', carrierName: supplier && supplier !== '—' ? supplier : title, baseFareTotal: isOffer ? item.cost : (item.sum || tariff || 0) };
  const orderNo = item.order || null;
  const channel = orderClientChannel(orderNo);
  const chMeta = sendChannelMeta(channel);
  const fin = cardInternals(item);
  const cst = cardStatus(cardSt);

  const sendCard = (ch) => {
    setCardSt('sent');
    setCardLog((l) => [...l, { t: 'сейчас', txt: 'Отправлена клиенту · канал «' + ch + '» · v' + version }]);
    toast('Карточка услуги отправлена клиенту по каналу «' + ch + '»', 'ok');
    setTimeout(() => { setCardSt('delivered'); setCardLog((l) => [...l, { t: '+1 мин', txt: 'Доставлена клиенту' }]); }, 1000);
    setTimeout(() => { setCardSt('viewed'); setCardLog((l) => [...l, { t: '+3 мин', txt: 'Просмотрена клиентом' }]); }, 2200);
  };
  const bumpVersion = () => {
    const nv = version + 1;
    setVersions((vs) => [...vs, { v: version, note: 'Прежняя версия сохранена в истории' }]);
    setVersion(nv);
    setCardSt('price_changed');
    setCardLog((l) => [...l, { t: 'сейчас', txt: 'Изменены параметры — создана версия v' + nv + ' (прежняя сохранена)' }]);
    toast('Создана новая версия карточки v' + nv + ' — прежняя сохранена в истории', 'ok');
  };
  // Ручная простановка статуса (в проде часть приходит из канала/по таймеру — здесь кнопки-симуляции).
  const markCard = (key) => {
    const st = cardStatus(key);
    setCardSt(key);
    setCardLog((l) => [...l, { t: 'сейчас', txt: 'Статус карточки: ' + st.label }]);
    toast('Статус карточки: ' + st.label, key === 'declined' || key === 'unavailable' || key === 'expired' ? 'info' : 'ok');
  };

  const TABS = [
    { key: 'pax', label: paxLabel, count: pax.length || undefined },
    { key: 'details', label: 'Детали' },
    { key: 'card', label: 'Карточка услуги' },
    { key: 'supplier', label: 'Поставщик' },
    { key: 'finance', label: 'Финансы' },
    { key: 'docs', label: 'Документы' },
    { key: 'comments', label: 'Комментарии' },
    { key: 'history', label: 'История' },
  ];

  return (
    <div className="fade-in">
      {!hideBackRow && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Button variant="secondary" size="sm" icon="chevLeft" onClick={onBack}>Назад</Button>
          <span style={{ color: 'var(--muted)', fontSize: 14 }}>{SVC_CFG_TITLE(kind)} / {no}</span>
        </div>
      )}

      {/* header — 1-в-1 со структурой авиа-карточки */}
      <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <span className="oc-svc-ic" style={{ background: k.color }}><Icon name={k.icon} /></span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 className="card-title">{title}</h2>
            <Pill tone={SERVICE_STATUS[status] || 'gray'}>{status}</Pill>
            <Pill tone={cst.tone}><Icon name={cst.icon} style={{ width: 12, height: 12, verticalAlign: -2 }} /> Карточка: {cst.label}</Pill>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>v{version}</span>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>{sub}{supplier && supplier !== '—' ? ' · ' + supplier : ''}</div>
        </div>
        <div style={{ textAlign: 'right' }}><div style={{ fontSize: 13, color: 'var(--muted)' }}>Итого к оплате</div><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>{total ? fmt(total) : '—'}</div></div>
        <Button icon="send" onClick={() => setSendOpen(true)}>Отправить клиенту</Button>
        {status === 'Предложение' && <Button variant="secondary" icon="check" onClick={() => toast('Отправлено на бронирование', 'ok')}>Забронировать</Button>}
        {status === 'Забронировано' && <Button variant="secondary" icon="check" onClick={() => toast('Услуга оформлена', 'ok')}>Оформить</Button>}
        <ActionMenu trigger={<button className="btn btn-secondary btn-icon"><Icon name="more" /></button>}
          items={[
            { icon: 'send', label: 'Отправить карточку клиенту', onClick: () => setSendOpen(true) },
            { icon: 'edit', label: 'Изменить параметры → новая версия', onClick: bumpVersion },
            { sep: true },
            { icon: 'template', label: 'Корректировка документов', onClick: () => setCorrOpen(true) },
            { icon: 'download', label: 'Скачать документы', onClick: () => toast('Загрузка…') },
          ]} />
      </div>

      <div style={{ marginBottom: 18, overflowX: 'auto' }}><Tabs tabs={TABS} value={tab} onChange={setTab} /></div>

      {tab === 'pax' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>{pax.length ? pax.length + (isHotel ? ' гост.' : ' участ.') + ' в услуге' : (isHotel ? 'Гости не указаны' : 'Участники не указаны')}</div>
            <Button size="sm" icon="plus" onClick={() => setAddPaxOpen(true)}>{isHotel ? 'Добавить гостя' : 'Добавить пассажира'}</Button>
          </div>
          <div className="table-card">
            {pax.length ? (
              <table className="tbl">
                <thead><tr><th>{isHotel ? 'Гость' : 'Участник'}</th><th>Тип</th><th>Документ</th><th>Дата рожд.</th></tr></thead>
                <tbody>{pax.map((p, i) => (
                  <tr key={i}><td style={{ fontWeight: 600 }}>{p.name}</td><td>{p.role || 'Взрослый'}</td><td>{p.doc || '—'}</td><td>{p.dob || '—'}</td></tr>
                ))}</tbody>
              </table>
            ) : (
              <EmptyState icon="users" title={isHotel ? 'Гости не указаны' : 'Участники не указаны'} sub="Добавьте их прямо здесь — кнопкой справа сверху — или во вкладке «Пассажиры» заказа."
                action={<Button size="sm" icon="plus" onClick={() => setAddPaxOpen(true)}>{isHotel ? 'Добавить гостя' : 'Добавить пассажира'}</Button>} />
            )}
          </div>
        </div>
      )}

      {tab === 'details' && (
        <div className="card card-pad" style={{ maxWidth: 640 }}>
          <div className="kv">
            {info.map((r, i) => (<div className="kv-row" key={i}><span className="k">{r.l}</span><span className="v">{r.v}</span></div>))}
            {item.tags && item.tags.length > 0 && <div className="kv-row"><span className="k">Включено</span><span className="v">{item.tags.join(', ')}</span></div>}
            {item.railSeats && (<>
              <div className="kv-row"><span className="k">Обслуживание</span><span className="v">{item.railSeats.clsName} · вагон {item.railSeats.wagonNo}</span></div>
              {(item.railSeats.list || []).map((r, i) => (<div className="kv-row" key={'seat' + i}><span className="k">{r.name}</span><span className="v">{r.seat ? 'место ' + r.seat + ' · ' + (RAIL_SEAT_LABEL[r.kind] || '') : '—'}</span></div>))}
            </>)}
          </div>
        </div>
      )}

      {tab === 'card' && (
        <div className="grid-2" style={{ alignItems: 'start', gap: 16 }}>
          <div>
            <div className="card card-pad" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <h3 className="card-title" style={{ fontSize: 15, margin: 0 }}>Отправка клиенту</h3>
                <Pill tone={cst.tone}>{cst.label}</Pill>
              </div>
              <div className="kv">
                <div className="kv-row"><span className="k">Закреплённый канал</span><span className="v"><Pill tone={chMeta.tone}><Icon name={chMeta.icon} style={{ width: 12, height: 12, verticalAlign: -2 }} /> {channel}</Pill></span></div>
                <div className="kv-row"><span className="k">Версия карточки</span><span className="v">v{version}</span></div>
                <div className="kv-row"><span className="k">Итоговая стоимость клиенту</span><span className="v" style={{ fontWeight: 700 }}>{fmt(fin.clientTotal)}</span></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <Button size="sm" icon="send" onClick={() => setSendOpen(true)}>Отправить клиенту</Button>
                <Button size="sm" variant="secondary" icon="edit" onClick={bumpVersion}>Новая версия</Button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="lock" style={{ width: 14, height: 14 }} />Внутренние расчёты (себестоимость, комиссия, прибыль) клиенту не отправляются.
              </div>
            </div>
            {/* Смена статуса карточки. В проде «выбрана/отклонена» приходят из канала, «срок истёк» — по таймеру. */}
            <div className="card card-pad" style={{ marginTop: 16 }}>
              <h3 className="card-title" style={{ fontSize: 14, marginBottom: 4 }}>Ответ клиента / статус</h3>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>В реальной работе приходит из канала связи или по таймеру. Здесь — вручную.</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button size="sm" variant="secondary" icon="check" onClick={() => markCard('chosen')}>Клиент выбрал</Button>
                <Button size="sm" variant="secondary" icon="x" onClick={() => markCard('declined')}>Отклонил</Button>
                <Button size="sm" variant="secondary" icon="clock" onClick={() => markCard('expired')}>Срок истёк</Button>
                <Button size="sm" variant="secondary" icon="alertCircle" onClick={() => markCard('unavailable')}>Недоступна</Button>
                <Button size="sm" variant="secondary" icon="checkCircle" onClick={() => markCard('issued')}>Оформлена</Button>
              </div>
            </div>
            {versions.length > 0 && (
              <div className="card card-pad">
                <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>История версий</h3>
                <div className="kv">
                  {versions.map((vv, i) => (<div className="kv-row" key={i}><span className="k">Версия v{vv.v}</span><span className="v" style={{ color: 'var(--muted)' }}>{vv.note}</span></div>))}
                  <div className="kv-row"><span className="k" style={{ fontWeight: 700 }}>Версия v{version}</span><span className="v"><Pill tone="green">актуальная</Pill></span></div>
                </div>
              </div>
            )}
          </div>
          <div className="card card-pad">
            <h3 className="card-title" style={{ fontSize: 15, marginBottom: 12 }}>Жизненный цикл карточки</h3>
            <CardLifecycle current={cardSt} />
            <div style={{ borderTop: '1px solid var(--line)', margin: '14px 0' }} />
            <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>Журнал</h3>
            <div className="timeline">
              {cardLog.map((l, i) => (<div className="tl-item" key={i}><span className="tl-dot" />{i < cardLog.length - 1 && <span className="tl-line" />}<div><div className="tl-time">{l.t}</div><div className="tl-text">{l.txt}</div></div></div>))}
            </div>
          </div>
        </div>
      )}

      {tab === 'supplier' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Бланк поставщика: сохранить оригинал + корректировать математику (единично/группово), закрыть тариф на IT (авиа) */}
          <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderLeft: '4px solid var(--blue)' }}>
            <span className="oc-svc-ic" style={{ background: 'var(--blue)', flex: '0 0 auto' }}><Icon name="template" /></span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Бланк поставщика</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                Оригинал сохраняется без изменений (v1). Клиентская версия — с правкой математики{corrCfg.mode === 'avia' ? ', закрытием тарифа на «IT»' : ''} единично или группово.
              </div>
            </div>
            <Button icon="edit" onClick={() => setCorrOpen(true)}>Корректировать бланк</Button>
            <Button variant="secondary" icon="clock" onClick={() => setCorrOpen(true)}>Версии</Button>
          </div>
          <div className="grid-2" style={{ alignItems: 'start' }}>
            <div className="card card-pad"><div className="kv">
              <div className="kv-row"><span className="k">Поставщик</span><span className="v">{supplier}</span></div>
              <div className="kv-row"><span className="k">Канал</span><span className="v">{(item.svcOffer && item.svcOffer.channel) || 'API / B2B'}</span></div>
              <div className="kv-row"><span className="k">Номер брони</span><span className="v">{no}</span></div>
              <div className="kv-row"><span className="k">Даты</span><span className="v">{item.date || '—'}</span></div>
            </div></div>
            <div className="card card-pad"><div className="kv">
              <div className="kv-row"><span className="k">Статус оплаты поставщику</span><span className="v"><Pill tone="amber">Ожидает</Pill></span></div>
              <div className="kv-row"><span className="k">Тайм-лимит</span><span className="v"><TimeLimitBadge>сегодня 18:00</TimeLimitBadge></span></div>
            </div></div>
          </div>
        </div>
      )}

      {tab === 'finance' && (
        <div className="grid-2" style={{ alignItems: 'start', gap: 16 }}>
          {/* Для клиента — только разрешённые поля */}
          <div className="card card-pad">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Icon name="eye" style={{ width: 16, height: 16, color: 'var(--blue)' }} />
              <h3 className="card-title" style={{ fontSize: 15, margin: 0 }}>Для клиента</h3>
            </div>
            <div className="kv">
              {clientFinRows(fin, (typeof CARD_CLIENT_VISIBILITY !== 'undefined' ? CARD_CLIENT_VISIBILITY : {}), fmt)}
              <div className="kv-row"><span className="k" style={{ fontWeight: 700, color: 'var(--ink)' }}>Итоговая стоимость</span><span className="v" style={{ fontSize: 18 }}>{fmt(fin.clientTotal)}</span></div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Клиент видит только разрешённые настройками компании поля.</div>
          </div>
          {/* Внутреннее — не для клиента */}
          <div className="card card-pad" style={{ background: 'var(--surface-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Icon name="lock" style={{ width: 16, height: 16, color: 'var(--muted)' }} />
              <h3 className="card-title" style={{ fontSize: 15, margin: 0 }}>Внутреннее — не для клиента</h3>
            </div>
            <div className="kv">
              <div className="kv-row"><span className="k">Цена поставщика</span><span className="v">{fmt(fin.supplierPrice)}</span></div>
              <div className="kv-row"><span className="k">Себестоимость</span><span className="v">{fmt(fin.cost)}</span></div>
              {fin.commission ? <div className="kv-row"><span className="k">Комиссия поставщика</span><span className="v" style={{ color: 'var(--green)' }}>+ {fmt(fin.commission)}</span></div> : null}
              <div className="kv-row"><span className="k">Сервисный сбор</span><span className="v">{fmt(fin.fee)}</span></div>
              {fin.markup ? <div className="kv-row"><span className="k">Наценка</span><span className="v">{fmt(fin.markup)}</span></div> : null}
              <div className="kv-row"><span className="k" style={{ fontWeight: 700, color: 'var(--ink)' }}>Прибыль</span><span className="v" style={{ fontWeight: 700, color: 'var(--green)' }}>{fmt(fin.profit)}</span></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'docs' && (
        <div className="grid-4">
          {[isHotel ? 'Ваучер на отель' : 'Ваучер / билет', 'Счёт на оплату', 'Подтверждение'].map((d) => (<button key={d} className="doc-chip" onClick={() => toast('Скачивание · ' + d)}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="docs" />{d}</span><Icon name="download" /></button>))}
          {uploadedDocs.map((d) => (
            <div key={d.id} className="doc-chip" title={d.name}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <Icon name="docs" style={{ flexShrink: 0 }} />
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{d.type}{d.size ? ' · ' + d.size : ''}</span>
                </span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <button className="icon-btn" onClick={() => toast('Скачивание · ' + d.name)} title="Скачать"><Icon name="download" /></button>
                <button className="icon-btn" onClick={() => { setUploadedDocs((cur) => cur.filter((x) => x.id !== d.id)); toast('Документ удалён'); }} title="Удалить"><Icon name="trash" /></button>
              </span>
            </div>
          ))}
          <button className="doc-chip" style={{ borderStyle: 'dashed', color: 'var(--blue)' }} onClick={() => setUploadOpen(true)}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="plus" />Загрузить</span></button>
        </div>
      )}

      {tab === 'comments' && (
        <div className="card card-pad" style={{ maxWidth: 680 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <Input placeholder="Внутренний комментарий…" style={{ flex: 1 }} />
            <Button icon="send" onClick={() => toast('Комментарий добавлен')}>Отправить</Button>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card card-pad" style={{ maxWidth: 680 }}>
          <div className="timeline">
            {[['14:32', 'Услуга добавлена в заказ'], ['14:40', 'Запрос отправлен поставщику'], ['15:10', 'Получено подтверждение']].map(([t, txt], i) => (
              <div className="tl-item" key={i}><span className="tl-dot" /><span className="tl-line" /><div><div className="tl-time">{t}</div><div className="tl-text">{txt}</div></div></div>
            ))}
          </div>
        </div>
      )}

      {corrOpen && <DocCorrectionPanel subjects={corrSubjects} meta={corrMeta} currency={cur || 'USD'} orderNo={item.order || null} onClose={() => setCorrOpen(false)} />}
      {sendOpen && <ServiceCardSendPanel item={item} kind={kind} participants={pax} orderNo={orderNo} currency={cur} onSent={sendCard} onClose={() => setSendOpen(false)} />}
      <SvcDocUploadDrawer open={uploadOpen} isHotel={isHotel} participants={pax} orderNo={orderNo} onClose={() => setUploadOpen(false)}
        onUploaded={(doc) => { setUploadedDocs((cur) => [...cur, doc]); setUploadOpen(false); toast('Документ загружен', 'ok'); }} />
      <SvcAddPaxDrawer open={addPaxOpen} isHotel={isHotel} onClose={() => setAddPaxOpen(false)}
        onAdd={(person) => { setPax((cur) => [...cur, person]); setAddPaxOpen(false); toast((isHotel ? 'Гость' : 'Пассажир') + ' добавлен', 'ok'); }} />
    </div>
  );
}

/* Боковая форма добавления участника/гостя прямо из карточки услуги (ТЗ #5). */
// Добавление пассажира/гостя в подборе услуг — единая форма (forms_unified.jsx).
function SvcAddPaxDrawer({ open, isHotel, onClose, onAdd }) {
  return (
    <UnifiedPersonDrawer open={open} kind="person" mode="create" showRole
      title={isHotel ? 'Добавить гостя' : 'Добавить пассажира'}
      onClose={onClose}
      onSave={(person, client) => onAdd({ name: client.name, role: person.role, doc: person.docNo || '—', dob: person.dob || '—', documents: person.documents })} />
  );
}
function SVC_CFG_TITLE(kind) { const c = Object.values(SVC_CFG).find((x) => x.kind === kind); return c ? c.title : kind; }

/* ---------- левый фильтр выдачи (как у гостиниц): цена / поставщик / особенности ---------- */
function svcPriceBounds(offers) {
  const totals = offers.map((o) => o.cost + o.fee);
  return { min: Math.floor(Math.min(...totals)), max: Math.ceil(Math.max(...totals)) };
}
function SvcFilters({ allOffers, flt, setFlt, bounds, facetLabel }) {
  const suppliers = [...new Set(allOffers.map((o) => o.supplier))];
  const supCount = (s) => allOffers.filter((o) => o.supplier === s).length;
  const tags = [...new Set(allOffers.flatMap((o) => o.tags || []))];
  const tg = (key, val) => setFlt((f) => ({ ...f, [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val] }));
  const selCount = flt.sup.length + flt.tags.length + ((flt.priceMax != null && flt.priceMax < bounds.max) ? 1 : 0);
  return (
    <aside className="hp-filters">
      <div className="hp-filters-head">
        <span>Фильтры{selCount > 0 && <span className="flt-count">{selCount}</span>}</span>
        <button className="hp-reset" onClick={() => setFlt({ sup: [], tags: [], priceMax: bounds.max })}>Очистить</button>
      </div>
      <div className="hp-filter-block">
        <div className="hp-filter-title">Цена</div>
        <div className="hp-price-range">
          <span className="hp-pr-from">от {svM(bounds.min)}</span>
          <span className="hp-pr-to">{svM(flt.priceMax == null ? bounds.max : flt.priceMax)}</span>
        </div>
        <input type="range" className="hp-slider" min={bounds.min} max={bounds.max} step="1"
          value={flt.priceMax == null ? bounds.max : flt.priceMax}
          onChange={(e) => setFlt((f) => ({ ...f, priceMax: +e.target.value }))} />
      </div>
      <div className="hp-filter-block">
        <div className="hp-filter-title">Поставщик</div>
        {suppliers.map((s) => (
          <label key={s} className="hp-check-row">
            <Checkbox on={flt.sup.includes(s)} onChange={() => tg('sup', s)} />
            <span className="hp-check-label">{s}</span>
            <span className="hp-check-cnt">{supCount(s)}</span>
          </label>
        ))}
      </div>
      {tags.length > 0 && (
        <div className="hp-filter-block">
          <div className="hp-filter-title">{facetLabel || 'Особенности'}</div>
          {tags.map((t) => (
            <label key={t} className="hp-check-row">
              <Checkbox on={flt.tags.includes(t)} onChange={() => tg('tags', t)} />
              <span className="hp-check-label">{t}</span>
            </label>
          ))}
        </div>
      )}
    </aside>
  );
}

/* ====================================================================
   FLOW
   ==================================================================== */
function ServiceFlow({ routeKey }) {
  const cfg = SVC_CFG[routeKey];
  const data = SVC_DATA[routeKey];
  const k = SERVICE_KIND[cfg.kind];
  const toast = useToast();
  const [view, setView] = useState('registry');
  const [form, setForm] = useState({});
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState('best');
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('');
  const bounds = svcPriceBounds(data.offers);
  const [flt, setFlt] = useState({ sup: [], tags: [], priceMax: bounds.max });
  const setF = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const TITLES = { registry: cfg.title, search: cfg.searchTitle, results: 'Результаты поиска', card: cfg.title };

  const runSearch = () => { setView('results'); setLoading(true); setTimeout(() => setLoading(false), 900); };

  let offers = data.offers.filter((o) => {
    if (flt.priceMax != null && (o.cost + o.fee) > flt.priceMax) return false;
    if (flt.sup.length && !flt.sup.includes(o.supplier)) return false;
    if (flt.tags.length && !(o.tags || []).some((t) => flt.tags.includes(t))) return false;
    return true;
  });
  if (sort === 'cheap') offers = [...offers].sort((a, b) => (a.cost + a.fee) - (b.cost + b.fee));
  if (sort === 'pricey') offers = [...offers].sort((a, b) => (b.cost + b.fee) - (a.cost + a.fee));

  let rows = data.registry.filter((r) => (!fStatus || r.status === fStatus) && (!q || `${r.no} ${r.main} ${r.order}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <Topbar title={TITLES[view]} sub={view === 'card' && item ? cfg.title + ' · ' + (item.no || item.id || '') : undefined}>
        <div className="topbar-spacer" />
        {view === 'registry' && <Button icon="search" onClick={() => setView('search')}>{cfg.searchTitle === 'Подбор тура' ? 'Подобрать тур' : 'Новый поиск'}</Button>}
        {view === 'card' && item && <Button variant="secondary" icon="chevLeft" onClick={() => setView(item.cost ? 'results' : 'registry')}>{item.cost ? 'К результатам' : 'К реестру'}</Button>}
      </Topbar>
      <div className="content">
        {view === 'registry' && (
          <div className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <SearchBox value={q} onChange={setQ} placeholder="Поиск: №, маршрут, заказ…" style={{ width: 280 }} />
              <FilterChip label="Статус" value={fStatus} onChange={setFStatus} options={[...new Set(data.registry.map((r) => r.status))]} />
            </div>
            <div className="table-card">
              {rows.length ? (
                <table className="tbl">
                  <thead><tr><th>№</th><th>Заказ</th><th>{cfg.mainLabel}</th><th>Детали</th><th>Дата</th><th>{cfg.qtyLabel}</th><th>Статус</th><th style={{ textAlign: 'right' }}>Стоимость</th><th></th></tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.no} style={{ cursor: 'pointer' }} onClick={() => { setItem(r); setView('card'); }}>
                        <td className="t-strong">{r.no}</td>
                        <td><span style={{ color: 'var(--blue)', fontWeight: 600 }}>№ {r.order}</span></td>
                        <td><span style={{ display: 'flex', alignItems: 'center', gap: 9 }}><span className="airline-logo sm" style={{ background: k.color, width: 30, height: 30, borderRadius: 8 }}><Icon name={k.icon} style={{ width: 16, height: 16 }} /></span>{r.main}</span></td>
                        <td className="t-muted">{r.sub}</td>
                        <td>{r.date}</td>
                        <td>{r.qty}</td>
                        <td><Pill tone={SERVICE_STATUS[r.status] || 'gray'}>{r.status}</Pill></td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.sum ? (r.currency === 'RUB' ? rub(r.sum) : svM(r.sum)) : '—'}</td>
                        <td onClick={(e) => e.stopPropagation()}><ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>} items={[{ icon: 'eye', label: 'Открыть', onClick: () => { setItem(r); setView('card'); } }, { icon: 'template', label: 'В КП' }]} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <EmptyState icon={k.icon} title="Услуг не найдено" sub="Создайте новый поиск или измените фильтры" />}
            </div>
          </div>
        )}

        {view === 'search' && (
          <div className="fade-in">
            <div className="av-bar">
              {cfg.fields.map((f) => <SvcField key={f.k} f={f} form={form} set={setF} />)}
              <Button icon="search" style={{ height: 46, marginBottom: 0 }} onClick={runSearch}>Найти</Button>
            </div>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 13 }}>
              <Icon name="api" style={{ width: 16, height: 16 }} />Поиск по подключённым поставщикам · {cfg.title}
            </div>
          </div>
        )}

        {view === 'results' && (
          <div className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Button variant="secondary" size="sm" icon="chevLeft" onClick={() => setView('search')}>Изменить поиск</Button>
              <div className="tabs" style={{ marginLeft: 6 }}>
                {[['best', 'Оптимальные'], ['cheap', 'Дешевле'], ['pricey', 'Дороже']].map(([key, l]) => (<button key={key} className={'tab' + (sort === key ? ' active' : '')} onClick={() => setSort(key)}>{l}</button>))}
              </div>
              <div style={{ flex: 1 }} />
              <span style={{ color: 'var(--muted)', fontSize: 14 }}>{loading ? 'Поиск…' : `Найдено ${offers.length}`}</span>
            </div>
            <div className="hp-layout">
              <SvcFilters allOffers={data.offers} flt={flt} setFlt={setFlt} bounds={bounds} facetLabel={cfg.kind === 'ЖД' ? 'Класс и условия' : 'Особенности'} />
              <div>
                {loading
                  ? [0, 1, 2].map((i) => (<div key={i} className="off-card" style={{ marginBottom: 14 }}><div className="off-main"><div className="sk" style={{ height: 44, width: '55%' }} /><div className="sk" style={{ height: 26, width: '85%' }} /></div><div className="off-side"><div className="sk" style={{ height: 56 }} /></div></div>))
                  : offers.length
                    ? offers.map((o) => cfg.kind === 'ЖД'
                        ? <RailOfferCard key={o.id} o={o} onSelect={(x) => { setItem(x); setView('card'); toast('Открыто без привязки к заказу — добавить можно из карточки заказа', 'info'); }} />
                        : <SvcOfferCard key={o.id} o={o} kind={cfg.kind} onSelect={(x) => { setItem(x); setView('card'); toast('Открыто без привязки к заказу — добавить можно из карточки заказа', 'info'); }} onSave={() => toast('Предложение сохранено', 'ok')} />)
                    : <EmptyState icon={k.icon} title="Нет вариантов по фильтрам" sub="Смягчите условия фильтрации слева" />}
              </div>
            </div>
          </div>
        )}

        {view === 'card' && item && <SvcCard item={item} kind={cfg.kind} hideBackRow onBack={() => setView(item.cost ? 'results' : 'registry')} />}
      </div>
    </>
  );
}

/* ---------- embeddable add-flow (search → results) for the order card ---------- */
function routeKeyForKind(kind) { return Object.keys(SVC_CFG).find((k) => SVC_CFG[k].kind === kind); }

function ServiceAddFlow({ routeKey, onAdd }) {
  const cfg = SVC_CFG[routeKey];
  const data = SVC_DATA[routeKey];
  const toast = useToast();
  const [view, setView] = useState('search');
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState('best');
  const bounds = svcPriceBounds(data.offers);
  const [flt, setFlt] = useState({ sup: [], tags: [], priceMax: bounds.max });
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const runSearch = () => { setView('results'); setLoading(true); setTimeout(() => setLoading(false), 800); };

  let offers = data.offers.filter((o) => {
    if (flt.priceMax != null && (o.cost + o.fee) > flt.priceMax) return false;
    if (flt.sup.length && !flt.sup.includes(o.supplier)) return false;
    if (flt.tags.length && !(o.tags || []).some((t) => flt.tags.includes(t))) return false;
    return true;
  });
  if (sort === 'cheap') offers = [...offers].sort((a, b) => (a.cost + a.fee) - (b.cost + b.fee));
  if (sort === 'pricey') offers = [...offers].sort((a, b) => (b.cost + b.fee) - (a.cost + a.fee));

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
        {view === 'results' && <Button variant="secondary" size="sm" icon="chevLeft" onClick={() => setView('search')}>Изменить поиск</Button>}
        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{cfg.searchTitle}</span>
      </div>

      {view === 'search' && (
        <>
          {/* ТЗ #4/#5 — у трансфера и автобуса: в одну сторону / туда и обратно */}
          {(cfg.kind === 'Трансфер' || cfg.kind === 'Автобус') && (
            <div className="trip-toggle" style={{ marginBottom: 12 }}>
              {[['ow', 'В одну сторону'], ['rt', 'Туда и обратно']].map(([k, l]) => (
                <button key={k} className={(form.trip || 'ow') === k ? 'on' : ''} onClick={() => setF('trip', k)}>{l}</button>
              ))}
            </div>
          )}
          <div className="av-bar">
            {cfg.fields.map((f) => <SvcField key={f.k} f={f} form={form} set={setF} />)}
            {(cfg.kind === 'Трансфер' || cfg.kind === 'Автобус') && form.trip === 'rt' && (
              <div className="av-field" style={{ width: 156 }}><span className="label">Обратно</span><DateField value={form.retDate} onChange={(d) => setF('retDate', d)} placeholder="Дата" /></div>
            )}
            <Button icon="search" style={{ height: 46, marginBottom: 0 }} onClick={runSearch}>Найти</Button>
          </div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 13 }}>
            <Icon name="api" style={{ width: 16, height: 16 }} />Поиск по подключённым поставщикам · {cfg.title}
          </div>
        </>
      )}

      {view === 'results' && (
        <>
          <div className="tabs" style={{ marginBottom: 16 }}>
            {[['best', 'Оптимальные'], ['cheap', 'Дешевле'], ['pricey', 'Дороже']].map(([k, l]) => (<button key={k} className={'tab' + (sort === k ? ' active' : '')} onClick={() => setSort(k)}>{l}</button>))}
            <div style={{ flex: 1 }} /><span style={{ color: 'var(--muted)', fontSize: 14, alignSelf: 'center' }}>{loading ? 'Поиск…' : `Найдено ${offers.length}`}</span>
          </div>
          <div className="hp-layout">
            <SvcFilters allOffers={data.offers} flt={flt} setFlt={setFlt} bounds={bounds} facetLabel={cfg.kind === 'ЖД' ? 'Класс и условия' : 'Особенности'} />
            <div>
              {loading
                ? [0, 1, 2].map((i) => (<div key={i} className="off-card" style={{ marginBottom: 14 }}><div className="off-main"><div className="sk" style={{ height: 44, width: '55%' }} /><div className="sk" style={{ height: 26, width: '85%' }} /></div><div className="off-side"><div className="sk" style={{ height: 56 }} /></div></div>))
                : offers.length
                  ? offers.map((o) => <SvcOfferCard key={o.id} o={o} kind={cfg.kind} onSelect={(x) => onAdd(x, cfg.kind)} onSave={() => toast('Предложение сохранено', 'ok')} />)
                  : <EmptyState icon={SERVICE_KIND[cfg.kind].icon} title="Нет вариантов по фильтрам" sub="Смягчите условия фильтрации слева" />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Аэроэкспресс add-flow (доп. услуга) ----------
   Направление (аэропорт ⇄ вокзал) + вариация проезда: разово / туда-обратно / абонемент.
   Выдача тарифов фильтруется под выбранную вариацию — как на крупных тревел-платформах. */
function AeroAddFlow({ onAdd }) {
  const toast = useToast();
  const data = SVC_DATA.aero;
  const [view, setView] = useState('search');
  const [fare, setFare] = useState('single');
  const [dir, setDir] = useState(AERO_DIRS[0].label);
  const [date, setDate] = useState(null);
  const [retDate, setRetDate] = useState(null);
  const [start, setStart] = useState(null);
  const [pax, setPax] = useState(1);
  const [loading, setLoading] = useState(false);
  const runSearch = () => { setView('results'); setLoading(true); setTimeout(() => setLoading(false), 800); };

  const offers = data.offers.filter((o) => o.fareType === fare);
  const fareLabel = (AERO_FARES.find(([k]) => k === fare) || [])[1];

  const addOffer = (o) => {
    const route = fare === 'single' ? dir.replace('⇄', '→') : dir;
    const info = fare === 'pass'
      ? [{ l: 'Направление', v: dir }, { l: 'Тариф', v: o.title }, { l: 'Начало действия', v: start ? fmtDate(start) : '—' }]
      : [{ l: 'Направление', v: route }, { l: 'Тариф', v: o.title }, { l: 'Дата', v: date ? fmtDate(date) : '—' }]
          .concat(fare === 'rt' ? [{ l: 'Обратно', v: retDate ? fmtDate(retDate) : '—' }] : [])
          .concat([{ l: 'Пассажиров', v: pax }]);
    onAdd({ ...o, sub: route + ' · ' + fareLabel, info }, 'Аэроэкспресс');
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
        {view === 'results' && <Button variant="secondary" size="sm" icon="chevLeft" onClick={() => setView('search')}>Изменить поиск</Button>}
        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Аэроэкспресс — билеты и абонементы</span>
      </div>

      {view === 'search' && (
        <>
          {/* вариация проезда: разово / туда-обратно / абонемент */}
          <div className="trip-toggle" style={{ marginBottom: 12 }}>
            {AERO_FARES.map(([k, l]) => (
              <button key={k} className={fare === k ? 'on' : ''} onClick={() => setFare(k)}>{l}</button>
            ))}
          </div>
          <div className="av-bar">
            <div className="av-field" style={{ width: 320 }}><span className="label">Направление</span>
              <Select options={AERO_DIRS.map((d) => d.label)} value={dir} onChange={(e) => setDir(e.target.value)} /></div>
            {fare === 'pass' ? (
              <div className="av-field" style={{ width: 156 }}><span className="label">Начало действия</span>
                <DateField value={start} onChange={setStart} placeholder="Дата" /></div>
            ) : (
              <>
                <div className="av-field" style={{ width: 156 }}><span className="label">{fare === 'rt' ? 'Туда' : 'Дата'}</span>
                  <DateField value={date} onChange={setDate} placeholder="Дата" /></div>
                {fare === 'rt' && <div className="av-field" style={{ width: 156 }}><span className="label">Обратно</span>
                  <DateField value={retDate} onChange={setRetDate} placeholder="Дата" /></div>}
                <div className="av-field" style={{ width: 150 }}><span className="label">Пассажиров</span>
                  <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                    <button className="btn btn-secondary btn-icon btn-sm" disabled={pax <= 1} onClick={() => setPax(pax - 1)}>−</button>
                    <span style={{ fontWeight: 700 }}>{pax}</span>
                    <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setPax(pax + 1)}>+</button>
                  </div>
                </div>
              </>
            )}
            <Button icon="search" style={{ height: 46, marginBottom: 0 }} onClick={runSearch}>Найти</Button>
          </div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 13 }}>
            <Icon name="api" style={{ width: 16, height: 16 }} />Билеты и абонементы Аэроэкспресс · цены в ₽
          </div>
        </>
      )}

      {view === 'results' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ color: 'var(--muted)', fontSize: 14 }}>{dir} · {fareLabel}</span>
            <div style={{ flex: 1 }} />
            <span style={{ color: 'var(--muted)', fontSize: 14 }}>{loading ? 'Поиск…' : `Найдено ${offers.length}`}</span>
          </div>
          {loading
            ? [0, 1, 2].map((i) => (<div key={i} className="off-card" style={{ marginBottom: 14 }}><div className="off-main"><div className="sk" style={{ height: 44, width: '55%' }} /><div className="sk" style={{ height: 26, width: '85%' }} /></div><div className="off-side"><div className="sk" style={{ height: 56 }} /></div></div>))
            : offers.map((o) => <SvcOfferCard key={o.id} o={o} kind="Аэроэкспресс" onSelect={addOffer} onSave={() => toast('Предложение сохранено', 'ok')} />)}
        </>
      )}
    </div>
  );
}

/* ====================================================================
   RAIL «Выбор вагона и мест» — class → wagon → per-passenger seat assignment.
   Opens as a side panel after a train is picked in the order's ЖД add-flow.
   Passengers are shown «по спискам» (subgroups) and each gets a specific seat.
   ==================================================================== */
const RAIL_SEAT_LABEL = { low: 'Нижнее', up: 'Верхнее', win: 'У окна', aisle: 'У прохода' };
function railSeatKind(cls, n) { const ks = cls.kinds; return ks.length === 1 ? ks[0] : (n % 2 === 1 ? ks[0] : ks[1]); }
function railChunk(arr, n) { const o = []; for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o; }
function railSections(pax, groups) {
  if (groups && groups.length) {
    const used = new Set();
    const secs = groups.map((g) => {
      const m = (g.members || []).filter((i) => i < pax.length && !used.has(i));
      m.forEach((i) => used.add(i));
      return { id: g.id, name: g.name, members: m };
    }).filter((s) => s.members.length);
    const rest = pax.map((_, i) => i).filter((i) => !used.has(i));
    if (rest.length) secs.push({ id: '__rest', name: 'Без подгруппы', members: rest });
    return secs;
  }
  return [{ id: '__all', name: null, members: pax.map((_, i) => i) }];
}

/* search-result row (1-в-1 с экраном ЖД-поиска) */
function RailOfferCard({ o, onSelect }) {
  return (
    <div className="rail-offer">
      <div className="ro-train">
        <span className={'ro-logo ' + (o.carrier === 'РЖД' ? 'rzd' : 'alt')}>{o.carrier}</span>
        <div style={{ minWidth: 0 }}>
          <div className="ro-no">{o.number}<span className="ro-name">{o.name}</span></div>
          <div className="ro-tags">{(o.tags || []).map((t, i) => <span key={i} className="ro-tag">{t}</span>)}</div>
        </div>
      </div>
      <div className="ro-leg">
        <div className="ro-time">{o.dep.time}</div>
        <div className="ro-date">{o.dep.date}</div>
        <div className="ro-city">{o.dep.city}</div>
        <div className="ro-station">{o.dep.station}</div>
      </div>
      <div className="ro-mid">
        <div className="ro-dur">{o.dur}</div>
        <div className="ro-line"><span /></div>
        <div className="ro-stops">{o.stops}</div>
      </div>
      <div className="ro-leg">
        <div className="ro-time">{o.arr.time}</div>
        <div className="ro-date">{o.arr.date}</div>
        <div className="ro-city">{o.arr.city}</div>
        <div className="ro-station">{o.arr.station}</div>
      </div>
      <div className="ro-side">
        <div className="ro-price">от {rub(o.priceRub)}</div>
        <div className="ro-per">за 1 человека</div>
        <div className="ro-clsline">{o.cls} · <span className="ro-free">{o.freeSeats} мест</span></div>
        <Button size="sm" onClick={() => onSelect(o)}>Выбрать поезд</Button>
        <button type="button" className="ro-more">Подробнее</button>
      </div>
    </div>
  );
}

/* left filter rail for ЖД search (price ₽ / время / класс / перевозчик) */
function RailFilters({ flt, setFlt, bounds }) {
  const carriers = [...new Set(SVC_DATA.rail.offers.map((o) => o.carrier))];
  const classes = [...new Set(SVC_DATA.rail.offers.map((o) => o.cls))];
  const tg = (key, val) => setFlt((f) => ({ ...f, [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val] }));
  const selCount = flt.times.length + flt.classes.length + flt.carriers.length + (flt.trainNo && flt.trainNo.trim() ? 1 : 0) + ((flt.priceMax != null && flt.priceMax < bounds.max) ? 1 : 0);
  return (
    <aside className="hp-filters">
      <div className="hp-filters-head">
        <span>Фильтры{selCount > 0 && <span className="flt-count">{selCount}</span>}</span>
        <button className="hp-reset" onClick={() => setFlt({ priceMax: bounds.max, times: [], classes: [], carriers: [], trainNo: '' })}>Очистить</button>
      </div>
      {/* ТЗ #2 — строка поиска по номеру поезда, как «Номер рейса» у авиа */}
      <SearchBox value={flt.trainNo || ''} onChange={(v) => setFlt((f) => ({ ...f, trainNo: v }))} placeholder="Номер поезда" style={{ minWidth: 0, width: '100%', height: 42, margin: '4px 0 10px' }} />
      <div className="hp-filter-block">
        <div className="hp-filter-title">Цена</div>
        <div className="hp-price-range"><span className="hp-pr-from">от {rub(bounds.min)}</span><span className="hp-pr-to">{rub(flt.priceMax == null ? bounds.max : flt.priceMax)}</span></div>
        <input type="range" className="hp-slider" min={bounds.min} max={bounds.max} step="100"
          value={flt.priceMax == null ? bounds.max : flt.priceMax} onChange={(e) => setFlt((f) => ({ ...f, priceMax: +e.target.value }))} />
      </div>
      <div className="hp-filter-block">
        <div className="hp-filter-title">Время отправления</div>
        {[['morning', 'Утро · 06–12'], ['day', 'День · 12–18'], ['evening', 'Вечер · 18–00'], ['night', 'Ночь · 00–06']].map(([v, l]) => (
          <label key={v} className="hp-check-row"><Checkbox on={flt.times.includes(v)} onChange={() => tg('times', v)} /><span className="hp-check-label">{l}</span></label>
        ))}
      </div>
      <div className="hp-filter-block">
        <div className="hp-filter-title">Класс обслуживания</div>
        {classes.map((c) => (
          <label key={c} className="hp-check-row"><Checkbox on={flt.classes.includes(c)} onChange={() => tg('classes', c)} /><span className="hp-check-label">{c}</span></label>
        ))}
      </div>
      <div className="hp-filter-block">
        <div className="hp-filter-title">Перевозчик</div>
        {carriers.map((c) => (
          <label key={c} className="hp-check-row"><Checkbox on={flt.carriers.includes(c)} onChange={() => tg('carriers', c)} /><span className="hp-check-label">{c}</span></label>
        ))}
      </div>
    </aside>
  );
}

const railTimeBucket = (t) => { const h = +(t || '0').split(':')[0]; return h < 6 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'day' : 'evening'; };

/* full ЖД add-flow inside the order: search bar + filters + result rows → seat panel */
function RailAddFlow({ participants = [], groups, onAdd }) {
  const toast = useToast();
  const offersAll = SVC_DATA.rail.offers;
  const bounds = { min: Math.floor(Math.min(...offersAll.map((o) => o.priceRub))), max: Math.ceil(Math.max(...offersAll.map((o) => o.priceRub))) };
  const [form, setForm] = useState({ trip: 'ow', from: 'Москва', to: 'Санкт-Петербург', dep: null, ret: null, pax: Math.max(1, participants.length) });
  const [sort, setSort] = useState('best');
  const [flt, setFlt] = useState({ priceMax: bounds.max, times: [], classes: [], carriers: [], trainNo: '' });
  const [seatOffer, setSeatOffer] = useState(null);
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const swap = () => setForm((f) => ({ ...f, from: f.to, to: f.from }));

  const trainNoMatch = (o, q) => { const n = q.replace(/\s+/g, '').toLowerCase(); return `${o.number} ${o.name}`.replace(/\s+/g, '').toLowerCase().includes(n); };
  let offers = offersAll.filter((o) => {
    if (flt.trainNo && flt.trainNo.trim() && !trainNoMatch(o, flt.trainNo)) return false;
    if (flt.priceMax != null && o.priceRub > flt.priceMax) return false;
    if (flt.times.length && !flt.times.includes(railTimeBucket(o.dep.time))) return false;
    if (flt.classes.length && !flt.classes.includes(o.cls)) return false;
    if (flt.carriers.length && !flt.carriers.includes(o.carrier)) return false;
    return true;
  });
  if (sort === 'cheap') offers = [...offers].sort((a, b) => a.priceRub - b.priceRub);
  if (sort === 'fast') offers = [...offers].sort((a, b) => a.dur.localeCompare(b.dur));

  const applySeats = (res) => {
    const aug = { ...seatOffer, sub: seatOffer.sub + ' · ' + res.summary, cost: res.total, fee: seatOffer.fee, currency: 'RUB', railSeats: res };
    setSeatOffer(null);
    onAdd(aug, 'ЖД');
  };

  return (
    <div className="fade-in">
      <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>Поиск железнодорожных билетов</div>
      {/* ТЗ #5 — у ЖД: в одну сторону / туда и обратно */}
      <div className="trip-toggle" style={{ marginBottom: 12 }}>
        {[['ow', 'В одну сторону'], ['rt', 'Туда и обратно']].map(([k, l]) => (
          <button key={k} className={form.trip === k ? 'on' : ''} onClick={() => setF('trip', k)}>{l}</button>
        ))}
      </div>
      <div className="av-bar">
        <div className="av-field" style={{ width: 190 }}><span className="label">Откуда</span><Input value={form.from} onChange={(e) => setF('from', e.target.value)} /></div>
        {/* ТЗ #4 — стрелка переключения городов, как у авиа */}
        <button className="av-swap" onClick={swap} title="Поменять местами" style={{ alignSelf: 'flex-end', marginBottom: 0 }}><Icon name="swap" style={{ width: 18, height: 18 }} /></button>
        <div className="av-field" style={{ width: 190 }}><span className="label">Куда</span><Input value={form.to} onChange={(e) => setF('to', e.target.value)} /></div>
        <div className="av-field" style={{ width: 150 }}><span className="label">{form.trip === 'rt' ? 'Туда' : 'Дата'}</span><DateField value={form.dep} onChange={(d) => setF('dep', d)} placeholder="Дата" /></div>
        {form.trip === 'rt' && <div className="av-field" style={{ width: 150 }}><span className="label">Обратно</span><DateField value={form.ret} onChange={(d) => setF('ret', d)} placeholder="—" /></div>}
        <div className="av-field" style={{ width: 130 }}><span className="label">Пассажиры</span>
          <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <button className="btn btn-secondary btn-icon btn-sm" disabled={form.pax <= 1} onClick={() => setF('pax', form.pax - 1)}>−</button>
            <span style={{ fontWeight: 700 }}>{form.pax}</span>
            <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setF('pax', form.pax + 1)}>+</button>
          </div>
        </div>
        <Button icon="search" style={{ height: 46, marginBottom: 0 }} onClick={() => toast('Поиск обновлён по подключённым поставщикам', 'info')}>Найти</Button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0 14px' }}>
        <div className="tabs">
          {[['best', 'Рекомендуемые'], ['cheap', 'Дешевле'], ['fast', 'Быстрее']].map(([k, l]) => (
            <button key={k} className={'tab' + (sort === k ? ' active' : '')} onClick={() => setSort(k)}>{l}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>Результаты поиска ({offers.length})</span>
      </div>

      <div className="hp-layout">
        <RailFilters flt={flt} setFlt={setFlt} bounds={bounds} />
        <div style={{ minWidth: 0 }}>
          {offers.length ? offers.map((o) => <RailOfferCard key={o.id} o={o} onSelect={setSeatOffer} />)
            : <EmptyState icon="train" title="Нет поездов по фильтрам" sub="Смягчите условия фильтрации слева" />}
        </div>
      </div>

      {seatOffer && (
        <RailSeatPanel offer={seatOffer} participants={participants} groups={groups}
          onClose={() => setSeatOffer(null)} onApply={applySeats} />
      )}
    </div>
  );
}

function RailSeatPanel({ offer, participants, groups, onClose, onApply }) {
  const PAX = participants && participants.length ? participants : [{ name: 'Пассажир 1', role: 'Взрослый' }];
  const tagClass = RAIL_SERVICE_CLASSES.find((c) => c.name === offer.cls) || RAIL_SERVICE_CLASSES.find((c) => (offer.tags || []).some((t) => t === c.type));
  const [clsId, setClsId] = useState(tagClass ? tagClass.id : 'kupe');
  const cls = RAIL_SERVICE_CLASSES.find((c) => c.id === clsId);
  const wagons = RAIL_WAGONS[clsId] || [];
  const [wagonNo, setWagonNo] = useState(wagons[0] ? wagons[0].no : '01');
  const [wagShow, setWagShow] = useState(8);
  const [seats, setSeats] = useState({});     // paxIdx -> seat number
  const [activePax, setActivePax] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const changeClass = (id) => { setClsId(id); const w = RAIL_WAGONS[id] || []; setWagonNo(w[0] ? w[0].no : '01'); setSeats({}); setWagShow(8); };
  const changeWagon = (no) => { setWagonNo(no); setSeats({}); };

  const occupied = new Set(RAIL_OCCUPIED[clsId + ':' + wagonNo] || []);
  const seatOwner = (n) => { const e = Object.entries(seats).find(([, v]) => v === n); return e ? +e[0] : null; };
  const assignSeat = (i, val) => {
    const n = val ? +val : null;
    setSeats((s) => { const x = { ...s }; if (!n) { delete x[i]; return x; } Object.keys(x).forEach((k) => { if (x[k] === n) delete x[k]; }); x[i] = n; return x; });
  };
  const pickSeat = (n) => { if (occupied.has(n)) return; const owner = seatOwner(n); assignSeat(activePax, (owner === activePax) ? '' : String(n)); };

  const assignedCount = Object.values(seats).filter(Boolean).length;
  const total = cls.priceRub * PAX.length;
  const seatNumbers = Array.from({ length: cls.seats }, (_, i) => i + 1);
  const comps = cls.perComp ? railChunk(seatNumbers, cls.perComp) : null;
  const seatOptions = (i) => [{ value: '', label: '— выбрать —' }].concat(
    seatNumbers.filter((n) => !occupied.has(n) && (seatOwner(n) === null || seatOwner(n) === i))
      .map((n) => ({ value: String(n), label: 'Место ' + n + ' · ' + RAIL_SEAT_LABEL[railSeatKind(cls, n)] })));
  const visiblePax = showAll ? PAX.map((_, i) => i) : PAX.map((_, i) => i).slice(0, 5);

  const seatNode = (n) => {
    const kind = railSeatKind(cls, n);
    const owner = seatOwner(n);
    const isOcc = occupied.has(n);
    const isSel = owner != null;
    const mine = seats[activePax] === n;
    return (
      <button key={n} type="button" disabled={isOcc}
        className={'rail-seat ' + kind + (isOcc ? ' occupied' : '') + (isSel ? ' sel' : '') + (mine ? ' mine' : '')}
        title={isOcc ? 'Занято' : ('Место ' + n + ' · ' + RAIL_SEAT_LABEL[kind] + (isSel ? ' · ' + PAX[owner].name : ''))}
        onClick={() => pickSeat(n)}>{n}</button>
    );
  };

  const apply = () => onApply({
    clsId, clsName: cls.name, wagonNo, seats, total,
    summary: cls.name + ' · ваг. ' + wagonNo + ' · места ' + (PAX.map((_, i) => seats[i]).filter(Boolean).join(', ') || '—'),
    list: PAX.map((p, i) => ({ name: p.name, seat: seats[i] || null, kind: seats[i] ? railSeatKind(cls, seats[i]) : null })),
  });

  return (
    <StackPanel title="Выбор вагона и мест" width="min(1380px,97vw)" onClose={onClose}
      footer={<>
        <div className="rail-foot-note">Цены указаны за 1 человека. Включая налоги и сборы.</div>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button icon="check" disabled={assignedCount < PAX.length} onClick={apply}>
          {assignedCount < PAX.length ? `Назначьте места (${assignedCount}/${PAX.length})` : 'Применить и продолжить'}
        </Button></>}>
      <div className="rail-head">
        <span className={'ro-logo ' + (offer.carrier === 'РЖД' ? 'rzd' : 'alt')} style={{ height: 34 }}>{offer.carrier}</span>
        <div style={{ minWidth: 0 }}>
          <div className="t">{offer.number} · {offer.name}</div>
          <div className="s">{offer.dep.city} → {offer.arr.city} · {offer.dep.time}–{offer.arr.time} · {offer.dur}</div>
        </div>
      </div>

      <div className="rail-layout">
        {/* 1. класс обслуживания */}
        <div className="rail-col">
          <div className="rail-col-h">1. Выберите класс обслуживания</div>
          <div className="rail-class-list">
            {RAIL_SERVICE_CLASSES.map((c) => (
              <button key={c.id} type="button" className={'rail-class' + (clsId === c.id ? ' sel' : '')} onClick={() => changeClass(c.id)}>
                <span className="rc-ic"><Icon name={c.icon} /></span>
                <div className="rc-body">
                  <div className="rc-name">{c.name}</div>
                  <div className="rc-price">от {rub(c.priceRub)}</div>
                  <div className="rc-per">за 1 человека</div>
                  <div className="rc-free">Свободно мест: {c.freeSeats}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. вагон */}
        <div className="rail-col">
          <div className="rail-col-h">2. Выберите вагон</div>
          <div className="rail-col-sub">Вагоны класса {cls.name}</div>
          <div className="rail-wlist">
            {wagons.slice(0, wagShow).map((w) => (
              <button key={w.no} type="button" className={'rail-wrow' + (wagonNo === w.no ? ' sel' : '')} onClick={() => changeWagon(w.no)}>
                <Radio on={wagonNo === w.no} onChange={() => changeWagon(w.no)} />
                <span className="wno">{w.no}</span>
                <span className="wtype">{cls.type}</span>
                <span className={'wseats' + (w.seatsLeft <= 4 ? ' low' : '')}>{w.seatsLeft}</span>
              </button>
            ))}
            {wagons.length > wagShow && <button type="button" className="rail-link" onClick={() => setWagShow(wagons.length)}>Показать ещё вагоны ({wagons.length - wagShow})</button>}
          </div>
        </div>

        {/* 3. места + назначение пассажирам */}
        <div className="rail-col grow">
          <div className="rail-col-h">3. Выберите места и назначьте их пассажирам</div>
          <div className="rail-wagon-line">Вагон {wagonNo} · {cls.type}</div>
          <div className="rail-amenities">{cls.amenities.map((a) => <span key={a} className="rail-am"><Icon name="check" />{a}</span>)}</div>

          <div className="rail-car">
            <div className="rail-wc">WC</div>
            {comps
              ? comps.map((seatsInComp, ci) => {
                  const top = seatsInComp.filter((n) => n % 2 === 0);
                  const bottom = seatsInComp.filter((n) => n % 2 === 1);
                  return (
                    <div className="rail-comp" key={ci}>
                      <div className="rail-comp-row">{top.map(seatNode)}</div>
                      <div className="rail-comp-row">{bottom.map(seatNode)}</div>
                      <div className="rail-comp-n">{ci + 1}</div>
                    </div>
                  );
                })
              : <div className="rail-sit-grid">{seatNumbers.map(seatNode)}</div>}
          </div>
          <div className="rail-legend">
            {cls.kinds.map((kk) => <span key={kk} className="rail-leg"><span className={'rail-seat ' + kk} />{RAIL_SEAT_LABEL[kk]}</span>)}
            <span className="rail-leg"><span className="rail-seat sel" />Выбрано</span>
            <span className="rail-leg"><span className="rail-seat occupied" />Занято</span>
          </div>

          <div className="rail-assign">
            <div className="rail-assign-head">
              <span className="ttl">Назначьте места пассажирам</span>
              <span className="ok">Назначено: {assignedCount} из {PAX.length}</span>
              <span className="warn">Не назначено: {PAX.length - assignedCount}</span>
              <div style={{ flex: 1 }} />
              <button type="button" className="rail-link" onClick={() => setSeats({})}>Сбросить все места</button>
            </div>
            <table className="rail-ptbl">
              <thead><tr><th>№</th><th>Пассажир</th><th>Тип</th><th>Место</th><th>Статус</th></tr></thead>
              <tbody>
                {visiblePax.map((i) => (
                  <tr key={i} className={activePax === i ? 'active' : ''} onClick={() => setActivePax(i)}>
                    <td className="t-muted">{i + 1}</td>
                    <td className="t-strong">{PAX[i].name}</td>
                    <td>{PAX[i].role || 'Взрослый'}</td>
                    <td onClick={(e) => e.stopPropagation()} style={{ width: 180 }}>
                      <Select options={seatOptions(i)} value={seats[i] ? String(seats[i]) : ''} onChange={(e) => assignSeat(i, e.target.value)} />
                    </td>
                    <td>
                      {seats[i]
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Pill tone="green">Назначено</Pill><button type="button" className="rail-clear" onClick={(e) => { e.stopPropagation(); assignSeat(i, ''); }}><Icon name="x" /></button></span>
                        : <Pill tone="amber">Не назначено</Pill>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {PAX.length > 5 && <button type="button" className="rail-link" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Свернуть' : `Показать ещё ${PAX.length - 5} пассажиров`}</button>}
          </div>
        </div>
      </div>
    </StackPanel>
  );
}

/* =====================================================================
   ЕДИНЫЙ ЭКРАН «Подбор услуг» (ТЗ-2 п.4) — раньше пункт меню только
   раскрывал список раздроблённых услуг и сам по себе не нёс функции.
   Теперь это осмысленная посадочная страница: выбор вида услуги.
   ===================================================================== */
const SERVICES_HUB = [
  { key: 'flights', icon: 'plane', title: 'Авиабилеты', desc: 'Поиск и бронирование перелётов, тарифы и доп. услуги.' },
  { key: 'rail', icon: 'train', title: 'ЖД билеты', desc: 'Железнодорожные билеты, выбор вагона и мест.' },
  { key: 'hotels', icon: 'building', title: 'Гостиницы', desc: 'Подбор отелей, категории, питание и условия.' },
  { key: 'transfers', icon: 'car', title: 'Трансферы', desc: 'Индивидуальные и групповые трансферы, такси.' },
  { key: 'buses', icon: 'bus', title: 'Автобусы', desc: 'Автобусные и маршрутные перевозки.' },
  { key: 'tours', icon: 'users', title: 'Туры и группы', desc: 'Групповые поездки и туристические пакеты.' },
];
function ServicesHubPage({ onNavigate, onAddOrder }) {
  return (
    <>
      <Topbar title="Подбор услуг" sub="Выберите вид услуги для поиска и бронирования">
        <div className="topbar-spacer" />
        {onAddOrder && <Button icon="plus" onClick={onAddOrder}>Новый заказ</Button>}
      </Topbar>
      <div className="content fade-in">
        <div className="svc-hub-grid">
          {SERVICES_HUB.map((s) => (
            <button key={s.key} type="button" className="svc-hub-card" onClick={() => onNavigate(s.key)}>
              <span className="svc-hub-ic"><Icon name={s.icon} /></span>
              <span className="svc-hub-body">
                <span className="svc-hub-t">{s.title}</span>
                <span className="svc-hub-d">{s.desc}</span>
              </span>
              <Icon name="arrowRight" className="svc-hub-go" />
            </button>
          ))}
        </div>
        <div className="svc-hub-note">
          <Icon name="alertCircle" style={{ width: 18, height: 18, color: 'var(--blue)', flex: '0 0 18px' }} />
          <span>Подбор всегда привязан к заказу и клиенту. Услуги можно добавить и внутри карточки заказа на вкладке «Услуги».</span>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { ServiceFlow, SVC_CFG, ServiceAddFlow, AeroAddFlow, routeKeyForKind, SvcCard, SvcOfferCard, ServiceCardSendPanel, CardLifecycle, RailSeatPanel, RailAddFlow, RailOfferCard, ServicesHubPage, SERVICES_HUB });
