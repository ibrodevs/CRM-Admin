import { StackPanel } from '../../locations/index.js';
import { Button } from '../../../shared/ui/Button.jsx';
import { Icon } from '../../../shared/icons/index.jsx';
import { formatMoney } from '../../../shared/lib/money.js';
import { fareRuleSections } from './fare-rules.js';

export function FlightFareRulesPanel({ fare, route, rules, loading, error, onRetry, onRefreshSearch, onSelect, onClose }) {
  const sections = fareRuleSections(rules);
  return <StackPanel closeOnBackdrop className="free-booking flight-rules-drawer" title="Условия тарифа" width="min(760px,96vw)" onClose={onClose}
    footer={<><Button variant="secondary" onClick={onClose}>К списку тарифов</Button><Button disabled={loading} icon="check" onClick={onSelect}>Выбрать этот тариф</Button></>}>
    <section className="flight-rules-summary"><div><span>Выбранный тариф</span><h4>{fare.name}</h4>{route && <p>{route}</p>}</div><div><strong>{formatMoney(fare.offer.fare + fare.offer.fee, fare.offer.currency)}</strong><span>За всех пассажиров и весь маршрут</span>{fare.priceChanged && <p role="status">Цена обновлена при перепроверке</p>}</div></section>
    {fare.features?.length > 0 && <div className="flight-rules-features">{fare.features.map((feature, i) => <span key={i}><Icon name={feature.ok ? 'check' : 'alertCircle'} />{feature.text}</span>)}</div>}
    {loading ? <div className="flight-rules-state" role="status"><Icon name="clock" /><div><h4>Уточняем условия тарифа</h4><p>При необходимости перепроверим предложение, затем загрузим правила поставщика.</p></div></div>
      : error ? <div className="flight-rules-state warning" role="alert"><Icon name="alertCircle" /><div><h4>Не удалось загрузить правила</h4><p>{error}</p><p>Повторите запрос или выберите другой тариф. Перед бронированием условия нужно уточнить у поставщика.</p><div className="flight-rules-retry"><Button variant="secondary" size="sm" onClick={onRetry}>Повторить загрузку</Button>{onRefreshSearch && <Button variant="secondary" size="sm" onClick={onRefreshSearch}>Обновить поиск</Button>}</div></div></div>
        : !sections.length ? <div className="flight-rules-state warning" role="status"><Icon name="alertCircle" /><div><h4>Подробные условия не предоставлены</h4><p>Поставщик не вернул правила. Это не означает, что обмен и отмена бесплатны. Повторите запрос или уточните условия до бронирования.</p><div className="flight-rules-retry"><Button variant="secondary" size="sm" onClick={onRetry}>Повторить загрузку</Button>{onRefreshSearch && <Button variant="secondary" size="sm" onClick={onRefreshSearch}>Обновить поиск</Button>}</div></div></div>
          : <div className="flight-rules-sections">{sections.map((section, index) => <section key={index}><h4>{section.title}</h4><p>{section.text}</p></section>)}</div>}
    <p className="flight-rules-note">Выбор тарифа не создаёт бронь. Перед подтверждением в заказе повторно проверяются цена и наличие мест.</p>
  </StackPanel>;
}
