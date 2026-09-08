import { translate } from '../preferences/translations.js';


function Topbar({ title, sub, children }) {
  return (
    <div className="topbar">
      <div style={{ minWidth: 0 }}>
        <h1 className="page-title">{translate(title)}</h1>
        {sub && <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4, fontWeight: 500 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

export { Topbar };
