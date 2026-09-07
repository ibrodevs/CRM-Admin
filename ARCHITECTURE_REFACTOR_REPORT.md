# Архитектурный рефакторинг CRM-Admin

Дата: 7 сентября 2026. Ветка: `refactor/frontend-architecture`. Исходная версия: `e4b5e7a`.

## Что изменено

Рефакторинг выполнен поэтапными коммитами в frontend-репозитории. Backend, зависимости и lockfile не изменялись.

- Старое дерево `js/` заменено слоями `application`, `modules`, `shared`, `server`, `legacy`, `styles`.
- Из общего файла ресурсов выделены API предметных областей. HTTP transport остался единым. Смешанные CRM/workspace API распределены между владельцами; старые агрегаты доступны в compatibility-слое.
- Из корневого приложения выделены providers, маршрутизация, resource gate, обработчики заказов, навигация и глобальные панели. Сохранены порядок providers и клиентский вход с `ssr: false`.
- Страницы, мапперы, API и hooks собраны по доменам. Междоменные импорты используют публичные `index.js`, `api.js`, `model.js`; API entrypoints не требуют загрузки UI.
- Общие контролы вынесены из UI-монолита в `shared/ui`. Общая mutable-модель overlay сохранена.
- Клиенты и компании разделены на самостоятельные страницы. Документы, финансовый реестр и PDF helpers отделены от редактора квитанций.
- WorkspaceProvider сохранён как источник состояния; добавлены доменные фасады и композиционный hook приложения.
- BFF helper перемещён в `src/server/bff/backend.js`. Маршруты Next.js остались в `app/api`.
- Глобальные window-регистры и старые адаптеры локализованы в `legacy`.
- CSS разделён последним: tokens → base → layout → components, затем прежние дополнительные файлы в прежнем порядке.
- Добавлены архитектурная проверка, аудит сохранности исходников и локальный синтетический upstream для smoke-проверок.

## Что сохранено

| Область | Результат и основание |
| --- | --- |
| UI | JSX, тексты, классы и ресурсы сохранены; DOM 12 основных разделов совпал с исходной версией на одинаковых данных. |
| Business logic | Реализации вычислений и обработчиков перенесены без функциональных изменений; автоматический аудит сверяет исходные AST-контракты. |
| Backend API | HTTP-методы, URL, payload, обработка ошибок и idempotency сохранены. Backend не редактировался. |
| Auth behaviour | Сохранены BFF, HttpOnly cookies, refresh, login/logout и провайдер. Локальный smoke проверил cookie/session lifecycle. |
| CSS behaviour | Конкатенация четырёх частей globals побайтно равна исходнику; пять дополнительных CSS-файлов также идентичны. Порядок подключения сохранён. |
| User flows | Маршруты, resource gates, обработчики и формы сохранены. Полная приёмка всех сценариев на реальном backend не выполнялась. |

Это подтверждение сохранности реализации и перечисленных проверок, а не гарантия отсутствия любых возможных регрессий на production-данных.

## Итоговая структура

```text
app/
  page.jsx
  layout.jsx
  globals.css
  api/                         прежние Next.js маршруты
src/
  application/
    CRMApp.jsx
    providers.jsx
    model/                     композиция workspace и действия заказов
    routing/                   RouteRenderer, navigation, resource gate
    shell/                     AppShell, Sidebar, Topbar, GlobalSearch, drawers
  modules/
    account/        calendar/       chats/          clients/
    companies/      dashboard/      documents/      finance/
    integrations/   locations/      notifications/  orders/
    profile/        proposals/      receipts/       returns/
    services/       settings/       suppliers/      users/
    workforce/      workspace/
    # По необходимости: api/, model/, ui/, lib/ и публичные entrypoints.
    # services содержит специализированные flights/ и hotels/.
  shared/
    api/            auth/           constants/      icons/
    lib/            ui/             workspace/
  server/bff/backend.js
  legacy/
    adapters/
    compatibility/              provider, API aliases, window bridges
    data/
  styles/
    tokens.css
    base.css
    layout.css
    components.css
    components/                 location-autocomplete, compact-steppers
    modules/                    receipt styles
scripts/
  check-architecture.mjs
  verify-refactor.mjs
  lib/architecture.mjs
test/
  architecture.test.mjs
  fixtures/architecture-debt.json
  fixtures/crm-upstream.mjs
```

## Legacy и технический долг

Проверено 1 392 импорта. Сохранены 65 явно перечисленных зависимостей от legacy и две циклические компоненты. Проверка запрещает новые legacy-рёбра и новые циклические рёбра, но допускает удаление существующих.

1. `legacy/compatibility/workspace-provider.jsx` всё ещё владеет загрузками, состоянием и мутациями. Доменные hooks являются фасадами прежнего context. Удалять provider можно только после отдельного переноса владения состоянием с проверкой жизненного цикла и сценариев.
2. `legacy/data` и `legacy/adapters` сохраняют изменяемые структуры, статические справочники и старые преобразования, от которых зависят действующие экраны. Нельзя заменять mutable-объекты копиями без отдельной проверки семантики.
3. `people-globals.js`, `receipt-globals.js`, `shell-globals.js` сохраняют прежние window-регистры. Удаление требует поиска всех потребителей, включая внешние и динамические обращения.
4. Совместимые агрегаты `resources.js`, `crmApi.js`, `workspaceApi.js` оставлены только в legacy. Их можно удалять после устранения потребителей, а не вместе с переносом методов.
5. Двухфайловый цикл `legacy/data/index.jsx ↔ company-finance.jsx` сохранён. Вторая компонента включает 14 узлов UI и публичных entrypoints связанных сценариев dashboard/orders/proposals/returns/services. Разрыв требует отдельного изменения композиции.
6. ReceiptEditorPage, OrderCard и ServicesPage остаются крупными. Выполнено разделение по существующим границам ответственности; глубокое переписывание расчётов и бронирования намеренно не входит в этот рефакторинг.
7. ЖД, трансферы, автобусы и туры продолжают использовать общий ServiceFlow. Пустые каталоги и формальные wrappers не создавались.
8. Старые `scripts/apply-receipt-*` — исторические патчи, а не поддерживаемые повторяемые миграции. Пути актуализированы; запускать их повторно на переработанном коде без ревизии нельзя.

Полный перечень сохранённых рёбер: `test/fixtures/architecture-debt.json`.

## Проверки

| Команда / проверка | Результат |
| --- | --- |
| `npm test` | 315 passed, 0 failed. Исходные 312 тестов сохранены, добавлены 3 архитектурных. Source-based тесты адаптированы к новым путям и разделению файлов. |
| `npm run build` | Успешная итоговая production-сборка Next.js 15.5.21; prebuild повторно выполнил все 315 тестов. |
| `npm run check:architecture` | Успешно: 1 392 импорта, 65 известных legacy-рёбер, 2 сохранённые циклические компоненты. |
| `npm run verify:refactor` | Успешно: 1 750 сохранённых контрактов исходников, 6 идентичных CSS-источников, 19 идентичных ресурсов относительно `e4b5e7a`. |
| `git diff --check` | Успешно. |
| `npm run smoke:production` с локальным fixture | Успешно: login 200, cookies, session, refresh и ротация access cookie, 18 API-ресурсов, logout 204, session 401. |
| `npm run smoke:production` для настоящего production | Не выполнен: отсутствуют `SMOKE_LOGIN` и `SMOKE_PASSWORD`; скрипт завершился до проверки сервиса. |

Аудит `verify:refactor` сравнивает AST реализаций без импортов, комментариев и координат; учитывает переименование владельцев API и внедрение прежнего auth bridge. Изменённая корневая композиция проверяется отдельно через извлечённые statements, routing tests и браузер. Этот аудит вынесен из обычных тестов: будущие функциональные изменения не должны сохранять неизменность версии `e4b5e7a`.

В браузере исходная и новая версии запускались рядом с одинаковым синтетическим upstream. DOM совпал для всех 12 разделов: главное, заказы, подбор услуг, клиенты, компании, поставщики, КП, финансы, редактор квитанций, чаты, уведомления, настройки. При одинаковом viewport 1440×900 изображения 11 разделов совпали побайтно по пикселям после завершения анимаций. Для подбора услуг осталось небольшое расхождение в области боковой навигации; его причина не установлена, поэтому полное пиксельное совпадение всех экранов не заявляется. CSS и исходная разметка этого экрана прошли аудит сохранности.

Дополнительно открыты форма нового заказа и вкладки свободного бронирования: авиа, ЖД, отели, трансферы, автобус, страховка, дополнительная услуга. Проверены отображение форм и переключение вкладок. Реальные бронирования, финансовые операции, загрузки файлов и полный цикл квитанций на настоящих данных вручную не выполнялись. Fixture возвращает преимущественно пустые коллекции и не эмулирует бизнес-логику backend.

## Воспроизведение

Обычные проверки:

```bash
npm test
npm run check:architecture
npm run verify:refactor
npm run build
```

Для аудита требуется git-история с исходным коммитом `e4b5e7a`.

Локальный upstream в отдельном терминале:

```bash
node test/fixtures/crm-upstream.mjs
```

Приложение во втором терминале:

```bash
BACKEND_URL=http://127.0.0.1:3199 npm run dev -- --port 3102
```

Smoke в третьем терминале:

```bash
SMOKE_BASE_URL=http://localhost:3102 \
SMOKE_LOGIN=architecture@example.test \
SMOKE_PASSWORD=local-fixture \
SMOKE_EXPIRED_ACCESS=fixture-expired \
npm run smoke:production
```

Для проверки реального окружения нужно задать его `SMOKE_BASE_URL`, действительные credentials и при необходимости истёкший access token. Локальный fixture smoke не заменяет такую проверку. Деплой и push в рамках этой задачи не выполнялись.
