// ===== Dashboard (Главное) =====

/* «Детальный поиск» — reuses the same category-tab service picker that lives inside an order's
   «Добавить услугу» flow, but standalone: no order to attach to yet, so results are informational. */
function DetailedSearchPanel({ onClose }) {
  const toast = useToast();
  const [kind, setKind] = useState('Авиа');
  const [aviaParams, setAviaParams] = useState({ trip: 'rt', from: 'FRU', to: 'IST', depDate: null, retDate: null, pax: { adt: 1, chd: 0, infNoSeat: 0, infSeat: 0, special: {}, subsidized: {} }, cabin: 'Эконом', baggage: false, flex: false, direct: false, airline: '', ...PAX_DEFAULT_OPTIONS });
  return (
    <StackPanel title="Поиск услуг" width="min(1320px,96vw)" onClose={onClose}>
      <AddServicePanel kind={kind} setKind={setKind} aviaParams={aviaParams} setAviaParams={setAviaParams}
        paxCount={aviaParams.pax.adt + aviaParams.pax.chd}
        onAddAvia={() => toast('Перелёт найден. Откройте нужный заказ, чтобы добавить его в сценарий', 'ok')}
        onAddOther={() => toast('Услуга найдена. Откройте нужный заказ, чтобы добавить её в сценарий', 'ok')} />
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
