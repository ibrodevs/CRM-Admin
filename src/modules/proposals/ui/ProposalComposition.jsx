import { Button } from '../../../shared/ui/Button.jsx';
import { kpMoney } from '../model/interactive.js';
import { compositionRows } from '../model/workspace-presentation.js';
export function ProposalComposition({ items, currency, onEdit, onRemove }) {
  const rows = compositionRows(items);
  if (!rows.length) return null;
  return <details className="kp-composition" open><summary>Состав КП <span className="kp-kind">{rows.length}</span></summary><div>{rows.map(item => <div className="kp-composition-row" key={item.id}><div className="kp-composition-content"><span className="kp-muted">{item.label}</span><strong title={item.title}>{item.title}</strong>{item.brief && <small>{item.brief}</small>}{item.description && <details><summary>Условия и маршрут</summary><p className="kp-description">{item.description}</p></details>}</div><b>{item.hasPrice ? kpMoney(item.price, currency) : 'Цена не указана'}</b><div className="kp-inline-actions">{onEdit && <Button variant="secondary" size="sm" onClick={() => onEdit(item.id)}>Изменить</Button>}{onRemove && <Button variant="secondary" size="sm" icon="trash" aria-label={`Убрать ${item.title}`} onClick={() => onRemove(item.id)} />}</div></div>)}</div></details>;
}
