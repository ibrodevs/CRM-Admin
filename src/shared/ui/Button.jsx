import { translate } from '../preferences/translations.js';
import { Icon } from '../icons/index.jsx';

const BTN_OWN_PROPS = { variant: 1, size: 1, icon: 1, iconRight: 1, children: 1, className: 1 };

function Button(props) {
  const variant = props.variant || 'primary';
  const { size, icon, iconRight } = props;
  const resolvedSize = ['sm', 'lg', 'field'].includes(size) ? size : 'md';
  const iconOnly = (props.children == null || props.children === false || props.children === '') && Boolean(icon || iconRight);
  const cls = ['btn', 'btn-' + variant, resolvedSize !== 'md' ? 'btn-' + resolvedSize : '', iconOnly ? 'btn-icon' : '', props.className || '']
    .filter(Boolean).join(' ');
  const rest = {};
  for (const k in props) if (!BTN_OWN_PROPS[k]) rest[k] = props[k];
  return (
    <button {...rest} className={cls} data-ui-button="true" data-size={resolvedSize} data-variant={variant}>
      {icon && <Icon name={icon} />}
      {typeof props.children === 'string' ? translate(props.children) : props.children}
      {iconRight && <Icon name={iconRight} />}
    </button>
  );
}

export { BTN_OWN_PROPS, Button };
