/**
 * Fast CRC32 implementation for integrity checks.
 * Not cryptographic, but enough to detect accidental corruption.
 */
const crc32Table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crc32Table[i] = c;
}

export function crc32(str: string): number {
  let crc = 0xffffffff;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    crc = crc32Table[(crc ^ char) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0; // unsigned
}

export function crc32Buffer(buffer: ArrayBuffer): number {
  const view = new Uint8Array(buffer);
  let crc = 0xffffffff;
  for (let i = 0; i < view.length; i++) {
    crc = crc32Table[(crc ^ view[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
