import { Icon } from '../icons/index.jsx';

export function BookingAction({ icon, title, sub, onClick, danger = false, disabled = false }) {
  return <button type="button" className={'flight-booking-action' + (danger ? ' danger' : '')} onClick={onClick} disabled={disabled}>
    <span className="flight-booking-action-icon"><Icon name={icon} /></span>
    <span><strong>{title}</strong><small>{sub}</small></span>
    <Icon name="chevRight" />
  </button>;
}
