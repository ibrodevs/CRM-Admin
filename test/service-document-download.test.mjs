import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { documentArchive, documentsForPerson } from '../src/modules/orders/model/document-download.js';

test('passenger download excludes shared documents and other passengers', () => {
  const documents = [{ id: 1, person: 7 }, { id: 2, person: '8' }, { id: 3, person: null }];
  assert.deepEqual(documentsForPerson(documents, '7'), [documents[0]]);
  assert.deepEqual(documentsForPerson(documents, ''), documents);
  assert.deepEqual(documentsForPerson(documents, '9'), []);
});

test('document archive extracts original bytes and Cyrillic filenames with valid CRC', async () => {
  const data = new TextEncoder().encode('%PDF-test\nДокумент');
  const archive = documentArchive([{ name: 'Билет.pdf', data }, { name: '../Билет.pdf', data }]);
  const result = spawnSync('python3', ['-c', `
import io, sys, zipfile
with zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())) as archive:
    assert archive.testzip() is None
    assert archive.namelist() == ['1-Билет.pdf', '2-.._Билет.pdf']
    assert archive.read(archive.namelist()[0]) == '%PDF-test\\nДокумент'.encode()
    assert archive.read(archive.namelist()[1]) == '%PDF-test\\nДокумент'.encode()
`], { input: Buffer.from(await archive.arrayBuffer()) });
  assert.equal(result.status, 0, result.stderr.toString());
});
