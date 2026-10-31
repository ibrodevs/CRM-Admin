import { useState } from 'react';
import { Button } from '../../../shared/ui/Button.jsx';
import { Drawer } from '../../../shared/ui/Overlays.jsx';
import { SearchBox } from '../../../shared/ui/SearchBox.jsx';
import { allWorkItems, filterWorkItems } from '../model/work-items.js';
import { Icon } from '../../../shared/icons/index.jsx';
import { Pill } from '../../../shared/ui/Pill.jsx';
import { DashboardCard, DashboardEmpty, DashboardError, DashboardSkeleton, dashToneColor, dashToneSoft } from './DashboardCard.jsx';

// Reuses the project tab styling (.tabs/.tab/.tab-count) and only adds a tone for critical counters.
function WorkCenterTabs({ tabs = [], value, onChange }) {
  return (
    <div className="tabs dsh-tabs">
      {tabs.map((tab) => (
        <button key={tab.key} type="button" onClick={() => onChange(tab.key)}
          className={'tab' + (value === tab.key ? ' active' : '') + (tab.tone === 'red' && tab.count ? ' is-crit' : '')}>
          {tab.label}
          {tab.count != null && <span className="tab-count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

function WorkTaskRow({ item, onClick }) {
  return (
    <button type="button" className="dsh-row" onClick={onClick} disabled={!onClick}>
      <span className="dsh-row-ic" style={{ background: dashToneSoft(item.tone), color: dashToneColor(item.tone) }}>
        <Icon name={item.icon || 'inbox'} />
      </span>
      <span className="dsh-row-main">
        <span className="dsh-row-title">{item.title}</span>
        {item.sub && <span className="dsh-row-sub">{item.sub}</span>}
      </span>
      {item.right && <span className="dsh-row-right" style={{ color: dashToneColor(item.tone) }}>{item.right}</span>}
      {item.badge && <Pill tone={item.tone}>{item.badge}</Pill>}
      <Icon name="chevRight" className="dsh-row-chev" />
    </button>
  );
}

function WorkCenter({ tabs, tab, onTabChange, items = [], rowsByTab = {}, total = 0, loading, error, onRetry, onOpenItem, emptyTitle }) {
  const [expandedTab, setExpandedTab] = useState(null);
  const [query, setQuery] = useState('');
  const allItems = allWorkItems(rowsByTab);
  const fullTabs = [{ key: 'all', label: 'Все', count: allItems.length }, ...tabs];
  const fullItems = filterWorkItems(expandedTab === 'all' ? allItems : (rowsByTab[expandedTab] || []), query);
  const openList = (key) => { setQuery(''); setExpandedTab(key); };
  const body = () => {
    if (error) return <DashboardError sub={error} onRetry={onRetry} />;
    if (loading) return <DashboardSkeleton rows={4} height={58} />;
    if (!items.length) return <DashboardEmpty title={emptyTitle || 'Задач в этой вкладке нет'} />;
    return <div className="dsh-rows">{items.map((item) => <WorkTaskRow key={item.id} item={item} onClick={onOpenItem ? () => onOpenItem(item) : undefined} />)}</div>;
  };
  return (
    <><DashboardCard
      title="Рабочий центр"
      action={<Button variant="ghost" size="sm" iconRight="arrowRight" onClick={() => openList('all')}>Все задачи</Button>}
      footer={!loading && !error && total > 0
        ? <button type="button" className="dsh-more" onClick={() => openList(tab)}>
            <span>Показать все задачи ({total})</span><Icon name="chevRight" />
          </button>
        : null}
    >
      <WorkCenterTabs tabs={tabs} value={tab} onChange={onTabChange} />
      <div className="dsh-work-list">{body()}</div>
    </DashboardCard>
    <Drawer open={expandedTab !== null} onClose={() => setExpandedTab(null)} title="Все задачи"
      sub="Рабочий центр · заявки, дедлайны и согласования" width="min(920px, 96vw)">
      <WorkCenterTabs tabs={fullTabs} value={expandedTab} onChange={(key) => { setExpandedTab(key); setQuery(''); }} />
      <SearchBox value={query} onChange={setQuery} placeholder="Поиск по задаче, клиенту или номеру заказа"
        style={{ width: '100%', marginBottom: 16 }} />
      {error ? <DashboardError sub={error} onRetry={onRetry} />
        : loading ? <DashboardSkeleton rows={4} height={58} />
        : <>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>Найдено задач: {fullItems.length}</div>
          {fullItems.length ? <div className="dsh-rows">{fullItems.map((item) => (
            <WorkTaskRow key={item.id} item={item} onClick={onOpenItem ? () => {
              setExpandedTab(null);
              onOpenItem(item);
            } : undefined} />
          ))}</div> : <DashboardEmpty title={query.trim() ? 'По вашему запросу задач не найдено' : 'В этой вкладке задач нет'} />}
        </>}
    </Drawer></>
  );
}

export { WorkCenter, WorkCenterTabs, WorkTaskRow };
