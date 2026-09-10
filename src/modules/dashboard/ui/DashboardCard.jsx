import { Button } from '../../../shared/ui/Button.jsx';
import { Icon } from '../../../shared/icons/index.jsx';

const TONE_VAR = { red: 'var(--red)', amber: 'var(--amber)', green: 'var(--green)', teal: 'var(--teal)', gray: 'var(--muted-2)', blue: 'var(--blue)' };
const TONE_SOFT = { red: 'var(--red-bg)', amber: 'var(--amber-bg)', green: 'var(--green-bg)', teal: 'var(--teal-bg)', gray: 'var(--gray-bg)', blue: 'var(--blue-soft)' };

function dashToneColor(tone) { return TONE_VAR[tone] || TONE_VAR.blue; }
function dashToneSoft(tone) { return TONE_SOFT[tone] || TONE_SOFT.blue; }

// Shared shell for every block of the dashboard: title, optional counter, one header action.
function DashboardCard({ title, badge, action, footer, className = '', bodyClassName = '', children }) {
  return (
    <section className={'card dsh-card ' + className}>
      <header className="dsh-card-head">
        <h2 className="dsh-card-title">{title}</h2>
        {badge}
        <span className="dsh-spacer" />
        {action}
      </header>
      <div className={'dsh-card-body ' + bodyClassName}>{children}</div>
      {footer && <footer className="dsh-card-foot">{footer}</footer>}
    </section>
  );
}

function DashboardSkeleton({ rows = 4, height = 54 }) {
  return (
    <div className="dsh-skeleton">
      {Array.from({ length: rows }).map((_, index) => <div key={index} className="sk" style={{ height }} />)}
    </div>
  );
}

function DashboardEmpty({ title = 'Нет данных', icon = 'check', tone = 'green' }) {
  return (
    <div className="dsh-empty">
      <span className="dsh-empty-ic" style={{ background: dashToneSoft(tone), color: dashToneColor(tone) }}>
        <Icon name={icon} />
      </span>
      <span>{title}</span>
    </div>
  );
}

function DashboardError({ title = 'Не удалось загрузить данные', sub, onRetry }) {
  return (
    <div className="dsh-empty">
      <span className="dsh-empty-ic" style={{ background: dashToneSoft('red'), color: dashToneColor('red') }}>
        <Icon name="alertCircle" />
      </span>
      <span>
        <span style={{ display: 'block', color: 'var(--ink)', fontWeight: 600 }}>{title}</span>
        {sub && <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{sub}</span>}
      </span>
      {onRetry && <Button variant="secondary" size="sm" icon="loader" onClick={onRetry}>Повторить</Button>}
    </div>
  );
}

export { DashboardCard, DashboardEmpty, DashboardError, DashboardSkeleton, dashToneColor, dashToneSoft };
