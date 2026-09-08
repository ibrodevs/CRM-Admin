import { getRuntimePreferences } from './preferences.js';

// Russian strings remain stable form values; only their displayed labels are translated.
const rows = `
Мой профиль|My profile|Менин профилим
Профиль|Profile|Профиль
Безопасность|Security|Коопсуздук
Уведомления|Notifications|Билдирүүлөр
Предпочтения|Preferences|Жеке жөндөөлөр
Доступы|Access|Кирүү укуктары
Мотивация|Incentives|Мотивация
Статистика|Statistics|Статистика
Рабочее время|Working time|Иш убактысы
Настройки|Settings|Жөндөөлөр
Настройки аккаунта|Account settings|Аккаунт жөндөөлөрү
Пользователи|Users|Колдонуучулар
Роли и права|Roles and permissions|Ролдор жана укуктар
Параметры системы|System parameters|Системанын параметрлери
Главное|Dashboard|Башкы бет
Заказы|Orders|Буйрутмалар
Оформление|Fulfillment|Тариздөө
Чаты|Chats|Чаттар
Подбор услуг|Service search|Кызмат издөө
Клиенты|Clients|Кардарлар
Компании|Companies|Компаниялар
Поставщики|Suppliers|Жеткирүүчүлөр
Ком. предложения|Proposals|Коммерциялык сунуштар
Финансы|Finance|Каржы
Редактор квитанций|Receipt editor|Квитанция редактору
Выйти|Sign out|Чыгуу
Сохранить|Save|Сактоо
Сохранить изменения|Save changes|Өзгөртүүлөрдү сактоо
Сохранение…|Saving…|Сакталууда…
Проверка…|Verifying…|Текшерилүүдө…
Изменить|Edit|Өзгөртүү
Редактировать|Edit|Түзөтүү
Вернуться|Back|Артка кайтуу
Отмена|Cancel|Жокко чыгаруу
Закрыть|Close|Жабуу
Удалить|Delete|Өчүрүү
Добавить|Add|Кошуу
Обновить|Refresh|Жаңыртуу
Применить|Apply|Колдонуу
Подтвердить|Confirm|Ырастоо
Отключить|Disable|Өчүрүү
Назад|Previous|Артка
Далее|Next|Кийинки
Страница|Page|Барак
из|of|ичинен
Загрузка…|Loading…|Жүктөлүүдө…
ФИО|Full name|Аты-жөнү
Должность|Position|Кызматы
Подразделение|Department|Бөлүм
Роль в системе|System role|Системадагы ролу
Руководитель|Supervisor|Жетекчи
Дата приёма на работу|Employment date|Жумушка кабыл алынган күн
Рабочий e-mail|Work email|Жумуш электрондук почтасы
Рабочий телефон|Work phone|Жумуш телефону
Внутренний номер|Extension|Ички номер
Статус|Status|Абалы
Часовой пояс|Time zone|Убакыт алкагы
Язык интерфейса|Interface language|Интерфейс тили
Изменить фото|Change photo|Сүрөттү өзгөртүү
Удалить фото|Remove photo|Сүрөттү өчүрүү
Последний вход|Last sign-in|Акыркы кирүү
ID или номер|ID or number|ID же номер
дд.мм.гггг|dd.mm.yyyy|кк.аа.жжжж
Работает|Working|Иштеп жатат
Отпуск|On vacation|Эмгек өргүүдө
Больничный|Sick leave|Оору боюнча өргүүдө
Выходной|Day off|Дем алышта
Онлайн|Online|Онлайн
Не в сети|Offline|Офлайн
Отошёл|Away|Убактылуу жок
Занят|Busy|Бош эмес
Админ|Admin|Админ
Оператор|Operator|Оператор
Бухгалтер|Accountant|Бухгалтер
Менеджер|Manager|Менеджер
Смена пароля|Change password|Сырсөздү өзгөртүү
Текущий пароль|Current password|Учурдагы сырсөз
Новый пароль|New password|Жаңы сырсөз
Подтвердите пароль|Confirm password|Сырсөздү ырастоо
Минимум 10 символов|At least 10 characters|Кеминде 10 белги
Повторите новый пароль|Repeat new password|Жаңы сырсөздү кайталаңыз
Изменить пароль|Change password|Сырсөздү өзгөртүү
Двухфакторная аутентификация|Two-factor authentication|Эки факторлуу аутентификация
Включена для входа в систему|Enabled for sign-in|Кирүү үчүн күйгүзүлгөн
Подтверждение входа через приложение|Verify sign-in with an authenticator app|Колдонмо аркылуу кирүүнү ырастоо
Активные устройства|Active devices|Активдүү түзмөктөр
Выйти со всех|Sign out other devices|Башка түзмөктөрдөн чыгуу
Текущее|Current|Учурдагы
Текущая|Current|Учурдагы
Активная|Active|Активдүү
Активные авторизации|Active sessions|Активдүү сессиялар
Создана|Created|Түзүлгөн
Устройство|Device|Түзмөк
Настройка 2FA|Set up 2FA|2FA жөндөө
Добавьте ключ в приложение аутентификации|Add this key to your authenticator app|Ачкычты аутентификация колдонмосуна кошуңуз
Секретный ключ|Secret key|Жашыруун ачкыч
Код из приложения|Authenticator code|Колдонмодогу код
Отключение 2FA|Disable 2FA|2FA өчүрүү
Подтвердите действие паролем и кодом|Confirm with your password and code|Сырсөз жана код менен ырастоо
Каналы доставки|Delivery channels|Жеткирүү каналдары
Общие события|General events|Жалпы окуялар
По услугам и действиям|By service and action|Кызматтар жана аракеттер боюнча
по вашим доступам|based on your permissions|укуктарыңызга ылайык
В системе (центр уведомлений)|In-app notification center|Системадагы билдирүү борбору
Push (моб. приложение)|Push (mobile app)|Push (мобилдик колдонмо)
Desktop (браузер)|Desktop (browser)|Desktop (браузер)
По новым заявкам|New requests|Жаңы өтүнмөлөр
По обменам и возвратам|Exchanges and refunds|Алмаштыруу жана кайтаруу
По просроченным задачам|Overdue tasks|Мөөнөтү өткөн тапшырмалар
По сообщениям чата|Chat messages|Чат билдирүүлөрү
По изменениям заказов|Order changes|Буйрутмалардын өзгөрүшү
Вам не назначены услуги — обратитесь к администратору.|No services assigned. Contact your administrator.|Кызматтар дайындалган эмес. Администраторго кайрылыңыз.
Тема оформления|Theme|Тема
Светлая|Light|Ачык
Тёмная|Dark|Караңгы
Системная|System|Системалык
Формат даты|Date format|Күндүн форматы
Формат времени|Time format|Убакыт форматы
24 часа|24 hours|24 саат
12 часов (AM/PM)|12 hours (AM/PM)|12 саат (AM/PM)
ДД.ММ.ГГГГ|DD.MM.YYYY|КК.АА.ЖЖЖЖ
ММ/ДД/ГГГГ|MM/DD/YYYY|АА/КК/ЖЖЖЖ
ГГГГ-ММ-ДД|YYYY-MM-DD|ЖЖЖЖ-АА-КК
Валюта по умолчанию|Default currency|Демейки валюта
Размер страницы списка|Rows per page|Барактагы саптар
Стартовая страница после входа|Start page after sign-in|Киргенден кийинки башкы барак
Роль и права|Role and permissions|Роль жана укуктар
Роль|Role|Роль
Доступные разделы|Available sections|Жеткиликтүү бөлүмдөр
Доступные поставщики|Available suppliers|Жеткиликтүү жеткирүүчүлөр
Доступные компании|Available companies|Жеткиликтүү компаниялар
Доступные виды услуг|Available service types|Жеткиликтүү кызмат түрлөрү
В пределах прав вашей организации|Within your organization's permissions|Уюмуңуздун укуктарынын чегинде
Матрица прав по ролям|Role permission matrix|Ролдордун укуктар матрицасы
Права доступа по ролям|Permissions by role|Ролдор боюнча укуктар
Доступ по видам услуг|Service access|Кызматтарга кирүү укугу
Полный доступ ко всем услугам заказа|Full access to all order services|Буйрутманын бардык кызматтарына толук укук
Оператор работает со всеми видами услуг без ограничений|Operator can use every service type|Оператор бардык кызмат түрлөрү менен иштей алат
Сохранить доступы|Save access|Укуктарды сактоо
прав|permissions|укук
Все виды услуг|All service types|Бардык кызмат түрлөрү
Не назначены|Not assigned|Дайындалган эмес
Просмотр|View|Көрүү
Поиск|Search|Издөө
Бронирование|Booking|Брондоо
Выписка|Issuing|Чыгаруу
Обмен|Exchange|Алмаштыруу
Возврат|Refund|Кайтаруу
Корректировка документов|Correct documents|Документтерди оңдоо
Отправка документов клиенту|Send documents to client|Кардарга документтерди жөнөтүү
Система мотивации|Incentive plan|Мотивация тутуму
Единые ставки для всех видов услуг|Same rates for all service types|Бардык кызматтарга бирдей чендер
Индивидуальные ставки по каждому виду услуг|Individual rates per service type|Ар бир кызматка өзүнчө чен
История изменений мотивации|Incentive change history|Мотивация өзгөрүүлөрүнүн тарыхы
Правила ещё не настроены.|No rules configured yet.|Эрежелер азырынча жөндөлө элек.
Обновлено правило «|Updated rule “|Жаңыртылган эреже «
Процент от сервисного сбора|Service fee percentage|Кызмат акысынын пайызы
Процент от агентской надбавки|Agency markup percentage|Агенттик үстөктүн пайызы
Процент от комиссионного вознаграждения|Commission percentage|Комиссиянын пайызы
Начало периода|Period start|Мезгилдин башталышы
Конец периода|Period end|Мезгилдин аягы
Экспорт|Export|Экспорт
Загрузка статистики…|Loading statistics…|Статистика жүктөлүүдө…
Оформлено заказов|Orders created|Таризделген буйрутмалар
Выписано услуг|Services issued|Чыгарылган кызматтар
Обменов|Exchanges|Алмаштыруулар
Возвратов|Refunds|Кайтаруулар
Среднее время обработки заявки|Average response time|Орточо жооп берүү убактысы
Общая прибыль (для компании)|Company profit|Компаниянын кирешеси
Заработок за период|Earnings for period|Мезгилдеги киреше
Отклик на заявку|Request response time|Өтүнмөгө жооп берүү убактысы
минут|minutes|мүнөт
История смен|Shift history|Нөөмөттөрдүн тарыхы
Дата|Date|Күнү
Смена|Shift|Нөөмөт
Отработано|Time worked|Иштеген убакыт
Операций|Operations|Операциялар
Смен пока нет|No shifts yet|Нөөмөттөр азырынча жок
Начало смены|Shift start|Нөөмөттүн башталышы
Окончание смены|Shift end|Нөөмөттүн аягы
Текущая длительность|Current duration|Учурдагы узактык
Отработано за месяц|Time worked this month|Ай ичинде иштеген убакыт
Операций за месяц|Operations this month|Ай ичиндеги операциялар
Смен за месяц|Shifts this month|Ай ичиндеги нөөмөттөр
Курсы валют|Exchange rates|Валюта курстары
Курс одной единицы валюты в основной валюте|Value of one currency unit in the base currency|Бир валюта бирдигинин негизги валютадагы баасы
Основная валюта|Base currency|Негизги валюта
Курс|Rate|Курс
Показать дополнительный расчёт|Show additional calculation|Кошумча эсептөөнү көрсөтүү
Добавить в список|Add to list|Тизмеге кошуу
Добавить валюту|Add currency|Валюта кошуу
Код валюты|Currency code|Валюта коду
Название валюты|Currency name|Валюта аталышы
Символ|Symbol|Белги
Сгенерировать|Generate|Түзүү
Наименование организации|Organization name|Уюмдун аталышы
Введите наименование на латинице|Enter the name in Latin characters|Аталышын латын тамгалары менен жазыңыз
Введите значение|Enter a value|Маани киргизиңиз
Выберите тип доступа|Select access type|Кирүү түрүн тандаңыз
Идет генерация API ключа|Generating API key|API ачкычы түзүлүүдө
Результаты API ключа|Generated API credentials|Түзүлгөн API ачкычтары
Генерация API ключа|Generate API key|API ачкычын түзүү
Доступы к API|API access|API кирүү укуктары
Организация|Organization|Уюм
Тип организации|Organization type|Уюмдун түрү
Дата создания|Creation date|Түзүлгөн күнү
Действия|Actions|Аракеттер
Получение аналитики|Read analytics|Аналитиканы окуу
Получение информации о клиентах|Read client information|Кардар маалыматтарын окуу
Доступ к данным|Read order and service data|Буйрутма жана кызмат маалыматтарын окуу
Добавить пользователя|Add user|Колдонуучу кошуу
Введите ФИО|Enter full name|Аты-жөнүн киргизиңиз
Телефон|Phone|Телефон
Выберите роль|Select a role|Ролду тандаңыз
Начальный пароль|Initial password|Баштапкы сырсөз
Активный|Active|Активдүү
Заблокированный|Suspended|Бөгөттөлгөн
Приглашён|Invited|Чакырылган
Настройки уведомлений|Notification settings|Билдирүү жөндөөлөрү
Доступ и нормативы оператора|Operator access and response targets|Оператордун укуктары жана ченемдери
пользователей|users|колдонуучу
Сотрудник|Employee|Кызматкер
Был активен|Last active|Акыркы активдүүлүк
Приглашение пользователя|User invitation|Колдонуучуну чакыруу
Одноразовая ссылка для установки пароля|One-time password setup link|Сырсөз орнотууга бир жолку шилтеме
Передайте ссылку пользователю. Срок действия — 7 дней.|Share the link with the user. Valid for 7 days.|Шилтемени колдонуучуга бериңиз. 7 күн жарактуу.
Копировать ссылку|Copy link|Шилтемени көчүрүү
Право доступа|Permission|Кирүү укугу
Загрузка пользователей…|Loading users…|Колдонуучулар жүктөлүүдө…
Настройки SLA|SLA settings|SLA жөндөөлөрү
Выберите сотрудника для настройки норматива отклика.|Select an employee to set their response target.|Жооп берүү ченемин коюу үчүн кызматкерди тандаңыз.
Настроить|Configure|Жөндөө
Видимость полей карточки для клиента|Client-visible card fields|Кардарга көрүнүүчү карточка талаалары
видно клиенту|visible to client|кардарга көрүнөт
внутреннее|internal|ички
Шаблоны документов|Document templates|Документ шаблондору
Сохранить шаблон|Save template|Шаблонду сактоо
Код шаблона|Template code|Шаблон коду
Название шаблона|Template name|Шаблондун аталышы
Тип документа|Document type|Документтин түрү
Опубликовать|Publish|Жарыялоо
Содержимое шаблона|Template content|Шаблондун мазмуну
К списку|Back to list|Тизмеге кайтуу
Добавить шаблон|Add template|Шаблон кошуу
Изменить шаблон|Edit template|Шаблонду өзгөртүү
Шаблон|Template|Шаблон
Версия|Version|Версия
Поиск в справочнике|Search directory|Маалымдамадан издөө
Аэропорты и города|Airports and cities|Аэропорттор жана шаарлар
Типы услуг|Service types|Кызмат түрлөрү
Общие настройки|General settings|Жалпы жөндөөлөр
Настройки уведомления|Notification settings|Билдирүү жөндөөлөрү
Справочники|Directories|Маалымдамалар
Справочник доп. услуг|Extra service catalog|Кошумча кызматтар маалымдамасы
Карточки услуг|Service cards|Кызмат карточкалары
Настройки карточек услуг|Service card settings|Кызмат карточкаларын жөндөө
Видимость полей для клиента|Client-visible fields|Кардарга көрүнүүчү талаалар
Изменить курс валют|Change exchange rates|Валюта курсун өзгөртүү
Добавить / удалить валюту|Add / remove currency|Валюта кошуу / өчүрүү
Сгенерировать API ключ|Generate API key|API ачкычын түзүү
Убрать доступ к API|Revoke API access|API укугун жокко чыгаруу
Коды ошибок интеграций|Integration error codes|Интеграция каталарынын коддору
Настройки карточек услуг · администратор|Service card settings · administrator|Кызмат карточкасынын жөндөөлөрү · администратор
Изменения применяются ко всей системе карточек услуг|Changes apply to all service cards|Өзгөртүүлөр бардык кызмат карточкаларына колдонулат
Виды услуг с карточками|Service types with cards|Карточкалары бар кызмат түрлөрү
Каналы отправки|Sending channels|Жөнөтүү каналдары
Тема|Subject|Тема
Текст письма|Email body|Каттын тексти
Включён|Enabled|Күйгүзүлгөн
Клиентское название сценария|Client-facing scenario name|Кардарга көрсөтүлүүчү сценарийдин аты
Основной ярлык|Primary label|Негизги аталыш
Варианты ярлыка (по строке)|Label variants (one per line)|Аталыштардын варианттары (ар бир сапта)
Действия клиента|Client actions|Кардардын аракеттери
Блоки карточки и порядок|Card blocks and order|Карточканын блоктору жана тартиби
`;
export const TRANSLATIONS = Object.fromEntries(rows.trim().split('\n').map((line) => { const [ru,en,ky] = line.split('|'); return [ru,{en,ky}]; }));
export function translate(text, language = getRuntimePreferences().language || 'ru') {
  if (typeof text !== 'string' || language === 'ru') return text;
  const key = text.trim();
  const value = TRANSLATIONS[key]?.[language];
  return value ? text.replace(key, value) : text;
}
