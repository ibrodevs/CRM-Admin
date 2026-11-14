import { Children, cloneElement, isValidElement } from 'react';
import { SearchBox } from './SearchBox.jsx';

// Registry filters always precede a separate, consistently sized search field.
export function SearchToolbar({ children, label = 'Поиск и фильтры', className = '', style }) {
  const items = Children.toArray(children);
  const searches = items.filter((child) => isValidElement(child) && child.type === SearchBox);
  const controls = items.filter((child) => !searches.includes(child) && !(isValidElement(child) && child.type === 'div' && !child.props.children && (child.props.className === 'topbar-spacer' || child.props.style?.flex === 1)));
  return <div className={'workspace-search-toolbar' + (className ? ' ' + className : '')} role="search" aria-label={label} style={{ marginBottom: style?.marginBottom }}>
    <div className="workspace-search-controls">{controls}</div>
    <div className="workspace-search-query">{searches.map((child) => cloneElement(child, { style: { ...child.props.style, width: '100%', maxWidth: '100%', minWidth: 0, flex: undefined, marginBottom: 0 } }))}</div>
  </div>;
}
