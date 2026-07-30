import { readFile, writeFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
let source = await readFile(pageUrl, 'utf8');

const reactImport = "import React, { useState, useEffect, useRef } from 'react';";
const portalImport = "import ReactDOM from 'react-dom';";
if (!source.includes(portalImport)) {
  if (!source.includes(reactImport)) throw new Error('Не найден React import в page_fulfillment.jsx');
  source = source.replace(reactImport, `${reactImport}\n${portalImport}`);
}

const oldEscape = `  useEffect(() => {
    if (!previewExpanded) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setPreviewExpanded(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [previewExpanded]);`;
const newEscape = `  useEffect(() => {
    if (!previewExpanded) return undefined;
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setPreviewExpanded(false);
    };
    window.addEventListener('keydown', closeOnEscape, true);
    return () => window.removeEventListener('keydown', closeOnEscape, true);
  }, [previewExpanded]);`;
if (!source.includes(newEscape)) {
  if (!source.includes(oldEscape)) throw new Error('Не найден обработчик Escape развёрнутой квитанции');
  source = source.replace(oldEscape, newEscape);
}

const oldOverlay = `      <div id="receipt-corrected-preview"
        className={\`receipt-corrected-preview-overlay\${previewExpanded ? ' is-open' : ''}\`}
        role="dialog" aria-modal="true" aria-hidden={!previewExpanded}
        aria-label="Развернутая квитанция с корректировками"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setPreviewExpanded(false);
        }}>
        <section className="receipt-corrected-preview-dialog">
          <header>
            <div><Icon name="eye" /><span><b>Квитанция с корректировками</b><small>Все несохранённые изменения уже учтены</small></span></div>
            <button type="button" className="btn btn-secondary btn-sm"
              onClick={() => setPreviewExpanded(false)}><Icon name="x" />Закрыть</button>
          </header>
          <ReceiptDocumentPreview type={file.type} draft={parsed} />
        </section>
      </div>`;
const newOverlay = `      {previewExpanded && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div id="receipt-corrected-preview"
          className="receipt-corrected-preview-overlay is-open"
          role="dialog" aria-modal="true"
          aria-label="Развернутая квитанция с корректировками"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreviewExpanded(false);
          }}>
          <section className="receipt-corrected-preview-dialog">
            <header>
              <div><Icon name="eye" /><span><b>Квитанция с корректировками</b><small>Все несохранённые изменения уже учтены</small></span></div>
              <button type="button" className="btn btn-secondary btn-sm"
                onClick={() => setPreviewExpanded(false)}><Icon name="x" />Закрыть</button>
            </header>
            <ReceiptDocumentPreview type={file.type} draft={parsed} />
          </section>
        </div>,
        document.body,
      )}`;
if (!source.includes('ReactDOM.createPortal(')) {
  if (!source.includes(oldOverlay)) throw new Error('Не найден старый overlay развёрнутой квитанции');
  source = source.replace(oldOverlay, newOverlay);
}

await writeFile(pageUrl, source, 'utf8');

const legacyTestUrl = new URL('../test/receipt-editor-spec.test.mjs', import.meta.url);
let legacyTests = await readFile(legacyTestUrl, 'utf8');
const oldPreviewAssertion = String.raw`  assert.match(page, /previewExpanded \? ' is-open' : ''/);`;
const newPreviewAssertion = String.raw`  assert.match(page, /ReactDOM\.createPortal/);`;
if (!legacyTests.includes(newPreviewAssertion)) {
  if (!legacyTests.includes(oldPreviewAssertion)) throw new Error('Не найдена устаревшая проверка expanded preview');
  legacyTests = legacyTests.replace(oldPreviewAssertion, newPreviewAssertion);
  await writeFile(legacyTestUrl, legacyTests, 'utf8');
}

console.log('Развёрнутая квитанция рендерится порталом поверх Drawer.');
