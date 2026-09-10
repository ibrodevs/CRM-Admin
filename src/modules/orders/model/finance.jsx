
import { currencySymbol, resolveCurrency } from '../../../shared/lib/money.js';

// Пустая валюта означает «не указана», а не «доллар»: подставляем валюту
// по умолчанию из настроек пользователя.
function normalizeCurrency(currency, fallback) {
  const code = resolveCurrency(currency, fallback);
  return ['RUR', 'РУБ'].includes(code) ? 'RUB' : code;
}

function ocCurrency(currency) {
  return currencySymbol(normalizeCurrency(currency));
}

function ocMoney(amount, currency) {
  const value = Number(amount);
  return (Number.isFinite(value) ? value : 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' ' + ocCurrency(currency);
}

function financeRowsTotal(rows, currency) {
  const targetCurrency = normalizeCurrency(currency);
  return (rows || []).reduce((sum, row) => {
    const rowCurrency = normalizeCurrency(row?.currency, targetCurrency);
    return rowCurrency === targetCurrency ? sum + Number(row?.amount || 0) : sum;
  }, 0);
}

function orderFinanceCurrency(summary, order = {}, services = []) {
  const summaryRows = [
    ...(summary?.services_total || []),
    ...(summary?.paid || []),
    ...(summary?.outstanding || []),
  ];
  const summaryCurrency = summaryRows.find((row) => row?.currency)?.currency;
  const serviceCurrency = (services || []).find((service) => service?.currency)?.currency;
  return normalizeCurrency(
    summaryCurrency || order.base_currency || order.currency || serviceCurrency,
  );
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

function activeOrderServices(services = []) {
  return services.filter((service) => !['cancelled', 'failed', 'Отменено', 'Ошибка'].includes(service.statusCode || service.status));
}

function serviceMoneyRows(services = [], fallback) {
  const totals = new Map();
  activeOrderServices(services).forEach((service) => {
    const currency = normalizeCurrency(service.currency, fallback);
    totals.set(currency, (totals.get(currency) || 0) + svcCalc(service).total);
  });
  return [...totals].map(([currency, amount]) => ({ currency, amount }));
}

function moneyRowsText(rows = [], fallback) {
  return rows.length ? rows.map((row) => ocMoney(row.amount, row.currency)).join(' + ') : ocMoney(0, fallback);
}

function financeSnapshot(orderNo, services, summary = null, fallback) {
  const totals = summary?.services_total || serviceMoneyRows(services, fallback);
  return { totals, totalText: moneyRowsText(totals, fallback),
    paidText: summary ? moneyRowsText(summary.paid, fallback) : 'Нет данных',
    debtText: summary ? moneyRowsText(summary.outstanding, fallback) : 'Нет данных' };
}

export {
  normalizeCurrency, ocCurrency, ocMoney, financeRowsTotal, orderFinanceCurrency,
  opPayable, opDebt, svcCalc, financeSnapshot, activeOrderServices, serviceMoneyRows, moneyRowsText,
};
