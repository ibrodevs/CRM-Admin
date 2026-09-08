import { translate } from '../preferences/translations.js';


function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button key={t.key} className={'tab' + (value === t.key ? ' active' : '')} onClick={() => onChange(t.key)}>
          {translate(t.label)}
          {t.count != null && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export { Tabs };
