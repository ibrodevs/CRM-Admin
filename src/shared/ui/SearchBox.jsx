import { Icon } from '../icons/index.jsx';

function SearchBox({ value, onChange, placeholder = 'Поиск', style }) {
  return (
    <div className="search" style={style}>
      <Icon name="search" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export { SearchBox };
