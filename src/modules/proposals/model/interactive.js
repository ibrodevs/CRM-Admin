export const KP_KINDS = { avia: 'Авиаперелёты', hotel: 'Отели', transfer: 'Трансферы', rail: 'ЖД билеты', insurance: 'Страхование', bus: 'Автобусы', lounge: 'Бизнес-залы', aeroexpress: 'Аэроэкспресс', tour: 'Туры', visa: 'Визы', other: 'Другие услуги' };
export const KP_ACTIONS = { services_prepared: 'Услуги подготовлены в заказе', draft_saved: 'Сохранён черновик', published: 'Опубликована версия', final_published: 'Отправлены итоговые условия', selection: 'Клиент отправил выбор', approval: 'Клиент согласовал итог', comment: 'Комментарий клиента', alternative: 'Запрошены другие варианты', price_changed: 'Изменились условия', price_checked: 'Проверена стоимость' };
export const optionsOf = payload => (payload?.groups || []).flatMap(group => group.options);
export const kpMoney = (value, currency) => currency ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value || 0)) : Number(value || 0).toLocaleString('ru-RU');
export const kpTime = value => value ? new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Ещё не проверено';
export const chosenTotal = (payload, ids) => optionsOf(payload).filter(row => ids.includes(row.id)).reduce((total, row) => total + Math.round(Number(row.price) * 100), 0) / 100;
export function selectionErrors(payload, ids, packageId) {
  if (!payload) return [];
  const chosen = new Set(ids);
  const errors = [];
  const availableIds = new Set(optionsOf(payload).map(row => row.id));
  if (ids.some(id => !availableIds.has(id))) errors.push('Состав предложения изменился. Проверьте выбор услуг');
  const pack = (payload.packages || []).find(row => row.id === packageId);
  if (packageId && (!pack || pack.option_ids.length !== ids.length || pack.option_ids.some(id => !chosen.has(id)))) errors.push('Состав комплекта изменён');
  if (payload.mode === 'packages' && !pack) errors.push('Выберите комплект');
  if (!pack) (payload.groups || []).forEach(group => {
    const count = group.options.filter(row => chosen.has(row.id)).length;
    if (count > 1 || (group.required && count !== 1)) errors.push(`Выберите один вариант: ${group.title}`);
  });
  optionsOf(payload).filter(row => chosen.has(row.id)).forEach(row => {
    if (row.availability === 'unavailable') errors.push(`Недоступно: ${row.title}`);
    if ((row.requires || []).some(id => !chosen.has(id))) errors.push(`Выберите связанные услуги для «${row.title}»`);
    if ((row.excludes || []).some(id => chosen.has(id))) errors.push(`Несовместимое сочетание: ${row.title}`);
  });
  return errors;
}
export function chooseOption(payload, ids, groupId, optionId) {
  const group = payload.groups.find(row => row.id === groupId);
  const others = ids.filter(id => !group.options.some(row => row.id === id));
  return ids.includes(optionId) ? others : [...others, optionId];
}

export function restoreProposalSelection(quote) {
  const selection = quote.selection || {};
  const available = new Set(optionsOf(quote.payload).map(row => row.id));
  const saved = selection.option_ids || [];
  const ids = saved.filter(id => available.has(id));
  const pack = (quote.payload.packages || []).find(row => row.id === selection.package_id);
  const packageId = pack && pack.option_ids.length === ids.length && pack.option_ids.every(id => ids.includes(id)) ? pack.id : null;
  return { ids, packageId, changed: saved.length > 0 && (ids.length !== saved.length || (selection.package_id || null) !== packageId || selection.revision !== quote.revision) };
}
