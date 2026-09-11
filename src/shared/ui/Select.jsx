import { translate } from '../preferences/translations.js';


function Select(props) {
  const { options, error, placeholder, className } = props;
  const rest = {};
  for (const k in props) { if (k !== 'options' && k !== 'error' && k !== 'placeholder' && k !== 'className') rest[k] = props[k]; }
  // className дописывается к базовому классу: если его передать через rest,
  // он затрёт 'select' и поле останется без стилей.
  return (
    <select className={'select' + (error ? ' err' : '') + (className ? ' ' + className : '')} {...rest}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.value;
        const lab = typeof o === 'string' ? o : o.label;
        return <option key={val} value={val}>{translate(lab)}</option>;
      })}
    </select>
  );
}

export { Select };
