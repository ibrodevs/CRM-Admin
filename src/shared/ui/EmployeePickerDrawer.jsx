import { Icon } from '../icons/index.jsx';
import { Avatar } from './Avatar.jsx';
import { Button } from './Button.jsx';
import { EmptyState } from './EmptyState.jsx';
import { Drawer } from './Overlays.jsx';
import { Pill } from './Pill.jsx';

function EmployeePickerDrawer({ open, currentId, options = [], title = 'Ответственный', onClose, onPick }) {
  if (!open) return null;
  return (
    <Drawer open={open} onClose={onClose} title={title}
      footer={<Button variant="secondary" style={{ width: '100%' }} onClick={onClose}>Закрыть</Button>}>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>Выберите сотрудника из команды.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map((choice) => {
          const employee = typeof choice === 'string'
            ? { id: choice, name: choice, sub: 'Сотрудник' }
            : {
                id: choice.id,
                name: choice.full_name || choice.name || choice.email || 'Сотрудник',
                sub: [choice.position || choice.role || 'Сотрудник', choice.email].filter(Boolean).join(' · '),
              };
          const selected = String(employee.id || '') === String(currentId || '');
          return (
            <button key={employee.id || employee.name} type="button" className={'oce-client' + (selected ? ' sel' : '')}
              style={{ cursor: 'pointer', width: '100%', textAlign: 'left', border: '1px solid ' + (selected ? 'var(--blue)' : 'var(--line)'), background: selected ? 'var(--blue-soft)' : 'var(--surface)', borderRadius: 12, padding: '10px 12px', color: 'inherit' }}
              onClick={() => onPick(employee)}>
              <Avatar name={employee.name} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}><div className="nm">{employee.name}</div><div className="mt">{employee.sub}</div></div>
              {selected ? <Pill tone="blue">Выбран</Pill> : <Icon name="chevRight" style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />}
            </button>
          );
        })}
        {!options.length && <EmptyState icon="users" title="Сотрудники не найдены" sub="Проверьте список пользователей в настройках доступа." />}
      </div>
    </Drawer>
  );
}

export { EmployeePickerDrawer };
