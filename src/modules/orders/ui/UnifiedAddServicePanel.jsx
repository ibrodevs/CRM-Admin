import { Icon } from '../../../shared/icons/index.jsx';
import { Checkbox } from '../../../shared/ui/Checkbox.jsx';
import { AddServicePanel as BaseAddServicePanel } from './OrderCard.jsx';

const MASK_CATEGORIES = [
  { kind: 'Авиа', label: 'Авиабилеты', icon: 'plane' },
  { kind: 'ЖД', label: 'ЖД билеты', icon: 'train' },
  { kind: 'Гостиница', label: 'Отели', icon: 'building' },
  { kind: 'Трансфер', label: 'Трансферы', icon: 'car' },
  { kind: 'Автобус', label: 'Автобус', icon: 'bus' },
  { kind: 'Аэроэкспресс', label: 'Аэроэкспресс', icon: 'zap' },
  { kind: 'Бизнес-зал', label: 'Бизнес-залы', icon: 'lounge' },
  { kind: 'Страховка', label: 'Страховка', icon: 'shield' },
  { kind: 'Доп. услуга', label: 'Доп. услуга', icon: 'briefcase' },
];

const SIDE_MASKS = new Set(['Авиа', 'Страховка', 'Доп. услуга']);

function ServiceMaskSidebar({ kind, aviaParams = {}, setAviaParams }) {
  const patchAvia = (patch) => {
    if (!setAviaParams) return;
    setAviaParams((current) => ({ ...current, ...patch }));
  };

  if (kind === 'Авиа') {
    return (
      <aside className="svc-mask-sidebar" aria-label="Фильтры авиапоиска">
        <div className="svc-mask-sidebar-head"><span>Фильтры</span></div>
        <div className="svc-mask-filter-block">
          <div className="svc-mask-filter-title">Валюта</div>
          <select className="select svc-mask-select" value={aviaParams.currency || 'RUB'} onChange={(event) => patchAvia({ currency: event.target.value })}>
            {['RUB', 'USD', 'EUR', 'KGS'].map((code) => <option key={code} value={code}>{code}</option>)}
          </select>
        </div>
        <div className="svc-mask-filter-block">
          <div className="svc-mask-filter-title">Условия</div>
          <label className="svc-mask-check"><Checkbox on={!!aviaParams.direct} onChange={() => patchAvia({ direct: !aviaParams.direct })} /><span>Только прямые</span></label>
          <label className="svc-mask-check"><Checkbox on={!!aviaParams.baggage} onChange={() => patchAvia({ baggage: !aviaParams.baggage })} /><span>С багажом</span></label>
          <label className="svc-mask-check"><Checkbox on={!!aviaParams.flex} onChange={() => patchAvia({ flex: !aviaParams.flex })} /><span>Гибкие даты</span></label>
        </div>
        <div className="svc-mask-sidebar-note"><Icon name="filter" />Параметры применяются к текущему поиску.</div>
      </aside>
    );
  }

  return (
    <aside className="svc-mask-sidebar" aria-label="Параметры услуги">
      <div className="svc-mask-sidebar-head"><span>Параметры</span></div>
      <div className="svc-mask-filter-block">
        <div className="svc-mask-filter-title">{kind}</div>
        <div className="svc-mask-info-row"><Icon name="suppliers" /><span>Поставщик указывается в форме</span></div>
        <div className="svc-mask-info-row"><Icon name="finance" /><span>Стоимость задаётся отдельно</span></div>
        <div className="svc-mask-info-row"><Icon name="api" /><span>Фильтры поставщиков появятся после подключения API</span></div>
      </div>
    </aside>
  );
}

function AddServicePanel(props) {
  const { kind, setKind, aviaParams, setAviaParams } = props;
  const hasSidebar = SIDE_MASKS.has(kind);

  return (
    <div className={'svc-mask-shell' + (hasSidebar ? ' has-sidebar' : '')}>
      <div className="svc-mask-tabs" role="tablist" aria-label="Тип услуги">
        {MASK_CATEGORIES.map((category) => (
          <button
            key={category.kind}
            type="button"
            role="tab"
            aria-selected={kind === category.kind}
            className={'svc-mask-tab' + (kind === category.kind ? ' active' : '')}
            onClick={() => setKind(category.kind)}
          >
            <Icon name={category.icon} />
            <span>{category.label}</span>
          </button>
        ))}
      </div>
      <div className={'svc-mask-body' + (hasSidebar ? ' has-sidebar' : '')}>
        {hasSidebar && <ServiceMaskSidebar kind={kind} aviaParams={aviaParams} setAviaParams={setAviaParams} />}
        <div className="svc-mask-main">
          <BaseAddServicePanel {...props} />
        </div>
      </div>
    </div>
  );
}

export { AddServicePanel };
