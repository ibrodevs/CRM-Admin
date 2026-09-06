import { Icon } from '../icons/index';

function Checkbox({ on, onChange, style }) {
  return (
    <button type="button" className={'checkbox' + (on ? ' on' : '')} style={style} onClick={() => onChange(!on)}>
      {on && <Icon name="check" strokeWidth={3} />}
    </button>
  );
}

export { Checkbox };
