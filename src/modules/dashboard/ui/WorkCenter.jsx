import { Button } from '../../../shared/ui/Button.jsx';
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

function WorkCenter({ tabs, tab, onTabChange, items = [], total = 0, loading, error, onRetry, onOpenAll, onOpenItem, onShowAll, emptyTitle }) {
  const body = () => {
    if (error) return <DashboardError sub={error} onRetry={onRetry} />;
    if (loading) return <DashboardSkeleton rows={4} height={58} />;
    if (!items.length) return <DashboardEmpty title={emptyTitle || 'Задач в этой вкладке нет'} />;
    return <div className="dsh-rows">{items.map((item) => <WorkTaskRow key={item.id} item={item} onClick={onOpenItem ? () => onOpenItem(item) : undefined} />)}</div>;
  };
  return (
    <DashboardCard
      title="Рабочий центр"
      action={<Button variant="ghost" size="sm" iconRight="arrowRight" onClick={onOpenAll}>Все задачи</Button>}
      footer={!loading && !error && total > items.length
        ? <button type="button" className="dsh-more" onClick={onShowAll}>
            <span>Показать все задачи ({total})</span><Icon name="chevRight" />
          </button>
        : null}
    >
      <WorkCenterTabs tabs={tabs} value={tab} onChange={onTabChange} />
      <div className="dsh-work-list">{body()}</div>
    </DashboardCard>
  );
}

export { WorkCenter, WorkCenterTabs, WorkTaskRow };
