
const CHATS = [
  { id: 1, name: 'Jessica Drew', kind: 'Клиент', last: 'Хорошо, ожидаем.', time: '18:30', unread: 2, online: '5 мин назад', org: 'ОсОО "Гранд лимитед"',
    messages: [
      { from: 'them', text: 'Добрый день! Подскажите по статусу заявки 51163', time: '18:10' },
      { from: 'me', text: 'Здравствуйте! Заявка на согласовании у поставщика.', time: '18:14' },
      { from: 'them', text: 'Хорошо, ожидаем.', time: '18:30' },
    ] },
  { id: 2, name: 'David Moore', kind: 'Поставщики', last: 'Вы: Не могли бы Вы ускорить этот процесс?', time: '18:16', unread: 0, online: '5 мин назад', org: 'ОсОО "Гранд лимитед"',
    messages: [
      { from: 'me', text: 'Вы получили все необходимые правки?', time: '18:12', read: true },
      { from: 'them', text: 'Пока что нет, ожидаем.', time: '18:16' },
      { from: 'me', text: 'Не могли бы Вы ускорить этот процесс?', time: '18:16', read: true },
    ] },
  { id: 3, name: 'Greg James', kind: 'Агенты', last: 'Хорошая работа', time: '18:02', unread: 0, online: '1 ч назад', org: 'Asia Travel',
    messages: [{ from: 'them', text: 'Хорошая работа', time: '18:02' }] },
  { id: 4, name: 'Emily Dorson', kind: 'Клиент', last: 'Хорошо', time: '17:42', unread: 0, online: '2 ч назад', org: 'Best Travel Inc',
    messages: [{ from: 'them', text: 'Хорошо', time: '17:42' }] },
  { id: 5, name: 'Elon Brite', kind: 'Поставщики', last: 'Вы: Ожидаем', time: '17:08', unread: 0, online: 'вчера', org: 'Emirates',
    messages: [{ from: 'me', text: 'Ожидаем', time: '17:08', read: true }] },
  { id: 6, name: 'Little Sister', kind: 'Клиент', last: 'Спасибо за помощь', time: 'Ср', unread: 0, online: '3 дня назад', org: 'Asia Travel',
    messages: [{ from: 'them', text: 'Спасибо за помощь', time: 'Ср' }] },
];



const CHAT_TYPES = [
  { key: 'client',         label: 'Клиент',               icon: 'user' },
  { key: 'operator',       label: 'Операторы',            icon: 'users' },
  { key: 'supplier',       label: 'Поставщики',           icon: 'suppliers' },
  { key: 'local_supplier', label: 'Локальные поставщики', icon: 'building' },
  { key: 'system',         label: 'События',              icon: 'bell' },
];
const CHAT_TYPE_LABEL = { client: 'Клиентский', operator: 'Операторский', supplier: 'Поставщик', local_supplier: 'Локальный поставщик', system: 'Системный' };
const CHAT_CHANNEL_TONE = { 'MAX': 'blue', 'Email': 'teal', 'API': 'gray', 'Система': 'amber', 'Телефон': 'green', 'Поставщик': 'gray' };

const CHAT_CHANNELS = CHAT_TYPES;

const CHAT_THREADS = [

  { id: 1, order: 51162, type: 'client', channel: 'MAX', name: 'ОсОО "Гранд лимитед"', client: 'Нуралиев Данияр', online: '5 мин назад',
    createdAt: '14.06.2026', responsibleOperator: 'Даниель', connectionStatus: 'Подключено', pinned: true, unread: 2,
    relatedServices: ['S1', 'S2'], participants: [{ name: 'Нуралиев Данияр', role: 'Клиент' }, { name: 'Даниель', role: 'Оператор' }],
    messages: [
      { from: 'them', author: 'Нуралиев Данияр', text: 'Добрый день! Когда будет готово КП по Стамбулу?', time: '14:02' },
      { from: 'system', text: 'КП-1042 отправлено клиенту', time: '15:34' },
      { from: 'me', author: 'Даниель', text: 'Здравствуйте! Отправили, посмотрите два варианта в предложении.', time: '15:36', read: true },
      { from: 'them', author: 'Нуралиев Данияр', text: 'Спасибо! Согласовываю вариант A.', time: '15:50' },
    ],
    internal: [
      { from: 'them', author: 'Адилет', text: '@Даниель клиент просит места рядом — учти при выписке.', time: '13:10' },
      { from: 'me', author: 'Даниель', text: 'Принял, выберу 12A и 12B.', time: '13:12', read: true },
    ] },
  { id: 2, order: 51162, type: 'supplier', channel: 'API', name: 'Air Astana', client: 'Нуралиев Данияр', supplier: 'Air Astana', online: '12 мин назад',
    createdAt: '14.06.2026', responsibleOperator: 'Даниель', connectionStatus: 'Подключено', pinned: false, unread: 0,
    relatedServices: ['S1'], participants: [{ name: 'Air Astana', role: 'Поставщик' }, { name: 'Даниель', role: 'Оператор' }],
    messages: [
      { from: 'me', author: 'Даниель', text: 'Прошу подтвердить бронь KC 131/132 на 2 пассажиров.', time: '12:40', read: true },
      { from: 'them', author: 'Air Astana', text: 'Подтверждаем, PNR KC8H2L. Тайм-лимит выписки сегодня 18:00.', time: '12:51' },
      { from: 'them', author: 'Air Astana', text: '', attach: { name: 'Подтверждение брони.pdf', size: '96 КБ' }, time: '12:52' },
    ],
    internal: [] },
  { id: 3, order: 51162, type: 'supplier', channel: 'Email', name: 'Booking B2B', client: 'Нуралиев Данияр', supplier: 'Booking B2B', online: '1 ч назад',
    createdAt: '14.06.2026', responsibleOperator: 'Даниель', connectionStatus: 'Подключено', pinned: false, unread: 1,
    relatedServices: ['S2'], participants: [{ name: 'Booking B2B', role: 'Поставщик' }, { name: 'Даниель', role: 'Оператор' }],
    messages: [
      { from: 'me', author: 'Даниель', text: 'Уточните тариф по Hilton Istanbul на 7 ночей, BB.', time: '13:20', read: true },
      { from: 'them', author: 'Booking B2B', text: 'Тариф подтверждён, бронь под гарантию до 16.06.', time: '14:18' },
    ],
    internal: [] },
  { id: 4, order: 51162, type: 'system', channel: 'Система', name: 'События заказа № 51162', client: 'Нуралиев Данияр', online: 'сейчас',
    createdAt: '14.06.2026', responsibleOperator: 'Даниель', connectionStatus: 'Подключено', pinned: false, unread: 0,
    relatedServices: ['S1'], participants: [{ name: 'Система', role: 'Бот' }],
    messages: [
      { from: 'system', text: 'Назначен ответственный: Даниель', time: '14:05' },
      { from: 'system', text: 'Получен ответ от поставщика Air Astana по запросу №34251. Статус: Подтверждено', time: '15:40', action: { label: 'Открыть ответ', service: 'S1' } },
      { from: 'system', text: 'Тайм-лимит выписки авиабилетов — сегодня 18:00', time: '16:00' },
    ],
    internal: [] },
  { id: 5, order: 51162, type: 'operator', channel: 'MAX', name: 'Команда заказа № 51162', client: 'Нуралиев Данияр', online: '3 мин назад',
    createdAt: '14.06.2026', responsibleOperator: 'Даниель', connectionStatus: 'Подключено', pinned: false, unread: 0,
    relatedServices: [], participants: [{ name: 'Даниель', role: 'Оператор' }, { name: 'Адилет', role: 'Оператор' }, { name: 'Кими', role: 'Бухгалтер' }],
    messages: [
      { from: 'them', author: 'Кими', text: 'Счёт по варианту A сформирую после согласования клиента.', time: '15:55' },
      { from: 'me', author: 'Даниель', text: 'Клиент согласовал A, можно выставлять.', time: '15:58', read: true },
    ],
    internal: [] },


  { id: 6, order: 51170, type: 'client', channel: 'MAX', name: 'ОсОО "Asia Travel"', client: 'Каримов Икрам', online: '1 ч назад',
    createdAt: '12.06.2026', responsibleOperator: 'Куба', connectionStatus: 'Подключено', pinned: false, unread: 0,
    relatedServices: ['S1'], participants: [{ name: 'Каримов Икрам', role: 'Клиент' }, { name: 'Куба', role: 'Оператор' }],
    messages: [{ from: 'them', author: 'Каримов Икрам', text: 'Подтвердите, пожалуйста, статус заявки на 6 человек.', time: '11:20' }, { from: 'me', author: 'Куба', text: 'В работе, выписываем билеты до 18:00.', time: '11:40', read: true }],
    internal: [] },
  { id: 7, order: 51170, type: 'supplier', channel: 'API', name: 'Qatar Airways', client: 'Каримов Икрам', supplier: 'Qatar Airways', online: '20 мин назад',
    createdAt: '12.06.2026', responsibleOperator: 'Куба', connectionStatus: 'Подключено', pinned: false, unread: 1,
    relatedServices: ['S1'], participants: [{ name: 'Qatar Airways', role: 'Поставщик' }, { name: 'Куба', role: 'Оператор' }],
    messages: [{ from: 'me', author: 'Куба', text: 'Нужна выписка по PNR QR9981, тайм-лимит горит.', time: '16:05', read: true }, { from: 'them', author: 'Qatar Airways', text: 'Принято в обработку, ответим в течение часа.', time: '16:20' }],
    internal: [{ from: 'system', text: 'Тайм-лимит выписки сегодня 18:00', time: '16:00' }] },
  { id: 8, order: 51170, type: 'operator', channel: 'Телефон', name: 'Куба ↔ Даниель', client: 'Каримов Икрам', online: 'вчера',
    createdAt: '12.06.2026', responsibleOperator: 'Куба', connectionStatus: 'Подключено', pinned: false, unread: 0,
    relatedServices: [], participants: [{ name: 'Куба', role: 'Оператор' }, { name: 'Даниель', role: 'Оператор' }],
    messages: [{ from: 'them', author: 'Даниель', text: 'Передаю заказ тебе на сегодня, я на встрече.', time: 'Вчера' }, { from: 'me', author: 'Куба', text: 'Принял, держу тайм-лимит.', time: 'Вчера', read: true }],
    internal: [] },


  { id: 9, order: 51163, type: 'client', channel: 'MAX', name: 'Аттокуров Эрбол', client: 'Аттокуров Эрбол', online: '2 ч назад',
    createdAt: '14.06.2026', responsibleOperator: 'Даниель', connectionStatus: 'Подключено', pinned: false, unread: 1,
    relatedServices: [], participants: [{ name: 'Аттокуров Эрбол', role: 'Клиент' }, { name: 'Даниель', role: 'Оператор' }],
    messages: [{ from: 'them', author: 'Аттокуров Эрбол', text: 'Загрузил паспорт, проверьте пожалуйста.', time: '09:10', attach: { name: 'passport.jpg', size: '1.1 МБ' } }],
    internal: [{ from: 'me', author: 'Даниель', text: 'Скан читаемый, отправляю на проверку визы.', time: '09:20', read: true }] },
  { id: 10, order: 51163, type: 'supplier', channel: 'API', name: 'Amadeus GDS', client: 'Аттокуров Эрбол', supplier: 'Amadeus GDS', online: '3 ч назад',
    createdAt: '13.06.2026', responsibleOperator: 'Даниель', connectionStatus: 'Отключено', pinned: false, unread: 0,
    relatedServices: ['S1'], participants: [{ name: 'Amadeus GDS', role: 'Поставщик' }, { name: 'Даниель', role: 'Оператор' }],
    messages: [{ from: 'me', author: 'Даниель', text: 'Запрос на аннуляцию AV-51163, ожидаем расчёт штрафа.', time: '12:10', read: false }],
    internal: [{ from: 'me', author: 'Даниель', text: 'Тариф невозвратный, аннуляция со 100% штрафом.', time: '12:12', read: true }] },
  { id: 11, order: 51163, type: 'local_supplier', channel: 'Email', name: 'Asia Local DMC', client: 'Аттокуров Эрбол', supplier: 'Asia Local DMC', online: 'вчера',
    createdAt: '13.06.2026', responsibleOperator: 'Даниель', connectionStatus: 'Подключено', pinned: false, unread: 0,
    relatedServices: ['S3'], participants: [{ name: 'Asia Local DMC', role: 'Локальный поставщик' }, { name: 'Даниель', role: 'Оператор' }],
    messages: [{ from: 'them', author: 'Asia Local DMC', text: 'Трансфер подтверждён, встреча с табличкой у выхода 3.', time: 'Вчера' }],
    internal: [] },


  { id: 12, order: 51156, type: 'client', channel: 'Email', name: 'Сагынбеков Икрам', client: 'Сагынбеков Икрам', online: 'вчера',
    createdAt: '10.06.2026', responsibleOperator: 'Кими', connectionStatus: 'Подключено', pinned: false, unread: 0,
    relatedServices: [], participants: [{ name: 'Сагынбеков Икрам', role: 'Клиент' }, { name: 'Кими', role: 'Оператор' }],
    messages: [{ from: 'me', author: 'Кими', text: 'Тур «Анталия All Inclusive» забронирован, ожидаем предоплату.', time: 'Вчера', read: true }],
    internal: [] },
  { id: 13, order: 51156, type: 'supplier', channel: 'Email', name: 'Coral Travel', client: 'Сагынбеков Икрам', supplier: 'Coral Travel', online: 'вчера',
    createdAt: '10.06.2026', responsibleOperator: 'Кими', connectionStatus: 'Подключено', pinned: false, unread: 0,
    relatedServices: ['S2'], participants: [{ name: 'Coral Travel', role: 'Поставщик' }, { name: 'Кими', role: 'Оператор' }],
    messages: [{ from: 'them', author: 'Coral Travel', text: 'Блок мест держим до 17.06.', time: 'Вчера' }],
    internal: [] },
  { id: 14, order: 51156, type: 'local_supplier', channel: 'Телефон', name: 'Antalya Transfers', client: 'Сагынбеков Икрам', supplier: 'Antalya Transfers', online: '2 дн назад',
    createdAt: '10.06.2026', responsibleOperator: 'Кими', connectionStatus: 'Подключено', pinned: false, unread: 0,
    relatedServices: ['S3'], participants: [{ name: 'Antalya Transfers', role: 'Локальный поставщик' }, { name: 'Кими', role: 'Оператор' }],
    messages: [{ from: 'them', author: 'Antalya Transfers', text: 'Машина и водитель назначены на дату заезда.', time: '2 дн назад' }],
    internal: [] },
  { id: 15, order: 51156, type: 'system', channel: 'Система', name: 'События заказа № 51156', client: 'Сагынбеков Икрам', online: 'сейчас',
    createdAt: '10.06.2026', responsibleOperator: 'Кими', connectionStatus: 'Подключено', pinned: false, unread: 0,
    relatedServices: [], participants: [{ name: 'Система', role: 'Бот' }],
    messages: [
      { from: 'system', text: 'Заказ создан и назначен оператору Кими', time: '10.06 · 10:00' },
      { from: 'system', text: 'Ожидается предоплата от клиента', time: '10.06 · 10:05' },
    ],
    internal: [] },
];

export { CHATS, CHAT_TYPES, CHAT_TYPE_LABEL, CHAT_CHANNEL_TONE, CHAT_CHANNELS, CHAT_THREADS };
