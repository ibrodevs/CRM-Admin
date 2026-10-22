import { useEffect, useState } from 'react';
import { Icon } from '../../../shared/icons/index.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { DateRangeField } from '../../../shared/ui/DateFields.jsx';
import { EmptyState } from '../../../shared/ui/EmptyState.jsx';
import { Field } from '../../../shared/ui/Field.jsx';
import { Input } from '../../../shared/ui/Input.jsx';
import { Pill } from '../../../shared/ui/Pill.jsx';
import { Select } from '../../../shared/ui/Select.jsx';
import { suppliersApi } from '../api/suppliersApi.js';

const statuses = { success: 'Успешно', ok: 'Успешно', failed: 'Ошибка', error: 'Ошибка', open: 'Новая', assigned: 'В работе', resolved: 'Решена', reopened: 'Открыта повторно', retrying: 'Повтор', snoozed: 'Отложена', escalated: 'Передана разработчикам' };
const operationLabels = {
  login: 'Авторизация', dictionary: 'Загрузка справочников', search: 'Поиск предложений',
  search_results: 'Результаты поиска', hotel_details: 'Информация об отеле',
  revalidate: 'Проверка цены и наличия', create_order: 'Создание заказа', book: 'Бронирование',
  search_orders: 'Поиск заказов', order_info: 'Информация о заказе', retrieve_item: 'Статус услуги',
  retrieve: 'Проверка бронирования', issue: 'Выписка', cancel: 'Отмена', refund_quote: 'Расчёт возврата', refund: 'Возврат',
};
const operationOptions = [{ value: '', label: 'Все операции' }, ...Object.entries(operationLabels).map(([value, label]) => ({ value, label }))];
const httpLabels = {
  200: 'Успешно', 201: 'Создано', 202: 'Принято в обработку', 204: 'Без содержимого',
  301: 'Постоянное перенаправление', 302: 'Временное перенаправление', 304: 'Не изменено',
  400: 'Некорректный запрос', 401: 'Требуется авторизация', 403: 'Доступ запрещён', 404: 'Не найдено',
  405: 'Метод не поддерживается', 408: 'Время ожидания истекло', 409: 'Конфликт',
  422: 'Ошибка проверки данных', 429: 'Слишком много запросов', 500: 'Внутренняя ошибка сервера',
  502: 'Ошибка шлюза', 503: 'Сервис недоступен', 504: 'Время ожидания шлюза истекло',
};
const calendarDate = (value) => value ? new Date(...value.split('-').map((part, index) => Number(part) - (index === 1 ? 1 : 0))) : null;
const filterDate = (value) => value ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}` : undefined;

const date = (value) => value ? new Date(value).toLocaleString('ru-RU') : '—';
const statusTone = (value) => ['success', 'ok', 'resolved'].includes(value) ? 'green' : ['failed', 'error', 'escalated'].includes(value) ? 'red' : 'amber';

function Payload({ title, value }) {
  return <div className="supplier-journal-payload"><h4>{title}</h4><pre>{value == null ? 'Данные не записаны' : typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</pre></div>;
}

function Journal({ supplierId, incidents, refresh }) {
  const [filters, setFilters] = useState({});
  const filter = (key, value) => { setPage(1); setFilters((old) => ({ ...old, [key]: value || undefined })); };
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { setPage(1); }, [supplierId]);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError('');
    const fetch = incidents ? suppliersApi.integrationIncidents : suppliersApi.integrationLogs;
    fetch(supplierId, page, controller.signal, filters).then(setData).catch((failure) => {
      if (!controller.signal.aborted) setError(failure.message || 'Не удалось загрузить журнал');
    });
    return () => controller.abort();
  }, [supplierId, page, incidents, refresh, filters]);
  const rows = data?.results || [];
  const filtered = Object.values(filters).some(Boolean);
  const httpCodes = [...new Set([...Object.keys(httpLabels), ...rows.filter((row) => row.http_status != null).map((row) => String(row.http_status)), ...(filters.http_status ? [filters.http_status] : [])])].sort((a, b) => Number(a) - Number(b));
  const httpOptions = [{ value: '', label: 'Все статусы' }, ...httpCodes.map((value) => ({ value, label: `${value} — ${httpLabels[value] || 'Ответ сервера'}` }))];
  return <section className="supplier-journal" aria-label={incidents ? 'Ошибки и инциденты API' : 'Логи запросов API'}>
    <div className="supplier-journal-heading">
      <div><h3>{incidents ? 'Ошибки и инциденты API' : 'Логи запросов API'}</h3><p>{incidents ? 'История ошибок и работа с инцидентами поставщика' : 'История обращений к поставщику и детали ответов'}</p></div>
      {data && <Pill tone="gray">Всего: {data.count ?? rows.length}</Pill>}
    </div>
    {!incidents && <div className="supplier-journal-filters">
      <Field label="Период запросов"><DateRangeField placeholder="Все даты" startVal={calendarDate(filters.date_from)} endVal={calendarDate(filters.date_to)}
        onChange={(start, end) => { setPage(1); setFilters((old) => ({ ...old, date_from: filterDate(start), date_to: filterDate(end) })); }} /></Field>
      <Field label="Операция"><Select options={operationOptions} value={filters.operation || ''} onChange={(event) => filter('operation', event.target.value)} /></Field>
      <Field label="HTTP статус"><Select options={httpOptions} value={filters.http_status || ''} onChange={(event) => filter('http_status', event.target.value)} /></Field>
      <Field label="ID заказа"><Input placeholder="Введите ID" value={filters.order_id || ''} onChange={(event) => filter('order_id', event.target.value)} /></Field>
      <Field label="Результат"><Select value={filters.result || ''} onChange={(event) => filter('result', event.target.value)} options={[{ value: '', label: 'Все результаты' }, { value: 'success', label: 'Успешно' }, { value: 'error', label: 'Ошибка' }]} /></Field>
      {filtered && <div className="supplier-journal-filter-actions"><Button variant="ghost" size="sm" onClick={() => { setPage(1); setFilters({}); }}>Сбросить фильтры</Button></div>}
    </div>}
    {error && <div className="supplier-journal-notice is-error" role="alert"><Icon name="alertCircle" /><span>{error}</span></div>}
    {!error && !data && <div className="supplier-journal-notice" role="status"><Icon name="loader" /><span>Загружаем журнал…</span></div>}
    {data && !rows.length && <div className="supplier-journal-empty"><EmptyState icon={incidents ? 'checkCircle' : 'api'} title={incidents ? 'Ошибок поставщика пока нет' : filtered ? 'По выбранным фильтрам запросов нет' : 'Запросов к API пока нет'} sub={incidents ? 'Здесь появятся инциденты, требующие внимания.' : filtered ? 'Измените условия или сбросьте фильтры.' : 'Выполните проверку подключения или поиск, чтобы увидеть историю.'} /></div>}
    <div className="supplier-journal-list">{rows.map((row) => {
      const status = row.status || row.result;
      return <details key={row.id} className="supplier-journal-entry">
        <summary>
          <span className="supplier-journal-entry-icon"><Icon name={incidents ? 'alertCircle' : 'api'} /></span>
          <span className="supplier-journal-entry-main"><b>{operationLabels[row.operation] || row.operation || 'Операция API'}</b><span>{date(row.created_at)}{row.order_id && ` · Заказ ${row.order_id}`}{row.supplier_status && ` · ${row.supplier_status}`}</span></span>
          <span className="supplier-journal-entry-status"><Pill tone={statusTone(status)}>{statuses[status] || status || '—'}</Pill><span className="supplier-journal-metrics">{row.http_status != null && `HTTP ${row.http_status}`}{row.http_status != null && row.duration_ms != null && ' · '}{row.duration_ms != null && `${row.duration_ms} мс`}{row.error_code && ` · ${row.error_code}`}</span></span>
          <Icon name="chevDown" className="supplier-journal-chevron" />
        </summary>
        <div className="supplier-journal-entry-body">
          <div className="supplier-journal-meta">
            {[['Окружение', row.environment], ['URL', row.url], ['HTTP метод', row.http_method], ['Адаптер', row.provider_adapter], ['ID запроса', row.correlation_id], ['Повторы', row.retry_count ?? row.retries], ...(incidents ? [['Критичность', row.severity], ['Повторений', row.occurrences], ['Обновлено', date(row.updated_at)]] : [])].map(([key, value]) => <div key={key}><span>{key}</span><b>{value ?? '—'}</b></div>)}
          </div>
          {(row.sanitized_error || row.raw_error) && <Payload title="Описание ошибки" value={row.sanitized_error || row.raw_error} />}
          {!incidents && <div className="supplier-journal-payloads">{[['Заголовки', row.request_headers], ['Запрос API', row.request_sanitized], ['Ответ API', row.response_sanitized], ['Идентификаторы поставщика', row.external_ids], ['Ошибка поставщика', row.provider_error]].map(([title, payload]) => <Payload key={title} title={title} value={payload} />)}</div>}
          {incidents && row.timeline?.length > 0 && <div className="supplier-journal-timeline">{row.timeline.map((entry) => <div key={entry.id}><span>{date(entry.created_at)} · {entry.actor_name}</span><Payload title={entry.action} value={entry.details} /></div>)}</div>}
        </div>
      </details>;
    })}</div>
    {data && (page > 1 || data.next) && <div className="supplier-journal-pagination">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Назад</Button>
      <span>Страница {page} · всего {data.count}</span>
      <Button variant="secondary" size="sm" disabled={!data.next} onClick={() => setPage((value) => value + 1)}>Далее</Button>
    </div>}
  </section>;
}

export function SupplierIntegrationJournal({ supplierId, mode }) {
  const [refresh, setRefresh] = useState(0);
  return <div className="supplier-integration-journal">
    <div className="supplier-journal-toolbar"><Button variant="secondary" size="sm" onClick={() => setRefresh((value) => value + 1)}>Обновить</Button></div>
    {mode !== 'incidents' && <Journal key={`logs-${supplierId}`} supplierId={supplierId} refresh={refresh} />}
    {mode !== 'logs' && <Journal key={`incidents-${supplierId}`} supplierId={supplierId} incidents refresh={refresh} />}
  </div>;
}
