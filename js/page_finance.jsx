// ===== Finance (Финансы) + finance info modal =====

function FinanceModal({ row, onClose, onDelete }) {
  const toast = useToast();
  if (!row) return null;
  const overdue = row.status === 'Нехватает' || row.status === 'Возврат';
  const partial = row.pct < 100;
  const remainder = (100 - row.pct);
  return (
    <Modal open onClose={onClose}>
      <div className="modal-pad">
        <ModalHeader title="Финансовая информация" sub={`№ ${row.no} ${row.org} от 20.12.25`} onClose={onClose} />
        {partial && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <button className="btn btn-secondary btn-sm" style={{ color: 'var(--amber)', borderColor: 'var(--amber-bg)' }} onClick={() => toast('Платёж отсрочен', 'info')}>Отсрочить платеж</button>
            <button className="btn btn-secondary btn-sm" style={{ color: 'var(--green)', borderColor: 'var(--green-bg)' }} onClick={() => toast('Платёж добавлен', 'ok')}>Добавить платеж</button>
          </div>
        )}
        <h3 className="card-title" style={{ marginBottom: 12 }}>Оплата</h3>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          {overdue && (
            <div style={{ position: 'absolute', right: 0, top: -42 }}>
              <span className="pill" style={{ background: 'var(--blue)', color: '#fff' }}>Просрочено</span>
            </div>
          )}
          <div style={{ height: 26, borderRadius: 8, overflow: 'hidden', display: 'flex', background: '#f0f1f4' }}>
            <span style={{ width: row.pct + '%', background: '#2bb96a' }} />
            <span style={{ width: remainder + '%', background: overdue ? '#ec4444' : '#f0921f' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 36, marginBottom: 22, fontSize: 14.5 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 13, height: 13, borderRadius: 3, background: '#2bb96a' }} />Оплачено {row.pct}% ({row.paid} {row.currency})</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 13, height: 13, borderRadius: 3, background: overdue ? '#ec4444' : '#f0921f' }} />Не оплачено {remainder}% до <b style={{ color: overdue ? 'var(--red-strong)' : 'inherit' }}>24.03.2026</b></span>
        </div>
        <div className="kv">
          {[['Поставщик', row.org], ['Тип поставщика', 'Локальный'], ['Типы услуг', 'Авиакомпания'], ['Организация', row.org], ['Валюта расчета', 'Руб'], ['Способ оплаты', 'Безналичный расчет'], ['Комиссия (%)', '12%'], ['Ответственное лицо', row.resp], ['Выбранная услуга', 'Авиа (Москва - Монако) / Полная страховка / Эконом класс']].map(([k, v], i) => (
            <div className="kv-row" key={i}><span className="k">{k}</span><span className="v" style={{ maxWidth: 360 }}>{v}</span></div>
          ))}
        </div>
        <div className="modal-actions">
          {partial && <Button variant="primary" icon="mail" onClick={() => toast('Уведомление об оплате отправлено', 'ok')}>Уведомить об оплате</Button>}
          <Button variant="secondary" icon="edit" onClick={() => toast('Редактирование', 'info')}>Редактировать</Button>
          <Button variant="secondary" icon="trash" onClick={onDelete}>Удалить</Button>
          <Button variant="secondary" icon="share" onClick={() => toast('Ссылка скопирована', 'ok')}>Поделиться</Button>
        </div>
      </div>
    </Modal>
  );
}

function FinancePage({ finance }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ service: '', status: '' });
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const { sort, onSort, apply } = useSort(null);
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [periodPickerPos, setPeriodPickerPos] = useState({ top: 0, left: 0 });
  const [periodStart, setPeriodStart] = useState(null);
  const [periodEnd, setPeriodEnd] = useState(null);
  const periodChipRef = useRef(null);

  const tabFilter = (r) => tab === 'all' ? true : tab === 'debt' ? (r.pct < 100) : (r.status === 'Возврат');
  let rows = finance.filter((r) =>
    (r.org.toLowerCase().includes(search.toLowerCase()) || String(r.no).includes(search)) &&
    tabFilter(r) &&
    (!filters.service || r.service === filters.service) &&
    (!filters.status || r.status === filters.status));
  rows = apply(rows, { no: (r) => r.no });
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, tab, filters]);

  const debtCount = finance.filter((r) => r.pct < 100).length;
  const archiveCount = finance.filter((r) => r.status === 'Возврат').length;

  return (
    <div className="fade-in">
      <Topbar title="Финансы">
        <div className="topbar-spacer" />
        <FilterChip label="Типы поставщиков" options={Object.keys(ORG_TYPE)} value={filters.orgType} onChange={() => {}} />
        <FilterChip label="Статусы" options={Object.keys(FIN_STATUS)} value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} />
        <FilterChip label="Типы услуг" options={['Авиа', 'Отель', 'Трансфер', 'Все включено']} value={filters.service} onChange={(v) => setFilters((f) => ({ ...f, service: v }))} />
        <SearchBox value={search} onChange={setSearch} style={{ width: 260 }} />
      </Topbar>
      <div className="content">
        <div className="grid-4" style={{ marginBottom: 26 }}>
          {FIN_STATS.map((s, i) => (
            <div className="stat-card" key={i}><div className="s-label">{s.label}</div><div className="s-value">{s.value}</div></div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <Tabs value={tab} onChange={setTab} tabs={[
            { key: 'all', label: 'Все операции', count: finance.length },
            { key: 'debt', label: 'Поставщики (задолженность)', count: debtCount },
            { key: 'archive', label: 'Архив', count: archiveCount },
          ]} />
          <div className="topbar-spacer" />
          <span style={{ color: 'var(--muted)', fontSize: 14 }}>Последнее обновление 5 минут назад</span>
          <span
            ref={periodChipRef}
            className="chip"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              if (periodChipRef.current) {
                const r = periodChipRef.current.getBoundingClientRect();
                const calH = 460, calW = 310;
                const top = (r.bottom + calH > window.innerHeight - 8) ? Math.max(8, r.top - calH) : r.bottom + 6;
                const left = Math.max(8, Math.min(r.left, window.innerWidth - calW - 8));
                setPeriodPickerPos({ top, left });
              }
              setShowPeriodPicker(true);
            }}
          >
            {periodStart
              ? (periodEnd ? `${fmtDate(periodStart)} — ${fmtDate(periodEnd)}` : fmtDate(periodStart))
              : 'Выберите период'}
            <Icon name="chevDown" />
          </span>
          {showPeriodPicker && ReactDOM.createPortal(
            <div style={{ position: 'fixed', top: periodPickerPos.top, left: periodPickerPos.left, zIndex: 9999 }}>
              <CalendarPicker
                mode="range"
                startVal={periodStart}
                endVal={periodEnd}
                onConfirm={(s, e) => { setPeriodStart(s); setPeriodEnd(e || null); setShowPeriodPicker(false); }}
                onClose={() => setShowPeriodPicker(false)}
              />
            </div>,
            document.body
          )}
        </div>
        <div className="table-card">
          <table className="tbl">
            <thead>
              <tr>
                <Th label="№" col="no" sort={sort} onSort={onSort} style={{ width: 80 }} />
                <th>Организация</th><th>Услуга</th><th>Сумма</th><th>Оплачено</th><th>Валюта</th><th>Ответственное лицо</th><th>Статус</th>
              </tr>
            </thead>
            {pageRows.length === 0
              ? <tbody><tr><td colSpan={8}><EmptyState icon="finance" title="Операций нет" /></td></tr></tbody>
              : (
                <tbody>
                  {pageRows.map((r, i) => (
                    <tr key={i} style={{ cursor: 'pointer' }} onClick={() => setModal(r)}>
                      <td className="t-strong">{r.no}</td>
                      <td className="t-strong">{r.org}</td>
                      <td><Pill tone={SERVICE_TYPE[r.service]}>{r.service}</Pill></td>
                      <td>{r.sum}</td>
                      <td><Pill tone={r.pct >= 100 ? 'green' : 'red'}>{r.paid}</Pill></td>
                      <td>{r.currency}</td>
                      <td><div className="t-strong">{r.resp}</div><div className="t-sub">{r.role}</div></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Pill tone={FIN_STATUS[r.status]}>{r.status}</Pill>
                          <span className="info-dot">i</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
          </table>
          <Pagination page={page} pages={pages} onPage={setPage} />
        </div>
      </div>
      {modal && <FinanceModal row={modal} onClose={() => setModal(null)} onDelete={() => setConfirm(modal)} />}
      <ConfirmDialog open={!!confirm} message="Данное действие невозможно будет отменить!"
        onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); setModal(null); toast('Запись удалена', 'ok'); }} />
    </div>
  );
}

Object.assign(window, { FinancePage, FinanceModal });
