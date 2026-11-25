import { Icon } from '../icons/index.jsx';

function SearchBox({ value, onChange, placeholder = 'Поиск', style, className = '', inputRef, ...inputProps }) {
  return (
    <div className={'search' + (className ? ' ' + className : '')} style={style}>
      <Icon name="search" />
      <input ref={inputRef} type="search" name="registry-search-query" autoComplete="off" data-1p-ignore="true" data-lpignore="true" {...inputProps} aria-label={inputProps['aria-label'] || placeholder} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export { SearchBox };
