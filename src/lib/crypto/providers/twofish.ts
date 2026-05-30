import { registerProvider, type CipherProvider } from "../service";
import { makeSession, encrypt, decrypt } from "twofish-ts";

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

function xorBlock(a: Uint8Array, b: Uint8Array, offset: number): Uint8Array {
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i++) out[i] = a[offset + i] ^ b[i];
  return out;
}

function twofishEcbEncrypt(data: Uint8Array, key: Uint8Array): Uint8Array {
  const session = makeSession(key);
  const padded = pkcs7Pad(data, 16);
  const out = new Uint8Array(padded.length);
  for (let i = 0; i < padded.length; i += 16) {
    const block = padded.subarray(i, i + 16);
    encrypt(block, 0, out, i, session);
  }
  return out;
}

function twofishEcbDecrypt(data: Uint8Array, key: Uint8Array): Uint8Array {
  const session = makeSession(key);
  if (data.length === 0 || data.length % 16 !== 0)
    throw new Error("Invalid ciphertext length for Twofish");
  const temp = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 16) {
    decrypt(data, i, temp, i, session);
  }
  return pkcs7Unpad(temp, 16);
}

function twofishCbcEncrypt(data: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array {
  const session = makeSession(key);
  const padded = pkcs7Pad(data, 16);
  const out = new Uint8Array(padded.length);
  let prev = iv;
  for (let i = 0; i < padded.length; i += 16) {
    const xored = xorBlock(padded, prev, i);
    encrypt(xored, 0, out, i, session);
    prev = out.subarray(i, i + 16);
  }
  return out;
}

function twofishCbcDecrypt(data: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array {
  const session = makeSession(key);
  if (data.length === 0 || data.length % 16 !== 0)
    throw new Error("Invalid ciphertext length for Twofish");
  const temp = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 16) {
    const prev = i === 0 ? iv : data.subarray(i - 16, i);
    decrypt(data, i, temp, i, session);
    const decBlock = temp.subarray(i, i + 16);
    const plain = xorBlock(decBlock, prev, 0);
    temp.set(plain, i);
  }
  return pkcs7Unpad(temp, 16);
}

registerProvider({
  type: "cipher",
  name: "Twofish-ECB",
  keySizes: [16, 24, 32],
  defaultIvSize: 0,
  async encrypt(key, _iv, data) {
    return twofishEcbEncrypt(data, key);
  },
  async decrypt(key, _iv, data) {
    return twofishEcbDecrypt(data, key);
  },
} as CipherProvider);

registerProvider({
  type: "cipher",
  name: "Twofish-CBC",
  keySizes: [16, 24, 32],
  defaultIvSize: 16,
  async encrypt(key, iv, data) {
    if (!iv) throw new Error("IV is required for Twofish-CBC");
    return twofishCbcEncrypt(data, key, iv);
  },
  async decrypt(key, iv, data) {
    if (!iv) throw new Error("IV is required for Twofish-CBC");
    return twofishCbcDecrypt(data, key, iv);
  },
} as CipherProvider);
