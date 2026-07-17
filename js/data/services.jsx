const SVC_DATA = {
  rail: {

    offers: [
      { id: 'R1', number: '752А', name: 'САПСАН', carrier: 'РЖД',
        dep: { time: '07:30', date: '20 июн, сб', city: 'Москва', station: 'Казанский вокзал' },
        arr: { time: '11:15', date: '20 июн, сб', city: 'Санкт-Петербург', station: 'Московский вокзал' },
        dur: '3 ч 45 мин', stops: 'Прямой', priceRub: 4560, cls: 'Купе', freeSeats: 54,
        tags: ['Купейный', 'РЖД'], supplier: 'РЖД (GDS)', currency: 'RUB', cost: 4560, fee: 250,
        title: 'Поезд 752А «САПСАН»', sub: 'Москва → Санкт-Петербург',
        info: [{ l: 'Отправление', v: '07:30 · 20 июн' }, { l: 'Прибытие', v: '11:15 · 20 июн' }, { l: 'В пути', v: '3 ч 45 мин' }] },
      { id: 'R2', number: '770А', name: 'Ласточка', carrier: 'РЖД',
        dep: { time: '08:40', date: '20 июн, сб', city: 'Москва', station: 'Ленинградский вокзал' },
        arr: { time: '12:30', date: '20 июн, сб', city: 'Санкт-Петербург', station: 'Московский вокзал' },
        dur: '3 ч 50 мин', stops: 'Прямой', priceRub: 3250, cls: 'Сидячий', freeSeats: 112,
        tags: ['Сидячий', 'РЖД'], supplier: 'РЖД (GDS)', currency: 'RUB', cost: 3250, fee: 220,
        title: 'Поезд 770А «Ласточка»', sub: 'Москва → Санкт-Петербург',
        info: [{ l: 'Отправление', v: '08:40 · 20 июн' }, { l: 'Прибытие', v: '12:30 · 20 июн' }, { l: 'В пути', v: '3 ч 50 мин' }] },
      { id: 'R3', number: '028А', name: 'Гранд Экспресс', carrier: 'ТКС',
        dep: { time: '22:10', date: '20 июн, сб', city: 'Москва', station: 'Ленинградский вокзал' },
        arr: { time: '08:30', date: '21 июн, вс', city: 'Санкт-Петербург', station: 'Московский вокзал' },
        dur: '10 ч 20 мин', stops: 'Прямой', priceRub: 8950, cls: 'СВ', freeSeats: 18,
        tags: ['СВ', 'ТКС'], supplier: 'ТКС (API)', currency: 'RUB', cost: 8950, fee: 400,
        title: 'Поезд 028А «Гранд Экспресс»', sub: 'Москва → Санкт-Петербург',
        info: [{ l: 'Отправление', v: '22:10 · 20 июн' }, { l: 'Прибытие', v: '08:30 · 21 июн' }, { l: 'В пути', v: '10 ч 20 мин' }] },
      { id: 'R4', number: '016А', name: 'Экспресс', carrier: 'РЖД',
        dep: { time: '13:50', date: '20 июн, сб', city: 'Москва', station: 'Ленинградский вокзал' },
        arr: { time: '23:05', date: '20 июн, сб', city: 'Санкт-Петербург', station: 'Московский вокзал' },
        dur: '9 ч 15 мин', stops: 'Прямой', priceRub: 2980, cls: 'Плацкарт', freeSeats: 102,
        tags: ['Плацкартный', 'РЖД'], supplier: 'РЖД (GDS)', currency: 'RUB', cost: 2980, fee: 180,
        title: 'Поезд 016А', sub: 'Москва → Санкт-Петербург',
        info: [{ l: 'Отправление', v: '13:50 · 20 июн' }, { l: 'Прибытие', v: '23:05 · 20 июн' }, { l: 'В пути', v: '9 ч 15 мин' }] },
      { id: 'R5', number: '004А', name: 'САПСАН', carrier: 'РЖД',
        dep: { time: '19:30', date: '20 июн, сб', city: 'Москва', station: 'Казанский вокзал' },
        arr: { time: '23:25', date: '20 июн, сб', city: 'Санкт-Петербург', station: 'Московский вокзал' },
        dur: '3 ч 55 мин', stops: 'Прямой', priceRub: 15800, cls: 'Люкс', freeSeats: 6,
        tags: ['Люкс', 'РЖД'], supplier: 'РЖД (GDS)', currency: 'RUB', cost: 15800, fee: 600,
        title: 'Поезд 004А «САПСАН»', sub: 'Москва → Санкт-Петербург',
        info: [{ l: 'Отправление', v: '19:30 · 20 июн' }, { l: 'Прибытие', v: '23:25 · 20 июн' }, { l: 'В пути', v: '3 ч 55 мин' }] },
    ],
    registry: [
      { no: 'RW-51201', order: 51162, main: 'Москва → Санкт-Петербург', sub: 'Сапсан 752А · Купе', date: '20.06.26', qty: 2, status: 'Забронировано', sum: 9620, currency: 'RUB' },
      { no: 'RW-51188', order: 51156, main: 'Москва → Санкт-Петербург', sub: 'Ласточка 770А · Сидячий', date: '26.06.26', qty: 4, status: 'Выписано', sum: 13880, currency: 'RUB' },
      { no: 'RW-51177', order: 51170, main: 'Москва → Санкт-Петербург', sub: 'Сапсан 754А · Купе', date: '02.07.26', qty: 6, status: 'Поиск', sum: 0, currency: 'RUB' },
    ],
  },
  hotels: {
    offers: [
      { id: 'H1', title: 'Hilton Istanbul Bosphorus 4★', sub: 'Şişli · 1.2 км от центра', info: [{ l: 'Заезд', v: '24.06' }, { l: 'Выезд', v: '01.07' }, { l: 'Ночей', v: '7' }], tags: ['Завтрак', 'Wi-Fi', 'Бассейн', 'Standard Double'], supplier: 'Booking B2B', cost: 980, fee: 25 },
      { id: 'H2', title: 'Holiday Inn Şişli 3★', sub: 'Şişli · 2.0 км от центра', info: [{ l: 'Заезд', v: '24.06' }, { l: 'Выезд', v: '01.07' }, { l: 'Ночей', v: '7' }], tags: ['Завтрак', 'Wi-Fi', 'Twin Room'], supplier: 'Expedia TAAP', cost: 710, fee: 20 },
      { id: 'H3', title: 'Swissôtel The Bosphorus 5★', sub: 'Beşiktaş · вид на Босфор', info: [{ l: 'Заезд', v: '24.06' }, { l: 'Выезд', v: '01.07' }, { l: 'Ночей', v: '7' }], tags: ['Полупансион', 'Спа', 'Deluxe'], supplier: 'Booking B2B', cost: 1820, fee: 45 },
    ],
    registry: [
      { no: 'HT-51162', order: 51162, main: 'Hilton Istanbul 4★', sub: 'Стамбул · Standard Double', date: '24.06 – 01.07', qty: 2, status: 'Забронировано', sum: 1005 },
      { no: 'HT-51168', order: 51168, main: 'Jannat Resort 4★', sub: 'Иссык-Куль · Family', date: '10.07 – 15.07', qty: 4, status: 'Подтверждено', sum: 640 },
      { no: 'HT-51155', order: 51155, main: 'Rixos Premium 5★', sub: 'Анталия · Suite', date: '01.08 – 10.08', qty: 2, status: 'Предложение', sum: 2300 },
    ],
  },
  transfers: {
    offers: [
      { id: 'T1', title: 'Mercedes Vito (минивэн)', sub: 'до 6 пассажиров · 6 мест багажа', info: [{ l: 'Подача', v: 'IST аэропорт' }, { l: 'Назначение', v: 'Hilton Istanbul' }, { l: 'Время', v: '24.06 · 09:30' }], tags: ['Встреча с табличкой', 'Детское кресло'], supplier: 'Karimov Transfer', cost: 55, fee: 5 },
      { id: 'T2', title: 'Toyota Camry (седан)', sub: 'до 3 пассажиров', info: [{ l: 'Подача', v: 'IST аэропорт' }, { l: 'Назначение', v: 'Hilton Istanbul' }, { l: 'Время', v: '24.06 · 09:30' }], tags: ['Эконом'], supplier: 'IST Transfer', cost: 32, fee: 3 },
      { id: 'T3', title: 'Mercedes S-class (VIP)', sub: 'до 3 пассажиров · бизнес', info: [{ l: 'Подача', v: 'IST аэропорт' }, { l: 'Назначение', v: 'Hilton Istanbul' }, { l: 'Время', v: '24.06 · 09:30' }], tags: ['Бизнес', 'Вода', 'Wi-Fi'], supplier: 'VIP Cars', cost: 120, fee: 8 },
    ],
    registry: [
      { no: 'TR-51162', order: 51162, main: 'IST → Hilton Istanbul', sub: 'Минивэн Vito · встреча', date: '24.06.26', qty: 2, status: 'Подтверждено', sum: 60 },
      { no: 'TR-51170', order: 51170, main: 'FRU → центр', sub: 'Седан · эконом', date: '28.06.26', qty: 3, status: 'Забронировано', sum: 18 },
      { no: 'TR-51156', order: 51156, main: 'Аэропорт AYT → отель', sub: 'Автобус · группа 10', date: '01.08.26', qty: 10, status: 'Предложение', sum: 140 },
    ],
  },
  buses: {
    offers: [
      { id: 'B1', title: 'Setra S 415', sub: 'Перевозчик AsiaBus', info: [{ l: 'Отправление', v: '08:00 · 24.06' }, { l: 'Прибытие', v: '16:30 · 24.06' }, { l: 'В пути', v: '8 ч 30 м' }], tags: ['Wi-Fi', 'Кондиционер', '45 мест'], supplier: 'AsiaBus', cost: 25, fee: 2 },
      { id: 'B2', title: 'Neoplan Cityliner', sub: 'Перевозчик Bishkek Express', info: [{ l: 'Отправление', v: '21:00 · 24.06' }, { l: 'Прибытие', v: '05:00 · 25.06' }, { l: 'В пути', v: '8 ч 00 м' }], tags: ['Ночной', 'Туалет', '49 мест'], supplier: 'Bishkek Express', cost: 22, fee: 2 },
      { id: 'B3', title: 'Mercedes Tourismo', sub: 'Перевозчик Silk Road', info: [{ l: 'Отправление', v: '10:30 · 24.06' }, { l: 'Прибытие', v: '18:40 · 24.06' }, { l: 'В пути', v: '8 ч 10 м' }], tags: ['Wi-Fi', 'USB', '51 место'], supplier: 'Silk Road', cost: 28, fee: 2 },
    ],
    registry: [
      { no: 'BS-51190', order: 51156, main: 'Бишкек → Алматы', sub: 'AsiaBus · Setra', date: '24.06.26', qty: 12, status: 'Забронировано', sum: 324 },
      { no: 'BS-51172', order: 51162, main: 'Бишкек → Чолпон-Ата', sub: 'Silk Road · группа', date: '10.07.26', qty: 20, status: 'Выписано', sum: 600 },
      { no: 'BS-51155', order: 51155, main: 'Алматы → Бишкек', sub: 'Bishkek Express', date: '12.08.26', qty: 4, status: 'Поиск', sum: 0 },
    ],
  },
  tours: {
    offers: [
      { id: 'G1', title: 'Анталия · All Inclusive', sub: 'Rixos Premium Belek 5★', info: [{ l: 'Даты', v: '24.06 – 01.07' }, { l: 'Ночей', v: '7' }, { l: 'Питание', v: 'Ultra AI' }], tags: ['Перелёт включён', 'Трансфер', 'Страховка'], supplier: 'Coral Travel', cost: 820, fee: 40 },
      { id: 'G2', title: 'Дубай · экскурсионный', sub: 'Rove Downtown 4★', info: [{ l: 'Даты', v: '24.06 – 30.06' }, { l: 'Ночей', v: '6' }, { l: 'Питание', v: 'Завтрак' }], tags: ['Перелёт включён', '3 экскурсии'], supplier: 'Anex Tour', cost: 690, fee: 35 },
      { id: 'G3', title: 'Иссык-Куль · оздоровительный', sub: 'Karven 4 Seasons 4★', info: [{ l: 'Даты', v: '10.07 – 17.07' }, { l: 'Ночей', v: '7' }, { l: 'Питание', v: 'Полный пансион' }], tags: ['Трансфер', 'Спа-программа'], supplier: 'Kyrgyz Concept', cost: 410, fee: 20 },
    ],
    registry: [
      { no: 'GT-51156', order: 51156, main: 'Анталия · All Inclusive', sub: 'Rixos Premium 5★ · 10 чел', date: '24.06 – 01.07', qty: 10, status: 'Согласование', sum: 8500 },
      { no: 'GT-51170', order: 51170, main: 'Дубай · экскурсионный', sub: 'Rove Downtown 4★ · 6 чел', date: '24.06 – 30.06', qty: 6, status: 'Забронировано', sum: 4140 },
      { no: 'GT-51168', order: 51168, main: 'Иссык-Куль · оздоровит.', sub: 'Karven 4 Seasons · 4 чел', date: '10.07 – 17.07', qty: 4, status: 'Предложение', sum: 1640 },
    ],
  },



  aero: {
    offers: [

      { id: 'AE1', fareType: 'single', title: 'Стандарт', sub: 'Аэроэкспресс · электронный билет', supplier: 'Аэроэкспресс', currency: 'RUB', cost: 500, fee: 50,
        info: [{ l: 'Тариф', v: 'Стандарт' }, { l: 'Поездок', v: '1' }, { l: 'Срок действия', v: '30 дней' }], tags: ['В одну сторону', 'Электронный билет'] },
      { id: 'AE2', fareType: 'single', title: 'Бизнес-класс', sub: 'Аэроэкспресс · вагон бизнес-класса', supplier: 'Аэроэкспресс', currency: 'RUB', cost: 1000, fee: 80,
        info: [{ l: 'Тариф', v: 'Бизнес' }, { l: 'Поездок', v: '1' }, { l: 'Срок действия', v: '30 дней' }], tags: ['В одну сторону', 'Бизнес-вагон', 'Отдельный зал'] },

      { id: 'AE3', fareType: 'rt', title: 'Стандарт · туда-обратно', sub: 'Аэроэкспресс · электронный билет', supplier: 'Аэроэкспресс', currency: 'RUB', cost: 1000, fee: 90,
        info: [{ l: 'Тариф', v: 'Стандарт' }, { l: 'Поездок', v: '2' }, { l: 'Срок действия', v: '30 дней' }], tags: ['Туда и обратно', 'Электронный билет'] },
      { id: 'AE4', fareType: 'rt', title: 'Бизнес · туда-обратно', sub: 'Аэроэкспресс · вагон бизнес-класса', supplier: 'Аэроэкспресс', currency: 'RUB', cost: 2000, fee: 150,
        info: [{ l: 'Тариф', v: 'Бизнес' }, { l: 'Поездок', v: '2' }, { l: 'Срок действия', v: '30 дней' }], tags: ['Туда и обратно', 'Бизнес-вагон'] },
      { id: 'AE5', fareType: 'rt', title: 'Семейный · до 5 пассажиров', sub: 'Аэроэкспресс · групповой билет', supplier: 'Аэроэкспресс', currency: 'RUB', cost: 1500, fee: 120,
        info: [{ l: 'Тариф', v: 'Семейный' }, { l: 'Пассажиров', v: 'до 5' }, { l: 'Срок действия', v: '30 дней' }], tags: ['Туда и обратно', 'До 5 пассажиров'] },

      { id: 'AE6', fareType: 'pass', title: 'Абонемент · 10 поездок', sub: 'Аэроэкспресс · 30 дней', supplier: 'Аэроэкспресс', currency: 'RUB', cost: 2200, fee: 150,
        info: [{ l: 'Тариф', v: 'Абонемент' }, { l: 'Поездок', v: '10' }, { l: 'Срок действия', v: '30 дней' }], tags: ['Абонемент', '10 поездок'] },
      { id: 'AE7', fareType: 'pass', title: 'Безлимитный · 30 дней', sub: 'Аэроэкспресс · без ограничений', supplier: 'Аэроэкспресс', currency: 'RUB', cost: 10500, fee: 300,
        info: [{ l: 'Тариф', v: 'Безлимит' }, { l: 'Поездок', v: '∞' }, { l: 'Срок действия', v: '30 дней' }], tags: ['Абонемент', 'Безлимит'] },
      { id: 'AE8', fareType: 'pass', title: 'Бизнес-абонемент · 10 поездок', sub: 'Аэроэкспресс · вагон бизнес-класса', supplier: 'Аэроэкспресс', currency: 'RUB', cost: 6500, fee: 250,
        info: [{ l: 'Тариф', v: 'Бизнес-абонемент' }, { l: 'Поездок', v: '10' }, { l: 'Срок действия', v: '30 дней' }], tags: ['Абонемент', 'Бизнес', '10 поездок'] },
    ],
    registry: [
      { no: 'AX-51162', order: 51162, main: 'Шереметьево (SVO) ⇄ город', sub: 'Стандарт · туда-обратно · 2 пасс.', date: '24.06.26', qty: 2, status: 'Забронировано', sum: 2000, currency: 'RUB' },
      { no: 'AX-51170', order: 51170, main: 'Домодедово (DME) → город', sub: 'Бизнес-класс · в одну сторону', date: '28.06.26', qty: 1, status: 'Выписано', sum: 1000, currency: 'RUB' },
      { no: 'AX-51156', order: 51156, main: 'Внуково (VKO) ⇄ город', sub: 'Абонемент · 10 поездок', date: '01.07.26', qty: 1, status: 'Предложение', sum: 2200, currency: 'RUB' },
    ],
  },


  lounge: {
    offers: [
      { id: 'L1', title: 'Primeclass Lounge · IST', sub: 'Стамбул (IST) · международная зона вылета', supplier: 'Primeclass', currency: 'USD', cost: 45, fee: 5,
        info: [{ l: 'Аэропорт', v: 'Стамбул (IST)' }, { l: 'Зона', v: 'Международная' }, { l: 'Ожидание', v: 'до 4 ч' }], tags: ['Wi-Fi', 'Шведский стол', 'Бар', 'Комната отдыха'] },
      { id: 'L2', title: 'Mastercard Lounge · IST', sub: 'Стамбул (IST) · терминал вылета', supplier: 'DragonPass', currency: 'USD', cost: 38, fee: 4,
        info: [{ l: 'Аэропорт', v: 'Стамбул (IST)' }, { l: 'Зона', v: 'Международная' }, { l: 'Ожидание', v: 'до 3 ч' }], tags: ['Wi-Fi', 'Горячее питание', 'Душ', 'Пресса'] },
      { id: 'L3', title: 'Turkish Airlines Lounge · IST', sub: 'Стамбул (IST) · Business / Miles&Smiles', supplier: 'Turkish Airlines', currency: 'USD', cost: 70, fee: 6,
        info: [{ l: 'Аэропорт', v: 'Стамбул (IST)' }, { l: 'Зона', v: 'Международная' }, { l: 'Ожидание', v: 'до 5 ч' }], tags: ['Премиум', 'Горячее питание', 'Кинозал', 'Душ'] },
      { id: 'L4', title: 'Manas VIP Lounge · FRU', sub: 'Бишкек (FRU), Манас · зал повышенной комфортности', supplier: 'Manas VIP', currency: 'USD', cost: 30, fee: 3,
        info: [{ l: 'Аэропорт', v: 'Бишкек (FRU)' }, { l: 'Зона', v: 'Вылет' }, { l: 'Ожидание', v: 'до 3 ч' }], tags: ['Wi-Fi', 'Закуски', 'Напитки', 'Отдельный вход'] },
      { id: 'L5', title: 'Business Lounge · DXB Concourse B', sub: 'Дубай (DXB) · терминал 3', supplier: 'Marhaba', currency: 'USD', cost: 60, fee: 5,
        info: [{ l: 'Аэропорт', v: 'Дубай (DXB)' }, { l: 'Зона', v: 'Международная' }, { l: 'Ожидание', v: 'до 4 ч' }], tags: ['Wi-Fi', 'Шведский стол', 'Душ', 'Детская зона'] },
    ],
    registry: [
      { no: 'LG-51162', order: 51162, main: 'Primeclass Lounge · IST', sub: 'Бизнес-зал · 2 гостя', date: '24.06.26', qty: 2, status: 'Подтверждено', sum: 100, currency: 'USD' },
      { no: 'LG-51170', order: 51170, main: 'Turkish Airlines Lounge · IST', sub: 'Премиум · 1 гость', date: '28.06.26', qty: 1, status: 'Забронировано', sum: 76, currency: 'USD' },
      { no: 'LG-51155', order: 51155, main: 'Manas VIP Lounge · FRU', sub: 'Бизнес-зал · 2 гостя', date: '27.06.26', qty: 2, status: 'Предложение', sum: 66, currency: 'USD' },
    ],
  },
};




const HOTEL_AMENITIES = [
  { id: 'ac', icon: 'snowflake', label: 'Кондиционер' },
  { id: 'tv', icon: 'tv', label: 'Телевизор' },
  { id: 'safe', icon: 'lock', label: 'Сейф' },
  { id: 'minibar', icon: 'coffee', label: 'Мини-бар' },
  { id: 'wifi', icon: 'wifi', label: 'Wi-Fi бесплатно' },
  { id: 'robe', icon: 'sparkles', label: 'Халат и тапочки' },
  { id: 'desk', icon: 'briefcase', label: 'Рабочий стол' },
  { id: 'bath', icon: 'sun', label: 'Ванная с душем' },
];


function hotelTariffs(base) {
  return [
    { id: 'pop', name: 'Популярный', badge: 'Популярный', price: base,
      feats: [{ ok: true, t: 'Завтрак включён' }, { ok: true, t: 'Бесплатная отмена до 17.06.2026' }, { ok: true, t: 'Оплата на месте · без предоплаты' }] },
    { id: 'flex', name: 'Тариф с гибкой отменой', price: Math.round(base * 1.18),
      feats: [{ ok: true, t: 'Завтрак включён' }, { ok: true, t: 'Бесплатная отмена в любое время' }, { ok: true, t: 'Оплата на месте · без предоплаты' }] },
    { id: 'nobreak', name: 'Тариф без завтрака', price: Math.round(base * 0.88),
      feats: [{ ok: false, t: 'Без завтрака' }, { ok: false, t: 'Без бесплатной отмены' }, { ok: true, t: 'Оплата на месте' }] },
  ];
}


function hotelRooms(mult) {
  const m = mult || 1;
  const R = (id, name, base, beds, cap, count, area, floor) =>
    ({ id, name, base: Math.round(base * m), beds, cap, count, area, floor, tariffs: hotelTariffs(Math.round(base * m)) });
  return [
    R('superior', 'Superior Room', 12450, '1 большая кровать', 2, 5, 24, '2–9'),
    R('deluxe', 'Deluxe Room', 16200, '1 большая кровать', 2, 3, 32, '3–11'),
    R('junior', 'Junior Suite', 24800, '2 раздельные кровати', 2, 4, 40, '6–12'),
    R('suite', 'Suite', 34600, '1 большая кровать', 2, 2, 55, '10–14'),
    R('exec', 'Executive Suite', 48500, '1 большая кровать', 2, 1, 70, '14'),
    R('family', 'Family Room', 18900, '2 кровати', 4, 2, 38, '2–6'),
    R('standard', 'Standard Room', 9800, '1 кровать', 2, 6, 18, '1–5'),
  ];
}

const HOTELS = [
  { id: 'metropol', name: 'Metropol Hotel Moscow', stars: 5, addr: 'Тверская б-р, д. 2, Москва', district: 'Центр города', metro: 450,
    rating: 9.4, ratingText: 'Превосходно', reviews: 1243, base: 12450, breakfast: true, freeCancel: '17.06.2026', payAtHotel: true,
    supplier: 'Островок', phone: '+7 495 937-10-00', email: 'reservation@metropol-moscow.ru', addrFull: 'Тверская б-р, д. 2, Москва, 125009, Россия',
    rooms: hotelRooms(1) },
  { id: 'azimut', name: 'Azimut City Hotel Smolenskaya', stars: 4, addr: 'Смоленская ул., 8, Москва', district: 'Центр города', metro: 600,
    rating: 8.7, ratingText: 'Отлично', reviews: 892, base: 8900, breakfast: true, freeCancel: '17.06.2026', payAtHotel: true,
    supplier: 'Островок', phone: '+7 495 411-77-77', email: 'reservation@azimuthotels.com', addrFull: 'Смоленская ул., 8, Москва, 121099, Россия',
    rooms: hotelRooms(0.72) },
  { id: 'ibis', name: 'Ibis Moscow Centre Bakhrushina', stars: 3, addr: 'ул. Бахрушина, 11, Москва', district: 'Центр города', metro: 800,
    rating: 8.2, ratingText: 'Очень хорошо', reviews: 568, base: 6200, breakfast: true, freeCancel: '18.06.2026', payAtHotel: true,
    supplier: 'Островок', phone: '+7 495 660-09-09', email: 'h7141@accor.com', addrFull: 'ул. Бахрушина, 11, Москва, 115054, Россия',
    rooms: hotelRooms(0.5) },
  { id: 'ararat', name: 'Ararat Park Hyatt Moscow', stars: 5, addr: 'Неглинная ул., 4, Москва', district: 'Центр города', metro: 300,
    rating: 9.6, ratingText: 'Превосходно', reviews: 657, base: 24800, breakfast: true, freeCancel: '18.06.2026', payAtHotel: true,
    supplier: 'Островок', phone: '+7 495 783-12-34', email: 'moscow.park@hyatt.com', addrFull: 'Неглинная ул., 4, Москва, 109012, Россия',
    rooms: hotelRooms(1.99) },
  { id: 'radisson', name: 'Radisson Collection Hotel', stars: 5, addr: 'Кутузовский пр-т, 2/1, Москва', district: 'Дорогомилово', metro: 350,
    rating: 9.1, ratingText: 'Превосходно', reviews: 1024, base: 19500, breakfast: true, freeCancel: '17.06.2026', payAtHotel: false,
    supplier: 'Островок', phone: '+7 495 221-55-55', email: 'info.moscow@radissoncollection.com', addrFull: 'Кутузовский пр-т, 2/1, Москва, 121248, Россия',
    rooms: hotelRooms(1.56) },
  { id: 'novotel', name: 'Novotel Moscow City', stars: 4, addr: 'Пресненская наб., 2, Москва', district: 'Пресненский', metro: 200,
    rating: 8.6, ratingText: 'Отлично', reviews: 741, base: 10200, breakfast: true, freeCancel: '17.06.2026', payAtHotel: true,
    supplier: 'Островок', phone: '+7 495 114-95-00', email: 'h7726@accor.com', addrFull: 'Пресненская наб., 2, Москва, 123317, Россия',
    rooms: hotelRooms(0.82) },
  { id: 'mercure', name: 'Mercure Arbat Moscow', stars: 4, addr: 'Смоленская пл., 6, Москва', district: 'Арбат', metro: 500,
    rating: 8.4, ratingText: 'Очень хорошо', reviews: 503, base: 9400, breakfast: false, freeCancel: '16.06.2026', payAtHotel: true,
    supplier: 'Островок', phone: '+7 495 225-00-25', email: 'h9518@accor.com', addrFull: 'Смоленская пл., 6, Москва, 119121, Россия',
    rooms: hotelRooms(0.75) },
  { id: 'hostel', name: 'City Comfort Inn', stars: 2, addr: 'ул. Щепкина, 28, Москва', district: 'Мещанский', metro: 700,
    rating: 7.6, ratingText: 'Хорошо', reviews: 214, base: 4200, breakfast: false, freeCancel: '15.06.2026', payAtHotel: true,
    supplier: 'Островок', phone: '+7 495 120-30-40', email: 'book@citycomfort.ru', addrFull: 'ул. Щепкина, 28, Москва, 129110, Россия',
    rooms: hotelRooms(0.34) },
];


const HOTEL_DISTRICTS = ['Центр города', 'Арбат', 'Дорогомилово', 'Пресненский', 'Мещанский'];


const HOTEL_MEALS = [
  { id: 'RO', label: 'RO', full: 'Без питания' },
  { id: 'BB', label: 'BB', full: 'Завтрак' },
  { id: 'HB', label: 'HB', full: 'Полупансион' },
  { id: 'FB', label: 'FB', full: 'Полный пансион' },
  { id: 'AI', label: 'AI', full: 'Всё включено' },
];


const HOTEL_EXTRAS = [
  { cat: 'stay', icon: 'building', label: 'Проживание', items: [
    { id: 'early', label: 'Ранний заезд', note: 'с 06:00', price: 1500, per: 'room' },
    { id: 'late', label: 'Поздний выезд', note: 'до 18:00', price: 1500, per: 'room' },
    { id: 'extrabed', label: 'Дополнительная кровать', price: 1000, per: 'room' },
    { id: 'kidbed', label: 'Детская кровать', price: 0, per: 'room' },
    { id: 'upgrade', label: 'Повышение категории номера', note: 'Superior → Deluxe', price: 4000, per: 'room' },
  ] },
  { cat: 'meal', icon: 'utensils', label: 'Питание', items: [
    { id: 'breakfast', label: 'Завтрак (шведский стол)', price: 750, per: 'guest' },
    { id: 'lunch', label: 'Обед', price: 900, per: 'guest' },
    { id: 'dinner', label: 'Ужин', price: 1200, per: 'guest' },
  ] },
  { cat: 'transfer', icon: 'car', label: 'Трансферы', items: [
    { id: 'tr_in', label: 'Трансфер аэропорт → отель', price: 1800, per: 'unit' },
    { id: 'tr_out', label: 'Трансфер отель → аэропорт', price: 1800, per: 'unit' },
  ] },
  { cat: 'service', icon: 'sparkles', label: 'Сервис в отеле', items: [
    { id: 'parking', label: 'Парковка', note: 'на период проживания', price: 1000, per: 'unit' },
    { id: 'spa', label: 'SPA / фитнес доступ', price: 500, per: 'guest' },
    { id: 'welcome', label: 'Поздравление к приезду', price: 0, per: 'unit' },
    { id: 'roomservice', label: 'Поздний ужин (room service)', price: 500, per: 'unit' },
  ] },
  { cat: 'kids', icon: 'baby', label: 'Детские услуги', items: [
    { id: 'nanny', label: 'Услуги няни (час)', price: 1200, per: 'unit' },
    { id: 'kidsmenu', label: 'Детское меню', price: 600, per: 'guest' },
  ] },
  { cat: 'insurance', icon: 'shield', label: 'Страхование', items: [
    { id: 'med', label: 'Медицинская страховка', price: 450, per: 'guest' },
    { id: 'cancel', label: 'Страховка от невыезда', price: 700, per: 'guest' },
  ] },
  { cat: 'other', icon: 'briefcase', label: 'Прочее', items: [
    { id: 'flowers', label: 'Цветы в номер', price: 2500, per: 'unit' },
    { id: 'lateco', label: 'Дополнительный комплект полотенец', price: 0, per: 'room' },
  ] },
];

export {
  SVC_DATA,
  HOTEL_AMENITIES,
  hotelTariffs,
  hotelRooms,
  HOTELS,
  HOTEL_DISTRICTS,
  HOTEL_MEALS,
  HOTEL_EXTRAS,
};
