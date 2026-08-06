import { readFile, writeFile } from 'node:fs/promises';

const fileUrl = new URL('../js/page_company_finance.jsx', import.meta.url);
let source = await readFile(fileUrl, 'utf8');
let changed = false;

const replaceOnce = (from, to, label) => {
  if (source.includes(to)) return;
  if (!source.includes(from)) throw new Error(`Не найден фрагмент для изменения: ${label}`);
  source = source.replace(from, to);
  changed = true;
};

const helpers = `
function cfNormalizeAgreement(agreement = {}) {
  const template = agreement && agreement.template ? agreement.template : 'standard';
  let defaults;
  try { defaults = feesFromTemplate(template); } catch (_) { defaults = null; }
  if (!defaults || typeof defaults !== 'object') defaults = feesFromTemplate('standard');
  const incoming = agreement && agreement.fees && typeof agreement.fees === 'object' ? agreement.fees : {};
  const fees = {};

  FEE_SERVICE_TYPES.forEach((service) => {
    fees[service] = {};
    FEE_SCHEMA[service].forEach((field) => {
      const fallback = defaults && defaults[service] && defaults[service][field.key]
        ? defaults[service][field.key]
        : { type: 'fixed', value: 0 };
      const raw = incoming[service] && incoming[service][field.key]
        ? incoming[service][field.key]
        : fallback;
      fees[service][field.key] = {
        type: raw && raw.type === 'percent' ? 'percent' : 'fixed',
        value: Number(raw && raw.value != null ? raw.value : fallback.value) || 0,
      };
    });
  });

  const defaultDescs = descsFromDefaults();
  const defaultFeeDescs = feeDescsFromDefaults();
  const feeDescs = {};
  FEE_SERVICE_TYPES.forEach((service) => {
    feeDescs[service] = {
      ...(defaultFeeDescs[service] || {}),
      ...((agreement && agreement.feeDescs && agreement.feeDescs[service]) || {}),
    };
  });

  return {
    ...(agreement || {}),
    template,
    fees,
    descs: { ...defaultDescs, ...((agreement && agreement.descs) || {}) },
    feeDescs,
    history: Array.isArray(agreement && agreement.history) ? agreement.history : [],
  };
}

function cfNormalizeFinancialConditions(value) {
  if (!value || typeof value !== 'object') return null;
  const contracts = (Array.isArray(value.contracts) ? value.contracts : [])
    .filter(Boolean)
    .map((contract) => ({
      ...contract,
      agreements: (Array.isArray(contract.agreements) ? contract.agreements : [])
        .filter(Boolean)
        .map(cfNormalizeAgreement),
    }));

  const configured = contracts.some((contract) =>
    String(contract.no || '').trim() && contract.agreements.length > 0
  );
  if (!configured) return null;

  const settlement = SETTLEMENT_TYPES.includes(value.settlement) ? value.settlement : 'предоплата';
  return {
    ...value,
    settlement,
    deposit: settlement === 'депозит'
      ? { balance: 0, reserved: 0, history: [], ...(value.deposit || {}) }
      : null,
    credit: settlement === 'отсрочка'
      ? { limit: 0, termDays: 30, debt: 0, overdue: 0, ...(value.credit || {}) }
      : null,
    contracts,
  };
}
`;

if (!source.includes('function cfNormalizeAgreement(')) {
  const marker = "const cfUid = (p) => p + Math.random().toString(36).slice(2, 7);";
  if (!source.includes(marker)) throw new Error('Не найдено место для нормализации финансовых данных');
  source = source.replace(marker, helpers + '\n' + marker);
  changed = true;
}

replaceOnce(
`        if (remote?.configured && remote.value) {
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
        }`,
`        const normalizedRemote = cfNormalizeFinancialConditions(remote?.value);
        if (remote?.configured && normalizedRemote) {
          if (active) setFin(normalizedRemote);
          return;
        }

        // Однократная миграция только полноценных старых условий.
        const legacy = await workspaceSettingsApi.get(legacyNamespace, controller.signal);
        const legacyValue = cfNormalizeFinancialConditions(legacy?.value);
        if (!legacyValue) return;
        try {
          const migrated = await crmApi.saveCompanyFinancialConditions(companyId, legacyValue);
          if (active) setFin(cfNormalizeFinancialConditions(migrated?.value) || legacyValue);
        } catch (migrationError) {
          if (migrationError?.status === 404 || migrationError?.status === 405) {
            if (active) setFin(legacyValue);
            return;
          }
          throw migrationError;
        }`,
  'безопасная загрузка и миграция условий',
);

replaceOnce(
`        if (error?.status === 404 || error?.status === 405) {
          const legacy = await workspaceSettingsApi.get(legacyNamespace, controller.signal);
          if (active && legacy?.value && Object.keys(legacy.value).length) setFin(legacy.value);
          return;
        }`,
`        if (error?.status === 404 || error?.status === 405) {
          const legacy = await workspaceSettingsApi.get(legacyNamespace, controller.signal);
          const legacyValue = cfNormalizeFinancialConditions(legacy?.value);
          if (active) setFin(legacyValue);
          return;
        }`,
  'безопасный fallback старых условий',
);

replaceOnce(
`  const updateFin = async (next) => {
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
`  const updateFin = async (next) => {
    const prepared = cfNormalizeFinancialConditions(next);
    if (!prepared) throw new Error('Добавьте договор и первое дополнительное соглашение');
    try {
      const saved = await crmApi.saveCompanyFinancialConditions(companyId, prepared);
      const value = cfNormalizeFinancialConditions(saved?.value) || prepared;
      setFin(value);
      return value;
    } catch (error) {
      // Временная совместимость до перезагрузки PythonAnywhere с новым endpoint.
      if (error?.status !== 404 && error?.status !== 405) throw error;
      await workspaceSettingsApi.save(legacyNamespace, prepared);
      setFin(prepared);
      return prepared;
    }
  };`,
  'нормализация перед сохранением',
);

replaceOnce(
  "  const [tpl, setTpl] = useState(agreement ? agreement.template : 'standard');\n  const [fees, setFees] = useState(() => (agreement ? JSON.parse(JSON.stringify(agreement.fees)) : feesFromTemplate('standard')));\n  const [descs, setDescs] = useState(() => (agreement ? { ...agreement.descs } : descsFromDefaults()));\n  const [feeDescs, setFeeDescs] = useState(() => (agreement && agreement.feeDescs ? JSON.parse(JSON.stringify(agreement.feeDescs)) : feeDescsFromDefaults()));",
  "  const [tpl, setTpl] = useState(agreement ? (agreement.template || 'standard') : 'standard');\n  const [fees, setFees] = useState(() => cfNormalizeAgreement(agreement).fees);\n  const [descs, setDescs] = useState(() => cfNormalizeAgreement(agreement).descs);\n  const [feeDescs, setFeeDescs] = useState(() => cfNormalizeAgreement(agreement).feeDescs);",
  'безопасное начальное состояние редактора',
);

replaceOnce(
  "    if (open && agreement) { setTpl(agreement.template); setFees(JSON.parse(JSON.stringify(agreement.fees))); setDescs({ ...agreement.descs }); setFeeDescs(agreement.feeDescs ? JSON.parse(JSON.stringify(agreement.feeDescs)) : feeDescsFromDefaults()); setTab(FEE_SERVICE_TYPES[0]); }",
  "    if (open && agreement) { const safe = cfNormalizeAgreement(agreement); setTpl(safe.template); setFees(safe.fees); setDescs(safe.descs); setFeeDescs(safe.feeDescs); setTab(FEE_SERVICE_TYPES[0]); }",
  'нормализация при открытии редактора',
);

replaceOnce(
  "  const setFee = (svc, key, patch) => setFees((f) => ({ ...f, [svc]: { ...f[svc], [key]: { ...f[svc][key], ...patch } } }));",
  "  const setFee = (svc, key, patch) => setFees((f) => ({ ...f, [svc]: { ...(f[svc] || {}), [key]: { ...(((f[svc] || {})[key]) || { type: 'fixed', value: 0 }), ...patch } } }));",
  'безопасное изменение отдельного сбора',
);

replaceOnce(
  "        const a = fees[svc][f.key], b = agreement.fees[svc] && agreement.fees[svc][f.key];",
  "        const a = (fees[svc] && fees[svc][f.key]) || { type: 'fixed', value: 0 }, b = agreement.fees && agreement.fees[svc] && agreement.fees[svc][f.key];",
  'безопасное сравнение сборов',
);

replaceOnce(
  "              const fee = fees[tab][f.key];",
  "              const fee = (fees[tab] && fees[tab][f.key]) || { type: 'fixed', value: 0 };",
  'защита fee.type от отсутствующего правила',
);

replaceOnce(
  "          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Описание для документов: «{agreement.descs[svc] || SERVICE_DESC_DEFAULTS[svc] || '—'}»</div>",
  "          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Описание для документов: «{(agreement.descs && agreement.descs[svc]) || SERVICE_DESC_DEFAULTS[svc] || '—'}»</div>",
  'безопасное описание соглашения',
);

replaceOnce(
  "        {(agreement ? [...agreement.history].reverse() : []).map((v, i) => (",
  "        {(agreement ? [...(agreement.history || [])].reverse() : []).map((v, i) => (",
  'безопасная история соглашения',
);

const required = [
  'function cfNormalizeAgreement(',
  'function cfNormalizeFinancialConditions(',
  "const fee = (fees[tab] && fees[tab][f.key]) || { type: 'fixed', value: 0 };",
  'const normalizedRemote = cfNormalizeFinancialConditions(remote?.value);',
  "if (!prepared) throw new Error('Добавьте договор и первое дополнительное соглашение');",
];
for (const token of required) {
  if (!source.includes(token)) throw new Error(`Не подтверждена защита финансовой вкладки: ${token}`);
}

if (changed) await writeFile(fileUrl, source, 'utf8');
console.log(changed
  ? 'Финансовые данные нормализуются, пустые записи не считаются условиями, fee.type защищён.'
  : 'Защита финансовой вкладки уже применена.');
