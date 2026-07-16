import { useState, useEffect } from 'react';
import { Icon } from './icons';
import { ActionMenu, Button, Drawer, EmptyState, FilterChip, Pill, SearchBox, Tabs, Toggle, useToast } from './ui';
import { ERR_CATEGORIES, ERR_SEVERITY, ERR_SYSTEMS, INTEGRATION_ERROR_CODES, NOTIFICATIONS, NOTIF_PRIORITY, NOTIF_PRIO_RANK, NOTIF_SETTINGS, NOTIF_SOURCE, ORDERS } from './data';
import { Topbar } from './layout';

// ===== Уведомления: центр управления вниманием + лента активности =====

// link.type / source → конкретная вкладка карточки заказа (deep-link в контекст записи, а не в раздел)
const NOTIF_TAB = { finance: 'finance', documents: 'documents', offers: 'offers', returns: 'aftersale', order: 'overview' };
function notifGo(n, onNavigate, onOpenOrder) {
  // если уведомление привязано к конкретной услуге — открываем именно её карточку, а не весь список услуг
  const svc = n.link && n.link.svc;
  const tab = n.source === 'Чаты' ? 'chat' : (svc ? 'services' : (NOTIF_TAB[n.link.type] || 'overview'));
  if (n.order && onOpenOrder) {
    const o = ORDERS.find((x) => x.no === n.order) || { no: n.order, client: n.title, requestType: 'Индивидуальная', status: 'В работе', operator: n.resp, date: '15.06.25' };
    onOpenOrder(o, tab, svc || null);
  } else onNavigate && onNavigate(n.link.type);
}

/* ---------- one notification row ---------- */
function NotificationRow({ n, onAct, onRead, onPin, onDismiss, onOpenCode }) {
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
          {n.errCode && <span className="link-chip" title="Открыть код ошибки" onClick={() => onOpenCode && onOpenCode(n.errCode)} style={{ padding: '3px 8px', fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 700 }}><Icon name="api" />{n.errCode}</span>}
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

/* ---------- Справочник кодов ошибок интеграций (drawer) ---------- */
function ErrorCodesDrawer({ open, focusCode, onClose }) {
  const [q, setQ] = useState('');
  const [fSys, setFSys] = useState('');
  const [fCat, setFCat] = useState('');
  useEffect(() => { if (open) { setQ(focusCode || ''); setFSys(''); setFCat(''); } }, [open, focusCode]);
  if (!open) return null;
  const rows = INTEGRATION_ERROR_CODES.filter((e) =>
    (!fSys || e.system === fSys) && (!fCat || e.category === fCat) &&
    (!q || `${e.code} ${e.title} ${e.desc} ${e.system} ${e.category}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <Drawer open={open} onClose={onClose} title="Коды ошибок интеграций"
      sub="Сбои API поставщиков и GDS, платёжного шлюза и внутренние ошибки — с расшифровкой и действиями"
      width="min(880px,96vw)"
      footer={<Button className="btn-block" variant="secondary" onClick={onClose}>Закрыть</Button>}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <SearchBox value={q} onChange={setQ} placeholder="Код, система, описание…" style={{ width: 240 }} />
        <FilterChip label="Система" value={fSys} onChange={setFSys} options={ERR_SYSTEMS} />
        <FilterChip label="Категория" value={fCat} onChange={setFCat} options={ERR_CATEGORIES} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((e) => (
          <div key={e.code} className="card card-pad" style={{ borderLeft: '3px solid var(--' + (ERR_SEVERITY[e.severity] || 'muted') + ')' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <code style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 700, fontSize: 13, background: 'var(--surface-2)', padding: '3px 9px', borderRadius: 6, color: 'var(--ink)' }}>{e.code}</code>
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{e.title}</span>
              <div style={{ flex: 1 }} />
              <Pill tone={ERR_SEVERITY[e.severity]}>{e.severity}</Pill>
            </div>
            <div style={{ display: 'flex', gap: 8, margin: '9px 0', flexWrap: 'wrap' }}>
              <Pill tone="gray">{e.system}</Pill><Pill tone="gray">{e.category}</Pill>
            </div>
            <div style={{ fontSize: 13, color: 'var(--body)', marginBottom: 8 }}>{e.desc}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
              <Icon name="check" style={{ width: 16, height: 16, color: 'var(--green)', flexShrink: 0, marginTop: 2 }} />
              <span><b style={{ color: 'var(--ink)' }}>Что делать:</b> {e.resolution}</span>
            </div>
          </div>
        ))}
        {!rows.length && <EmptyState icon="search" title="Код не найден" sub="Измените запрос или сбросьте фильтры" />}
      </div>
    </Drawer>
  );
}

/* ====================================================================
   NOTIFICATIONS CENTER
   ==================================================================== */
function NotificationsCenter({ onNavigate, onOpenOrder, compact }) {
  const toast = useToast();
  const [list, setList] = useState(NOTIFICATIONS);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [fPrio, setFPrio] = useState('');
  const [fSource, setFSource] = useState('');
  const [setOpen, setSetOpen] = useState(false);
  const [settings, setSettings] = useState(NOTIF_SETTINGS);
  const [errOpen, setErrOpen] = useState(null); // null | '' | '<code>' — открыт справочник кодов ошибок

  const setRead = (id, v) => setList((l) => l.map((n) => n.id === id ? { ...n, read: v != null ? v : !n.read } : n));
  const pin = (id) => setList((l) => l.map((n) => n.id === id ? { ...n, pinned: !n.pinned } : n));
  const dismiss = (id) => { setList((l) => l.filter((n) => n.id !== id)); };
  const openCode = (code) => setErrOpen(code || '');
  const act = (n) => { setRead(n.id, true); if (n.errCode && !n.order) { openCode(n.errCode); return; } notifGo(n, onNavigate, onOpenOrder); };

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
      {/* Крупные счётчики — только на полной странице; в боковой панели градация видна по вкладкам и приоритетам строк */}
      {!compact && (
        <div className="grid-4" style={{ marginBottom: 22 }}>
          {STATS.map((s) => (<div className="stat-card" key={s.l}><div className="s-label">{s.l}</div><div className="s-value" style={s.tone === 'red' && s.v ? { color: 'var(--red)' } : null}>{s.v}</div></div>))}
        </div>
      )}

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
        <Button variant="secondary" size="sm" icon="api" onClick={() => openCode('')}>Коды ошибок</Button>
        <Button variant="secondary" size="sm" icon="settings" onClick={() => setSetOpen(true)}>Настройки</Button>
      </div>

      {rows.length ? rows.map((n) => (
        <NotificationRow key={n.id} n={n} onAct={act} onRead={(id) => setRead(id)} onPin={pin} onDismiss={dismiss} onOpenCode={openCode} />
      )) : <EmptyState icon="bell" title="Здесь пусто" sub="Нет уведомлений по выбранным условиям" />}

      <NotifSettingsDrawer open={setOpen} settings={settings} setSettings={setSettings} onClose={() => setSetOpen(false)} />
      <ErrorCodesDrawer open={errOpen !== null} focusCode={errOpen} onClose={() => setErrOpen(null)} />
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

Object.assign(window, { NotificationsCenter, NotificationsPage, ActivityFeed, NotificationRow, NotifSettingsDrawer, ErrorCodesDrawer, notifGo });



export { NOTIF_TAB, notifGo, NotificationRow, NotifSettingsDrawer, ErrorCodesDrawer, NotificationsCenter, NotificationsPage, ActivityFeed };
