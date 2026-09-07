

# Travel Hub CRM

Frontend административной системы для управления корпоративными поездками. Интерфейс объединяет работу с заказами, пассажирами, услугами, поставщиками, финансами, документами, уведомлениями и внутренними коммуникациями.

## Стек

- Next.js 15
- React 18
- JavaScript и JSX
- CSS с общими дизайн-токенами

## Запуск

```bash
npm install
cp .env.example .env.local
npm run dev
```

Приложение будет доступно по адресу `http://localhost:3000`.
Backend должен быть доступен по адресу из `BACKEND_URL` (по умолчанию `http://127.0.0.1:8000`). JWT не передаётся JavaScript-коду браузера: Next.js BFF хранит access/refresh в `HttpOnly` cookies, обновляет access-токен и проксирует `/api/v1` запросы.

Для production-сборки:

```bash
npm run build
npm start
```

Production smoke после деплоя и reload backend:

```bash
SMOKE_LOGIN='admin@example.com' SMOKE_PASSWORD='***' npm run smoke:production
```

По умолчанию smoke проверяет `https://crm-admin-theta.vercel.app`, login cookies, `/api/session`, основные `/api/backend/*` ресурсы и logout. Для другого frontend URL задайте `SMOKE_BASE_URL`; для refresh-проверки можно передать заранее истёкший access token в `SMOKE_EXPIRED_ACCESS`.

## Структура проекта

```text
app/                       Next.js entrypoints и BFF routes
src/
  application/             композиция providers, routing, shell и обработчиков
  modules/<domain>/        UI, API, модели и мапперы предметной области
  shared/                  общие UI, HTTP, auth, utilities и context
  server/bff/              серверные helpers сессии и proxy
  legacy/                  изолированные адаптеры и compatibility bridges
  styles/                  tokens, base, layout, components и стили модулей
```

Подробная карта изменений, проверки и ограничения: [отчёт о рефакторинге](ARCHITECTURE_REFACTOR_REPORT.md).

## Архитектурные правила

- Направление зависимостей: `application → modules → shared`.
- Другой домен импортируется через публичные `index.js`, `api.js` или `model.js`; внутренние файлы доступны только своему модулю.
- Общий HTTP transport расположен в `src/shared/api`, предметные запросы — в `src/modules/<domain>/api`.
- Серверные helpers находятся в `src/server`; браузерные модули их не импортируют.
- WorkspaceProvider сохраняет прежнее поведение; доменные hooks предоставляют его отдельные части.
- Новые зависимости от legacy и новые циклы запрещены проверкой архитектуры. Существующие перечислены в `test/fixtures/architecture-debt.json`.
- Токены запрещено помещать в `localStorage`, session state или публичные переменные окружения.
- Изменения интерфейса и пользовательских сценариев требуют отдельной задачи.

## Проверка изменений

Перед отправкой изменений необходимо выполнить:

```bash
npm run check:architecture
npm run build
```

Также следует проверить вход, открытие основных разделов, карточку заказа, поиск услуг и работу боковых панелей.

Для container deployment доступен multi-stage `Dockerfile`:

```bash
docker build -t travelhub-frontend .
docker run --rm -p 3000:3000 -e BACKEND_URL=http://backend:8000 travelhub-frontend
```

Поиск услуг требует запущенного backend worker: `uv run python manage.py run_jobs`. Реальные поставщики подключаются adapter-модулями backend и их зашифрованными credentials; встроенный `mock` предназначен только для sandbox/приёмочного тестирования.
