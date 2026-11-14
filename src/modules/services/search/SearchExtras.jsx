import { offerSearchExtras, transferSearchExtras } from './search-extras.js';

export function SearchExtras({ items, onToggle, priced = false }) {
  if (!items.length) return null;
  return <section className="search-extras" aria-label="Дополнительные услуги">
    <div className="search-extras-heading"><b>Дополнительные услуги</b><span>{items.filter((row) => row.selected).length} выбрано</span></div>
    <div className="search-extras-list">{items.map((row) => <div className={'search-extra-row' + (row.selected ? ' is-selected' : '')} key={row.id}>
      <div className="search-extra-description">
        {onToggle ? <label><input type="checkbox" checked={row.selected} disabled={row.required} onChange={(event) => onToggle(row.id, event.target.checked)} /><span>{row.label}</span></label> : <strong>{row.label}</strong>}
        <small>{row.quantity > 1 ? `${row.quantity} шт. · ` : ''}{row.required ? 'Для указанных детей' : row.included ? 'Включено в тариф' : priced ? 'Учтено в общей цене' : 'По выбору'}</small>
      </div>
      <strong className="search-extra-price">{row.amount == null ? (priced ? 'Цена не передана' : 'После поиска') : new Intl.NumberFormat('ru-RU', { style: 'currency', currency: row.currency || 'RUB', maximumFractionDigits: 2 }).format(row.amount)}</strong>
    </div>)}</div>
    <p>{priced ? 'Допуслуги показаны отдельно. Итоговая стоимость указана в предложении.' : 'Точную стоимость покажем в каждом предложении после поиска. Бесплатные услуги — 0 ₽.'}</p>
  </section>;
}

export function TransferSearchExtras({ form, set, selectedOnly = false }) {
  const items = transferSearchExtras(form);
  return <SearchExtras items={selectedOnly ? items.filter((row) => row.selected) : items} onToggle={selectedOnly ? undefined : (type, checked) => set('additional_service_types', checked ? [...new Set([...(form.additional_service_types || []), type])] : (form.additional_service_types || []).filter((value) => value !== type))} />;
}

export function OfferSearchExtras({ service }) {
  const items = offerSearchExtras(service);
  return <SearchExtras items={items} priced />;
}
