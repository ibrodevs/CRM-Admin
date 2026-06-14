// ===== Documents (Документы) + document modals =====

function DocInvoiceModal({ row, onClose }) {
  const toast = useToast();
  if (!row) return null;
  return (
    <Modal open onClose={onClose}>
      <div className="modal-pad">
        <ModalHeader title="Документация" sub={`№ ${row.no} ${row.org} от 23.12.25`} onClose={onClose} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18 }}>
          <h3 className="card-title">Счет на оплату</h3>
          <span style={{ color: 'var(--muted)' }}>№6152 от 23.12.25</span>
        </div>
        <div className="kv">
          {[['Поставщик', row.org === '-' ? 'S7 Airlines' : row.org], ['Тип поставщика', 'Локальный'], ['Типы услуг', 'Авиакомпания'], ['Организация', 'S7 Airlines'], ['Валюта расчета', 'Руб'], ['Комиссия (%)', '12%'], ['Ответственное лицо', row.client], ['Выбранная услуга', 'Авиа (Москва - Монако) / Полная страховка / Эконом класс'], ['Итоговая сумма', '76200 RUB'], ['Основание', `Оплата за услуги и комиссионные по договору №${row.no} от 23.12.25`]].map(([k, v], i) => (
            <div className="kv-row" key={i}><span className="k">{k}</span><span className="v" style={{ maxWidth: 380 }}>{v}</span></div>
          ))}
        </div>
        <div className="modal-actions">
          <Button variant="secondary" iconRight="chevRight" onClick={() => toast('Открываю документ', 'info')}>Посмотреть документ</Button>
          <Button variant="primary" iconRight="chevRight" onClick={() => { toast('Документ подписан', 'ok'); onClose(); }}>Подписать</Button>
        </div>
      </div>
    </Modal>
  );
}

function DocsPage({ documents }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('main');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const { sort, onSort, apply } = useSort(null);

  const tabFilter = (d) => {
    if (tab === 'missing') return d.status === 'Ожидает';
    if (tab === 'companies') return d.org.toLowerCase().includes('осоо');
    if (tab === 'persons') return !d.org.toLowerCase().includes('осоо');
    return true;
  };
  let rows = documents.filter((d) =>
    (d.client.toLowerCase().includes(search.toLowerCase()) || String(d.no).includes(search)) && tabFilter(d));
  rows = apply(rows, { no: (r) => r.no });
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, tab]);

  return (
    <div className="fade-in">
      <Topbar title="Документы">
        <div className="topbar-spacer" />
        <SearchBox value={search} onChange={setSearch} style={{ width: 300 }} />
      </Topbar>
      <div className="content">
        <div style={{ marginBottom: 24 }}>
          <Tabs value={tab} onChange={setTab} tabs={[
            { key: 'main', label: 'Главное' },
            { key: 'all', label: 'Все документы', count: 109 },
            { key: 'missing', label: 'Не хватает', count: documents.filter((d) => d.status === 'Ожидает').length },
            { key: 'companies', label: 'Компании', count: 5 },
            { key: 'persons', label: 'Физические лица', count: 14 },
          ]} />
        </div>
        <h2 className="section-title" style={{ marginBottom: 16 }}>
          {tab === 'missing' ? 'Документы, требующие действия' : 'Последние документы'}
        </h2>
        <div className="table-card">
          <table className="tbl">
            <thead>
              <tr>
                <Th label="№" col="no" sort={sort} onSort={onSort} style={{ width: 80 }} />
                <th>Клиент</th><th>Организация</th><th>Статус документа</th><th>Тип документа</th><th>Сумма</th><th>Статус</th>
              </tr>
            </thead>
            {pageRows.length === 0
              ? <tbody><tr><td colSpan={7}><EmptyState icon="docs" title="Документы не найдены" /></td></tr></tbody>
              : (
                <tbody>
                  {pageRows.map((d, i) => (
                    <tr key={i} style={{ cursor: 'pointer' }} onClick={() => setModal(d)}>
                      <td className="t-strong">{d.no}</td>
                      <td className="t-strong">{d.client}</td>
                      <td className="t-muted">{d.org}</td>
                      <td><Pill tone={DOC_STAGE[d.stage] || 'gray'}>{d.stage}</Pill></td>
                      <td><Pill tone={DOC_TYPE[d.type]}>{d.type}</Pill></td>
                      <td>{d.sum}</td>
                      <td><Pill tone={DOC_STATUS[d.status]}>{d.status}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              )}
          </table>
          <Pagination page={page} pages={pages} onPage={setPage} />
        </div>
      </div>
      {modal && <DocInvoiceModal row={modal} onClose={() => setModal(null)} />}
    </div>
  );
}

Object.assign(window, { DocsPage, DocInvoiceModal });
