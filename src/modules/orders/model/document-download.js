import { apiRequest } from '../../../shared/api/client.js';
import { documentsApi } from '../../documents/api.js';

export function documentsForPerson(documents, person) {
  if (!person) return documents;
  return documents.filter((doc) => doc.person != null && String(doc.person) === String(person));
}

// ZIP with stored entries: keeps original PDFs and supports UTF-8 filenames.
export function documentArchive(files) {
  const chunks = [], directory = [];
  let offset = 0, directorySize = 0;
  for (const [index, file] of files.entries()) {
    const name = new TextEncoder().encode(`${index + 1}-${file.name.replace(/[\\/\x00-\x1f]/g, '_')}`);
    const data = file.data;
    let crc = 0xffffffff;
    for (const byte of data) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const local = new Uint8Array(30), lh = new DataView(local.buffer);
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x800, true);
    lh.setUint16(12, 33, true); lh.setUint32(14, crc, true);
    lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true);
    chunks.push(local, name, data);
    const central = new Uint8Array(46), ch = new DataView(central.buffer);
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x800, true);
    ch.setUint16(14, 33, true); ch.setUint32(16, crc, true);
    ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
    directory.push(central, name);
    directorySize += central.length + name.length;
    offset += local.length + name.length + data.length;
  }
  const end = new Uint8Array(22), eh = new DataView(end.buffer);
  eh.setUint32(0, 0x06054b50, true); eh.setUint16(8, files.length, true); eh.setUint16(10, files.length, true);
  eh.setUint32(12, directorySize, true); eh.setUint32(16, offset, true);
  return new Blob([...chunks, ...directory, end], { type: 'application/zip' });
}

export async function downloadServiceDocuments(documents, archiveName) {
  const files = [];
  for (const doc of documents) {
    const blob = await apiRequest(documentsApi.downloadUrl(doc.id), { accept: '*/*' });
    if (!(blob instanceof Blob)) throw new Error('Не удалось получить файл документа');
    const extension = blob.type.includes('pdf') ? '.pdf' : '';
    const name = doc.file_name || doc.filename || doc.title || `Документ-${doc.id}`;
    files.push({ name: /\.[a-z0-9]{2,5}$/i.test(name) ? name : name + extension, data: new Uint8Array(await blob.arrayBuffer()) });
  }
  const url = URL.createObjectURL(documentArchive(files));
  const link = document.createElement('a');
  link.href = url; link.download = archiveName + '.zip';
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
