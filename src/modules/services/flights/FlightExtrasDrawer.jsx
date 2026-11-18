import { StackPanel } from '../../locations/index.js';
import { Button } from '../../../shared/ui/Button.jsx';
import { Icon } from '../../../shared/icons/index.jsx';
import { flightExtrasStatus } from './flight-extras.js';

export function FlightExtrasPreview({ offer, onOpen }) {
  const status = flightExtrasStatus(offer);
  return <section className="flight-extras-preview" aria-label="Доступность дополнительных услуг">
    <div className="flight-extras-preview-icon"><Icon name="briefcase" /></div>
    <div><h4>Дополнительные услуги</h4><strong>{status.title}</strong><p>{status.baggageLabel}. Багаж, места, питание и другие допуслуги не добавлены.</p></div>
    <Button variant="secondary" size="sm" iconRight="chevRight" onClick={onOpen}>Подробнее</Button>
  </section>;
}

export function FlightExtrasContent({ offer, passengerCount, onRules }) {
  const status = flightExtrasStatus(offer);
  const fare = offer?.backendOffer?.fare || {};
  const fareName = String(fare.name || fare.brand || offer?.fareName || '');
  const showClass = fare.booking_class && !fareName.toLocaleLowerCase('ru').includes(`класс ${String(fare.booking_class).toLocaleLowerCase('ru')}`);
  const route = (offer?.itinerary?.segments || []).map((segment) => `${segment.origin} → ${segment.destination}`).join(' · ');
  return <div className="flight-extras-content">
    <section className="flight-extras-context" aria-label="Выбранный перелёт">
      <span className="flight-extras-eyebrow">Выбранный перелёт</span><h4>{route || 'Маршрут не указан'}</h4>
      <p>{[fareName, showClass ? `Класс ${fare.booking_class}` : '', `Пассажиров: ${passengerCount}`].filter(Boolean).join(' · ')}</p>
      <div className="flight-extras-segments">{(offer?.itinerary?.segments || []).map((segment, i) => <span key={i}>{[segment.airline, segment.flight_number].filter(Boolean).join(' ')}{segment.departure ? ` · ${new Date(segment.departure).toLocaleDateString('ru-RU')}` : ''}</span>)}</div>
    </section>
    <section className="flight-extras-status" role="status"><Icon name="alertCircle" /><div><h4>{status.title}</h4><p>{status.description}</p><p>Бронирование билета само по себе не гарантирует, что допуслуги станут доступны.</p></div></section>
    <section className="flight-extras-included"><div><h4>Условия выбранного тарифа</h4><p>{status.baggageLabel}</p><span>Включённые услуги входят в стоимость тарифа. Дополнительный багаж — отдельная услуга.</span></div><button type="button" className="flight-fare-rules-link" onClick={onRules}>Условия тарифа<Icon name="chevRight" /></button></section>
    <section aria-label="Доступность по категориям"><div className="flight-fare-section-head"><h4>Дополнительные услуги по категориям</h4></div><div className="flight-extras-categories">{status.categories.map((category) => <div className="flight-extras-category" key={category.key}><Icon name={category.icon} /><div><h5>{category.label}</h5><p>{category.description}</p></div><span>Выбор недоступен</span></div>)}</div></section>
    <p className="flight-extras-next">Если нужен другой багаж, вернитесь к тарифам и сравните включённые условия. Дополнительные услуги здесь не бронируются и не оплачиваются.</p>
  </div>;
}

export function FlightExtrasDrawer({ offer, passengerCount, onClose, onRules, onBackToFares }) {
  return <StackPanel title="Дополнительные услуги" width="min(760px,96vw)" className="free-booking flight-extras-drawer" closeOnBackdrop onClose={onClose} footer={<><div className="flight-extras-footer-note"><strong>Допуслуги не добавлены</strong><span>Стоимость допуслуг не рассчитана</span></div><Button variant="secondary" icon="chevLeft" onClick={onBackToFares}>К тарифам</Button></>}>
    <FlightExtrasContent offer={offer} passengerCount={passengerCount} onRules={onRules} />
  </StackPanel>;
}
