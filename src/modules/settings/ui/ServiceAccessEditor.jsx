import { translate as t } from '../../../shared/preferences/translations.js';
import { useEffect, useState } from 'react';
import { OPERATOR_SVC_ACCESS, SVC_ACCESS_KINDS, SVC_ACCESS_RIGHTS, fullRights, noRights, operatorSvcAccess } from '../../../legacy/data/access-control.jsx';
import { Icon } from '../../../shared/icons/index.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { Checkbox } from '../../../shared/ui/Checkbox.jsx';
import { Toggle } from '../../../shared/ui/Toggle.jsx';
import { useToast } from '../../../shared/ui/Toast.jsx';
import { usersApi } from '../../users/api.js';

import { serviceAccessToUi, serviceAccessFromUi } from '../service-access.js';

function ServiceAccessEditor({ operator, userId }) {
  const toast = useToast();
  const [access, setAccess] = useState(() => JSON.parse(JSON.stringify(operatorSvcAccess(operator))));
  const [loadedRows, setLoadedRows] = useState([]);
  const [busy, setBusy] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [expandedKind, setExpandedKind] = useState(null);
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    setBusy(true); setLoadError(false);
    usersApi.serviceAccess(userId, controller.signal).then((rows) => {
      setLoadedRows(rows); setAccess(serviceAccessToUi(rows));
    }).catch((error) => { if (error.name !== 'AbortError') { setLoadError(true); toast(error.message, 'err'); } }).finally(() => setBusy(false));
    return () => controller.abort();
  }, [userId]);
  const kindEnabled = (kind) => access.kinds[kind] && Object.values(access.kinds[kind]).some(Boolean);

  const toggleKind = (kind) => setAccess((current) => {
    const kinds = { ...current.kinds };
    if (kindEnabled(kind)) delete kinds[kind];
    else kinds[kind] = fullRights();
    return { ...current, kinds };
  });

  const toggleRight = (kind, right) => setAccess((current) => {
    const kinds = { ...current.kinds };
    const rights = kinds[kind] ? { ...kinds[kind] } : noRights();
    rights[right] = !rights[right];
    kinds[kind] = rights;
    return { ...current, kinds };
  });

  const save = async () => {
    if (!userId) {
      toast('Выберите пользователя, чтобы сохранить доступы', 'err');
      return;
    }
    const body = serviceAccessFromUi(access, loadedRows);
    setBusy(true);
    try {
      await usersApi.setServiceAccess(userId, body);
      setLoadedRows(body);
      OPERATOR_SVC_ACCESS[operator] = serviceAccessToUi(body);
      toast('Область ответственности сохранена в backend', 'ok');
    } catch (error) { toast(error.message || 'Не удалось сохранить доступы', 'err'); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--field-line)', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{t("Полный доступ ко всем услугам заказа")}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t("Оператор работает со всеми видами услуг без ограничений")}</div>
        </div>
        <Toggle on={access.fullAccess} onChange={(fullAccess) => setAccess((current) => ({ ...current, fullAccess }))} />
      </div>
      {!access.fullAccess && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t("Отметьте виды услуг и настройте права по каждому. Оператор не имеет доступа к невыбранным видам.")}</div>
          {SVC_ACCESS_KINDS.map((kind) => {
            const enabled = kindEnabled(kind);
            const expanded = expandedKind === kind;
            return (
              <div key={kind} className="card" style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                  <Checkbox on={enabled} onChange={() => toggleKind(kind)} />
                  <span style={{ flex: 1, fontWeight: 600, color: 'var(--ink)' }}>{kind}</span>
                  {enabled && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{SVC_ACCESS_RIGHTS.filter((right) => access.kinds[kind] && access.kinds[kind][right]).length}{t("из")}{SVC_ACCESS_RIGHTS.length}{t("прав")}</span>}
                  {enabled && <button type="button" className="icon-btn" onClick={() => setExpandedKind(expanded ? null : kind)} aria-label={expanded ? 'Свернуть права' : 'Развернуть права'}><Icon name={expanded ? 'chevUp' : 'chevDown'} /></button>}
                </div>
                {enabled && expanded && (
                  <div style={{ borderTop: '1px solid var(--line)', padding: '12px 16px', background: 'var(--surface-2)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
                    {SVC_ACCESS_RIGHTS.map((right) => (
                      <label key={right} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--body)' }}>
                        <Checkbox on={Boolean(access.kinds[kind] && access.kinds[kind][right])} onChange={() => toggleRight(kind, right)} />{right}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <Button icon="check" disabled={busy || loadError} onClick={save}>{t("Сохранить доступы")}</Button>
      </div>
    </div>
  );
}

export { ServiceAccessEditor };
