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

  // Выбор существующего заказа для привязки
  if (step === 'order') {
    const rows = ORDERS.filter((o) => `${o.no} ${o.client}`.toLowerCase().includes(q.toLowerCase())).slice(0, 20);
    return (
      <Drawer open onClose={onClose} title="Привязать к заказу"
        footer={<Button variant="secondary" style={{ width: '100%' }} onClick={() => setStep('menu')}>Назад</Button>}>
        <SearchBox value={q} onChange={setQ} placeholder="Поиск: № заказа или клиент" style={{ width: '100%', marginBottom: 12 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((o) => (
            <button key={o.id} type="button" className="oce-client" style={{ cursor: 'pointer', width: '100%', textAlign: 'left', border: '1px solid var(--line)', background: '#fff', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}
              onClick={() => finish('Услуги привязаны к заказу № ' + o.no)}>
              <span className="oc-svc-ic" style={{ background: 'var(--blue)', width: 34, height: 34 }}><Icon name="briefcase" /></span>
              <div style={{ flex: 1, minWidth: 0 }}><div className="nm" style={{ fontWeight: 600 }}>Заказ № {o.no}</div><div className="mt" style={{ fontSize: 12.5, color: 'var(--muted)' }}>{o.client} · {o.requestType}</div></div>
              <Icon name="chevRight" style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />
            </button>
          ))}
          {!rows.length && <EmptyState icon="briefcase" title="Заказы не найдены" />}
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
          <span className="oc-svc-ic" style={{ background: 'var(--blue)', width: 40, height: 40, borderRadius: 11 }}><Icon name="template" style={{ width: 19, height: 19 }} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{kpNo}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{draft.length} {plural(draft.length, ['услуга', 'услуги', 'услуг'])} · черновик</div>
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
              <div><div style={{ fontWeight: 600, color: 'var(--ink)' }}>{svcTitle(x)}</div><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{x.kind || 'Авиа'}{x.supplier ? ' · ' + x.supplier : ''}</div></div>
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
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name={icon} style={{ width: 15, height: 15 }} />{label}</span>
              <Icon name="chevRight" style={{ width: 15, height: 15 }} />
            </button>
          ))}
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer open onClose={onClose} title="Оформление свободного бронирования"
      footer={<Button variant="secondary" style={{ width: '100%' }} onClick={onClose}>Закрыть</Button>}>
      <div style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 14 }}>
        В подборке {draft.length} {plural(draft.length, ['услуга', 'услуги', 'услуг'])}. Выберите, что сделать дальше.
      </div>
      <div className="card card-pad" style={{ marginBottom: 18 }}>
        {draft.map((x, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: i < draft.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <div><div style={{ fontWeight: 600, color: 'var(--ink)' }}>{svcTitle(x)}</div><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{x.kind || 'Авиа'}{x.supplier ? ' · ' + x.supplier : ''}</div></div>
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
      </div>
    </Drawer>
  );
}

/* «Свободное бронирование» — поиск услуг без привязки к заказу (ТЗ #1). Подобранные услуги
   собираются в подборку, затем оформляются: КП / привязка к заказу / привязка к физ.лицу. */
function DetailedSearchPanel({ onClose }) {
  const toast = useToast();
  const [kind, setKind] = useState('Авиа');
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
      <div style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 12 }}>
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
          <div className="s-value" style={{ fontSize: 28, color: 'var(--green)' }}>{money(ov.deposits)}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('companies')}>
          <div className="s-label">Задолженность (отсрочка)</div>
          <div className="s-value" style={{ fontSize: 28, color: 'var(--amber)' }}>{money(ov.debt)}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('finance')}>
          <div className="s-label">Просрочено</div>
          <div className="s-value" style={{ fontSize: 28, color: ov.overdue > 0 ? 'var(--red)' : 'var(--muted)' }}>{money(ov.overdue)}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('finance')}>
          <div className="s-label">Клиентов с просрочкой</div>
          <div className="s-value" style={{ fontSize: 28, color: ov.overdueCount > 0 ? 'var(--red)' : 'var(--muted)' }}>{ov.overdueCount}</div>
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
                  <div className="mt" style={{ fontSize: 12.5, color: 'var(--muted)' }}>{u.text}</div>
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
        <div className="s-value" style={{ fontSize: 34 }}>{s.value}</div>
        {s.cta
          ? <span className="pill pill-green" style={{ height: 32 }}>{s.cta}<Icon name="arrowRight" style={{ width: 15, height: 15 }} /></span>
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

function DashboardPage({ onNavigate, onAddOrder, onOpenOrder }) {
  const [period, setPeriod] = useState('today');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
  const [customStart, setCustomStart] = useState(null);
  const [customEnd, setCustomEnd] = useState(null);
  const pickerBtnRef = useRef(null);
  const rows = ORDERS.filter((o) => o.client.toLowerCase().includes(search.toLowerCase())).slice(0, 6);

  return (
    <div className="fade-in">
      <Topbar title="Добрый день, Айсулуу">
        <div className="topbar-spacer" />
        <SearchBox value={search} onChange={setSearch} placeholder="Поиск" style={{ width: 260 }} />
        <Button variant="secondary" icon="search" onClick={() => setSearchOpen(true)}>Поиск услуг</Button>
        <Button variant="primary" icon="plus" onClick={onAddOrder}>Добавить заказ</Button>
      </Topbar>

      {searchOpen && <DetailedSearchPanel onClose={() => setSearchOpen(false)} />}

      <div className="content">
        {/* stat cards */}
        <div className="grid-4" style={{ marginBottom: 30 }}>
          {DASH_STATS.map((s, i) => (
            <StatCardDash key={i} s={s} onGo={() => onNavigate(s.label === 'Просрочены оплаты' ? 'finance' : 'orders')} />
          ))}
        </div>

        {/* attention feed */}
        <div style={{ marginBottom: 32 }}>
          <ActivityFeed onNavigate={onNavigate} onOpenOrder={onOpenOrder} />
        </div>

        {/* отклик операторов на заявки — просрочки / накал тайминга */}
        <SlaResponseWidget onOpenOrder={onOpenOrder} />

        {/* финансовое состояние клиентов */}
        <FinanceOverviewBlock onNavigate={onNavigate} />

        {/* order statistics */}
        <h2 className="section-title" style={{ marginBottom: 16 }}>Статистика заказов</h2>
        <div className="stackbar" style={{ marginBottom: 4 }}>
          {ORDER_BREAKDOWN.map((b, i) => (
            <span key={i} style={{ width: b.pct + '%', background: b.color }} title={`${b.label} ${b.pct}%`} />
          ))}
        </div>
        <div className="legend" style={{ marginBottom: 36 }}>
          {ORDER_BREAKDOWN.map((b, i) => (
            <div key={i} className="legend-item">
              <span className="dot" style={{ background: b.color }} />
              {b.label} ({b.pct}%) <span className="cnt">{b.count}</span>
            </div>
          ))}
        </div>

        {/* order list */}
        <h2 className="section-title" style={{ marginBottom: 16 }}>Список заказов</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span className="chip">Все фильтры<Icon name="chevDown" /></span>
          <span className="chip">Юр лица, незавершенные +2<button className="chip-x"><Icon name="x" style={{ width: 15, height: 15 }} /></button></span>
          <div className="topbar-spacer" />
          <button className="tab"><Icon name="filter" />Фильтр</button>
        </div>

        <div className="table-card" style={{ marginBottom: 40 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 80 }}>№</th>
                <th>Клиент</th>
                <th>Статус заказа</th>
                <th>Ответственное лицо</th>
                <th style={{ width: 180 }}>Прогресс</th>
                <th>Тип заказа</th>
                <th style={{ width: 90 }}>Действие</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o, i) => (
                <tr key={i} style={{ cursor: 'pointer' }} onClick={() => onOpenOrder(o)}>
                  <td className="t-strong">{o.no}</td>
                  <td className="t-strong">{o.client}</td>
                  <td><Pill tone={ORDER_STATUS[o.status]}>{o.status}</Pill></td>
                  <td>
                    <div className="t-strong">{o.operator}</div>
                    <div className="t-sub">{o.operatorRole}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="info-dot" title="Детали">i</span>
                      <div className="progress"><span style={{ width: o.progress + '%' }} /></div>
                    </div>
                  </td>
                  <td><Pill tone="blue">{o.requestType}</Pill></td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn green" onClick={(e) => { e.stopPropagation(); onOpenOrder(o); }}><Icon name="edit" /></button>
                      <span className="go-dot" onClick={(e) => { e.stopPropagation(); onOpenOrder(o); }}><Icon name="chevRight" /></span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={10} pages={13} onPage={() => {}} />
        </div>

        {/* recent changes */}
        <h2 className="section-title" style={{ marginBottom: 16 }}>Последние изменения</h2>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {[['month', 'Месяц'], ['week', 'Неделя'], ['today', 'Сегодня']].map(([k, l]) => (
            <button key={k} className={'tab' + (period === k ? ' active' : '')} onClick={() => { setPeriod(k); setCustomStart(null); setCustomEnd(null); }}>{l}</button>
          ))}
          <button
            ref={pickerBtnRef}
            className={'tab' + (period === 'custom' ? ' active' : '')}
            style={period !== 'custom' ? { background: 'none', border: 'none', color: 'var(--muted)' } : {}}
            onClick={() => {
              if (pickerBtnRef.current) {
                const r = pickerBtnRef.current.getBoundingClientRect();
                const calH = 460, calW = 310;
                const top = (r.bottom + calH > window.innerHeight - 8) ? Math.max(8, r.top - calH) : r.bottom + 6;
                const left = Math.max(8, Math.min(r.left, window.innerWidth - calW - 8));
                setPickerPos({ top, left });
              }
              setShowPicker(true);
            }}
          >
            {period === 'custom' && customStart
              ? (customEnd ? `${fmtDate(customStart)} — ${fmtDate(customEnd)}` : fmtDate(customStart))
              : 'Выбрать период'}
          </button>
          {showPicker && ReactDOM.createPortal(
            <div style={{ position: 'fixed', top: pickerPos.top, left: pickerPos.left, zIndex: 9999 }}>
              <CalendarPicker
                mode="range"
                startVal={customStart}
                endVal={customEnd}
                onConfirm={(s, e) => { setCustomStart(s); setCustomEnd(e || null); setPeriod('custom'); setShowPicker(false); }}
                onClose={() => setShowPicker(false)}
              />
            </div>,
            document.body
          )}
        </div>
        <div className="table-card">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 80 }}>№</th><th>Отдел</th><th>Клиент</th>
                <th>Тип заказа</th><th>Ответственное лицо</th><th>Описание</th><th style={{ width: 90 }}>Действие</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_CHANGES.map((r, i) => (
                <tr key={i}>
                  <td className="t-strong">{r.time}</td>
                  <td><Pill tone="gray">{r.dept}</Pill></td>
                  <td className="t-strong">{r.client}</td>
                  <td><Pill tone="blue">{r.type}</Pill></td>
                  <td><div className="t-strong">{r.resp}</div><div className="t-sub">Оператор</div></td>
                  <td className="t-muted">{r.desc}</td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn green"><Icon name="edit" /></button>
                      <span className="go-dot"><Icon name="chevRight" /></span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DashboardPage });
