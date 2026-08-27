import { FIN_OPS } from '../../data';

function ocCurrency(currency = 'RUB') {
  if (currency === 'USD' || currency === '$') return '$';
  if (currency === 'RUB' || currency === '₽') return '₽';
  if (currency === 'EUR' || currency === '€') return '€';
  if (currency === 'KGS') return 'сом';
  return currency;
}

function ocMoney(amount, currency = 'RUB') {
  const value = Number(amount);
  return Math.round(Number.isFinite(value) ? value : 0).toLocaleString('ru-RU') + ' ' + ocCurrency(currency);
}

function opPayable(operation) {
  return operation.tariff + operation.taxes + operation.fee + operation.penalty - operation.discount;
}

function opDebt(operation) {
  return Math.max(0, opPayable(operation) - operation.paid - operation.refund);
}

function svcCalc(service) {
  const number = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const source = service.calc || {};
  const tariff = number(source.tariff ?? service.supplier_cost ?? service.sum);
  const taxes = number(source.taxes ?? service.taxes);
  const fee = number(source.fee ?? service.agency_fee);
  const markup = number(source.markup ?? service.markup);
  const discount = number(source.discount ?? service.discount);
  const commission = number(source.commission ?? service.commission);
  const calculatedTotal = tariff + taxes + fee + markup - discount;
  const explicitTotal = source.total ?? service.client_total ?? service.sum;
  return {
    ...source,
    tariff,
    taxes,
    fee,
    markup,
    discount,
    commission,
    total: explicitTotal === undefined || explicitTotal === null || explicitTotal === ''
      ? calculatedTotal
      : number(explicitTotal),
  };
}

function financeSnapshot(orderNo, services) {
  const operations = FIN_OPS.filter((operation) => operation.order === orderNo);
  const byKind = {};
  services.forEach((service) => {
    const calculation = svcCalc(service);
    byKind[service.kind] = {
      total: (byKind[service.kind]?.total || 0) + calculation.total,
      tariff: (byKind[service.kind]?.tariff || 0) + calculation.tariff,
      taxes: (byKind[service.kind]?.taxes || 0) + calculation.taxes,
      fee: (byKind[service.kind]?.fee || 0) + calculation.fee,
      commission: (byKind[service.kind]?.commission || 0) + calculation.commission,
      currency: service.currency || byKind[service.kind]?.currency || 'USD',
    };
  });
  operations.forEach((operation) => {
    byKind[operation.source] = {
      ...(byKind[operation.source] || {
        total: 0,
        tariff: 0,
        taxes: 0,
        fee: 0,
        commission: 0,
        currency: operation.currency,
      }),
      paid: (byKind[operation.source]?.paid || 0) + operation.paid,
      debt: (byKind[operation.source]?.debt || 0) + opDebt(operation),
      margin: (byKind[operation.source]?.margin || 0) + operation.commission,
      payable: (byKind[operation.source]?.payable || 0) + opPayable(operation),
      refund: (byKind[operation.source]?.refund || 0) + operation.refund,
    };
  });
  return {
    byKind,
    tariffs: services.reduce((sum, service) => sum + svcCalc(service).tariff, 0),
    taxes: services.reduce((sum, service) => sum + svcCalc(service).taxes, 0),
    fees: services.reduce((sum, service) => sum + svcCalc(service).fee, 0),
    margin: operations.length
      ? operations.reduce((sum, operation) => sum + (operation.commission || 0), 0)
      : services.reduce((sum, service) => sum + svcCalc(service).commission, 0),
    total: services.reduce((sum, service) => sum + svcCalc(service).total, 0),
    paid: operations.reduce((sum, operation) => sum + operation.paid, 0),
    debt: operations.reduce((sum, operation) => sum + opDebt(operation), 0),
    refund: operations.reduce((sum, operation) => sum + operation.refund, 0),
    hasOps: operations.length > 0,
    currencies: [
      ...new Set(
        services
          .map((service) => service.currency)
          .concat(operations.map((operation) => operation.currency))
          .filter(Boolean),
      ),
    ],
  };
}

export { ocCurrency, ocMoney, opPayable, opDebt, svcCalc, financeSnapshot };
