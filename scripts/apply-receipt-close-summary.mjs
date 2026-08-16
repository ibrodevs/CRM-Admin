import { readFile, writeFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
let source = await readFile(pageUrl, 'utf8');

const marker = 'className="receipt-close-summary"';
const before = `      <Drawer open={confirmClose} onClose={() => setConfirmClose(false)} title="Закрыть импорт?"
        width="min(560px,94vw)"
        footer={<>
          <Button variant="secondary" onClick={() => setConfirmClose(false)}>Продолжить работу</Button>
          <Button variant="danger" onClick={() => {
            onDraftCleared?.();
            setConfirmClose(false);
            onClose();
          }}>Закрыть без сохранения</Button>
          <Button icon="save" disabled={processing || !done.length} onClick={saveDraftAndClose}>
            Сохранить черновик и выйти
          </Button>
        </>}>
        <div style={{ display: 'grid', gap: 10, color: 'var(--muted)', fontSize: 15, lineHeight: 1.5 }}>
          <p style={{ margin: 0 }}>Загружено файлов: {files.length}. Можно сохранить текущую проверку и вернуться к ней из редактора квитанций.</p>
          {processing && <p style={{ margin: 0, color: 'var(--amber)' }}>Сначала дождитесь окончания распознавания текущего файла.</p>}
          {!processing && done.length > 0 && <p style={{ margin: 0, color: 'var(--green)' }}>Будут сохранены поля, подстроки, проверки и настройки стоимости.</p>}
        </div>
      </Drawer>`;

const after = `      <Drawer open={confirmClose} onClose={() => setConfirmClose(false)} title="Закрыть импорт?"
        sub="Проверьте, какие бланки сохранятся в черновик"
        width="min(780px,96vw)"
        footer={
          <div className="receipt-close-actions">
            <Button variant="secondary" onClick={() => setConfirmClose(false)}>Продолжить работу</Button>
            <Button variant="danger" onClick={() => {
              onDraftCleared?.();
              setConfirmClose(false);
              onClose();
            }}>Закрыть без сохранения</Button>
            <Button icon="save" disabled={processing || !done.length} onClick={saveDraftAndClose}>
              Сохранить черновик и выйти
            </Button>
          </div>
        }>
        <div className="receipt-close-summary">
          <div className="receipt-close-overview">
            <div><span>Всего загружено</span><b>{files.length}</b><small>файлов</small></div>
            <div><span>Обработано</span><b>{done.length}</b><small>из {files.length}</small></div>
            <div><span>Требуют внимания</span><b>{(counts['Требует проверки'] || 0) + (counts['Ошибка'] || 0) + (files.length - done.length)}</b><small>проверить</small></div>
            <div><span>Сохранится</span><b>{doneRows.filter((row) => !excluded[row.f.id]).length}</b><small>бланков</small></div>
          </div>

          <section className="receipt-close-section">
            <div className="receipt-close-section-head">
              <span><Icon name="docs" /></span>
              <div><b>Бланки в текущем импорте</b><small>Название, услуга, участник и статус — каждый файл отдельной строкой</small></div>
            </div>
            <div className="receipt-close-files">
              {rows.map((row, index) => {
                const file = row.f;
                const parsed = file.parsed || {};
                const typeMeta = recType(file.type);
                const statusCfg = REC_STATUS[row.status] || { tone: 'gray' };
                const participant = receiptParticipantLabel(parsed, 'Участники не распознаны');
                const route = routeSummary(parsed);
                const excludedFromDraft = !!excluded[file.id];
                return (
                  <div className={'receipt-close-file' + (excludedFromDraft ? ' is-muted' : '')} key={file.id}>
                    <span className="receipt-close-file-index">{index + 1}</span>
                    <span className="receipt-close-file-icon" style={{ background: typeMeta.color }}><Icon name={typeMeta.icon} /></span>
                    <span className="receipt-close-file-main">
                      <b>{file.name}</b>
                      <span>{file.type} · {participant}</span>
                      {route && route !== '—' && <small>{route}</small>}
                    </span>
                    <span className="receipt-close-file-state">
                      <Pill tone={statusCfg.tone}>{row.status}</Pill>
                      <small>{row.pending
                        ? 'Распознавание не завершено'
                        : excludedFromDraft
                          ? 'Исключён из добавления'
                          : reviewed[file.id]
                            ? 'Проверено — сохранится'
                            : 'Сохранится в черновик'}</small>
                    </span>
                  </div>
                );
              })}
              {!rows.length && <EmptyState icon="docs" title="Бланки не загружены" />}
            </div>
          </section>

          <div className="receipt-close-save-note">
            <span><Icon name="save" /></span>
            <div>
              <b>Что сохранится в черновике</b>
              <span>Распознанные поля, разбивка на бланки, результаты проверки, привязки и настройки стоимости.</span>
            </div>
          </div>

          {processing && (
            <div className="receipt-close-warning">
              <Icon name="alertCircle" />
              <span><b>Распознавание ещё идёт.</b> Дождитесь обработки всех файлов, чтобы сохранить полный черновик.</span>
            </div>
          )}
        </div>
      </Drawer>`;

if (source.includes(marker)) {
  console.log('Структурированное окно закрытия импорта уже настроено.');
} else {
  if (!source.includes(before)) {
    throw new Error('Не удалось обновить окно закрытия импорта: исходный блок не найден.');
  }
  source = source.replace(before, after);
  await writeFile(pageUrl, source, 'utf8');
  console.log('Окно закрытия импорта дополнено сводкой и списком бланков.');
}

// Keep both icon tiles geometrically centered. Earlier CSS used baseline
// alignment, which pulled the eye/docs and service icons toward the text
// baseline instead of the middle of their 34/38 px tiles.
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);
let css = await readFile(cssUrl, 'utf8');
const iconAlignMarker = '/* Close-import summary icons: center SVGs inside their tiles. */';
if (!css.includes(iconAlignMarker)) {
  css += `\n\n${iconAlignMarker}\n.receipt-close-section-head > span,\n.receipt-close-file-icon {\n  align-items: center !important;\n  justify-content: center !important;\n  line-height: 1 !important;\n}\n\n.receipt-close-section-head > span > svg,\n.receipt-close-file-icon > svg {\n  display: block;\n  margin: 0 !important;\n  flex: 0 0 auto;\n  align-self: center;\n}\n`;
  await writeFile(cssUrl, css, 'utf8');
  console.log('Иконки в окне закрытия импорта выровнены по центру.');
} else {
  console.log('Иконки окна закрытия импорта уже выровнены.');
}

for (const token of [
  '.receipt-close-section-head > span,',
  '.receipt-close-file-icon {',
  'align-items: center !important;',
  'align-self: center;',
]) {
  if (!css.includes(token)) throw new Error(`Не подтверждено выравнивание иконок: ${token}`);
}
