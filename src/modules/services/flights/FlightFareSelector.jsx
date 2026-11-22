import { useEffect, useState } from 'react';
import { Button } from '../../../shared/ui/Button.jsx';
import { Icon } from '../../../shared/icons/index.jsx';
import { currencySymbol } from '../../../shared/lib/money.js';

const PAGE_SIZE = 6;
const price = (amount, currency) => `${Number(amount).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${currencySymbol(currency)}`;

export function FlightFareSelector({ classes, classCode, cabin, tiers, selectedId, currency, passengerCount, onClassChange, onSelect, onInspect }) {
  const [page, setPage] = useState(0);
  const ordered = [...tiers].sort((a, b) => (a.offer.fare + a.offer.fee) - (b.offer.fare + b.offer.fee));
  const selectedIndex = ordered.findIndex((tier) => tier.id === selectedId);
  useEffect(() => { setPage(Math.max(0, Math.floor(selectedIndex / PAGE_SIZE))); }, [selectedId, selectedIndex, classCode]);
  const pageCount = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const shown = ordered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  return <div className="flight-fare-selector">
    <section className="flight-fare-section" aria-label="Класс бронирования">
      <div className="flight-fare-section-head"><h4>Класс бронирования</h4><span>{classes.length === 1 ? 'Доступен один класс' : `Доступно классов: ${classes.length}`}</span></div>
      <div className="fare-class-grid" role="group" aria-label="Выберите класс бронирования">
        {classes.map((item) => <button type="button" key={item.code} className={`flight-fare-class${classCode === item.code ? ' selected' : ''}`} aria-pressed={classCode === item.code} onClick={() => onClassChange(item.code)}>
          <span className="flight-fare-class-code">{item.code}</span><span><strong>{item.cabin}</strong>{item.seatsLeft != null && <small>Мест: {item.seatsLeft}</small>}</span>{classCode === item.code && <Icon name="check" />}
        </button>)}
      </div>
    </section>
    <section className="flight-fare-section" aria-label="Тарифы перелёта">
      <div className="flight-fare-section-head"><div><h4>Выберите тариф</h4><p>{cabin} · класс {classCode} · пассажиров: {passengerCount}</p></div><span>Тарифов: {ordered.length}</span></div>
      <p className="flight-fare-caption">Полная стоимость за всех пассажиров и все сегменты маршрута.</p>
      <div className="flight-fare-grid">
        {shown.map((tier, index) => {
          const selected = tier.id === selectedId;
          const duplicateName = ordered.filter((item) => item.name === tier.name).length > 1;
          return <article key={tier.id} className={`flight-fare-option${selected ? ' selected' : ''}`} aria-label={`${tier.name}, ${price(tier.offer.fare + tier.offer.fee, currency)}`}>
            <div className="flight-fare-option-info">
              <div className="flight-fare-option-head"><h5>{tier.name || `Класс ${classCode}`}</h5>{duplicateName && <span>Вариант {currentPage * PAGE_SIZE + index + 1}</span>}{tier.recommended && !selected && <span className="flight-fare-selected">Рекомендуем</span>}</div>
              <span className={`flight-fare-choice${selected ? ' checked' : ''}`} aria-hidden="true">{selected && <Icon name="check" />}</span>
            </div>
            <div className="flight-fare-option-cost"><div className="flight-fare-option-price">{price(tier.offer.fare + tier.offer.fee, currency)}</div><div className="flight-fare-option-delta">{tier.delta === 0 ? 'Исходная цена' : `${tier.delta > 0 ? '+' : '−'} ${price(Math.abs(tier.delta), currency)} к исходной цене`}</div></div>
            <dl className="flight-fare-conditions">{(tier.rules?.length ? tier.rules : [
              { k: 'Багаж', icon: 'luggage' }, { k: 'Ручная кладь', icon: 'briefcase' }, { k: 'Возврат', icon: 'refund' }, { k: 'Обмен', icon: 'swap' },
            ]).map((rule) => <div key={rule.k} className={`flight-fare-condition ${rule.tone || 'unknown'}`}>
              <Icon name={rule.icon || 'ticket'} />
              <div><dt>{rule.k}</dt><dd>{rule.segments ? rule.segments.map((segment, i) => <span key={i} className="flight-fare-condition-segment">{segment.route && <span>{segment.route}: </span>}{segment.v}</span>) : rule.v || 'Не указано'}</dd></div>
            </div>)}</dl>
            <div className="flight-fare-option-actions"><button type="button" className="flight-fare-rules-link" onClick={() => onInspect(tier)}>Условия тарифа<Icon name="chevRight" /></button><Button size="sm" variant={selected ? 'secondary' : 'primary'} icon={selected ? 'check' : undefined} aria-pressed={selected} onClick={() => onSelect(tier.id)}>{selected ? 'Выбран' : 'Выбрать тариф'}</Button></div>
          </article>;
        })}
      </div>
      {pageCount > 1 && <nav className="flight-fare-pagination" aria-label="Страницы тарифов"><span>{currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, ordered.length)} из {ordered.length}</span><div><Button size="sm" variant="secondary" disabled={currentPage === 0} aria-label="Предыдущие тарифы" onClick={() => setPage(currentPage - 1)} icon="chevLeft" /><span>{currentPage + 1} / {pageCount}</span><Button size="sm" variant="secondary" disabled={currentPage === pageCount - 1} aria-label="Следующие тарифы" onClick={() => setPage(currentPage + 1)} icon="chevRight" /></div></nav>}
    </section>
  </div>;
}
