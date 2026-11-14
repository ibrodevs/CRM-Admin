import { Icon } from '../icons/index.jsx';

// Reference totals stay available on demand instead of occupying a row of cards.
export function RegistryStats({ children }) {
  return <details className="registry-stats">
    <summary><Icon name="pie" /><span>Сводка по разделу</span><Icon name="chevDown" /></summary>
    <div className="registry-stats-content">{children}</div>
  </details>;
}
