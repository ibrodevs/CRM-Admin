'use client';
import { readableServiceTitle } from '../model/presentation.js';
import { Button } from '../../../shared/ui/Button.jsx';
import { KP_KINDS, chooseOption, chosenTotal, kpMoney, kpTime, optionsOf } from '../model/interactive.js';

export function ProposalChoices({ payload, ids, packageId, onChange, disabled = false }) {
  const options = optionsOf(payload);
  const activePackage = payload.packages.find(row => row.id === packageId);
  const totalOnly = Boolean(activePackage?.total_only);
  const toggle = (group, option) => onChange(chooseOption(payload, ids, group.id, option.id), null);
  return <div className="kp-choices">
    {payload.mode !== 'flexible' && <section className="kp-section"><h2>Готовые комплекты</h2><div className="kp-packages">{payload.packages.map(pack => <button type="button" className={`kp-package ${packageId === pack.id ? 'is-selected' : ''}`} aria-pressed={packageId === pack.id} disabled={disabled} key={pack.id} onClick={() => onChange(pack.option_ids, pack.id)}><strong>{pack.title}</strong><span>{pack.option_ids.map(id => readableServiceTitle(options.find(row => row.id === id)?.title)).filter(Boolean).join(' · ')}</span><b>{kpMoney(chosenTotal(payload, pack.option_ids), payload.currency)}</b><span>{packageId === pack.id ? 'Выбран' : 'Выбрать комплект'}</span></button>)}</div></section>}
    {payload.mode === 'both' && <p className="kp-muted">Выберите готовый комплект или соберите поездку из вариантов ниже. Некоторые услуги связаны между собой.</p>}
    {payload.groups.filter(group => group.options.length).map(group => <section className="kp-section" key={group.id}>
      <header className="kp-section-title"><h2>{group.title}</h2><span className="kp-muted">{group.required && payload.mode !== 'packages' ? 'Обязательный раздел' : 'Варианты услуг'}</span></header>
      <div className="kp-option-list">{group.options.map(option => {
        const selected = ids.includes(option.id);
        const changed = option.previous_price != null && Number(option.previous_price) !== Number(option.price);
        return <article className={`kp-option ${selected ? 'is-selected' : ''}`} key={option.id}>
          <div className="kp-option-main"><span className="kp-kind">{KP_KINDS[option.kind] || 'Услуга'}</span><h3>{readableServiceTitle(option.title)}</h3><p className="kp-description">{option.description || 'Условия уточняются оператором'}</p>
            {((option.requires || []).length > 0 || (option.excludes || []).length > 0) && <p className="kp-muted">{(option.requires || []).length > 0 && `Вместе с: ${option.requires.map(id => readableServiceTitle(options.find(row => row.id === id)?.title)).join(', ')}. `}{(option.excludes || []).length > 0 && `Не сочетается: ${option.excludes.map(id => readableServiceTitle(options.find(row => row.id === id)?.title)).join(', ')}.`}</p>}
            <div className="kp-freshness"><span>{option.availability === 'available' ? 'Доступно' : option.availability === 'unavailable' ? 'Недоступно' : 'Наличие требует проверки'}</span><span>{kpTime(option.checked_at)}{option.checked_at ? (option.check_source === 'api' ? ' · поставщик' : ' · оператор') : ''}</span></div>
            {option.check_error && <p className="kp-error">{option.check_error}</p>}
          </div>
          <div className="kp-option-actions">{!totalOnly && <><strong className="kp-price">{kpMoney(option.price, payload.currency)}</strong>{changed && <span className="kp-price-change"><del>{kpMoney(option.previous_price, payload.currency)}</del><span>Разница: {Number(option.price) > Number(option.previous_price) ? '+' : ''}{kpMoney(Number(option.price) - Number(option.previous_price), payload.currency)}</span></span>}</>}
            {payload.mode !== 'packages' && <Button variant={selected ? 'secondary' : 'primary'} size="sm" disabled={disabled || option.availability === 'unavailable'} aria-pressed={selected} onClick={() => toggle(group, option)}>{selected ? 'Выбрано' : 'Выбрать'}</Button>}
            {payload.mode === 'packages' && selected && <span className="kp-kind">В выбранном комплекте</span>}
          </div>
        </article>;
      })}</div>
    </section>)}
  </div>;
}
