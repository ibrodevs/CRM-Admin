import { AddServicePanel as BaseAddServicePanel } from './OrderCard.jsx';
import { resolveCurrency } from '../../../shared/lib/money.js';

function FreeBookingAddServicePanel(props) {
  const safeAviaParams = {
    ...(props.aviaParams || {}),
    currency: resolveCurrency(props.aviaParams?.currency),
  };

  return (
    <div className="free-booking-service-mask" data-kind={props.kind || 'Авиа'}>
      <BaseAddServicePanel {...props} aviaParams={safeAviaParams} />
    </div>
  );
}

export { FreeBookingAddServicePanel as AddServicePanel };
