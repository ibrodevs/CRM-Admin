import { Icon } from '../icons/index.jsx';
import { useState } from 'react';

export function InfoNotice({ children, icon = 'alertCircle', title, tone = 'info', role = 'note', className = '', style, dismissible = false }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed && tone === 'info') return null;
  return (
    <div className={`info-notice info-notice-${tone}${className ? ` ${className}` : ''}`} role={role} style={style}>
      <Icon name={icon} />
      <div className="info-notice-content">
        {title && <strong className="info-notice-title">{title}</strong>}
        {children}
      </div>
      {dismissible && tone === 'info' && <button type="button" className="info-notice-close" aria-label="Закрыть подсказку" title="Закрыть подсказку" onClick={() => setDismissed(true)}><Icon name="x" /></button>}
    </div>
  );
}
