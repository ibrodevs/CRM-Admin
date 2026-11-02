import { Icon } from '../icons/index.jsx';

function SearchBox({ value, onChange, placeholder = 'Поиск', style, className = '', ...inputProps }) {
  return (
    <div className={'search' + (className ? ' ' + className : '')} style={style}>
      <Icon name="search" />
      <input {...inputProps} aria-label={inputProps['aria-label'] || placeholder} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export { SearchBox };
