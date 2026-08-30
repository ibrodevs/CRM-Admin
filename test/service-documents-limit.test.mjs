import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const services = await readFile(new URL('../js/page_services.jsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');

test('documents in a service card are paged instead of growing the whole order page', () => {
  assert.match(services, /const SERVICE_DOCUMENT_PAGE_SIZE = 12/);
  assert.match(services, /uploadedDocs\.slice\(0, visibleDocumentCount\)/);
  assert.match(services, /Показано \{visibleDocuments\.length\} из \{uploadedDocs\.length\}/);
  assert.match(services, /Показать ещё \(\{Math\.min\(SERVICE_DOCUMENT_PAGE_SIZE, hiddenDocumentCount\)\}\)/);
  assert.match(services, /setVisibleDocumentCount\(SERVICE_DOCUMENT_PAGE_SIZE\)/);
});

test('the service document list has a bounded scroll container', () => {
  assert.match(css, /\.svc-documents-grid\{[^}]*max-height:min\(52vh,560px\)[^}]*overflow-y:auto/);
  assert.match(css, /\.svc-documents-grid\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:760px\)[\s\S]*\.svc-documents-grid\{grid-template-columns:1fr/);
});
