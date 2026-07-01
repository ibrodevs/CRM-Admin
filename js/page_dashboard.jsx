// ===== Dashboard (Главное) =====

/* Финализация свободного бронирования (ТЗ #1): по подобранным без привязки к заказу услугам можно
   сформировать КП, привязать к существующему заказу или к физ.лицу. */
function FreeBookingFinalize({ draft, onClose, onDone }) {
  const toast = useToast();
  const svcTitle = (x) => x.title || x.route || x.fareName || (x.from && x.to ? x.from + ' → ' + x.to : x.kind || 'Услуга');
  const svcSum = (x) => x.fareDeltaUsd || x.total || x.cost || x.price || x.sum || 0;
  const total = draft.reduce((s, x) => s + svcSum(x), 0);
  const finish = (msg) => { toast(msg, 'ok'); onDone(); };
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
        <Button icon="template" style={{ width: '100%' }} onClick={() => finish('Коммерческое предложение сформировано')}>Сформировать КП</Button>
        <Button variant="secondary" icon="briefcase" style={{ width: '100%' }} onClick={() => finish('Услуги привязаны к заказу')}>Привязать к заказу</Button>
        <Button variant="secondary" icon="user" style={{ width: '100%' }} onClick={() => finish('Услуги привязаны к физ. лицу')}>Привязать к физ. лицу</Button>
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
