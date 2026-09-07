import { Icon } from '../icons/index.jsx';

const PILL_TONE = {
  green: 'pill-green', red: 'pill-red', teal: 'pill-teal',
  amber: 'pill-amber', blue: 'pill-blue', gray: 'pill-gray',
};

function Pill({ tone = 'gray', children }) {
  return <span className={'pill ' + (PILL_TONE[tone] || 'pill-gray')}>{children}</span>;
}

function TimeLimitBadge({ tone = 'red', icon = 'clock', children }) {
  return (
    <span className={'pill ' + (PILL_TONE[tone] || 'pill-red')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <Icon name={icon} style={{ width: 14, height: 14 }} />{children}
    </span>
  );
}

export { PILL_TONE, Pill, TimeLimitBadge };
