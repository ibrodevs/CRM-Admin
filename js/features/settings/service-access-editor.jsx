import { useEffect, useState } from 'react';
import {
  OPERATOR_SVC_ACCESS,
  SVC_ACCESS_KINDS,
  SVC_ACCESS_RIGHTS,
  fullRights,
  noRights,
  operatorSvcAccess,
} from '../../data/access-control';
import { Icon } from '../../icons';
import { Button, Checkbox, Toggle, useToast } from '../../ui';
import { usersApi } from '../../api/resources';

const KIND_CODE = { 'Авиа': 'avia', 'ЖД': 'rail', 'Гостиница': 'hotel', 'Трансфер': 'transfer', 'Автобус': 'bus', 'Тур': 'tour', 'Виза': 'visa', 'Страхование': 'insurance' };
const RIGHT_CODE = { 'Поиск': 'search', 'Бронирование': 'book', 'Выписка': 'issue', 'Возврат': 'refund', 'Обмен': 'exchange', 'Аннуляция': 'cancel', 'Доп. услуги': 'extras' };

function ServiceAccessEditor({ operator, userId }) {
  const toast = useToast();
  const [access, setAccess] = useState(() => JSON.parse(JSON.stringify(operatorSvcAccess(operator))));
  const [expandedKind, setExpandedKind] = useState(null);
  useEffect(() => {
    if (!userId) return;
    usersApi.serviceAccess(userId).then((rows) => {
      if (!rows.length) return setAccess({ fullAccess: true, kinds: {} });
      const kinds = {};
      rows.forEach((row) => {
        const kind = Object.keys(KIND_CODE).find((key) => KIND_CODE[key] === row.service_kind);
        if (!kind) return;
        kinds[kind] = noRights();
        row.allowed_actions.forEach((code) => { const right = Object.keys(RIGHT_CODE).find((key) => RIGHT_CODE[key] === code); if (right) kinds[kind][right] = true; });
      });
      setAccess({ fullAccess: false, kinds });
    }).catch(() => {});
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
    const body = access.fullAccess ? [] : Object.entries(access.kinds).map(([kind, rights]) => ({
      service_kind: KIND_CODE[kind] || 'other',
      allowed_actions: Object.entries(rights).filter(([, enabled]) => enabled).map(([right]) => RIGHT_CODE[right]).filter(Boolean),
    }));
    try { await usersApi.setServiceAccess(userId, body); toast('Область ответственности сохранена в backend', 'ok'); }
    catch (error) { toast(error.message || 'Не удалось сохранить доступы', 'err'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--field-line)', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>Полный доступ ко всем услугам заказа</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Оператор работает со всеми видами услуг без ограничений</div>
        </div>
        <Toggle on={access.fullAccess} onChange={(fullAccess) => setAccess((current) => ({ ...current, fullAccess }))} />
      </div>
      {!access.fullAccess && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Отметьте виды услуг и настройте права по каждому. Оператор не имеет доступа к невыбранным видам.</div>
          {SVC_ACCESS_KINDS.map((kind) => {
            const enabled = kindEnabled(kind);
            const expanded = expandedKind === kind;
            return (
              <div key={kind} className="card" style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                  <Checkbox on={enabled} onChange={() => toggleKind(kind)} />
                  <span style={{ flex: 1, fontWeight: 600, color: 'var(--ink)' }}>{kind}</span>
                  {enabled && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{SVC_ACCESS_RIGHTS.filter((right) => access.kinds[kind] && access.kinds[kind][right]).length} из {SVC_ACCESS_RIGHTS.length} прав</span>}
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
        <Button icon="check" onClick={save}>Сохранить доступы</Button>
      </div>
    </div>
  );
}

export { ServiceAccessEditor };
