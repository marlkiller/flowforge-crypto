import {
  registerProvider,
  CryptoService,
  ensureBufferSource,
  type CipherProvider,
} from "../service";

const ZERO_IV = new Uint8Array(16);

function pkcs7Pad(data: Uint8Array, blockSize: number): Uint8Array {
  const paddingLen = blockSize - (data.byteLength % blockSize);
  const out = new Uint8Array(data.byteLength + paddingLen);
  out.set(data, 0);
  out.fill(paddingLen, data.byteLength);
  return out;
}

function pkcs7Unpad(data: Uint8Array, blockSize: number): Uint8Array {
  if (data.byteLength === 0 || data.byteLength % blockSize !== 0)
    throw new Error("Invalid padded data length");
  const lastByte = data[data.byteLength - 1];
  if (lastByte < 1 || lastByte > blockSize) throw new Error("Invalid PKCS7 padding value");
  for (let i = data.byteLength - lastByte; i < data.byteLength; i++) {
    if (data[i] !== lastByte) throw new Error("Invalid PKCS7 padding content");
  }
  return data.slice(0, data.byteLength - lastByte);
}

async function aesImportKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", ensureBufferSource(raw), "AES-CBC", false, [
    "encrypt",
    "decrypt",
  ]);
}

async function aesEncryptBlock(key: CryptoKey, block: Uint8Array): Promise<Uint8Array> {
  const ct = await CryptoService.encrypt({ name: "AES-CBC", iv: ZERO_IV }, key, block);
  return ct.slice(0, 16);
}

async function aesDecryptBlock(key: CryptoKey, block: Uint8Array): Promise<Uint8Array> {
  const pt2 = new Uint8Array(16);
  pt2[15] = 0x01;
  const xorInput = new Uint8Array(16);
  for (let i = 0; i < 16; i++) xorInput[i] = pt2[i] ^ block[i];
  const fakeC2 = await aesEncryptBlock(key, xorInput);
  const combined = new Uint8Array(32);
  combined.set(block, 0);
  combined.set(fakeC2, 16);
  const pt = await CryptoService.decrypt({ name: "AES-CBC", iv: ZERO_IV }, key, combined);
  return pt.slice(0, 16);
}

function makeCustomBlockProvider(
  name: string,
  ivSize: number,
  process: (
    key: CryptoKey,
    iv: Uint8Array | null,
    data: Uint8Array,
    action: "encrypt" | "decrypt",
  ) => Promise<Uint8Array>,
): CipherProvider {
  return {
    type: "cipher",
    name,
    keySizes: [16, 24, 32],
    defaultIvSize: ivSize,
    async encrypt(keyRaw, iv, data) {
      const key = await aesImportKey(keyRaw);
      return process(key, iv, data, "encrypt");
    },
    async decrypt(keyRaw, iv, data) {
      const key = await aesImportKey(keyRaw);
      return process(key, iv, data, "decrypt");
    },
  };
}

async function ecbProcessPKCS7(
  key: CryptoKey,
  _iv: Uint8Array | null,
  data: Uint8Array,
  action: "encrypt" | "decrypt",
) {
  if (action === "encrypt") {
    const padded = pkcs7Pad(data, 16);
    const n = padded.byteLength / 16;
    const out = new Uint8Array(n * 16);
    for (let i = 0; i < n; i++) {
      out.set(await aesEncryptBlock(key, padded.slice(i * 16, (i + 1) * 16)), i * 16);
    }
    return out;
  }
  if (data.byteLength === 0 || data.byteLength % 16 !== 0)
    throw new Error("ECB ciphertext length must be a multiple of 16");
  const n = data.byteLength / 16;
  const out = new Uint8Array(data.byteLength);
  for (let i = 0; i < n; i++) {
    out.set(await aesDecryptBlock(key, data.slice(i * 16, (i + 1) * 16)), i * 16);
  }
  return pkcs7Unpad(out, 16);
}

async function ecbProcessNoPad(
  key: CryptoKey,
  _iv: Uint8Array | null,
  data: Uint8Array,
  action: "encrypt" | "decrypt",
) {
  const lenErr = `ECB NoPadding requires ${action === "encrypt" ? "plaintext" : "ciphertext"} length to be a multiple of 16`;
  if (data.byteLength === 0 || data.byteLength % 16 !== 0) throw new Error(lenErr);
  const n = data.byteLength / 16;
  const out = new Uint8Array(data.byteLength);
  const fn = action === "encrypt" ? aesEncryptBlock : aesDecryptBlock;
  for (let i = 0; i < n; i++) {
    out.set(await fn(key, data.slice(i * 16, (i + 1) * 16)), i * 16);
  }
  return out;
}

async function cbcProcessNoPad(
  key: CryptoKey,
  iv: Uint8Array | null,
  data: Uint8Array,
  action: "encrypt" | "decrypt",
) {
  if (!iv) throw new Error("CBC requires an IV");
  const lenErr = `CBC NoPadding requires ${action === "encrypt" ? "plaintext" : "ciphertext"} length to be a multiple of 16`;
  if (data.byteLength === 0 || data.byteLength % 16 !== 0) throw new Error(lenErr);
  const n = data.byteLength / 16;
  const out = new Uint8Array(data.byteLength);
  if (action === "encrypt") {
    let prev = iv;
    for (let i = 0; i < n; i++) {
      const block = data.slice(i * 16, (i + 1) * 16);
      const xored = new Uint8Array(16);
      for (let j = 0; j < 16; j++) xored[j] = block[j] ^ prev[j];
      const enc = await aesEncryptBlock(key, xored);
      out.set(enc, i * 16);
      prev = enc;
    }
  } else {
    let prev = iv;
    for (let i = 0; i < n; i++) {
      const block = data.slice(i * 16, (i + 1) * 16);
      const dec = await aesDecryptBlock(key, block);
      for (let j = 0; j < 16; j++) out[i * 16 + j] = dec[j] ^ prev[j];
      prev = block;
    }
  }
  return out;
}

async function cfbProcess(key: CryptoKey, iv: Uint8Array, data: Uint8Array) {
  const n = Math.ceil(data.byteLength / 16);
  const out = new Uint8Array(data.byteLength);
  let prev = iv;
  for (let i = 0; i < n; i++) {
    const enc = await aesEncryptBlock(key, prev);
    const end = Math.min((i + 1) * 16, data.byteLength);
    for (let j = 0; j < end - i * 16; j++) out[i * 16 + j] = data[i * 16 + j] ^ enc[j];
    prev = out.slice(i * 16, end);
    if (prev.byteLength < 16) {
      const p = new Uint8Array(16);
      p.set(prev, 0);
      prev = p;
    }
  }
  return out;
}

async function ofbProcess(key: CryptoKey, iv: Uint8Array, data: Uint8Array) {
  const n = Math.ceil(data.byteLength / 16);
  const out = new Uint8Array(data.byteLength);
  let feedback = iv;
  for (let i = 0; i < n; i++) {
    feedback = await aesEncryptBlock(key, feedback);
    const end = Math.min((i + 1) * 16, data.byteLength);
    for (let j = 0; j < end - i * 16; j++) out[i * 16 + j] = data[i * 16 + j] ^ feedback[j];
  }
  return out;
}

registerProvider(makeCustomBlockProvider("AES-ECB-PKCS7", 0, ecbProcessPKCS7));
registerProvider(makeCustomBlockProvider("AES-ECB-None", 0, ecbProcessNoPad));
registerProvider(makeCustomBlockProvider("AES-CBC-None", 16, cbcProcessNoPad));
registerProvider(
  makeCustomBlockProvider("AES-CFB", 16, (key, iv, data) => cfbProcess(key, iv!, data)),
);
registerProvider(
  makeCustomBlockProvider("AES-OFB", 16, (key, iv, data) => ofbProcess(key, iv!, data)),
);
