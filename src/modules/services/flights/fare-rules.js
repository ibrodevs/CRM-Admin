const LABELS = { refund: 'Возврат', refunds: 'Возврат', exchange: 'Обмен', changes: 'Изменения', cancellation: 'Отмена', penalties: 'Штрафы', baggage: 'Багаж', carry_on: 'Ручная кладь', no_show: 'Неявка', rules: 'Правила тарифа', fare_rules: 'Правила тарифа', upt: 'Условия применения тарифа', text: 'Правила тарифа', description: 'Описание', conditions: 'Условия', rule: 'Правило', category: 'Категория', name: 'Название', title: 'Раздел', passenger: 'Пассажир', segment: 'Сегмент', value: 'Условие' };
const technical = /^(token|selection_token|request_id|session_id|offer_id|status|success|command|context|code|error|messages|type|elapsed|currency|price|amount)$/i;
const plainText = (value) => String(value).replace(/<br\s*\/?\s*>|<\/p\s*>/gi, '\n').replace(/<\/?[a-z][a-z0-9]*(?:\s[^<>]*|\s*)>/gi, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();

// Supplier responses can be plain text, named rule groups, or nested UPT sections.
// Never show transport metadata or serialize raw supplier JSON to the operator.
export function fareRuleSections(value) {
  const sections = [];
  const walk = (node, title = 'Правила тарифа', depth = 0) => {
    if (node == null || depth > 10) return;
    if (typeof node !== 'object') {
      const text = plainText(typeof node === 'boolean' ? (node ? 'Да' : 'Нет') : node);
      if (text) sections.push({ title, text });
      return;
    }
    if (Array.isArray(node)) { node.forEach((item) => walk(item, title, depth + 1)); return; }
    const heading = node.title || node.name || node.header;
    const content = node.text ?? node.body ?? node.content ?? node.description;
    if (heading && content != null) { walk(content, plainText(heading), depth + 1); return; }
    Object.entries(node).forEach(([key, item]) => {
      if (technical.test(key)) return;
      const label = LABELS[key.toLowerCase()] || (/^(respond|response|data|result|items|parameters)$/i.test(key) ? title : key.replace(/_/g, ' '));
      walk(item, label, depth + 1);
    });
  };
  walk(value);
  return sections.filter((item, index) => sections.findIndex((other) => other.title === item.title && other.text === item.text) === index);
}
