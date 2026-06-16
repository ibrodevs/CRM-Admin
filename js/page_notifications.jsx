// ===== Уведомления: центр управления вниманием + лента активности =====

// link.type / source → конкретная вкладка карточки заказа (deep-link в контекст записи, а не в раздел)
const NOTIF_TAB = { finance: 'finance', documents: 'documents', offers: 'offers', returns: 'aftersale', order: 'overview' };
function notifGo(n, onNavigate, onOpenOrder) {
  const tab = n.source === 'Чаты' ? 'chat' : (NOTIF_TAB[n.link.type] || 'overview');
  if (n.order && onOpenOrder) {
    const o = ORDERS.find((x) => x.no === n.order) || { no: n.order, client: n.title, requestType: 'Индивидуальная', status: 'В работе', operator: n.resp, date: '15.06.25' };
    onOpenOrder(o, tab);
  } else onNavigate && onNavigate(n.link.type);
}

/* ---------- one notification row ---------- */
function NotificationRow({ n, onAct, onRead, onPin, onDismiss }) {
  const src = NOTIF_SOURCE[n.source] || NOTIF_SOURCE['Система'];
  return (
    <div className={'ntf p-' + n.priority + (n.read ? '' : ' unread')}>
      <span className="ntf-ic" style={{ background: src.color }}><Icon name={src.icon} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="ntf-title">{!n.read && <span className="ntf-unread-dot" />}{n.title}</div>
        <div className="ntf-desc">{n.desc}</div>
        <div className="ntf-meta">
          <Pill tone={NOTIF_PRIORITY[n.priority]}>{n.priority}</Pill>
          <span>·</span><span>{n.source}</span>
          {n.order && <span className="link-chip" onClick={() => onAct(n)} style={{ padding: '3px 8px' }}><Icon name="orders" />№ {n.order}</span>}
          <span>·</span><span>{n.resp}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flex: '0 0 auto' }}>
        <span className="ntf-time">{n.time} назад</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {n.act && <Button size="sm" iconRight="arrowRight" onClick={() => onAct(n)}>{n.act}</Button>}
          <button className={'icon-btn' + (n.pinned ? ' green' : '')} title="Закрепить" onClick={() => onPin(n.id)}><Icon name="star" /></button>
          <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
            items={[
              { icon: n.read ? 'eyeOff' : 'check', label: n.read ? 'Отметить непрочитанным' : 'Отметить прочитанным', onClick: () => onRead(n.id) },
              { icon: 'star', label: n.pinned ? 'Открепить' : 'Закрепить', onClick: () => onPin(n.id) },
              { sep: true }, { icon: 'x', label: 'Закрыть', danger: true, onClick: () => onDismiss(n.id) },
            ]} />
        </div>
      </div>
    </div>
  );
}

/* ---------- settings drawer ---------- */
function NotifSettingsDrawer({ open, settings, setSettings, onClose }) {
  return (
    <Drawer open={open} onClose={onClose} title="Настройки уведомлений"
      footer={<Button className="btn-block" onClick={onClose}>Готово</Button>}>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 0 }}>Выберите, какие события показывать в центре уведомлений и ленте.</p>
      {settings.map((s, i) => (
        <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0', borderBottom: i < settings.length - 1 ? '1px solid var(--line)' : 'none' }}>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 600, color: 'var(--ink)' }}>{s.label}</div><div style={{ fontSize: 13, color: 'var(--muted)' }}>{s.desc}</div></div>
          <Toggle on={s.on} onChange={(v) => setSettings((cur) => cur.map((x) => x.key === s.key ? { ...x, on: v } : x))} />
        </div>
      ))}
    </Drawer>
  );
}

/* ====================================================================
   NOTIFICATIONS CENTER
   ==================================================================== */
function NotificationsCenter({ onNavigate, onOpenOrder }) {
  const toast = useToast();
  const [list, setList] = useState(NOTIFICATIONS);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [fPrio, setFPrio] = useState('');
  const [fSource, setFSource] = useState('');
  const [setOpen, setSetOpen] = useState(false);
  const [settings, setSettings] = useState(NOTIF_SETTINGS);

  const setRead = (id, v) => setList((l) => l.map((n) => n.id === id ? { ...n, read: v != null ? v : !n.read } : n));
  const pin = (id) => setList((l) => l.map((n) => n.id === id ? { ...n, pinned: !n.pinned } : n));
  const dismiss = (id) => { setList((l) => l.filter((n) => n.id !== id)); };
  const act = (n) => { setRead(n.id, true); notifGo(n, onNavigate, onOpenOrder); };

  const actionable = (n) => (n.priority === 'Критический' || n.priority === 'Высокий') && !n.read;
  const tabTest = { all: () => true, unread: (n) => !n.read, pinned: (n) => n.pinned, action: actionable };

  let rows = list.filter((n) => tabTest[tab](n) && (!fPrio || n.priority === fPrio) && (!fSource || n.source === fSource) &&
    (!q || `${n.title} ${n.desc} ${n.order}`.toLowerCase().includes(q.toLowerCase())));
  rows = [...rows].sort((a, b) => (b.pinned - a.pinned) || (NOTIF_PRIO_RANK[a.priority] - NOTIF_PRIO_RANK[b.priority]));

  const STATS = [
    { l: 'Требуют внимания', v: list.filter(actionable).length, tone: 'red' },
    { l: 'Критические', v: list.filter((n) => n.priority === 'Критический').length, tone: 'red' },
    { l: 'Непрочитанные', v: list.filter((n) => !n.read).length },
    { l: 'Закреплённые', v: list.filter((n) => n.pinned).length },
  ];
  const cnt = (t) => list.filter(tabTest[t]).length;
  const TABS = [
    { key: 'all', label: 'Все', count: list.length },
    { key: 'action', label: 'Требуют действия', count: cnt('action') },
    { key: 'unread', label: 'Непрочитанные', count: cnt('unread') },
    { key: 'pinned', label: 'Закреплённые', count: cnt('pinned') },
  ];

  return (
    <div className="fade-in">
      <div className="grid-4" style={{ marginBottom: 22 }}>
        {STATS.map((s) => (<div className="stat-card" key={s.l}><div className="s-label">{s.l}</div><div className="s-value" style={s.tone === 'red' && s.v ? { color: 'var(--red)' } : null}>{s.v}</div></div>))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
        <div style={{ flex: 1 }} />
        <SearchBox value={q} onChange={setQ} placeholder="Поиск уведомления…" style={{ width: 220 }} />
        <FilterChip label="Приоритет" value={fPrio} onChange={setFPrio} options={Object.keys(NOTIF_PRIORITY)} />
        <FilterChip label="Источник" value={fSource} onChange={setFSource} options={Object.keys(NOTIF_SOURCE)} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Button variant="secondary" size="sm" icon="check" onClick={() => { setList((l) => l.map((n) => ({ ...n, read: true }))); toast('Все отмечены прочитанными', 'ok'); }}>Прочитать все</Button>
        <Button variant="secondary" size="sm" icon="trash" onClick={() => { setList((l) => l.filter((n) => !n.read || n.pinned)); toast('Прочитанные закрыты', 'ok'); }}>Закрыть прочитанные</Button>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" size="sm" icon="settings" onClick={() => setSetOpen(true)}>Настройки</Button>
      </div>

      {rows.length ? rows.map((n) => (
        <NotificationRow key={n.id} n={n} onAct={act} onRead={(id) => setRead(id)} onPin={pin} onDismiss={dismiss} />
      )) : <EmptyState icon="bell" title="Здесь пусто" sub="Нет уведомлений по выбранным условиям" />}

      <NotifSettingsDrawer open={setOpen} settings={settings} setSettings={setSettings} onClose={() => setSetOpen(false)} />
    </div>
  );
}

function NotificationsPage({ onNavigate, onOpenOrder }) {
  return (<><Topbar title="Уведомления" /><div className="content"><NotificationsCenter onNavigate={onNavigate} onOpenOrder={onOpenOrder} /></div></>);
}

/* ====================================================================
   ACTIVITY FEED (compact, for Dashboard)
   ==================================================================== */
function ActivityFeed({ onNavigate, onOpenOrder, limit = 6 }) {
  const items = [...NOTIFICATIONS]
    .sort((a, b) => (NOTIF_PRIO_RANK[a.priority] - NOTIF_PRIO_RANK[b.priority]))
    .slice(0, limit);
  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
        <h3 className="card-title" style={{ fontSize: 18 }}>Требует внимания</h3>
        <span className="pill pill-red" style={{ marginLeft: 10 }}>{NOTIFICATIONS.filter((n) => (n.priority === 'Критический' || n.priority === 'Высокий') && !n.read).length}</span>
        <div style={{ flex: 1 }} />
        <button className="link-chip" onClick={() => onNavigate('notifications')}>Все уведомления<Icon name="arrowRight" /></button>
      </div>
      {items.map((n) => {
        const src = NOTIF_SOURCE[n.source] || NOTIF_SOURCE['Система'];
        return (
          <div className="feed-item" key={n.id} onClick={() => notifGo(n, onNavigate, onOpenOrder)}>
            <span className="feed-ic" style={{ background: n.priority === 'Критический' ? 'var(--red)' : src.color }}><Icon name={src.icon} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="feed-t">{n.title}</div>
              <div className="feed-d">{n.desc}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <Pill tone={NOTIF_PRIORITY[n.priority]}>{n.priority}</Pill>
              <span className="ntf-time">{n.time}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { NotificationsCenter, NotificationsPage, ActivityFeed, NotificationRow, NotifSettingsDrawer, notifGo });
