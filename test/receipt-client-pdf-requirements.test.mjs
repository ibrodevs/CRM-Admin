import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const resourcesUrl = new URL('../js/api/resources.js', import.meta.url);
const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const editorUrl = new URL('../js/features/receipts/editor.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);
const peopleUrl = new URL('../js/page_people.jsx', import.meta.url);


test('supplier working original and immutable source open separately inline', async () => {
  const resources = await readFile(resourcesUrl, 'utf8');
  const page = await readFile(pageUrl, 'utf8');
  const editor = await readFile(editorUrl, 'utf8');

  assert.match(resources, /supplierPreviewUrl: \(id\) => apiPath\(`documents\/\$\{id\}\/supplier-pdf\/\?disposition=inline`\)/);
  assert.match(resources, /supplierSourcePreviewUrl: \(id\) => apiPath\(`documents\/\$\{id\}\/supplier-pdf\/\?source=1&disposition=inline`\)/);
  assert.match(page, /documentsApi\.supplierPreviewUrl\(result\.source_document_id \|\| imported\.document_id\)/);
  assert.match(page, /documentsApi\.supplierSourcePreviewUrl\(result\.source_document_id \|\| imported\.document_id\)/);
  assert.match(editor, /<iframe className="receipt-supplier-original-frame" src=\{displayedSupplierPdfUrl\} title="Оригинал поставщика с правками"/);
  assert.match(editor, /freshSupplierPdfUrl\(sourcePdfUrl\)/);
  assert.match(editor, /supplierPdfNonce/);
  assert.match(page, /freshSupplierDocumentUrl\(d\.originalUrl\)/);
  assert.match(editor, /Оригинал поставщика · с сохранёнными корректировками/);
  assert.match(editor, /Оригинал поставщика с корректировками/);
  assert.match(editor, /Исходный файл поставщика/);
});


test('corrected supplier PDF hooks stay before the drawer early return', async () => {
  const editor = await readFile(editorUrl, 'utf8');
  const drawerStart = editor.indexOf('export function ReceiptBrandDocumentDrawer');
  const nonceHook = editor.indexOf('const [supplierPdfNonce, setSupplierPdfNonce] = useState(0);', drawerStart);
  const earlyReturn = editor.indexOf('if (!open || !draft) return null;', drawerStart);

  assert.ok(drawerStart >= 0, 'ReceiptBrandDocumentDrawer must exist');
  assert.ok(nonceHook > drawerStart, 'supplierPdfNonce hook must exist inside drawer');
  assert.ok(earlyReturn > nonceHook, 'supplierPdfNonce hook must run before the conditional return');

  const afterReturn = editor.slice(earlyReturn);
  assert.equal((afterReturn.match(/const \[supplierPdfNonce, setSupplierPdfNonce\] = useState\(0\);/g) || []).length, 0);
});


test('corrected agency receipt and corrected supplier copy still keep source immutable', async () => {
  const editor = await readFile(editorUrl, 'utf8');

  assert.match(editor, /output\.mode === 'original' \? \(/);
  assert.match(editor, /\) : type === 'Авиа' \? \(\s*<ReceiptAviaDocument draft=\{p\} organization=\{organization\} \/>/s);
  assert.match(editor, /Загруженный оригинал хранится отдельно без изменений/);
  assert.match(editor, /sourceOriginalPdfUrl/);
  assert.match(editor, /const taxRows = p\.taxBreakdown\?\.length \? p\.taxBreakdown/);
});


test('long receipt preview scrolls completely above the drawer footer', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /Client receipt PDF requirements: complete preview scroll and immutable original/);
  assert.match(css, /\.receipt-edit-preview \{[\s\S]*max-height: calc\(100dvh - 250px\);[\s\S]*overflow-y: auto;[\s\S]*padding: 0 5px 96px 0;/);
  assert.match(css, /\.receipt-supplier-original-frame \{[\s\S]*height: min\(70dvh, 900px\);/);
});


test('corrected supplier PDF footer actions stay inside drawer at every width', async () => {
  const editor = await readFile(editorUrl, 'utf8');
  const css = await readFile(cssUrl, 'utf8');

  assert.match(editor, /footer=\{<div className="receipt-supplier-footer-actions">/);
  assert.match(editor, /receipt-supplier-footer-actions[\s\S]*Оригинал поставщика с корректировками[\s\S]*Исходный файл поставщика/);
  assert.match(css, /Corrected supplier PDF: footer actions must stay inside drawer/);
  assert.match(css, /\.receipt-supplier-footer-actions \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(css, /\.receipt-supplier-footer-actions > \.btn \{[\s\S]*min-width: 0;[\s\S]*white-space: normal;[\s\S]*overflow-wrap: anywhere;/);
  assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.receipt-supplier-footer-actions \{[\s\S]*grid-template-columns: 1fr;/);
});


test('rail grouped total is explicitly a group summary, child totals stay independent', async () => {
  const editor = await readFile(editorUrl, 'utf8');

  assert.match(editor, /Итого по \{tickets\.length\} бланкам/);
  assert.match(editor, /Бланк \{activeIndex \+ 1\} из \{tickets\.length\} · данные и стоимость только этого билета/);
  assert.match(editor, /total: receiptFinancialTotal\('ЖД', ticket\)/);
  assert.match(editor, /<ReceiptDocumentPreview type="ЖД" draft=\{active\} \/>/);
});


test('hotel receipt UI uses structured hotel and room fields rather than a raw OCR blob', async () => {
  const editor = await readFile(editorUrl, 'utf8');

  assert.match(editor, /p\.hotel\?\.name \|\| p\.carrier/);
  assert.match(editor, /p\.hotel\?\.address/);
  assert.match(editor, /room\.category \|\| room\.name/);
  assert.match(editor, /room\.meal/);
  assert.match(editor, /room\.guestIds/);
  assert.match(editor, /p\.hotelTerms\.deposit/);
});


test('avia editor separates checked baggage from carry-on baggage', async () => {
  const editor = await readFile(editorUrl, 'utf8');

  assert.match(editor, /handBaggage: firstReceiptValue\(source\.handBaggage, source\.hand_baggage, source\.carryOn, source\.carry_on\)/);
  assert.match(editor, /label="Багаж сегмента"/);
  assert.match(editor, /label="Ручная кладь"/);
  assert.match(editor, /\['Ручная кладь', leg\.handBaggage \|\| p\.handBaggage\]/);
  assert.match(editor, /function receiptBaggageAllowance\(value\)/);
  assert.match(editor, /normalized\.handBaggage = normalized\.baggage;\s*normalized\.baggage = normalized\.fareBasis;\s*normalized\.fareBasis = '';/s);
  assert.match(editor, /draft\.fareBasis = '';\s*draft\.baggage = firstAviaLeg\.baggage;\s*draft\.handBaggage = firstAviaLeg\.handBaggage;/s);
});


test('explicit economy booking class fills an empty service class safely', async () => {
  const editor = await readFile(editorUrl, 'utf8');

  assert.match(editor, /function receiptCabinFromBookingClass\(value\)/);
  assert.match(editor, /ECONOMY\|ЭКОНОМ\|ЭКОНОМИЧЕСКИЙ/);
  assert.match(editor, /if \(!normalized\.cabin\) normalized\.cabin = receiptCabinFromBookingClass\(normalized\.cls\);/);
});


test('IT fare control is available for supplier and branded avia documents', async () => {
  const editor = await readFile(editorUrl, 'utf8');

  assert.match(editor, /const aviaItFareControl = type === 'Авиа'/);
  assert.match(editor, /<b[^>]*>Закрыть тариф на IT<\/b>/);
  assert.match(editor, /\{aviaItFareControl\}[\s\S]*\{bindingBlock\}/);
  assert.doesNotMatch(editor, /type === 'Авиа' && p\.output\.mode !== 'original' && <Field label="Стоимость в клиентском документе">/);
});


test('every client order row displays the order date', async () => {
  const people = await readFile(peopleUrl, 'utf8');
  const app = await readFile(new URL('../js/app.jsx', import.meta.url), 'utf8');

  assert.match(people, /<th>№<\/th><th>Дата<\/th><th>Тип<\/th>/);
  assert.match(people, /function ordersForClient\(client, orders = ORDERS\)/);
  assert.match(people, /order\.client_person[\s\S]*String\(client\.id\)/);
  assert.match(people, /<ClientCard c=\{active\} orders=\{orders\}/);
  assert.match(people, /<td className="t-strong">\{o\.no\}<\/td><td>\{orderDate\(o\)\}<\/td>/);
  assert.match(app, /<ClientsPage initialClients=\{workspace\.clients\} orders=\{orders\}/);
});


test('company and employee order histories display the order date too', async () => {
  const people = await readFile(peopleUrl, 'utf8');
  const app = await readFile(new URL('../js/app.jsx', import.meta.url), 'utf8');

  assert.match(people, /Поездки сотрудника[\s\S]*<th>№<\/th><th>Дата<\/th>/);
  assert.match(people, /Заказы компании[\s\S]*<th>№<\/th><th>Дата<\/th>/);
  assert.match(people, /<CompanyCard co=\{active\} orders=\{orders\}/);
  assert.match(app, /<CompaniesPage initialCompanies=\{workspace\.companies\} orders=\{orders\}/);
});


test('receipt uploaded inside an order opens the full receipt import editor and keeps the order binding', async () => {
  const page = await readFile(pageUrl, 'utf8');

  assert.match(page, /setEditorFor\(\{ file: info\.file\?\.raw, participant:/);
  assert.match(page, /<ReceiptImportModal\s+open\s+initialFiles=\{editorFor\.file \? \[editorFor\.file\] : \[\]\}/s);
  assert.match(page, /label: `Заказ № \$\{scopeOrder\}`/);
  assert.match(page, /if \(!draft && initialFiles\.length\) addFiles\(initialFiles\);/);
});


test('saved receipts can be edited and exported directly inside an order', async () => {
  const page = await readFile(pageUrl, 'utf8');

  assert.match(page, /setReceiptEdit\(\{/);
  assert.match(page, /documentsApi\.updateReceipt\(fileId/);
  assert.match(page, /Квитанция сохранена прямо в документах заказа/);
  assert.match(page, /<ReceiptBrandDocumentDrawer open=\{!!receiptBrand\}/);
  assert.match(page, /Оригинал поставщика с корректировками/);
  assert.match(page, /Фирменный бланк/);
});


test('hotel branded voucher shows all term types and removes exact duplicates', async () => {
  const editor = await readFile(editorUrl, 'utf8');

  assert.match(editor, /function uniqueReceiptTermRows\(rows\)/);
  assert.match(editor, /\['Регистрационный сбор', p\.hotelTerms\.registrationFee\]/);
  assert.match(editor, /\['Условия изменения', p\.hotelTerms\.amendment\]/);
  assert.match(editor, /const terms = uniqueReceiptTermRows/);
});
