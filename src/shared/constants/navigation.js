

const ORDER_OPS_SECTIONS = [
  { key: 'documents', label: 'Документы', icon: 'docs', desc: 'Билеты, ваучеры, счета и договоры по всем заказам' },
  { key: 'fulfillment', label: 'Оформление', icon: 'clipboard', desc: 'Очередь выписки и оформления услуг' },
  { key: 'returns', label: 'Возвраты и обмены', icon: 'refund', desc: 'Возвраты, обмены и штрафы' },
];

const SERVICE_KEYS = ['flights', 'rail', 'hotels', 'transfers', 'buses', 'tours'];

export { ORDER_OPS_SECTIONS, SERVICE_KEYS };
