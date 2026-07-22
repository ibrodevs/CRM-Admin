# Travel Hub CRM

Frontend административной системы для управления корпоративными поездками. Интерфейс объединяет работу с заказами, пассажирами, услугами, поставщиками, финансами, документами, уведомлениями и внутренними коммуникациями.

## Стек

- Next.js 14
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
app/                       Next.js entrypoints, BFF routes и глобальные стили
js/
  api/                     единый HTTP-клиент и API-модули предметных областей
  core/                    auth/workspace contexts и загрузка серверного состояния
  components/              переиспользуемые интерфейсные компоненты
  data/                    только статические UI-справочники и legacy-экраны
  features/                рабочие server-backed сценарии по доменам
  app.jsx                  маршрутизация разделов приложения
  layout.jsx               верхняя панель и элементы каркаса
  shell.jsx                боковая навигация и глобальные панели
  page_*.jsx               страницы разделов
  ui.jsx                   базовые UI-компоненты
image/                     изображения интерфейса
```

Рабочие реестры не импортируют изменяемые данные из `js/data`: заказы, CRM, поставщики, услуги, документы, финансы, чаты, уведомления и настройки получают состояние из backend.

## Архитектурные правила

- Страницы собирают сценарии, но не содержат общие компоненты других разделов.
- Переиспользуемые панели и контролы размещаются в `js/components`.
- Логика предметной области размещается в `js/features/<domain>`.
- Справочники и локальные хранилища группируются в `js/data`.
- Все изменяющие запросы идут через `js/api`, передают idempotency key и обрабатывают единый формат ошибок API.
- Токены запрещено помещать в `localStorage`, session state или публичные переменные окружения.
- Изменения интерфейса не должны менять существующие пользовательские сценарии без отдельного согласования.

## Проверка изменений

Перед отправкой изменений необходимо выполнить:

```bash
npm run build
```

Также следует проверить вход, открытие основных разделов, карточку заказа, поиск услуг и работу боковых панелей.

Для container deployment доступен multi-stage `Dockerfile`:

```bash
docker build -t travelhub-frontend .
docker run --rm -p 3000:3000 -e BACKEND_URL=http://backend:8000 travelhub-frontend
```

Поиск услуг требует запущенного backend worker: `uv run python manage.py run_jobs`. Реальные поставщики подключаются adapter-модулями backend и их зашифрованными credentials; встроенный `mock` предназначен только для sandbox/приёмочного тестирования.
