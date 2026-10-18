import { safeFilename } from './inspector.models';
export function download(content: BlobPart, name: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFilename(name);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function decodeDocument(content: string): Uint8Array {
  const match = /^data:([^;,]*)(;base64)?,([\s\S]*)$/.exec(content);
  if (!match) throw new Error('The saved file content is unavailable.');
  if (match[2]) return Uint8Array.from(atob(match[3]), (c) => c.charCodeAt(0));
  return new TextEncoder().encode(decodeURIComponent(match[3]));
}
export function zip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [],
    directory: Uint8Array[] = [];
  let offset = 0,
    size = 0;
  function header(length: number) {
    const bytes = new Uint8Array(length);
    return { bytes, view: new DataView(bytes.buffer) };
  }
  for (const file of files) {
    const name = encoder.encode(safeFilename(file.name));
    let crc = 0xffffffff;
    for (const byte of file.data) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const local = header(30);
    local.view.setUint32(0, 0x04034b50, true);
    local.view.setUint16(4, 20, true);
    local.view.setUint16(6, 0x800, true);
    local.view.setUint32(14, crc, true);
    local.view.setUint32(18, file.data.length, true);
    local.view.setUint32(22, file.data.length, true);
    local.view.setUint16(26, name.length, true);
    chunks.push(local.bytes, name, file.data);
    const central = header(46);
    central.view.setUint32(0, 0x02014b50, true);
    central.view.setUint16(4, 20, true);
    central.view.setUint16(6, 20, true);
    central.view.setUint16(8, 0x800, true);
    central.view.setUint32(16, crc, true);
    central.view.setUint32(20, file.data.length, true);
    central.view.setUint32(24, file.data.length, true);
    central.view.setUint16(28, name.length, true);
    central.view.setUint32(42, offset, true);
    directory.push(central.bytes, name);
    size += 46 + name.length;
    offset += 30 + name.length + file.data.length;
  }
  const end = header(22);
  end.view.setUint32(0, 0x06054b50, true);
  end.view.setUint16(8, files.length, true);
  end.view.setUint16(10, files.length, true);
  end.view.setUint32(12, size, true);
  end.view.setUint32(16, offset, true);
  const result = new Uint8Array(offset + size + 22);
  let index = 0;
  for (const chunk of [...chunks, ...directory, end.bytes]) {
    result.set(chunk, index);
    index += chunk.length;
  }
  return result;
}
