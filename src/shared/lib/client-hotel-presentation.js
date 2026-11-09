// Guest presentation only. Never apply to supplier requests or operator state.
const privateKeys = new Set(['supplier', 'suppliername', 'suppliercost', 'supplierprice', 'suppliertotal', 'supplierreference', 'supplierbookingreference', 'supplierorderno', 'supplierorderid', 'provider', 'provideradapter', 'providername', 'providersnapshot', 'rawsnapshot', 'order', 'orderid', 'orderno', 'ordernumber', 'crmorderno', 'crmorderid', 'serviceid', 'itemid', 'itemids', 'clientorderid', 'clientrequestid', 'cost', 'profit', 'markup', 'supplieramount', 'suppliernetprice', 'providercost', 'providerprice', 'purchaseprice', 'netprice', 'netamount', 'commission', 'margin', 'source', 'token', 'password', 'credentials']);
const privateLabel = /^(?:заказ|поставщик|название поставщика)$|(?:стоимость|цена|заказ|бронь|номер).*поставщик|закупоч|себестоимост|маржа|комисси|заказ.*(?:crm|срм|внутрен|api)|(?:внутрен|crm|срм).*номер|идентификатор/i;
export function clientHotelText(value, privateIds = []) {
  let text = String(value ?? '');
  for (const id of privateIds.filter(Boolean).map(String).sort((a, b) => b.length - a.length)) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'gu'), '');
  }
  return text.replace(/(?<![\p{L}\p{N}_])(?:hb[\s-]?pro|hotel[\s-]?book|хотелбук)(?![\p{L}\p{N}_])/giu, 'поставщик услуг').replace(/\bORD-[A-Z0-9-]+\b/gi, '').trim();
}
export function clientHotelContent(value, privateIds = []) {
  if (Array.isArray(value)) return value.map((child) => clientHotelContent(child, privateIds)).filter((child) => child !== undefined);
  if (value && typeof value === 'object') {
    if (privateLabel.test(value.l || value.label || '')) return undefined;
    return Object.fromEntries(Object.entries(value).filter(([key]) => !privateKeys.has(key.toLowerCase().replace(/[^a-z0-9]/g, ''))).map(([key, child]) => [key, clientHotelContent(child, privateIds)]).filter(([, child]) => child !== undefined));
  }
  return typeof value === 'string' ? clientHotelText(value, privateIds) : value;
}
export function clientHotelCard(value, privateIds = []) {
  const result = clientHotelContent(value, privateIds);
  if (result?.fin) result.fin = Object.fromEntries(Object.entries(result.fin).filter(([key]) => ['clientTotal', 'fee', 'currency', 'model'].includes(key)));
  return result;
}
