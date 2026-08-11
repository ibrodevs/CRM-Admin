import { readFile, writeFile } from 'node:fs/promises';

async function patchFile(url, replacements, required) {
  let source = await readFile(url, 'utf8');
  let changed = false;
  const appliedSentinels = {
    'загрузка и сохранение через профильный CRM endpoint': [
      'const normalizedRemote = cfNormalizeFinancialConditions(remote?.value);',
      'const prepared = cfNormalizeFinancialConditions(next);',
      'crmApi.saveCompanyFinancialConditions(companyId, prepared)',
    ],
  };

  for (const [from, to, label] of replacements) {
    if (source.includes(to)) continue;
    if ((appliedSentinels[label] || []).every((token) => source.includes(token))) continue;
    if (!source.includes(from)) throw new Error(`Не найден фрагмент для изменения: ${label}`);
    source = source.replace(from, to);
    changed = true;
  }

  for (const token of required) {
    if (!source.includes(token)) throw new Error(`Не подтверждена backend-интеграция финансовых условий: ${token}`);
  }

  if (changed) await writeFile(url, source, 'utf8');
  return changed;
}

const financeChanged = await patchFile(
  new URL('../js/page_company_finance.jsx', import.meta.url),
  [
    [
      "import { Button, ConfirmDialog, Drawer, Field, Input, Pill, Select, Tabs, useToast } from './ui';",
      "import { Button, ConfirmDialog, DateField, Drawer, Field, Input, Pill, Select, Tabs, useToast } from './ui';",
      'импорт общего DateField',
    ],
    [
      "import { financeApi, workspaceActionsApi, workspaceSettingsApi } from './api/resources';",
      "import { crmApi, financeApi, workspaceActionsApi, workspaceSettingsApi } from './api/resources';",
      'импорт crmApi',
    ],
    [
      "  const [contractDate, setContractDate] = useState(() => new Date().toISOString().slice(0, 10));",
      "  const [contractDate, setContractDate] = useState(() => new Date());",
      'начальное значение даты договора',
    ],
    [
      "    setContractDate(new Date().toISOString().slice(0, 10));",
      "    setContractDate(new Date());",
      'сброс даты договора',
    ],
    [
      "    const date = contractDate ? contractDate.split('-').reverse().join('.') : cfNow().split(' ')[0];",
      "    const date = contractDate instanceof Date && !Number.isNaN(contractDate.getTime())\n      ? `${String(contractDate.getDate()).padStart(2, '0')}.${String(contractDate.getMonth() + 1).padStart(2, '0')}.${contractDate.getFullYear()}`\n      : cfNow().split(' ')[0];",
      'форматирование даты договора',
    ],
    [
      "              <Input type=\"date\" value={contractDate} onChange={(e) => setContractDate(e.target.value)} />",
      "              <DateField value={contractDate} onChange={setContractDate} placeholder=\"Выберите дату договора\" />",
      'единый календарь даты договора',
    ],
    [
      "  const namespace = `company-finance-${co.serverId || co.id}`;",
      "  const companyId = co.serverId || co.id;\n  const legacyNamespace = `company-finance-${companyId}`;",
      'идентификатор backend-компании',
    ],
    [
`  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setFin(null);
    setLoading(true);
    workspaceSettingsApi.get(namespace, controller.signal).then((setting) => {
      if (active && setting.value && Object.keys(setting.value).length) setFin(setting.value);
    }).catch((error) => { if (error.name !== 'AbortError') console.error(error); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [namespace]);

  const updateFin = async (next) => {
    await workspaceSettingsApi.save(namespace, next);
    setFin(next);
  };`,
`  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setFin(null);
    setLoading(true);

    const load = async () => {
      try {
        const remote = await crmApi.companyFinancialConditions(companyId, controller.signal);
        if (remote?.configured && remote.value) {
          if (active) setFin(remote.value);
          return;
        }

        // Однократная миграция данных, созданных до появления профильного endpoint.
        const legacy = await workspaceSettingsApi.get(legacyNamespace, controller.signal);
        if (!legacy?.value || !Object.keys(legacy.value).length) return;
        try {
          const migrated = await crmApi.saveCompanyFinancialConditions(companyId, legacy.value);
          if (active) setFin(migrated?.value || legacy.value);
        } catch (migrationError) {
          if (migrationError?.status === 404 || migrationError?.status === 405) {
            if (active) setFin(legacy.value);
            return;
          }
          throw migrationError;
        }
      } catch (error) {
        if (error.name === 'AbortError') return;
        if (error?.status === 404 || error?.status === 405) {
          const legacy = await workspaceSettingsApi.get(legacyNamespace, controller.signal);
          if (active && legacy?.value && Object.keys(legacy.value).length) setFin(legacy.value);
          return;
        }
        console.error(error);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; controller.abort(); };
  }, [companyId, legacyNamespace]);

  const updateFin = async (next) => {
    try {
      const saved = await crmApi.saveCompanyFinancialConditions(companyId, next);
      const value = saved?.value || next;
      setFin(value);
      return value;
    } catch (error) {
      // Временная совместимость до перезагрузки PythonAnywhere с новым endpoint.
      if (error?.status !== 404 && error?.status !== 405) throw error;
      await workspaceSettingsApi.save(legacyNamespace, next);
      setFin(next);
      return next;
    }
  };`,
      'загрузка и сохранение через профильный CRM endpoint',
    ],
    [
      "<Pill tone=\"blue\">Шаблон: {feeTemplate(a.template).name}</Pill>",
      "<Pill tone=\"blue\">Шаблон: {a.templateName || feeTemplate(a.template).name}</Pill>",
      'название backend-шаблона',
    ],
  ],
  [
    "DateField value={contractDate}",
    'crmApi.companyFinancialConditions(companyId',
    'crmApi.saveCompanyFinancialConditions(companyId',
    'const normalizedRemote = cfNormalizeFinancialConditions(remote?.value);',
    'a.templateName || feeTemplate(a.template).name',
  ],
);

const resourcesChanged = await patchFile(
  new URL('../js/api/resources.js', import.meta.url),
  [
    [
      "  removeCompanyDepartment: (companyId, departmentId) => remove(`companies/${companyId}/departments/${departmentId}/`),\n};",
      "  removeCompanyDepartment: (companyId, departmentId) => remove(`companies/${companyId}/departments/${departmentId}/`),\n  companyFinancialConditions: (id, signal) => get(`companies/${id}/financial-conditions/`, signal),\n  saveCompanyFinancialConditions: (id, body) => apiRequest(apiPath(`companies/${id}/financial-conditions/`), { method: 'PUT', body }),\n};",
      'методы финансовых условий crmApi',
    ],
  ],
  [
    'companyFinancialConditions: (id, signal)',
    'saveCompanyFinancialConditions: (id, body)',
    "method: 'PUT'",
  ],
);

console.log(financeChanged || resourcesChanged
  ? 'Финансовые условия подключены к CRM backend, дата договора использует общий календарь.'
  : 'Backend-интеграция финансовых условий и общий календарь уже подключены.');
