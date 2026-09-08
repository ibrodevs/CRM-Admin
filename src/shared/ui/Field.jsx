import { translate } from '../preferences/translations.js';
import { Children, cloneElement, isValidElement, useId } from 'react';
import { Icon } from '../icons/index.jsx';

function Field({ label, required, hint, error, children }) {
  const id = useId();
  const controls = Children.map(children, (child) => isValidElement(child) && (typeof child.type !== 'string' || ['input', 'select', 'textarea'].includes(child.type)) ? cloneElement(child, { id: child.props.id || id, 'aria-label': child.props['aria-label'] || (typeof label === 'string' ? label : undefined) }) : child);
  return (
    <div className="field">
      {label && <label className="label" htmlFor={id}>{translate(label)}{required && <span className="req"> *</span>}</label>}
      {hint && <div className="hint">{hint}</div>}
      {controls}
      {error && <div className="err-text"><Icon name="alertCircle" style={{ width: 14, height: 14 }} />{error}</div>}
    </div>
  );
}

export { Field };
