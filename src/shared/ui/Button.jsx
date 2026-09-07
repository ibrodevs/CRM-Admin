import { Icon } from '../icons/index.jsx';

const BTN_OWN_PROPS = { variant: 1, size: 1, icon: 1, iconRight: 1, children: 1, className: 1 };

function Button(props) {
  const variant = props.variant || 'primary';
  const { size, icon, iconRight } = props;
  const cls = ['btn', 'btn-' + variant, size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '', props.className || '']
    .filter(Boolean).join(' ');
  const rest = {};
  for (const k in props) if (!BTN_OWN_PROPS[k]) rest[k] = props[k];
  return (
    <button {...rest} className={cls}>
      {icon && <Icon name={icon} />}
      {props.children}
      {iconRight && <Icon name={iconRight} />}
    </button>
  );
}

export { BTN_OWN_PROPS, Button };
