// ===== Dashboard (Главное) =====

/* Финализация свободного бронирования (ТЗ #1): по подобранным без привязки к заказу услугам можно
   сформировать КП, привязать к существующему заказу или к физ.лицу. */
function FreeBookingFinalize({ draft, onClose, onDone }) {
  const toast = useToast();
  const [step, setStep] = useState('menu');   // menu | order | person | kp
  const [q, setQ] = useState('');
  const [recipient, setRecipient] = useState('');   // получатель КП (необязательно)
  const [kpNo] = useState(() => 'КП-' + (1040 + Math.floor(Math.random() * 60)));
  const svcTitle = (x) => x.title || x.route || x.fareName || (x.from && x.to ? x.from + ' → ' + x.to : x.kind || 'Услуга');
  const svcSum = (x) => x.fareDeltaUsd || x.total || x.cost || x.price || x.sum || 0;
  const total = draft.reduce((s, x) => s + svcSum(x), 0);
  const finish = (msg) => { toast(msg, 'ok'); onDone(); };
  // Список заказов для привязки: фильтр + хронология по дате формирования (сначала новые)
  const orderPickRows = (query) => ORDERS
    .filter((o) => `${o.no} ${o.client}`.toLowerCase().includes(query.toLowerCase()))
    .slice()
    .sort((a, b) => (b.createdOn ? b.createdOn.getTime() : 0) - (a.createdOn ? a.createdOn.getTime() : 0))
    .slice(0, 20);

  // Выбор существующего заказа для привязки
  if (step === 'order') {
    const rows = orderPickRows(q);
    return (
      <Drawer open onClose={onClose} title="Привязать к заказу"
        footer={<Button variant="secondary" style={{ width: '100%' }} onClick={() => setStep('menu')}>Назад</Button>}>
        <SearchBox value={q} onChange={setQ} placeholder="Поиск: № заказа или клиент" style={{ width: '100%', marginBottom: 12 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((o) => (
            <button key={o.id} type="button" className="oce-client" style={{ cursor: 'pointer', width: '100%', textAlign: 'left', border: '1px solid var(--line)', background: '#fff', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}
              onClick={() => finish('Услуги привязаны к заказу № ' + o.no)}>
              <span className="oc-svc-ic" style={{ background: 'var(--blue)', width: 34, height: 34 }}><Icon name="briefcase" /></span>
              <div style={{ flex: 1, minWidth: 0 }}><div className="nm" style={{ fontWeight: 600 }}>Заказ № {o.no}</div><div className="mt" style={{ fontSize: 12, color: 'var(--muted)' }}>{o.client} · {o.requestType}</div></div>
              {o.createdOn && <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="calendar" style={{ width: 13, height: 13 }} />{fmtDate(o.createdOn)}</div>}
              <Icon name="chevRight" style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />
            </button>
          ))}
          {!rows.length && <EmptyState icon="briefcase" title="Заказы не найдены" />}
        </div>
      </Drawer>
    );
  }

  // Свободная выгрузка подборки в чат заказа — без формирования КП (ТЗ-2 п.10)
  if (step === 'chat') {
    const rows = orderPickRows(q);
    return (
      <Drawer open onClose={onClose} title="Отправить в чат по заказу"
        footer={<Button variant="secondary" style={{ width: '100%' }} onClick={() => setStep('menu')}>Назад</Button>}>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
          Подборка ({draft.length} {plural(draft.length, ['услуга', 'услуги', 'услуг'])}) уйдёт в чат выбранного заказа без формирования КП.
        </div>
        <SearchBox value={q} onChange={setQ} placeholder="Поиск: № заказа или клиент" style={{ width: '100%', marginBottom: 12 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((o) => (
            <button key={o.id} type="button" className="oce-client" style={{ cursor: 'pointer', width: '100%', textAlign: 'left', border: '1px solid var(--line)', background: '#fff', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}
              onClick={() => finish('Подборка (' + draft.length + ' ' + plural(draft.length, ['услуга', 'услуги', 'услуг']) + ') отправлена в чат по заказу № ' + o.no)}>
              <span className="oc-svc-ic" style={{ background: 'var(--green)', width: 34, height: 34 }}><Icon name="chat" /></span>
              <div style={{ flex: 1, minWidth: 0 }}><div className="nm" style={{ fontWeight: 600 }}>Заказ № {o.no}</div><div className="mt" style={{ fontSize: 12, color: 'var(--muted)' }}>{o.client} · {o.requestType}</div></div>
              {o.createdOn && <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="calendar" style={{ width: 13, height: 13 }} />{fmtDate(o.createdOn)}</div>}
              <Icon name="chevRight" style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />
            </button>
          ))}
          {!rows.length && <EmptyState icon="chat" title="Заказы не найдены" />}
        </div>
      </Drawer>
    );
  }

  // Выбор физ. лица (клиента) для привязки
  if (step === 'person') {
    const list = CLIENTS.filter((c) => c.toLowerCase().includes(q.toLowerCase()));
    return (
      <Drawer open onClose={onClose} title="Привязать к физ. лицу"
        footer={<Button variant="secondary" style={{ width: '100%' }} onClick={() => setStep('menu')}>Назад</Button>}>
        <SearchBox value={q} onChange={setQ} placeholder="Поиск клиента" style={{ width: '100%', marginBottom: 12 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((c) => (
            <button key={c} type="button" style={{ cursor: 'pointer', width: '100%', textAlign: 'left', border: '1px solid var(--line)', background: '#fff', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}
              onClick={() => finish('Услуги привязаны к клиенту: ' + c)}>
              <Avatar name={c} size={34} />
              <div style={{ flex: 1, minWidth: 0, fontWeight: 600, color: 'var(--ink)' }}>{c}</div>
              <Icon name="chevRight" style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />
            </button>
          ))}
          {!list.length && <EmptyState icon="user" title="Клиенты не найдены" />}
        </div>
      </Drawer>
    );
  }

  // Формирование КП — боковое окно с составом, получателем, суммой и действиями
  if (step === 'kp') {
    return (
      <Drawer open onClose={onClose} title="Коммерческое предложение"
        footer={<>
          <Button variant="secondary" onClick={() => setStep('menu')}>Назад</Button>
          <Button icon="send" style={{ flex: 1 }} onClick={() => finish(kpNo + ' сформировано' + (recipient ? ' и отправлено: ' + recipient : ''))}>
            {recipient ? 'Отправить клиенту' : 'Сформировать КП'}
          </Button>
        </>}>
        {/* шапка КП */}
        <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span className="oc-svc-ic" style={{ background: 'var(--blue)', width: 40, height: 40, borderRadius: 11 }}><Icon name="template" style={{ width: 20, height: 20 }} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{kpNo}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{draft.length} {plural(draft.length, ['услуга', 'услуги', 'услуг'])} · черновик</div>
          </div>
          <Pill tone="amber">Черновик</Pill>
        </div>

        <PanelSub style={{ marginTop: 0 }}>Получатель</PanelSub>
        <SearchBox value={recipient} onChange={setRecipient} placeholder="Клиент или организация (необязательно)" style={{ width: '100%', marginBottom: 6 }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {CLIENTS.slice(0, 4).map((c) => (
            <button key={c} type="button" className="chip" style={{ cursor: 'pointer' }} onClick={() => setRecipient(c)}>{c}</button>
          ))}
        </div>

        <PanelSub>Состав предложения</PanelSub>
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          {draft.map((x, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: i < draft.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <div><div style={{ fontWeight: 600, color: 'var(--ink)' }}>{svcTitle(x)}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{x.kind || 'Авиа'}{x.supplier ? ' · ' + x.supplier : ''}</div></div>
              <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{svcSum(x) ? svcSum(x).toLocaleString('ru-RU') + ' $' : '—'}</div>
            </div>
          ))}
          {total > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)', fontWeight: 700, color: 'var(--ink)' }}>
              <span>Итого</span><span>{total.toLocaleString('ru-RU')} $</span>
            </div>
          )}
        </div>

        <PanelSub>Действия с КП</PanelSub>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[['Скачать PDF', 'download', () => toast(kpNo + ': PDF скачан', 'ok')],
            ['Открыть в разделе КП', 'template', () => finish(kpNo + ' создано — открыто в разделе «Ком. предложения»')],
            ['Копировать ссылку', 'docs', () => toast('Ссылка на ' + kpNo + ' скопирована', 'ok')],
            ['Печать', 'clipboard', () => toast(kpNo + ' отправлено на печать')]].map(([label, icon, on]) => (
            <button key={label} className="doc-chip" style={{ width: '100%' }} onClick={on}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name={icon} style={{ width: 16, height: 16 }} />{label}</span>
              <Icon name="chevRight" style={{ width: 16, height: 16 }} />
            </button>
          ))}
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer open onClose={onClose} title="Оформление свободного бронирования"
      footer={<Button variant="secondary" style={{ width: '100%' }} onClick={onClose}>Закрыть</Button>}>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>
        В подборке {draft.length} {plural(draft.length, ['услуга', 'услуги', 'услуг'])}. Выберите, что сделать дальше.
      </div>
      <div className="card card-pad" style={{ marginBottom: 18 }}>
        {draft.map((x, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: i < draft.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <div><div style={{ fontWeight: 600, color: 'var(--ink)' }}>{svcTitle(x)}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{x.kind || 'Авиа'}{x.supplier ? ' · ' + x.supplier : ''}</div></div>
            <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{svcSum(x) ? svcSum(x).toLocaleString('ru-RU') + ' $' : '—'}</div>
          </div>
        ))}
        {total > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)', fontWeight: 700, color: 'var(--ink)' }}>
            <span>Итого</span><span>{total.toLocaleString('ru-RU')} $</span>
          </div>
        )}
      </div>
      <PanelSub style={{ marginTop: 0 }}>Итог</PanelSub>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button icon="template" style={{ width: '100%' }} onClick={() => { setQ(''); setStep('kp'); }}>Сформировать КП</Button>
        <Button variant="secondary" icon="briefcase" style={{ width: '100%' }} onClick={() => { setQ(''); setStep('order'); }}>Привязать к заказу</Button>
        <Button variant="secondary" icon="user" style={{ width: '100%' }} onClick={() => { setQ(''); setStep('person'); }}>Привязать к физ. лицу</Button>
        <Button variant="secondary" icon="chat" style={{ width: '100%' }} onClick={() => { setQ(''); setStep('chat'); }}>Отправить в чат по заказу</Button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12, textAlign: 'center' }}>
        «Отправить в чат» выгружает подборку в чат заказа без формирования КП.
      </div>
    </Drawer>
  );
}

/* «Свободное бронирование» — поиск услуг без привязки к заказу (ТЗ #1). Подобранные услуги
   собираются в подборку, затем оформляются: КП / привязка к заказу / привязка к физ.лицу. */
function DetailedSearchPanel({ onClose, initialKind }) {
  const toast = useToast();
  const [kind, setKind] = useState(initialKind || 'Авиа');
  const [aviaParams, setAviaParams] = useState({ trip: 'rt', from: 'FRU', to: 'IST', depDate: null, retDate: null, pax: { adt: 1, chd: 0, infNoSeat: 0, infSeat: 0, special: {}, subsidized: {} }, cabin: 'Эконом', baggage: false, flex: false, direct: false, airline: '', ...PAX_DEFAULT_OPTIONS });
  const [draft, setDraft] = useState([]);
  const [finalize, setFinalize] = useState(false);
  const add = (svc, k) => { setDraft((d) => [...d, { kind: k || 'Авиа', ...(svc || {}) }]); toast('Добавлено в свободное бронирование', 'ok'); };
  return (
    <StackPanel title="Свободное бронирование" width="min(1320px,96vw)" onClose={onClose}
      footer={draft.length ? (
        <>
          <div style={{ flex: 1, alignSelf: 'center', color: 'var(--muted)', fontSize: 14 }}>В подборке: <b style={{ color: 'var(--ink)' }}>{draft.length}</b> {plural(draft.length, ['услуга', 'услуги', 'услуг'])}</div>
          <Button variant="secondary" onClick={() => setDraft([])}>Очистить</Button>
          <Button icon="check" onClick={() => setFinalize(true)}>Оформить</Button>
        </>
      ) : null}>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
        Поиск без привязки к заказу. Можно добавить несколько услуг, затем сформировать КП, привязать к заказу или к физ. лицу.
      </div>
      <AddServicePanel kind={kind} setKind={setKind} aviaParams={aviaParams} setAviaParams={setAviaParams}
        paxCount={aviaParams.pax.adt + aviaParams.pax.chd}
        onAddAvia={(r) => add(r, 'Авиа')}
        onAddOther={(o, k) => add(o, k)} />
      {finalize && <FreeBookingFinalize draft={draft} onClose={() => setFinalize(false)} onDone={() => { setFinalize(false); onClose(); }} />}
    </StackPanel>
  );
}

/* Финансовое состояние клиентов на дашборде (ТЗ: балансы, пропущенные оплаты по срокам,
   срочные документы для оплат — «в дашборде и иных местах»). */
function FinanceOverviewBlock({ onNavigate }) {
  const ov = financeOverview();
  const money = (n) => Math.round(n || 0).toLocaleString('ru-RU') + ' $';
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Финансовое состояние клиентов</h2>
        <Button variant="secondary" size="sm" icon="building" onClick={() => onNavigate('companies')}>Все компании</Button>
      </div>
      <div className="grid-4" style={{ marginBottom: ov.urgent.length ? 16 : 0 }}>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('companies')}>
          <div className="s-label">Депозиты (доступно)</div>
          <div className="s-value" style={{ fontSize: 'var(--fs-stat)', color: 'var(--green)' }}>{money(ov.deposits)}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('companies')}>
          <div className="s-label">Задолженность (отсрочка)</div>
          <div className="s-value" style={{ fontSize: 'var(--fs-stat)', color: 'var(--amber)' }}>{money(ov.debt)}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('finance')}>
          <div className="s-label">Просрочено</div>
          <div className="s-value" style={{ fontSize: 'var(--fs-stat)', color: ov.overdue > 0 ? 'var(--red)' : 'var(--muted)' }}>{money(ov.overdue)}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('finance')}>
          <div className="s-label">Клиентов с просрочкой</div>
          <div className="s-value" style={{ fontSize: 'var(--fs-stat)', color: ov.overdueCount > 0 ? 'var(--red)' : 'var(--muted)' }}>{ov.overdueCount}</div>
        </div>
      </div>

      {!!ov.urgent.length && (
        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Icon name="alertCircle" style={{ width: 18, height: 18, color: 'var(--amber)' }} />
            <h3 className="card-title" style={{ fontSize: 15, margin: 0 }}>Срочные оплаты и внимание к балансам</h3>
            <Pill tone="amber">{ov.urgent.length}</Pill>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ov.urgent.map((u, i) => (
              <button key={i} type="button" onClick={() => onNavigate('companies')}
                style={{ cursor: 'pointer', width: '100%', textAlign: 'left', border: '1px solid var(--line)', borderLeft: '3px solid var(--' + u.tone + ')', background: '#fff', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="oc-svc-ic" style={{ background: 'var(--' + u.tone + ')', width: 34, height: 34, opacity: .9 }}><Icon name="bank" style={{ width: 16, height: 16 }} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="nm" style={{ fontWeight: 600, color: 'var(--ink)' }}>{u.co}</div>
                  <div className="mt" style={{ fontSize: 12, color: 'var(--muted)' }}>{u.text}</div>
                </div>
                <Pill tone={u.tone}>{u.kind}</Pill>
                <span style={{ fontWeight: 700, whiteSpace: 'nowrap', color: 'var(--' + u.tone + ')' }}>{money(u.value)}</span>
                <Icon name="chevRight" style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCardDash({ s, onGo }) {
  return (
    <div className="stat-card" style={{ cursor: 'pointer' }} onClick={onGo}>
      <div className="s-label">{s.label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div className="s-value" style={{ fontSize: 'var(--fs-display)' }}>{s.value}</div>
        {s.cta
          ? <span className="pill pill-green" style={{ height: 32 }}>{s.cta}<Icon name="arrowRight" style={{ width: 16, height: 16 }} /></span>
          : <span className="go-dot"><Icon name="chevRight" /></span>}
      </div>
    </div>
  );
}

/* Отклик операторов на заявки (Блок A ТЗ): норматив в минутах, просрочка / накал тайминга */
function SlaResponseWidget({ onOpenOrder }) {
  const rows = SLA_QUEUE.map((q) => ({ ...q, tone: slaTone(q.waited, q.limit) }));
  const overdue = rows.filter((r) => r.tone === 'red').length;
  const heating = rows.filter((r) => r.tone === 'amber').length;
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Отклик на заявки</h2>
        {overdue > 0 && <Pill tone="red">Просрочено: {overdue}</Pill>}
        {heating > 0 && <Pill tone="amber">Накал тайминга: {heating}</Pill>}
        {!overdue && !heating && <Pill tone="green">Все в норме</Pill>}
      </div>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>Заявка</th><th>Клиент</th><th>Оператор</th><th>Ожидает</th><th>Норматив</th><th>Статус</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ cursor: 'pointer' }} onClick={() => { const o = ORDERS.find((x) => x.no === r.no); o && onOpenOrder && onOpenOrder(o); }}>
                <td className="t-strong">№ {r.no}</td>
                <td>{r.client}</td>
                <td>{r.operator}</td>
                <td style={{ fontWeight: 600, color: r.tone === 'red' ? 'var(--red)' : r.tone === 'amber' ? 'var(--amber)' : 'var(--ink)' }}>{r.waited} мин</td>
                <td className="t-muted">{r.limit} мин</td>
                <td><Pill tone={r.tone}>{slaLabel(r.tone)}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Компактная плитка-виджет дашборда ---------- */
function DashTile({ w, active, onClick }) {
  const toneColor = w.tone === 'red' ? 'var(--red)' : w.tone === 'amber' ? 'var(--amber)' : w.tone === 'green' ? 'var(--green)' : 'var(--blue)';
  return (
    <button type="button" onClick={onClick}
      style={{
        textAlign: 'left', cursor: 'pointer', background: active ? 'var(--blue-soft, #eef3ff)' : '#fff',
        border: '1px solid ' + (active ? 'var(--blue)' : 'var(--line)'), borderRadius: 14, padding: '12px 14px',
        boxShadow: active ? '0 0 0 1px var(--blue) inset, var(--shadow-card)' : 'var(--shadow-card)',
        display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, transition: 'all .14s',
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minHeight: 34 }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: toneColor, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name={w.icon} style={{ width: 16, height: 16, color: '#fff' }} />
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', lineHeight: 1.25 }}>{w.label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: w.small ? 18 : 22, fontWeight: 700, letterSpacing: '-.02em', color: w.tone === 'green' ? 'var(--ink)' : toneColor }}>{w.value}</span>
        {w.sub && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{w.sub}</span>}
      </div>
    </button>
  );
}

/* ---------- Пустое состояние детали (нет проблем) ---------- */
function DashDetailEmpty({ title }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', gap: 8, padding: 40 }}>
      <span style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--green)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" style={{ width: 24, height: 24, color: '#fff' }} /></span>
      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
    </div>
  );
}

/* ---------- Демо-данные для показателей дашборда (в проде — из API/БД) ---------- */
const SUPPLIER_STATS = [
  { name: 'Amadeus GDS',      apiErrors: 3, failed: 2, avgResp: '1.8 с', tone: 'red' },
  { name: 'Sirena',          apiErrors: 0, failed: 0, avgResp: '0.9 с', tone: 'green' },
  { name: 'Ratehawk',        apiErrors: 1, failed: 0, avgResp: '2.4 с', tone: 'amber' },
  { name: 'Air Astana (NDC)', apiErrors: 0, failed: 1, avgResp: '1.2 с', tone: 'green' },
  { name: 'Qatar (API)',     apiErrors: 2, failed: 1, avgResp: '3.1 с', tone: 'amber' },
];
const OPERATORS_WORK = [
  { name: 'Даниель',           handled: 21, orders: 6, issued: 8, earn: 142, profit: 470, sla: 'ok' },
  { name: 'Куба',              handled: 17, orders: 4, issued: 5, earn: 96,  profit: 320, sla: 'red' },
  { name: 'Адилет Медербеков',  handled: 14, orders: 5, issued: 6, earn: 88,  profit: 260, sla: 'ok' },
  { name: 'Кими Райкконен',     handled: 9,  orders: 2, issued: 3, earn: 54,  profit: 140, sla: 'amber' },
];
const TODAY_TRIPS = [
  { type: 'Вылет',     icon: 'plane',    main: 'FRU → IST · Turkish TK 4521',   sub: 'Нуралиев Данияр · 09:40',   order: 51162 },
  { type: 'Заселение', icon: 'building', main: 'Jannat Hotel · 3 ночи',          sub: 'Аттокуров Эрбол · заезд 14:00', order: 51163 },
  { type: 'Трансфер',  icon: 'car',      main: 'Аэропорт Манас → отель',         sub: 'Группа · подача 12:30',      order: 51154 },
  { type: 'Поездка',   icon: 'train',    main: 'Москва → СПб · Купе',            sub: 'Сагынбеков Икрам · 11:05',   order: 51156 },
  { type: 'Вылет',     icon: 'plane',    main: 'FRU → DXB · Air Astana',         sub: 'Асылов Айбек · 18:20',       order: 51171 },
];
const MY_TASKS = [
  { title: 'Выписать билеты по заказу № 51170', due: 'до 18:00',  tone: 'red',   order: 51170 },
  { title: 'Ответить клиенту в чате · Гранд лимитед', due: '15 мин', tone: 'red', order: 51162 },
  { title: 'Согласовать КП-1033 с клиентом', due: 'сегодня', tone: 'amber', order: 51156 },
  { title: 'Загрузить паспорт · Аттокуров Эрбол', due: 'до 15.06', tone: 'amber', order: 51163 },
];

function DashboardPage({ role, onNavigate, onAddOrder, onOpenOrder }) {
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [errCodeOpen, setErrCodeOpen] = useState(null);
  const [, tick] = useState(0); // перерисовка по смене/таймеру (длительность смены)

  const isMgr = role === 'Админ' || role === 'Менеджер';
  const [sel, setSel] = useState(isMgr ? 'overdue' : 'mytasks');
  const shift = window.SHIFT_STATE || null;

  useEffect(() => {
    const onShift = () => tick((t) => t + 1);
    window.addEventListener('shift-change', onShift);
    const id = setInterval(() => tick((t) => t + 1), 60000);
    return () => { window.removeEventListener('shift-change', onShift); clearInterval(id); };
  }, []);
  // при смене категории роли выбранный виджет может исчезнуть — вернуть к дефолтному
  useEffect(() => { setSel(isMgr ? 'overdue' : 'mytasks'); }, [isMgr]);

  const money = (n) => Math.round(n || 0).toLocaleString('ru-RU') + ' $';
  const fin = financeOverview();
  const slaRows = SLA_QUEUE.map((q) => ({ ...q, tone: slaTone(q.waited, q.limit) }));
  const slaOverdue = slaRows.filter((r) => r.tone === 'red').length;
  const errNotifs = NOTIFICATIONS.filter((n) => n.source === 'Интеграции');
  const supErrTotal = SUPPLIER_STATS.reduce((s, x) => s + x.apiErrors, 0);

  // сегодняшние операции (смена оператора → показатели «за сегодня»)
  const shOps = shift ? shift.ops : SHIFT_DEMO_OPS;
  const shT = shiftTotals(shOps, motivationFor('Даниель'));
  const issuedToday = shOps.filter((o) => o.type === 'Выписка').length;
  const salesToday = shOps.reduce((s, o) => s + Math.max(0, o.cost), 0);

  const isActive = (s) => s !== 'Завершено' && s !== 'Отменено' && s !== 'Отклонено';
  const returnsActive = RETURNS.filter((r) => isActive(r.status));
  const approvals = [
    ...PROPOSALS.filter((p) => p.status === 'На согласовании' || p.status === 'Отправлено клиенту').map((p) => ({ label: p.id, who: p.client, kind: 'КП', order: p.order })),
    ...RETURNS.filter((r) => r.status === 'Ожидает согласования клиента').map((r) => ({ label: r.no + ' · ' + r.type, who: r.client, kind: 'Возврат', order: r.order })),
  ];
  const deadlines = [
    ...returnsActive.map((r) => ({ label: r.type + ' · ' + r.no, who: r.client, date: r.deadline, tone: 'red', order: r.order, icon: 'refund' })),
    ...PROPOSALS.filter((p) => p.validUntil && p.status !== 'Согласовано' && p.status !== 'Отклонено').map((p) => ({ label: 'Срок КП · ' + p.id, who: p.client, date: p.validUntil, tone: 'amber', order: p.order, icon: 'template' })),
  ];

  const openErr = (code) => setErrCodeOpen(code || '');
  const goOrder = (no) => { const o = ORDERS.find((x) => x.no === no); o ? onOpenOrder(o) : onNavigate('orders'); };

  // Роль-адаптивный набор виджетов: руководитель — по компании, оператор — свои
  const WIDGETS = isMgr ? [
    { key: 'newreq',    label: 'Новые заявки',      value: SLA_QUEUE.length, tone: 'blue', icon: 'inbox' },
    { key: 'ordersToday', label: 'Заказы сегодня',  value: shT.orders, tone: 'blue', icon: 'orders' },
    { key: 'issued',    label: 'Выписано услуг',    value: issuedToday, tone: 'green', icon: 'check' },
    { key: 'sales',     label: 'Продажи сегодня',   value: money(salesToday), small: true, tone: 'blue', icon: 'finance' },
    { key: 'profit',    label: 'Прибыль сегодня',   value: money(shT.profit), small: true, tone: 'green', icon: 'bank' },
    { key: 'returns',   label: 'Возвраты и обмены', value: returnsActive.length, tone: returnsActive.length ? 'amber' : 'green', icon: 'refund' },
    { key: 'approvals', label: 'Согласования',      value: approvals.length, tone: approvals.length ? 'amber' : 'green', icon: 'template' },
    { key: 'deadlines', label: 'Дедлайны',          value: deadlines.length, tone: deadlines.length ? 'red' : 'green', icon: 'clock' },
    { key: 'overdue',   label: 'Просрочки оплат',   value: fin.overdueCount, sub: fin.overdue > 0 ? money(fin.overdue) : null, tone: fin.overdue > 0 ? 'red' : 'green', icon: 'alertCircle' },
    { key: 'risk',      label: 'Депозит / лимит',   value: fin.urgent.length, tone: fin.urgent.length ? 'amber' : 'green', icon: 'bank' },
    { key: 'operators', label: 'Работа операторов', value: OPERATORS_WORK.length, tone: 'blue', icon: 'users' },
    { key: 'suppliers', label: 'Поставщики (API)',  value: supErrTotal, sub: 'ошибок', tone: supErrTotal ? 'red' : 'green', icon: 'api' },
    { key: 'trips',     label: 'Вылеты и заезды',   value: TODAY_TRIPS.length, tone: 'blue', icon: 'plane' },
    { key: 'activity',  label: 'Активность',        value: RECENT_CHANGES.length, tone: 'blue', icon: 'clock' },
  ] : [
    { key: 'mytasks',   label: 'Мои задачи',        value: MY_TASKS.length, tone: MY_TASKS.length ? 'amber' : 'green', icon: 'clipboard' },
    { key: 'newreq',    label: 'Мои новые заявки',  value: SLA_QUEUE.length, tone: 'blue', icon: 'inbox' },
    { key: 'ordersToday', label: 'Заказы сегодня',  value: shT.orders, tone: 'blue', icon: 'orders' },
    { key: 'issued',    label: 'Выписано услуг',    value: issuedToday, tone: 'green', icon: 'check' },
    { key: 'myearn',    label: 'Заработок сегодня', value: money(shT.earn), small: true, tone: 'blue', icon: 'finance' },
    { key: 'approvals', label: 'Мои согласования',  value: approvals.length, tone: approvals.length ? 'amber' : 'green', icon: 'template' },
    { key: 'deadlines', label: 'Мои дедлайны',      value: deadlines.length, tone: deadlines.length ? 'red' : 'green', icon: 'clock' },
    { key: 'returns',   label: 'Возвраты и обмены', value: returnsActive.length, tone: returnsActive.length ? 'amber' : 'green', icon: 'refund' },
  ];

  const DTITLE = {
    newreq: 'Новые заявки · отклик', ordersToday: 'Заказы за сегодня', issued: 'Выписанные услуги за сегодня',
    sales: 'Продажи за сегодня', profit: 'Финансовые показатели за сегодня', returns: 'Возвраты и обмены в обработке',
    approvals: 'Открытые согласования', deadlines: 'Ближайшие дедлайны', overdue: 'Просрочки оплат по клиентам',
    risk: 'Клиенты: депозит и лимит отсрочки', operators: 'Работа операторов', suppliers: 'Статистика по поставщикам',
    trips: 'Вылеты, заселения и поездки сегодня', activity: 'Активность пользователей', mytasks: 'Мои задачи', myearn: 'Мой заработок за смену',
  };

  // компактная строка-ссылка
  const Row = ({ icon, iconBg, title, sub, right, tone, onClick }) => (
    <button type="button" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', textAlign: 'left', width: '100%', border: '1px solid var(--line)', borderLeft: '3px solid var(--' + (tone || 'line-strong') + ')', background: '#fff', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
      {icon && <span className="oc-svc-ic" style={{ background: iconBg || 'var(--blue)', width: 32, height: 32 }}><Icon name={icon} style={{ width: 16, height: 16 }} /></span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
      </div>
      {right}
      {onClick && <Icon name="chevRight" style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />}
    </button>
  );
  const List = ({ children }) => <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>;

  /* ------- деталь выбранного виджета ------- */
  const renderDetail = () => {
    switch (sel) {
      case 'newreq':
        return (
          <table className="tbl">
            <thead><tr><th>Заявка</th><th>Клиент</th><th>Оператор</th><th>Ожидает</th><th>Норматив</th><th>Статус</th></tr></thead>
            <tbody>{slaRows.map((r, i) => (
              <tr key={i} style={{ cursor: 'pointer' }} onClick={() => goOrder(r.no)}>
                <td className="t-strong">№ {r.no}</td><td>{r.client}</td><td>{r.operator}</td>
                <td style={{ fontWeight: 600, color: r.tone === 'red' ? 'var(--red)' : r.tone === 'amber' ? 'var(--amber)' : 'var(--ink)' }}>{r.waited} мин</td>
                <td className="t-muted">{r.limit} мин</td><td><Pill tone={r.tone}>{slaLabel(r.tone)}</Pill></td>
              </tr>))}</tbody>
          </table>
        );
      case 'ordersToday':
        return (
          <table className="tbl">
            <thead><tr><th style={{ width: 80 }}>№</th><th>Клиент</th><th>Статус</th><th>Ответственный</th><th>Тип</th><th style={{ width: 50 }}></th></tr></thead>
            <tbody>{ORDERS.slice(0, 8).map((o, i) => (
              <tr key={i} style={{ cursor: 'pointer' }} onClick={() => onOpenOrder(o)}>
                <td className="t-strong">{o.no}</td><td className="t-strong">{o.client}</td>
                <td><Pill tone={ORDER_STATUS[o.status]}>{o.status}</Pill></td><td>{o.operator}</td>
                <td><Pill tone="blue">{o.requestType}</Pill></td><td><span className="go-dot"><Icon name="chevRight" /></span></td>
              </tr>))}</tbody>
          </table>
        );
      case 'issued': case 'sales': case 'myearn':
        return (
          <table className="tbl">
            <thead><tr><th>Время</th><th>Услуга</th><th>Заказ</th><th>Тип</th><th style={{ textAlign: 'right' }}>Стоимость</th><th style={{ textAlign: 'right' }}>{sel === 'myearn' ? 'Заработок' : 'Сборы'}</th></tr></thead>
            <tbody>{shOps.map((o, i) => (
              <tr key={i} style={{ cursor: 'pointer' }} onClick={() => goOrder(o.order)}>
                <td className="t-muted">{o.time}</td><td className="t-strong">{o.title}</td><td>№ {o.order}</td>
                <td><Pill tone={o.type === 'Выписка' ? 'green' : o.type === 'Обмен' ? 'blue' : 'amber'}>{o.type}</Pill></td>
                <td style={{ textAlign: 'right' }}>{money(o.cost)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--blue)' }}>{sel === 'myearn' ? money(operatorEarn(o, motivationFor('Даниель'))) : money(o.serviceFee + o.markup + o.commission)}</td>
              </tr>))}</tbody>
          </table>
        );
      case 'profit':
        return (
          <div className="grid-4" style={{ gap: 14 }}>
            {[['Сервисные сборы', shT.serviceFee, 'blue'], ['Агентские надбавки', shT.markup, 'teal'], ['Комиссионное вознаграждение', shT.commission, 'amber'], ['Заработок операторов', shT.earn, 'gray'], ['Итого сборы', shT.feesTotal, 'blue'], ['Продажи (оборот)', salesToday, 'gray'], ['Прибыль компании', shT.profit, 'green']].map(([l, v, t], i) => (
              <div key={i} className="stat-card" style={{ borderLeft: '3px solid var(--' + t + ')' }}>
                <div className="s-label">{l}</div>
                <div className="s-value" style={{ fontSize: 'var(--fs-stat)', color: t === 'green' ? 'var(--green)' : 'var(--ink)' }}>{money(v)}</div>
              </div>
            ))}
          </div>
        );
      case 'returns':
        if (!returnsActive.length) return <DashDetailEmpty title="Возвратов и обменов в обработке нет" />;
        return <List>{returnsActive.map((r, i) => (
          <Row key={i} icon={RETURN_TYPE[r.type] ? RETURN_TYPE[r.type].icon : 'refund'} iconBg="var(--blue)" tone="amber"
            title={r.type + ' · ' + r.no} sub={r.client + ' · ' + r.service}
            right={<Pill tone={RETURN_STATUS[r.status]}>{r.status}</Pill>} onClick={() => goOrder(r.order)} />
        ))}</List>;
      case 'approvals':
        if (!approvals.length) return <DashDetailEmpty title="Открытых согласований нет" />;
        return <List>{approvals.map((a, i) => (
          <Row key={i} icon="template" iconBg="var(--blue)" tone="amber" title={a.label} sub={a.who}
            right={<Pill tone="gray">{a.kind}</Pill>} onClick={() => goOrder(a.order)} />
        ))}</List>;
      case 'deadlines':
        if (!deadlines.length) return <DashDetailEmpty title="Ближайших дедлайнов нет" />;
        return <List>{deadlines.map((d, i) => (
          <Row key={i} icon={d.icon} iconBg={'var(--' + d.tone + ')'} tone={d.tone} title={d.label} sub={d.who}
            right={<span style={{ fontWeight: 700, color: 'var(--' + d.tone + ')', whiteSpace: 'nowrap' }}>{d.date}</span>} onClick={() => goOrder(d.order)} />
        ))}</List>;
      case 'overdue': case 'risk': {
        const list = sel === 'overdue' ? fin.urgent.filter((u) => u.tone === 'red') : fin.urgent;
        if (!list.length) return <DashDetailEmpty title={sel === 'overdue' ? 'Просрочек по оплатам нет' : 'Рисков по депозитам и лимитам нет'} />;
        return <List>{list.map((u, i) => (
          <Row key={i} icon="bank" iconBg={'var(--' + u.tone + ')'} tone={u.tone} title={u.co} sub={u.text}
            right={<><Pill tone={u.tone}>{u.kind}</Pill><span style={{ fontWeight: 700, color: 'var(--' + u.tone + ')', whiteSpace: 'nowrap', marginLeft: 8 }}>{money(u.value)}</span></>}
            onClick={() => onNavigate('companies')} />
        ))}</List>;
      }
      case 'operators':
        return (
          <table className="tbl">
            <thead><tr><th>Оператор</th><th>Заявок</th><th>Заказов</th><th>Услуг</th><th style={{ textAlign: 'right' }}>Заработок</th><th style={{ textAlign: 'right' }}>Прибыль компании</th><th>SLA</th></tr></thead>
            <tbody>{OPERATORS_WORK.map((o, i) => (
              <tr key={i}>
                <td className="t-strong">{o.name}</td><td>{o.handled}</td><td>{o.orders}</td><td>{o.issued}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--blue)' }}>{money(o.earn)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>{money(o.profit)}</td>
                <td><Pill tone={o.sla === 'ok' ? 'green' : o.sla}>{o.sla === 'red' ? 'Просрочка' : o.sla === 'amber' ? 'Накал' : 'В норме'}</Pill></td>
              </tr>))}</tbody>
          </table>
        );
      case 'suppliers':
        return (
          <table className="tbl">
            <thead><tr><th>Поставщик</th><th>Ошибки API</th><th>Неуспешные брони</th><th>Ср. время ответа</th><th>Статус</th></tr></thead>
            <tbody>{SUPPLIER_STATS.map((s, i) => (
              <tr key={i}>
                <td className="t-strong">{s.name}</td>
                <td style={{ color: s.apiErrors ? 'var(--red)' : 'var(--muted-2)', fontWeight: s.apiErrors ? 700 : 400 }}>{s.apiErrors}</td>
                <td style={{ color: s.failed ? 'var(--amber)' : 'var(--muted-2)', fontWeight: s.failed ? 700 : 400 }}>{s.failed}</td>
                <td>{s.avgResp}</td><td><Pill tone={s.tone}>{s.tone === 'red' ? 'Сбои' : s.tone === 'amber' ? 'Замедления' : 'Стабильно'}</Pill></td>
              </tr>))}</tbody>
          </table>
        );
      case 'trips':
        return <List>{TODAY_TRIPS.map((t, i) => (
          <Row key={i} icon={t.icon} iconBg="var(--blue)" tone="blue" title={t.main} sub={t.sub}
            right={<Pill tone="blue">{t.type}</Pill>} onClick={() => goOrder(t.order)} />
        ))}</List>;
      case 'activity':
        return <List>{RECENT_CHANGES.map((r, i) => (
          <Row key={i} icon="clock" iconBg="var(--muted-2)" title={r.desc} sub={r.client + ' · ' + r.resp + ' · ' + r.dept}
            right={<span style={{ fontSize: 12, color: 'var(--muted-2)' }}>{r.time}</span>} />
        ))}</List>;
      case 'mytasks':
        return <List>{MY_TASKS.map((t, i) => (
          <Row key={i} icon="clipboard" iconBg={'var(--' + t.tone + ')'} tone={t.tone} title={t.title} sub={'Заказ № ' + t.order}
            right={<span style={{ fontWeight: 700, color: 'var(--' + t.tone + ')', whiteSpace: 'nowrap' }}>{t.due}</span>} onClick={() => goOrder(t.order)} />
        ))}</List>;
      default:
        return <DashDetailEmpty title="Нет данных" />;
    }
  };

  const shiftStat = (l, v, accent) => (
    <div style={{ flex: '1 1 120px', minWidth: 110 }}>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{l}</div>
      <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: accent ? 'var(--' + accent + ')' : 'var(--ink)', letterSpacing: '-.01em' }}>{v}</div>
    </div>
  );

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100vh', minHeight: 0 }}>
      <Topbar title={isMgr ? 'Добрый день, Айсулуу' : 'Мой рабочий день'}>
        <div className="topbar-spacer" />
        <SearchBox value={search} onChange={setSearch} placeholder="Поиск" style={{ width: 220 }} />
        <Button variant="secondary" icon="search" onClick={() => setSearchOpen(true)}>Поиск услуг</Button>
        <Button variant="primary" icon="plus" onClick={onAddOrder}>Добавить заказ</Button>
      </Topbar>

      {searchOpen && <DetailedSearchPanel onClose={() => setSearchOpen(false)} />}

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '10px 38px 22px', overflowY: 'auto' }}>
        {/* Блок «Моя смена» — только при открытой смене */}
        {shift && (
          <div className="card card-pad" style={{ marginBottom: 16, borderLeft: '3px solid var(--green)', background: 'var(--green-bg, #f2fbf6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--green)' }} />
              <h3 className="card-title" style={{ fontSize: 16, margin: 0 }}>Моя смена</h3>
              <Pill tone="green">открыта · с {shiftFmtTime(shift.openedAt)}</Pill>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Отчёт и закрытие — в меню смены в шапке</span>
            </div>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              {shiftStat('Продолжительность', shiftDuration(shift.openedAt))}
              {shiftStat('Обработано заявок', SHIFT_REQUESTS_HANDLED)}
              {shiftStat('Оформлено заказов', shT.orders)}
              {shiftStat('Выписано услуг', issuedToday)}
              {shiftStat('Текущий заработок', money(shT.earn), 'blue')}
              {shiftStat('Прибыль компании', money(shT.profit), 'green')}
            </div>
          </div>
        )}

        {/* KPI-виджеты — клик переключает деталь ниже */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
          {WIDGETS.map((w) => (<DashTile key={w.key} w={w} active={sel === w.key} onClick={() => setSel(w.key)} />))}
        </div>

        {/* деталь выбранного виджета */}
        <div className="card" style={{ flex: 1, minHeight: 320, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
            <h2 className="card-title" style={{ fontSize: 17, margin: 0 }}>{DTITLE[sel] || ''}</h2>
            <div style={{ flex: 1 }} />
            {sel === 'suppliers' && <Button variant="secondary" size="sm" icon="suppliers" onClick={() => onNavigate('suppliers')}>Все поставщики</Button>}
            {(sel === 'overdue' || sel === 'risk') && <Button variant="secondary" size="sm" icon="building" onClick={() => onNavigate('companies')}>Все компании</Button>}
            {(sel === 'returns') && <Button variant="secondary" size="sm" icon="refund" onClick={() => onNavigate('returns')}>Все возвраты</Button>}
            {(sel === 'ordersToday' || sel === 'newreq') && <Button variant="secondary" size="sm" icon="orders" onClick={() => onNavigate('orders')}>Все заказы</Button>}
            {sel === 'activity' && <Button variant="secondary" size="sm" icon="bell" onClick={() => onNavigate('notifications')}>Все события</Button>}
          </div>
          <div className="scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 16 }}>
            {renderDetail()}
          </div>
        </div>
      </div>

      <ErrorCodesDrawer open={errCodeOpen !== null} focusCode={errCodeOpen} onClose={() => setErrCodeOpen(null)} />
    </div>
  );
}

Object.assign(window, { DashboardPage, DetailedSearchPanel });
