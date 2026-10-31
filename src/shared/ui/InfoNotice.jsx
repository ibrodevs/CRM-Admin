import { Icon } from '../icons/index.jsx';

export function InfoNotice({ children, icon = 'alertCircle', title, tone = 'info', role = 'note', className = '', style }) {
  return (
    <div className={`info-notice info-notice-${tone}${className ? ` ${className}` : ''}`} role={role} style={style}>
      <Icon name={icon} />
      <div className="info-notice-content">
        {title && <strong className="info-notice-title">{title}</strong>}
        {children}
      </div>
    </div>
  );
}
