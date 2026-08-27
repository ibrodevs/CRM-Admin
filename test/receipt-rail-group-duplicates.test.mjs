import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);

function extractHelper(source, helperName, endMarker) {
  const start = source.indexOf(`function ${helperName}`);
  assert.ok(start >= 0, `Функция ${helperName} должна присутствовать в page_fulfillment.jsx`);
  const stop = source.indexOf(endMarker, start);
  assert.ok(stop > start, `Маркер конца для ${helperName} не найден`);
  return source.slice(start, stop);
}

test('receiptBlankFingerprint distinguishes railway blanks sharing order number or passenger', async () => {
  const source = await readFile(pageUrl, 'utf8');
  const fingerprintSource = extractHelper(source, 'receiptBlankFingerprint', '\nfunction receiptBlankFingerprints');

  const { receiptBlankFingerprint } = Function(`
    ${fingerprintSource}
    return { receiptBlankFingerprint };
  `)();

  const ticket1 = {
    ticketNo: '78706152276981',
    passenger: 'ИВАНОВ ИВАН ИВАНОВИЧ',
    legs: [{ flightNo: '098', coach: '04', seat: '025', date: '14.12.2025', dep: '06:44', from: 'Курган', to: 'Омск' }],
  };
  const ticket2 = {
    ticketNo: '78706152276981', // common group order number
    passenger: 'ПЕТРОВ ПЕТР ПЕТРОВИЧ',
    legs: [{ flightNo: '098', coach: '04', seat: '026', date: '14.12.2025', dep: '06:44', from: 'Курган', to: 'Омск' }],
  };

  const fp1 = receiptBlankFingerprint(ticket1, {});
  const fp2 = receiptBlankFingerprint(ticket2, {});

  assert.ok(fp1, 'Отпечаток первого билета не должен быть пустым');
  assert.ok(fp2, 'Отпечаток второго билета не должен быть пустым');
  assert.notEqual(fp1, fp2, 'Билеты группы с общим номером заказа должны иметь разные отпечатки');

  // Same passenger buying 2 seats in the same train
  const myshlyaevSeat25 = {
    ticketNo: '74205065230155',
    passenger: 'МЫШЛЯЕВ ДЕНИС АЛЕКСАНДРОВИЧ',
    segments: [{ flightNo: '719ГА', coach: '01', seat: '025', date: '18.06.2025', dep: '09:30', from: 'Нижний Новгород', to: 'Москва' }],
  };
  const myshlyaevSeat26 = {
    ticketNo: '74205065230166',
    passenger: 'МЫШЛЯЕВ ДЕНИС АЛЕКСАНДРОВИЧ',
    segments: [{ flightNo: '719ГА', coach: '01', seat: '026', date: '18.06.2025', dep: '09:30', from: 'Нижний Новгород', to: 'Москва' }],
  };

  const fpSeat25 = receiptBlankFingerprint(myshlyaevSeat25, {});
  const fpSeat26 = receiptBlankFingerprint(myshlyaevSeat26, {});

  assert.ok(fpSeat25 && fpSeat26);
  assert.notEqual(fpSeat25, fpSeat26, 'Два места одного пассажира должны иметь разные отпечатки');
});

test('receiptStatus does not mark group railway tickets as duplicates', async () => {
  const source = await readFile(pageUrl, 'utf8');
  const fingerprintSource = extractHelper(source, 'receiptBlankFingerprint', '\nfunction receiptBlankFingerprints');
  const fingerprintsSource = extractHelper(source, 'receiptBlankFingerprints', '\nfunction receiptStatus');
  const statusSource = extractHelper(source, 'receiptStatus', '\nasync function waitForReceiptResult');

  const routeSummary = () => 'Курган → Омск';
  const { receiptStatus } = Function('routeSummary', `
    ${fingerprintSource}
    ${fingerprintsSource}
    ${statusSource}
    return { receiptStatus };
  `)(routeSummary);

  const seen = new Set();

  const file1 = {
    id: 'file-1',
    type: 'ЖД',
    parsed: {
      passenger: 'ИВАНОВ ИВАН ИВАНОВИЧ',
      total: '4434.20',
      legs: [{ flightNo: '098', coach: '04', seat: '025', date: '14.12.2025', dep: '06:44', from: 'Курган', to: 'Омск' }],
      groupTickets: [
        {
          ticketNo: '78706152276981',
          passenger: 'ИВАНОВ ИВАН ИВАНОВИЧ',
          legs: [{ flightNo: '098', coach: '04', seat: '025', date: '14.12.2025', dep: '06:44', from: 'Курган', to: 'Омск' }],
        },
        {
          ticketNo: '78706152276981',
          passenger: 'ПЕТРОВ ПЕТР ПЕТРОВИЧ',
          legs: [{ flightNo: '098', coach: '04', seat: '026', date: '14.12.2025', dep: '06:44', from: 'Курган', to: 'Омск' }],
        },
      ],
    },
  };

  const status1 = receiptStatus(file1.parsed, seen, file1.type, null, file1);
  assert.equal(status1, 'Распознано', 'Первый групповой файл должен иметь статус Распознано');

  // If the same file is uploaded again, it should be marked as duplicate
  const file1Duplicate = { ...file1, id: 'file-1-copy' };
  const statusDup = receiptStatus(file1Duplicate.parsed, seen, file1Duplicate.type, null, file1Duplicate);
  assert.equal(statusDup, 'Возможный дубль', 'Повторно загруженный файл должен быть помечен как Возможный дубль');

  // Another file with a distinct ticket from another person
  const file2 = {
    id: 'file-2',
    type: 'ЖД',
    parsed: {
      passenger: 'СИДОРОВ СЕРГЕЙ СЕРГЕЕВИЧ',
      total: '4434.20',
      ticketNo: '78706152276981',
      legs: [{ flightNo: '098', coach: '04', seat: '027', date: '14.12.2025', dep: '06:44', from: 'Курган', to: 'Омск' }],
    },
  };
  const status2 = receiptStatus(file2.parsed, seen, file2.type, null, file2);
  assert.equal(status2, 'Распознано', 'Отдельный билет группы не должен считаться дублем');
});

