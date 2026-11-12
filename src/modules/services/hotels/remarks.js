// The supplier dictionary has no categories. Group by meaning; retain every row.
export const REMARK_PAGE_SIZE = 8;
export const REMARK_LIMIT = 30;
export const REMARK_GROUPS = [
  ['stay', 'Заезд и выезд', /заезд|выезд|продлен|продлён|пересел|arrival|departure|check.?in|check.?out/i],
  ['beds', 'Кровати и дети', /кроват|кровот|люльк|детск|реб[её]н|crib|bed|child/i],
  ['room', 'Номер и расположение', /номер|этаж|видом|тихи|курени|room|floor|view|smok/i],
  ['guest', 'Данные гостя', /телефон|контакт|лояльност|гост[ья]|phone|loyalty|guest/i],
  ['other', 'Другое', null],
];
export const remarkGroup = (row) => REMARK_GROUPS.find(([, , pattern]) => !pattern || pattern.test(row.title))[0];
export function remarkPage(rows, query = '', group = 'all', page = 0) {
  const words = query.trim().toLocaleLowerCase().replaceAll('ё', 'е').split(/\s+/).filter(Boolean);
  const found = rows.filter((row) => (group === 'all' || remarkGroup(row) === group)
    && words.every((word) => row.title.toLocaleLowerCase().replaceAll('ё', 'е').includes(word)));
  const pages = Math.max(1, Math.ceil(found.length / REMARK_PAGE_SIZE));
  const index = Math.max(0, Math.min(page, pages - 1));
  return { rows: found.slice(index * REMARK_PAGE_SIZE, (index + 1) * REMARK_PAGE_SIZE), total: found.length, pages, index };
}
