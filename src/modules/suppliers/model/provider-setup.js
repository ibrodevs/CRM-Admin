export function providerDefaults(provider) {
  return Object.fromEntries((provider?.fields || []).map((field) => [field.key, field.default ?? '']));
}
export function providerSecrets(provider, values) {
  if (!provider) throw new Error('Выберите API-поставщика');
  const secrets = {};
  for (const field of provider.fields) {
    const value = values[field.key];
    if (value == null || typeof value === 'string' && !value.trim()) {
      if (field.required) throw new Error(`Заполните поле «${field.label}»`);
      continue;
    }
    if (field.kind === 'json') {
      let parsed;
      try { parsed = typeof value === 'string' ? JSON.parse(value) : value; } catch { throw new Error(`Проверьте JSON в поле «${field.label}»`); }
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error(`В поле «${field.label}» нужен JSON-объект`);
      secrets[field.key] = parsed;
    } else secrets[field.key] = String(value).trim();
  }
  return secrets;
}
export function publicProviderSettings(provider, environment, secrets) {
  // Secrets belong exclusively to the encrypted SupplierCredential endpoint.
  return { provider_adapter: provider?.key || '', environment, url: secrets.url || '', status: 'Не проверено', lastSync: '—' };
}

export function providerConnectionState(result) {
  const connected = result?.status === 'connected';
  return { status: connected ? 'ok' : 'configured', tone: connected ? 'ok' : 'warn', message: result?.message || (connected ? 'Подключение успешно' : 'Реквизиты настроены; live-доступ ещё не подтверждён') };
}
