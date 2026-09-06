

function Select(props) {
  const { options, error, placeholder } = props;
  const rest = {};
  for (const k in props) { if (k !== 'options' && k !== 'error' && k !== 'placeholder') rest[k] = props[k]; }
  return (
    <select className={'select' + (error ? ' err' : '')} {...rest}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.value;
        const lab = typeof o === 'string' ? o : o.label;
        return <option key={val} value={val}>{lab}</option>;
      })}
    </select>
  );
}

export { Select };
