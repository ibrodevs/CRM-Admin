import { translate } from '../preferences/translations.js';
import { getDefaultCurrency } from '../lib/money.js';
import { Children, cloneElement, isValidElement, useId } from 'react';
import { Icon } from '../icons/index.jsx';

function normalizedFieldLabel(label) {
  if (typeof label !== 'string') return label;
  const value = label.trim();
  if (/^Стоимость,\s*(?:undefined|null)$/i.test(value)) return `Стоимость, ${getDefaultCurrency()}`;
  return label;
}

function Field({ label, required, hint, error, children }) {
  const id = useId();
  const safeLabel = normalizedFieldLabel(label);
  const controls = Children.map(children, (child) => isValidElement(child) && (typeof child.type !== 'string' || ['input', 'select', 'textarea'].includes(child.type)) ? cloneElement(child, { id: child.props.id || id, 'aria-label': child.props['aria-label'] || (typeof safeLabel === 'string' ? safeLabel : undefined) }) : child);
  return (
    <div className="field">
      {safeLabel && <label className="label" htmlFor={id}>{translate(safeLabel)}{required && <span className="req"> *</span>}</label>}
      {hint && <div className="hint">{hint}</div>}
      {controls}
      {error && <div className="err-text"><Icon name="alertCircle" style={{ width: 14, height: 14 }} />{error}</div>}
    </div>
  );
}

export { Field };
