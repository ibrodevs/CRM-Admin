

const NOTIF_PRIORITY = { 'Критический': 'red', 'Высокий': 'amber', 'Средний': 'blue', 'Информационный': 'gray' };
const NOTIF_PRIO_RANK = { 'Критический': 0, 'Высокий': 1, 'Средний': 2, 'Информационный': 3 };
const NOTIF_SOURCE = {
  'Заказы': { icon: 'orders', color: '#2566ff' }, 'Авиа': { icon: 'plane', color: '#5a5af0' },
  'КП': { icon: 'template', color: '#2f88aa' }, 'Финансы': { icon: 'finance', color: '#1f9d57' },
  'Документы': { icon: 'docs', color: '#c47e22' }, 'Возвраты': { icon: 'refund', color: '#2f88aa' },
  'Чаты': { icon: 'chat', color: '#5a5af0' }, 'Поставщики': { icon: 'suppliers', color: '#6c7686' },
  'Интеграции': { icon: 'api', color: '#d64545' },
  'Система': { icon: 'settings', color: '#7e889a' },
};


const NOTIFICATIONS = [
  { id: 'N1',  cat: 'Финансы',   priority: 'Критический',    source: 'Финансы',   title: 'Просрочена оплата поставщику', desc: 'Заказ № 51170 · Qatar · тайм-лимит выписки сегодня 18:00', time: '8 мин', order: 51170, resp: 'Куба',    link: { type: 'finance' },   act: 'Открыть финансы',          read: false, pinned: true },
  { id: 'N2',  cat: 'Возвраты',  priority: 'Критический',    source: 'Возвраты',  title: 'Дедлайн возврата сегодня',     desc: 'R-7019 · возврат Qatar · исполнить до 15.06',              time: '22 мин', order: 51170, resp: 'Куба',   link: { type: 'returns' },   act: 'Открыть возврат',          read: false, pinned: false },
  { id: 'N3',  cat: 'Документы', priority: 'Критический',    source: 'Документы', title: 'Не выписаны билеты',           desc: 'Заказ № 51170 · 6 пассажиров без билетов',                 time: '25 мин', order: 51170, resp: 'Куба',   link: { type: 'documents' }, act: 'Открыть документы',         read: false, pinned: false },
  { id: 'N4',  cat: 'КП',        priority: 'Высокий',        source: 'КП',        title: 'Истекает срок действия КП',    desc: 'КП-1033 · Сагынбеков Икрам · действует до 17.06',          time: '40 мин', order: 51156, resp: 'Кими',   link: { type: 'offers' },    act: 'Открыть КП',                read: false, pinned: false },
  { id: 'N5',  cat: 'Возвраты',  priority: 'Высокий',        source: 'Возвраты',  title: 'Возврат требует проверки',     desc: 'R-7008 · аннуляция AV-51163 · нужна проверка условий',     time: '1 ч',    order: 51163, resp: 'Даниель', link: { type: 'returns' },  act: 'Открыть возврат',          read: false, pinned: false },
  { id: 'N6',  cat: 'Документы', priority: 'Высокий',        source: 'Документы', title: 'Требуется загрузка документа', desc: 'Заказ № 51163 · паспорт Аттокуров Эрбол на проверке',      time: '1 ч',    order: 51163, resp: 'Даниель', link: { type: 'documents' },act: 'Открыть документы',         read: false, pinned: false },
  { id: 'N7',  cat: 'КП',        priority: 'Высокий',        source: 'КП',        title: 'Клиент отклонил КП',           desc: 'КП-1028 · ИП Мамажанов · невозвратный тариф',              time: '2 ч',    order: 51155, resp: 'Даниель', link: { type: 'offers' },   act: 'Открыть КП',                read: true,  pinned: false },
  { id: 'N8',  cat: 'Заказы',    priority: 'Средний',        source: 'Заказы',    title: 'Новый заказ',                  desc: 'Заказ № 51180 · ОсОО "Asia Travel" · корпоративная',       time: '2 ч',    order: 51180, resp: 'Куба',    link: { type: 'order' },    act: 'Открыть заказ',             read: false, pinned: false },
  { id: 'N9',  cat: 'Возвраты',  priority: 'Средний',        source: 'Возвраты',  title: 'Обмен ждёт согласования клиента', desc: 'R-7020 · обмен AV-51162 · доплата +160 $',               time: '3 ч',    order: 51162, resp: 'Даниель', link: { type: 'returns' },  act: 'Открыть возврат',          read: false, pinned: false },
  { id: 'N10', cat: 'Финансы',   priority: 'Средний',        source: 'Финансы',   title: 'Частичная оплата',             desc: 'F-2042 · Hilton · внесён аванс 500 $ из 980 $',            time: '3 ч',    order: 51162, resp: 'Даниель', link: { type: 'finance' },  act: 'Открыть финансы',           read: true,  pinned: false },
  { id: 'N11', cat: 'Система',   priority: 'Средний',        source: 'Система',   title: 'Вам назначен заказ',           desc: 'Заказ № 51162 · ОсОО "Гранд лимитед"',                     time: '4 ч',    order: 51162, resp: 'Даниель', link: { type: 'order' },    act: 'Открыть заказ',             read: true,  pinned: false },
  { id: 'N12', cat: 'Система',   priority: 'Средний',        source: 'Чаты',      title: 'Вас упомянули',                desc: '@Даниель в комментарии по AV-51162: «учти места рядом»',   time: '4 ч',    order: 51162, resp: 'Даниель', link: { type: 'order' },    act: 'Перейти',                   read: false, pinned: false },
  { id: 'N13', cat: 'Финансы',   priority: 'Информационный', source: 'Финансы',   title: 'Поступила оплата',             desc: 'F-2041 · оплата 1 720 $ подтверждена',                     time: '5 ч',    order: 51162, resp: 'Даниель', link: { type: 'finance' },  act: 'Открыть финансы',           read: true,  pinned: false },
  { id: 'N14', cat: 'Финансы',   priority: 'Информационный', source: 'Возвраты',  title: 'Возврат завершён',             desc: 'R-7012 · возврат 176 $ исполнен',                          time: 'Вчера',  order: 51155, resp: 'Даниель', link: { type: 'returns' },  act: 'Открыть возврат',          read: true,  pinned: false },
  { id: 'N15', cat: 'Документы', priority: 'Информационный', source: 'Документы', title: 'Выпущены документы',           desc: 'Заказ № 51162 · маршрут-квитанция и билет готовы',          time: 'Вчера',  order: 51162, resp: 'Даниель', link: { type: 'documents' },act: 'Открыть документы',         read: true,  pinned: false },
  { id: 'N16', cat: 'КП',        priority: 'Информационный', source: 'КП',        title: 'Клиент согласовал КП',         desc: 'КП-1039 · ОсОО "Asia Travel" · Вариант A',                 time: 'Вчера',  order: 51170, resp: 'Куба',    link: { type: 'offers' },   act: 'Открыть КП',                read: true,  pinned: false },
  { id: 'N17', cat: 'Документы', priority: 'Критический',    source: 'Интеграции', title: 'Ошибка выписки билета',        desc: 'Заказ № 51170 · Qatar · поставщик вернул отказ выписки',    time: '5 мин',  order: 51170, resp: 'Куба',    link: { type: 'documents' }, act: 'Открыть документы',        read: false, pinned: false, errCode: 'TKT-500' },
  { id: 'N18', cat: 'Система',   priority: 'Высокий',        source: 'Интеграции', title: 'GDS временно недоступен',      desc: 'Amadeus не отвечает · автоподбор авиа приостановлен',       time: '18 мин', resp: 'Система', link: { type: 'order' },   act: 'Открыть код ошибки',       read: false, pinned: false, errCode: 'GDS-503' },
  { id: 'N19', cat: 'Финансы',   priority: 'Высокий',        source: 'Интеграции', title: 'Платёж отклонён шлюзом',       desc: 'F-2043 · заказ № 51162 · шлюз отклонил оплату 480 $',       time: '1 ч',    order: 51162, resp: 'Даниель', link: { type: 'finance' },  act: 'Открыть финансы',          read: false, pinned: false, errCode: 'PAY-402' },
];



const INTEGRATION_ERROR_CODES = [
  { code: 'GDS-401',  system: 'Amadeus (GDS)',     category: 'Авторизация',    severity: 'Критический', title: 'Сессия GDS не авторизована',   desc: 'Токен доступа к GDS истёк или отозван — запросы к системе бронирования отклоняются.', resolution: 'Переподключить интеграцию в «Доступы к API», проверить срок действия ключа.' },
  { code: 'GDS-503',  system: 'Amadeus (GDS)',     category: 'Тайм-аут',       severity: 'Высокий',     title: 'GDS временно недоступен',      desc: 'Поставщик не ответил в пределах тайм-аута — подбор и бронирование недоступны.',        resolution: 'Повторить запрос позже. При повторении — проверить статус поставщика.' },
  { code: 'BKG-409',  system: 'Поставщик (API)',   category: 'Бронирование',   severity: 'Высокий',     title: 'Место/тариф уже недоступны',   desc: 'Выбранный тариф или место больше не продаётся у поставщика.',                          resolution: 'Обновить подбор и предложить клиенту актуальный вариант.' },
  { code: 'BKG-422',  system: 'Поставщик (API)',   category: 'Бронирование',   severity: 'Средний',     title: 'Некорректные данные пассажира', desc: 'Поставщик отклонил бронь: ФИО/паспорт не проходят валидацию правил тарифа.',          resolution: 'Проверить данные пассажира в карточке и повторить бронирование.' },
  { code: 'TKT-500',  system: 'Поставщик (API)',   category: 'Выписка',        severity: 'Критический', title: 'Ошибка выписки билета',        desc: 'Тайм-лимит выписки истёк или поставщик вернул отказ при оформлении.',                  resolution: 'Проверить оплату и тайм-лимит; при необходимости — перебронировать.' },
  { code: 'TKT-408',  system: 'Поставщик (API)',   category: 'Выписка',        severity: 'Высокий',     title: 'Тайм-аут при выписке',         desc: 'Ответ по выписке не получен вовремя — статус операции неизвестен.',                    resolution: 'Не повторять выписку вслепую — сначала уточнить статус брони у поставщика.' },
  { code: 'PAY-402',  system: 'Платёжный шлюз',    category: 'Оплата',         severity: 'Высокий',     title: 'Платёж отклонён',              desc: 'Банк или платёжный шлюз отклонил транзакцию.',                                         resolution: 'Проверить реквизиты и повторить оплату другим способом.' },
  { code: 'PAY-409',  system: 'Платёжный шлюз',    category: 'Оплата',         severity: 'Средний',     title: 'Двойное списание предотвращено', desc: 'Повторная транзакция по тому же заказу заблокирована системой защиты.',              resolution: 'Проверить статус первой оплаты перед повторной попыткой.' },
  { code: 'SYNC-207', system: 'Внутренняя система', category: 'Синхронизация', severity: 'Средний',     title: 'Рассинхрон статусов',          desc: 'Статус заказа в CRM не совпадает со статусом у поставщика.',                           resolution: 'Запустить ручную синхронизацию заказа.' },
  { code: 'SYS-500',  system: 'Внутренняя система', category: 'Сбой',          severity: 'Критический', title: 'Внутренняя ошибка сервера',    desc: 'Непредвиденная ошибка при обработке запроса.',                                         resolution: 'Повторить позже; при повторении — обратиться в техподдержку с кодом ошибки.' },
];
const ERR_SEVERITY = { 'Критический': 'red', 'Высокий': 'amber', 'Средний': 'blue' };
const ERR_SYSTEMS = [...new Set(INTEGRATION_ERROR_CODES.map((e) => e.system))];
const ERR_CATEGORIES = [...new Set(INTEGRATION_ERROR_CODES.map((e) => e.category))];

const NOTIF_SETTINGS = [
  { key: 'finance', label: 'Финансовые события', desc: 'Оплаты, задолженности, возвраты', on: true },
  { key: 'myorders', label: 'События по моим заказам', desc: 'Только заказы, где я ответственный', on: true },
  { key: 'system', label: 'Системные уведомления', desc: 'Назначения, упоминания, смена ответственного', on: true },
  { key: 'errors', label: 'Ошибки интеграций', desc: 'Сбои API поставщиков и GDS, ошибки выписки и оплаты', on: true },
  { key: 'deadlines', label: 'Напоминания о дедлайнах', desc: 'Тайм-лимиты, сроки КП, дедлайны возвратов', on: true },
];

const ENABLE_DEMO_BUSINESS_DATA = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
if (!ENABLE_DEMO_BUSINESS_DATA) {
  NOTIFICATIONS.splice(0, NOTIFICATIONS.length);
}

export {
  NOTIF_PRIORITY,
  NOTIF_PRIO_RANK,
  NOTIF_SOURCE,
  NOTIFICATIONS,
  INTEGRATION_ERROR_CODES,
  ERR_SEVERITY,
  ERR_SYSTEMS,
  ERR_CATEGORIES,
  NOTIF_SETTINGS,
};
