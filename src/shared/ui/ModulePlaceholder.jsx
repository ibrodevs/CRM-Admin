import { Icon } from '../icons/index.jsx';
import { Topbar } from './Topbar.jsx';

function ModulePlaceholder({ title, icon = 'inbox', planned = [] }) {
  return (
    <>
      <Topbar title={title} />
      <div className="content">
        <div className="card card-pad fade-in" style={{ maxWidth: 720, margin: '40px auto', textAlign: 'center', padding: '48px 40px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--blue-soft)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <Icon name={icon} style={{ width: 30, height: 30 }} />
          </div>
          <h2 className="card-title" style={{ marginBottom: 8 }}>Модуль «{title}»</h2>
          <p style={{ color: 'var(--muted)', fontSize: 15, margin: '0 0 22px' }}>
            Спроектирован в дизайн-системе и запланирован к реализации в следующей фазе.
          </p>
          {planned.length > 0 && (
            <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
              {planned.map((p) => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--body)', fontSize: 14 }}>
                  <Icon name="check" style={{ width: 18, height: 18, color: 'var(--green)' }} />{p}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export { ModulePlaceholder };
