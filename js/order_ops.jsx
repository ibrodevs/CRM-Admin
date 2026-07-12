// ===== Заказ: ответственные по видам услуг + журнал действий (Блок D) и
//        динамические доп. услуги по этапам / API поставщика (Блок E) =====

/* Операторы, у которых есть доступ к данному виду услуг (для назначения ответственного) */
function operatorsForKind(kind) {
  return OPERATORS.filter((op) => {
    const a = operatorSvcAccess(op);
    return a.fullAccess || (a.kinds && a.kinds[kind] && Object.values(a.kinds[kind]).some(Boolean));
  });
}

/* Гарантирует, что для заказа есть список ответственных по услугам (демо-подстановка) */
function ensureResponsibles(order) {
  if (ORDER_SVC_RESPONSIBLES[order.no]) return ORDER_SVC_RESPONSIBLES[order.no];
  const kindMap = { 'Отель': 'Гостиницы', 'Трансфер': 'Трансферы', 'Виза': 'Визы' };
  const k = kindMap[order.service] || (SVC_ACCESS_KINDS.includes(order.service) ? order.service : 'Авиа');
  ORDER_SVC_RESPONSIBLES[order.no] = [{ kind: k, service: order.service + ' по заказу', operator: order.operator || OPERATORS[0] }];
  return ORDER_SVC_RESPONSIBLES[order.no];
}

/* ---------- Вкладка «Ответственные» ---------- */
function OrderResponsiblesTab({ order }) {
  const toast = useToast();
  const [, tick] = useState(0);
  const rerender = () => tick((n) => n + 1);
  const resp = ensureResponsibles(order);
  const history = ORDER_RESP_HISTORY[order.no] || (ORDER_RESP_HISTORY[order.no] = []);
  const log = orderActionLog(order.no);

  const reassign = (row, op) => {
    if (op === row.operator) return;
    const prev = row.operator;
    row.operator = op;
    history.push({ date: (window.cfNow ? window.cfNow() : new Date().toLocaleString('ru-RU')), text: row.kind + ': ' + prev + ' → ' + op, user: (CURRENT_USER && CURRENT_USER.name) || 'Оператор' });
    toast('Ответственный по «' + row.kind + '»: ' + op, 'ok');
    rerender();
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <h3 className="card-title" style={{ fontSize: 18, margin: 0 }}>Ответственные по услугам</h3>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Над одним заказом работают несколько операторов — каждый со своими услугами. Вознаграждение считается по своим услугам.</div>
        </div>
      </div>

      <div className="table-card" style={{ marginBottom: 18 }}>
        <table className="tbl">
          <thead><tr><th>Вид услуг</th><th>Услуга</th><th>Ответственный</th><th style={{ width: 150 }}>Действие</th></tr></thead>
          <tbody>
            {resp.map((row, i) => (
              <tr key={i}>
                <td><Pill tone={SERVICE_TYPE[row.kind] || 'blue'}>{row.kind}</Pill></td>
                <td className="t-strong">{row.service}</td>
                <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Avatar name={row.operator} size={26} />{row.operator}</span></td>
                <td>
                  <ActionMenu trigger={<Button variant="secondary" size="sm" iconRight="chevDown">Переназначить</Button>}
                    items={(operatorsForKind(row.kind).length ? operatorsForKind(row.kind) : OPERATORS).map((op) => ({
                      icon: op === row.operator ? 'check' : 'user', label: op, onClick: () => reassign(row, op),
                    }))} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Журнал действий операторов */}
        <div>
          <h3 className="card-title" style={{ fontSize: 16, marginBottom: 10 }}>Журнал действий операторов</h3>
          <div className="table-card">
            <table className="tbl">
              <thead><tr><th>Время</th><th>Оператор</th><th>Услуга</th><th>Действие</th><th>Результат</th></tr></thead>
              <tbody>
                {log.length ? log.map((l, i) => (
                  <tr key={i}>
                    <td className="t-muted" style={{ whiteSpace: 'nowrap' }}>{l.time}</td>
                    <td>{l.operator}</td>
                    <td><Pill tone={SERVICE_TYPE[l.kind] || 'blue'}>{l.kind}</Pill></td>
                    <td>{l.action}</td>
                    <td className="t-muted">{l.result}</td>
                  </tr>
                )) : <tr><td colSpan={5}><EmptyState title="Действий пока нет" /></td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* История переназначений */}
        <div>
          <h3 className="card-title" style={{ fontSize: 16, marginBottom: 10 }}>История назначений</h3>
          <div className="card card-pad">
            {history.length ? (
              <div className="timeline">
                {[...history].reverse().map((h, i) => (
                  <div className="tl-item" key={i}><span className="tl-dot" /><span className="tl-line" />
                    <div><div className="tl-time">{h.date} · {h.user}</div><div className="tl-text">{h.text}</div></div>
                  </div>
                ))}
              </div>
            ) : <div style={{ color: 'var(--muted)', fontSize: 13.5 }}>Переназначений ещё не было.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Вкладка «Доп. услуги» — динамический список по этапу и API поставщика (Блок E) ---------- */
function DynamicExtrasPanel({ order }) {
  const toast = useToast();
  const [stage, setStage] = useState('Бронирование');
  const [hasApi, setHasApi] = useState(true);
  const [issued, setIssued] = useState({});
  const list = extrasFromSupplier(stage, hasApi, issued);

  const issue = (item) => { setIssued((s) => ({ ...s, [item.id]: true })); toast('Услуга оформлена: ' + item.name, 'ok'); };
  const request = (item) => toast('Запрос поставщику отправлен: ' + item.name, 'info');

  const groups = [
    { key: 'available', title: 'Доступны сейчас', hint: 'Вернул поставщик через API — можно оформить' },
    { key: 'request', title: 'Запросить вручную / у поставщика', hint: 'API не подтвердил — оформляется по запросу' },
    { key: 'manual', title: 'Только вручную', hint: 'Оформляется оператором вручную' },
    { key: 'issued', title: 'Уже оформлены', hint: '' },
    { key: 'unavailable', title: 'Недоступны на этом этапе', hint: 'Не поддерживаются тарифом / этапом / поставщиком' },
  ];
  const byGroup = (k) => list.filter((x) => x.status === k);

  const card = (item) => {
    const st = EXTRA_STATUS[item.status];
    return (
      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12, border: '1px solid var(--field-line)', background: item.status === 'unavailable' ? 'var(--surface-2)' : '#fff', opacity: item.status === 'unavailable' ? 0.7 : 1 }}>
        <span className="oc-svc-ic" style={{ width: 38, height: 38, background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name={item.icon} style={{ width: 18, height: 18 }} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{item.name}{item.emd && <span className="off-tag">EMD</span>}{item.fee && <span className="off-tag">сбор</span>}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{item.category} · {item.desc}</div>
        </div>
        <Pill tone={st.tone}>{st.label}</Pill>
        {item.status === 'available' && <Button size="sm" icon="check" onClick={() => issue(item)}>Оформить</Button>}
        {item.status === 'request' && <Button size="sm" variant="secondary" icon="send" onClick={() => request(item)}>Запросить</Button>}
        {item.status === 'manual' && <Button size="sm" variant="secondary" icon="edit" onClick={() => issue(item)}>Вручную</Button>}
      </div>
    );
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h3 className="card-title" style={{ fontSize: 18, margin: 0 }}>Дополнительные услуги</h3>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Список формируется динамически: этап оформления → запрос в API поставщика → фильтр по статусу → отображение.</div>
        </div>
      </div>

      {/* Этап + тип поставщика */}
      <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 6 }}>Этап оформления</div>
          <div className="seg-toggle" style={{ width: 300 }}>
            {EXTRA_STAGES.map((st) => <button key={st} className={'seg-btn' + (stage === st ? ' active' : '')} onClick={() => setStage(st)}>{st}</button>)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 6 }}>Поставщик</div>
          <div className="seg-toggle" style={{ width: 260 }}>
            <button className={'seg-btn' + (hasApi ? ' active' : '')} onClick={() => setHasApi(true)}>С API</button>
            <button className={'seg-btn' + (!hasApi ? ' active' : '')} onClick={() => setHasApi(false)}>Локальный (без API)</button>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 280, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <Icon name="api" style={{ width: 15, height: 15, color: 'var(--blue)', flexShrink: 0, marginTop: 1 }} />
          CRM показывает только то, что вернул поставщик. Если API нет — услуга помечается «ручной запрос».
        </div>
      </div>

      {groups.map((g) => {
        const items = byGroup(g.key);
        if (!items.length) return null;
        return (
          <div key={g.key} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{g.title}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{g.hint}</span>
              <span style={{ fontSize: 12, color: 'var(--muted-2)' }}>· {items.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{items.map(card)}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Справочник доп. услуг для настроек (Блок E) ---------- */
function ExtrasCatalogModal({ open, onClose }) {
  const toast = useToast();
  if (!open) return null;
  return (
    <Drawer open={open} onClose={onClose} title="Справочник дополнительных услуг" sub="Отображение и правила услуг. Доступность определяется API поставщика, а не справочником." width="min(900px, 96vw)"
      footer={<>
        <Button variant="secondary" icon="plus" onClick={() => toast('Добавление услуги в справочник', 'info')}>Добавить услугу</Button>
        <Button variant="primary" onClick={onClose}>Закрыть</Button>
      </>}>
        <div className="table-card">
          <table className="tbl">
            <thead><tr><th>Услуга</th><th>Категория</th><th>Этапы доступности</th><th>EMD</th><th>Вручную</th><th>Сбор</th></tr></thead>
            <tbody>
              {EXTRA_SVC_CATALOG.map((x) => (
                <tr key={x.id}>
                  <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon name={x.icon} style={{ width: 16, height: 16, color: 'var(--blue)' }} />{x.name}</span></td>
                  <td>{x.category}</td>
                  <td className="t-muted" style={{ fontSize: 12.5 }}>{x.stages.join(', ')}</td>
                  <td>{x.emd ? <Pill tone="teal">EMD</Pill> : <span className="t-muted">—</span>}</td>
                  <td>{x.manual ? 'Да' : 'Нет'}</td>
                  <td>{x.fee ? (x.feeName || 'Сбор') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </Drawer>
  );
}

Object.assign(window, { OrderResponsiblesTab, DynamicExtrasPanel, ExtrasCatalogModal, operatorsForKind, ensureResponsibles });
