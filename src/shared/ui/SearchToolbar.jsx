export function SearchToolbar({ children, label = 'Поиск и фильтры', className = '' }) {
  return <div className={'workspace-search-toolbar' + (className ? ' ' + className : '')} aria-label={label}>{children}</div>;
}
