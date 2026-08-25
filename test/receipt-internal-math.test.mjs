import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('../js/page_fulfillment.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');

function loadSignatureHelpers() {
  const money = page.match(/function receiptMoneyNumber\(value\) \{[\s\S]*?\n\}/)?.[0];
  const start = page.indexOf('function receiptSupplierBaseAmount(type, receipt) {');
  const end = page.indexOf('\nfunction receiptRailSignatureAmount', start);
  assert.ok(money && start >= 0 && end > start);
  const helpers = page.slice(start, end);
  return Function(`${money}\n${helpers}\nreturn { receiptPricingCostSignature, receiptSupplierBaseAmount };`)();
}

test('identical costs are matched independently for rail and aviation', () => {
  const { receiptPricingCostSignature } = loadSignatureHelpers();
  assert.equal(receiptPricingCostSignature('ЖД', {
    currency: 'RUB', ticketCost: '4 167,30', reservedSeatCost: '2 422,20', agencyServiceFee: 0,
  }), 'RUB::658950');
  assert.equal(receiptPricingCostSignature('Авиа', {
    currency: 'RUB', fare: '4 167,30', taxes: '2 422,20', fees: 0,
  }), 'RUB::658950');
  assert.equal(receiptPricingCostSignature('Гостиница', { currency: 'RUB', total: 6589.5 }), '');
});

test('internal math fees never change the identical supplier cost criterion', () => {
  const { receiptPricingCostSignature, receiptSupplierBaseAmount } = loadSignatureHelpers();
  const rail = { currency: 'RUB', ticketCost: '4 167,30', reservedSeatCost: '2 422,20' };
  const avia = { currency: 'RUB', fare: '4 167,30', taxes: '2 422,20' };

  assert.equal(receiptSupplierBaseAmount('ЖД', rail), 6589.5);
  assert.equal(receiptSupplierBaseAmount('Авиа', avia), 6589.5);
  assert.equal(
    receiptPricingCostSignature('ЖД', { ...rail, agencyServiceFee: 500, additionalFees: 90, markup: 300, commission: 40 }),
    receiptPricingCostSignature('ЖД', rail),
  );
  assert.equal(
    receiptPricingCostSignature('Авиа', { ...avia, fees: 500, markup: 300, commission: 40 }),
    receiptPricingCostSignature('Авиа', avia),
  );
});

test('internal math has service-specific forms and preserves cents', () => {
  assert.match(page, /Внутренняя математика ·/);
  assert.match(page, /'Авиа': \{ title: 'Авиа', tariff: 'Тариф \+ таксы поставщика'/);
  assert.match(page, /'ЖД': \{ title: 'ЖД', tariff: 'Билет \+ плацкарта поставщика'/);
  assert.match(page, /step="0\.01" inputMode="decimal"/);
  assert.match(page, /Math\.round\(\(Number\(v\) \|\| 0\) \* 100\) \/ 100/);
  assert.ok(page.includes('const clientTotal = (m) => Math.round(((Number(m.tariff) || 0) + (Number(m.fee) || 0) + (Number(m.markup) || 0)) * 100) / 100;'));
});

test('bulk internal math is isolated by service and keeps supplier base individual', () => {
  assert.match(page, /pricingSel\[row\.mathKey\] && row\.f\.type === sourcePricingRow\?\.f\?\.type/);
  assert.match(page, /row\.mathKey === id[\s\S]*\? patch[\s\S]*fee: patch\.fee, markup: patch\.markup, commission: patch\.commission/);
  assert.match(page, /selectedPricingRows = pricingRows\.filter\([\s\S]*!mathFile \|\| row\.f\.type === mathFile\.type/);
  assert.match(page, /\['Авиа', 'ЖД'\]\.includes\(r\.f\.type\) && identicalCostCount > 1/);
});

test('calculation table and drawer visually separate internal math from receipt data', () => {
  assert.match(page, /Внутренняя математика по бланкам/);
  assert.match(page, /Это вторая форма расчёта, отдельная от редактора данных бланка/);
  assert.match(page, /receipt-pricing-selection/);
  assert.match(page, /receipt-internal-math-summary/);
  assert.match(styles, /\.receipt-internal-math-fields\{/);
  assert.match(styles, /\.receipt-internal-math-summary>div\.is-total\{/);
});
