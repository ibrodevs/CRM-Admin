import { useEffect, useState } from 'react';
import { Button } from '../../../shared/ui/Button.jsx';
import { suppliersApi } from '../api/suppliersApi.js';

const statuses = { success: 'Успешно', ok: 'Успешно', failed: 'Ошибка', error: 'Ошибка', open: 'Новая', assigned: 'В работе', resolved: 'Решена', reopened: 'Открыта повторно', retrying: 'Повтор', snoozed: 'Отложена', escalated: 'Передана разработчикам' };
const date = (value) => value ? new Date(value).toLocaleString('ru-RU') : '—';

function Journal({ supplierId, incidents, refresh }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { setPage(1); }, [supplierId]);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError('');
    const fetch = incidents ? suppliersApi.integrationIncidents : suppliersApi.integrationLogs;
    fetch(supplierId, page, controller.signal).then(setData).catch((failure) => {
      if (!controller.signal.aborted) setError(failure.message || 'Не удалось загрузить журнал');
    });
    return () => controller.abort();
  }, [supplierId, page, incidents, refresh]);
  const rows = data?.results || [];
  return <section style={{ marginTop: 24 }}>
    <h3>{incidents ? 'Ошибки и инциденты API' : 'Логи запросов API'}</h3>
    {error && <div role="alert">{error}</div>}
    {!error && !data && <div role="status">Загрузка…</div>}
    {data && !rows.length && <div style={{ color: 'var(--muted)' }}>{incidents ? 'Ошибок поставщика пока нет.' : 'Запросы к API поставщика пока не зарегистрированы.'}</div>}
    {rows.map((row) => <details key={row.id} className="card card-pad" style={{ marginTop: 10 }}>
      <summary style={{ cursor: 'pointer', overflowWrap: 'anywhere' }}>
        {date(row.created_at)} · {row.operation || 'Операция API'} · {statuses[row.status || row.result] || row.status || row.result || '—'}
        {row.http_status != null && ` · HTTP ${row.http_status}`}{row.duration_ms != null && ` · ${row.duration_ms} мс`}{row.error_code && ` · ${row.error_code}`}
      </summary>
      <div className="kv" style={{ marginTop: 12 }}>
        {[['Адаптер', row.provider_adapter], ['ID запроса', row.correlation_id], ['Повторы', row.retry_count ?? row.retries], ...(incidents ? [['Критичность', row.severity], ['Повторений', row.occurrences], ['Обновлено', date(row.updated_at)]] : [])].map(([key, value]) => <div className="kv-row" key={key}><span className="k">{key}</span><span className="v" style={{ overflowWrap: 'anywhere' }}>{value ?? '—'}</span></div>)}
      </div>
      {(row.sanitized_error || row.raw_error) && <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{row.sanitized_error || row.raw_error}</pre>}
      {!incidents && [['Запрос API', row.request_sanitized], ['Ответ API', row.response_sanitized]].map(([title, payload]) => <div key={title}><h4>{title}</h4><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{payload == null ? 'Данные не записаны' : JSON.stringify(payload, null, 2)}</pre></div>)}
      {incidents && row.timeline?.map((entry) => <div key={entry.id} style={{ marginTop: 8 }}>{date(entry.created_at)} · {entry.actor_name} · {entry.action}<pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(entry.details, null, 2)}</pre></div>)}
    </details>)}
    {data && (page > 1 || data.next) && <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 }}>
      <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Назад</Button>
      <span>Страница {page} · всего {data.count}</span>
      <Button variant="secondary" disabled={!data.next} onClick={() => setPage((value) => value + 1)}>Далее</Button>
    </div>}
  </section>;
}

export function SupplierIntegrationJournal({ supplierId }) {
  const [refresh, setRefresh] = useState(0);
  return <div>
    <Button variant="secondary" onClick={() => setRefresh((value) => value + 1)} style={{ marginTop: 18 }}>Обновить логи и ошибки</Button>
    <Journal key={`logs-${supplierId}`} supplierId={supplierId} refresh={refresh} />
    <Journal key={`incidents-${supplierId}`} supplierId={supplierId} incidents refresh={refresh} />
  </div>;
}
