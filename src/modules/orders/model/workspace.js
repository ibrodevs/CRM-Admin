export const ORDER_SECTIONS = {
  participants: { title: 'Пассажиры', description: 'Участники поездки, их данные и документы.' },
  route: { title: 'Маршрут поездки', description: 'Все перемещения и проживание в порядке следования.' },
  documents: { title: 'Документы заказа', description: 'Файлы по услугам и пассажирам, версии и статусы документов.' },
  finance: { title: 'Финансы заказа', description: 'Стоимость услуг, начисления и поступившие платежи.' },
  tasks: { title: 'Задачи заказа', description: 'Сроки, ответственные и текущий статус работы.' },
  history: { title: 'История заказа', description: 'Изменения и действия сотрудников по этому заказу.' },
  aftersale: { title: 'Возвраты и обмены', description: 'Запросы по услугам заказа и история их обработки.' },
  overview: { title: 'Информация о заказе', description: 'Параметры поездки и контактные данные.' },
  clients: { title: 'Заказчик и контакты', description: 'Клиент, контактное лицо и способы связи.' },
  responsibles: { title: 'Ответственные', description: 'Назначения сотрудников по услугам заказа.' },
  extras: { title: 'Дополнительные услуги', description: 'Дополнения к бронированиям, их стоимость и состояние.' },
  offers: { title: 'Коммерческие предложения', description: 'Варианты поездки и согласование с клиентом.' },
};
export function canonicalOrderSection(key) {
  if (!key || ['main', 'services'].includes(key) || !ORDER_SECTIONS[key]) return 'main';
  return key;
}
