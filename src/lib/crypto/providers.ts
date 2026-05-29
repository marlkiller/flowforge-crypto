import { registerProvider, ensureBufferSource, CryptoService, bytesToHex, hexToBytes, toPEM, type CipherProvider, type MacProvider } from "./service";
import { HMAC_ALGOS, makeNobleHmacProvider } from "./hmac";

// noble hashes
import { md5, ripemd160 } from "@noble/hashes/legacy.js";
import { sha3_256, sha3_384, sha3_512, keccak_256, shake128_32, shake256_64 } from "@noble/hashes/sha3.js";
import { blake2b, blake2s } from "@noble/hashes/blake2.js";
import { blake3 } from "@noble/hashes/blake3.js";
import { argon2id, argon2i, argon2d } from "@noble/hashes/argon2.js";
import { scrypt } from "@noble/hashes/scrypt.js";
// noble ciphers
import { chacha20poly1305, xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { gcmsiv, cmac } from "@noble/ciphers/aes.js";
import { poly1305 } from "@noble/ciphers/_poly1305.js";
// third-party
import { sm3 as sm3Hash, sm4 as sm4Cipher } from "sm-crypto";
import forge from "node-forge";

// ─── Built-in WebCrypto Providers ─────────────────────────────────

registerProvider({
  type: "hash",
  name: "SHA-1",
  digest(data) {
    return CryptoService.digest("SHA-1", data);
  },
});

registerProvider({
  type: "hash",
  name: "SHA-256",
  digest(data) {
    return CryptoService.digest("SHA-256", data);
  },
});

registerProvider({
  type: "hash",
  name: "SHA-384",
  digest(data) {
    return CryptoService.digest("SHA-384", data);
  },
});

registerProvider({
  type: "hash",
  name: "SHA-512",
  digest(data) {
    return CryptoService.digest("SHA-512", data);
  },
});

registerProvider({
  type: "hash",
  name: "MD5",
  async digest(data) {
    return md5(data);
  },
});

registerProvider({
  type: "hash",
  name: "SHA3-256",
  async digest(data) {
    return sha3_256(data);
  },
});

registerProvider({
  type: "hash",
  name: "SHA3-384",
  async digest(data) {
    return sha3_384(data);
  },
});

registerProvider({
  type: "hash",
  name: "SHA3-512",
  async digest(data) {
    return sha3_512(data);
  },
});

registerProvider({
  type: "hash",
  name: "Keccak-256",
  async digest(data) {
    return keccak_256(data);
  },
});

registerProvider({
  type: "cipher",
  name: "ChaCha20-Poly1305",
  keySizes: [32],
  defaultIvSize: 12,
  async encrypt(key, iv, data) {
    if (!iv) throw new Error("IV is required for ChaCha20-Poly1305");
    return chacha20poly1305(key, iv).encrypt(data);
  },
  async decrypt(key, iv, data) {
    if (!iv) throw new Error("IV is required for ChaCha20-Poly1305");
    return chacha20poly1305(key, iv).decrypt(data);
  },
});

function makeHmacProvider(hash: string): MacProvider {
  return {
    type: "mac",
    name: `HMAC-${hash}`,
    async sign(keyRaw, data) {
      const key = await CryptoService.importKey("raw", keyRaw, { name: "HMAC", hash }, false, [
        "sign",
      ]);
      return CryptoService.sign({ name: "HMAC" }, key, data);
    },
    async verify(keyRaw, signature, data) {
      const key = await CryptoService.importKey("raw", keyRaw, { name: "HMAC", hash }, false, [
        "verify",
      ]);
      return CryptoService.verify({ name: "HMAC" }, key, signature, data);
    },
  };
}

registerProvider(makeHmacProvider("SHA-1"));
registerProvider(makeHmacProvider("SHA-256"));
registerProvider(makeHmacProvider("SHA-384"));
registerProvider(makeHmacProvider("SHA-512"));

for (const [name, { fn, block }] of Object.entries(HMAC_ALGOS)) {
  registerProvider(makeNobleHmacProvider(name, fn, block));
}

// ─── AES Providers ────────────────────────────────────────────────

function makeAesProvider(mode: "CBC" | "GCM" | "CTR"): CipherProvider {
  return {
    type: "cipher",
    name: `AES-${mode}`,
    keySizes: [16, 24, 32],
    defaultIvSize: mode === "GCM" ? 12 : 16,
    async encrypt(keyRaw, iv, data) {
      const key = await CryptoService.importKey("raw", keyRaw, { name: `AES-${mode}` }, false, [
        "encrypt",
      ]);
      const params: any = { name: `AES-${mode}` };
      if (mode === "CBC") params.iv = iv;
      if (mode === "GCM") params.iv = iv;
      if (mode === "CTR") {
        params.counter = iv;
        params.length = 64;
      }
      return CryptoService.encrypt(params, key, data);
    },
    async decrypt(keyRaw, iv, data) {
      const key = await CryptoService.importKey("raw", keyRaw, { name: `AES-${mode}` }, false, [
        "decrypt",
      ]);
      const params: any = { name: `AES-${mode}` };
      if (mode === "CBC") params.iv = iv;
      if (mode === "GCM") params.iv = iv;
      if (mode === "CTR") {
        params.counter = iv;
        params.length = 64;
      }
      return CryptoService.decrypt(params, key, data);
    },
  };
}

registerProvider(makeAesProvider("CBC"));
registerProvider(makeAesProvider("GCM"));
registerProvider(makeAesProvider("CTR"));

// ─── RSA & ECC Providers ──────────────────────────────────────────

registerProvider({
  type: "rsa",
  name: "RSA-OAEP",
  async encrypt(keyRaw, data, params) {
    const hash = (params?.hash as string) || "SHA-256";
    const key = await CryptoService.importRSAKey("spki", keyRaw, "RSA-OAEP", hash, ["encrypt"]);
    return CryptoService.encrypt({ name: "RSA-OAEP" }, key, data);
  },
  async decrypt(keyRaw, data, params) {
    const hash = (params?.hash as string) || "SHA-256";
    const key = await CryptoService.importRSAKey("pkcs8", keyRaw, "RSA-OAEP", hash, ["decrypt"]);
    return CryptoService.decrypt({ name: "RSA-OAEP" }, key, data);
  },
});

registerProvider({
  type: "rsa",
  name: "RSAES-PKCS1-V1_5",
  async encrypt(keyRaw, data) {
    const pem = toPEM(keyRaw, "PUBLIC KEY");
    const key = forge.pki.publicKeyFromPem(pem);
    const input = String.fromCharCode(...data);
    const output = key.encrypt(input, "RSAES-PKCS1-V1_5");
    return Uint8Array.from(output, (c) => c.charCodeAt(0));
  },
  async decrypt(keyRaw, data) {
    const pem = toPEM(keyRaw, "PRIVATE KEY");
    const key = forge.pki.privateKeyFromPem(pem);
    const input = String.fromCharCode(...data);
    const output = key.decrypt(input, "RSAES-PKCS1-V1_5");
    return Uint8Array.from(output, (c) => c.charCodeAt(0));
  },
});

registerProvider({
  type: "rsa",
  name: "RAW",
  async encrypt(keyRaw, data) {
    const pem = toPEM(keyRaw, "PUBLIC KEY");
    const key = forge.pki.publicKeyFromPem(pem);
    const n = (key as any).n as forge.jsbn.BigInteger;
    const e = (key as any).e as forge.jsbn.BigInteger;
    const m = new forge.jsbn.BigInteger(
      Array.from(data).map((b) => b.toString(16).padStart(2, "0")).join(""),
      16,
    );
    if (m.compareTo(n) >= 0) throw new Error("Data too large for key modulus");
    const c = m.modPow(e, n);
    const nBytes = Math.ceil(n.bitLength() / 8);
    const hex = c.toString(16).padStart(nBytes * 2, "0");
    return new Uint8Array(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  },
  async decrypt(keyRaw, data) {
    const pem = toPEM(keyRaw, "PRIVATE KEY");
    const key = forge.pki.privateKeyFromPem(pem);
    const n = (key as any).n as forge.jsbn.BigInteger;
    const d = (key as any).d as forge.jsbn.BigInteger;
    const c = new forge.jsbn.BigInteger(
      Array.from(data).map((b) => b.toString(16).padStart(2, "0")).join(""),
      16,
    );
    const m = c.modPow(d, n);
    const nBytes = Math.ceil(n.bitLength() / 8);
    const hex = m.toString(16).padStart(nBytes * 2, "0");
    const trimmed = hex.replace(/^0+/, "") || "0";
    const even = trimmed.length % 2 === 0 ? trimmed : "0" + trimmed;
    return new Uint8Array(even.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  },
});

function makeSignatureProvider(name: "RSASSA-PKCS1-v1_5" | "RSA-PSS" | "ECDSA"): MacProvider {
  return {
    type: "mac",
    name,
    async sign(keyRaw, data, params) {
      const hash = (params?.hash as string) || "SHA-256";
      const isRSA = name.startsWith("RSA");
      const key = isRSA
        ? await CryptoService.importRSAKey("pkcs8", keyRaw, name, hash, ["sign"])
        : await CryptoService.importECKey("pkcs8", keyRaw, "ECDSA", params?.namedCurve as string, [
            "sign",
          ]);

      const signParams: any = { name, hash };
      if (name === "RSA-PSS") signParams.saltLength = 32;

      return CryptoService.sign(signParams, key, data);
    },
    async verify(keyRaw, signature, data, params) {
      const hash = (params?.hash as string) || "SHA-256";
      const isRSA = name.startsWith("RSA");
      const key = isRSA
        ? await CryptoService.importRSAKey("spki", keyRaw, name, hash, ["verify"])
        : await CryptoService.importECKey("spki", keyRaw, "ECDSA", params?.namedCurve as string, [
            "verify",
          ]);

      const signParams: any = { name, hash };
      if (name === "RSA-PSS") signParams.saltLength = 32;

      return CryptoService.verify(signParams, key, signature, data);
    },
  };
}

registerProvider(makeSignatureProvider("RSASSA-PKCS1-v1_5"));
registerProvider(makeSignatureProvider("RSA-PSS"));
registerProvider(makeSignatureProvider("ECDSA"));

// ─── KDF Providers ────────────────────────────────────────────────

registerProvider({
  type: "kdf",
  name: "PBKDF2",
  async derive(password, salt, length, params) {
    const baseKey = await CryptoService.importKey("raw", password, "PBKDF2", false, ["deriveBits"]);
    return CryptoService.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations: (params?.iterations as number) || 100000,
        hash: (params?.hash as string) || "SHA-256",
      },
      baseKey,
      length,
    );
  },
});

registerProvider({
  type: "kdf",
  name: "HKDF",
  async derive(ikm, salt, length, params) {
    const baseKey = await CryptoService.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
    return CryptoService.deriveBits(
      {
        name: "HKDF",
        salt,
        info: (params?.info as Uint8Array) || new Uint8Array(0),
        hash: (params?.hash as string) || "SHA-256",
      },
      baseKey,
      length,
    );
  },
});

registerProvider({
  type: "kdf",
  name: "Argon2",
  async derive(password, salt, length, params) {
    const type = (params?.type as string) || "id";
    const opts = {
      t: (params?.t as number) || 3,
      m: (params?.m as number) || 65536,
      p: (params?.p as number) || 1,
      dkLen: length / 8, // length is in bits, argon2 expects bytes
    };
    if (type === "id") return argon2id(password, salt, opts);
    if (type === "i") return argon2i(password, salt, opts);
    return argon2d(password, salt, opts);
  },
});

registerProvider({
  type: "kdf",
  name: "Scrypt",
  async derive(password, salt, length, params) {
    return scrypt(password, salt, {
      N: (params?.N as number) || 16384,
      r: (params?.r as number) || 8,
      p: (params?.p as number) || 1,
      dkLen: length / 8,
    });
  },
});

// ─── SM3 Provider ─────────────────────────────────────────────────

registerProvider({
  type: "hash",
  name: "SM3",
  async digest(data) {
    const result = sm3Hash(data);
    return hexToBytes(result);
  },
});

// ─── SM4 Cipher Providers ────────────────────────────────────────

registerProvider({
  type: "cipher",
  name: "SM4-ECB",
  keySizes: [16],
  defaultIvSize: 0,
  async encrypt(key, _iv, data) {
    if (key.length !== 16) throw new Error("SM4 requires a 16-byte key");
    const keyHex = bytesToHex(key);
    const result = sm4Cipher.encrypt(data, keyHex, { mode: "ecb" });
    return hexToBytes(result);
  },
  async decrypt(key, _iv, data) {
    if (key.length !== 16) throw new Error("SM4 requires a 16-byte key");
    const keyHex = bytesToHex(key);
    const dataHex = bytesToHex(data);
    const result = sm4Cipher.decrypt(dataHex, keyHex, {
      mode: "ecb",
      output: "array",
    }) as number[];
    return new Uint8Array(result);
  },
});

registerProvider({
  type: "cipher",
  name: "SM4-CBC",
  keySizes: [16],
  defaultIvSize: 16,
  async encrypt(key, iv, data) {
    if (key.length !== 16) throw new Error("SM4 requires a 16-byte key");
    if (!iv || iv.length !== 16) throw new Error("SM4-CBC requires a 16-byte IV");
    const keyHex = bytesToHex(key);
    const ivHex = bytesToHex(iv);
    const result = sm4Cipher.encrypt(data, keyHex, {
      mode: "cbc",
      iv: ivHex,
    });
    return hexToBytes(result);
  },
  async decrypt(key, iv, data) {
    if (key.length !== 16) throw new Error("SM4 requires a 16-byte key");
    if (!iv || iv.length !== 16) throw new Error("SM4-CBC requires a 16-byte IV");
    const keyHex = bytesToHex(key);
    const ivHex = bytesToHex(iv);
    const dataHex = bytesToHex(data);
    const result = sm4Cipher.decrypt(dataHex, keyHex, {
      mode: "cbc",
      iv: ivHex,
      output: "array",
    }) as number[];
    return new Uint8Array(result);
  },
});

// ─── BLAKE2 / BLAKE3 / RIPEMD-160 / SHAKE Providers ──────────────

registerProvider({
  type: "hash",
  name: "BLAKE2b",
  async digest(data) {
    return blake2b(data);
  },
});

registerProvider({
  type: "hash",
  name: "BLAKE2s",
  async digest(data) {
    return blake2s(data);
  },
});

registerProvider({
  type: "hash",
  name: "BLAKE3",
  async digest(data) {
    return blake3(data);
  },
});

registerProvider({
  type: "hash",
  name: "RIPEMD-160",
  async digest(data) {
    return ripemd160(data);
  },
});

registerProvider({
  type: "hash",
  name: "SHAKE128",
  async digest(data) {
    return shake128_32(data);
  },
});

registerProvider({
  type: "hash",
  name: "SHAKE256",
  async digest(data) {
    return shake256_64(data);
  },
});

// ─── XChaCha20-Poly1305 Provider ─────────────────────────────────

registerProvider({
  type: "cipher",
  name: "XChaCha20-Poly1305",
  keySizes: [32],
  defaultIvSize: 24,
  async encrypt(key, iv, data) {
    if (!iv) throw new Error("IV is required for XChaCha20-Poly1305");
    return xchacha20poly1305(key, iv).encrypt(data);
  },
  async decrypt(key, iv, data) {
    if (!iv) throw new Error("IV is required for XChaCha20-Poly1305");
    return xchacha20poly1305(key, iv).decrypt(data);
  },
});

// ─── AES-GCM-SIV Provider ────────────────────────────────────────

registerProvider({
  type: "cipher",
  name: "AES-GCM-SIV",
  keySizes: [16, 32],
  defaultIvSize: 12,
  async encrypt(key, iv, data, params) {
    if (!iv) throw new Error("IV is required for AES-GCM-SIV");
    const aad = (params?.aad as Uint8Array) || new Uint8Array(0);
    return gcmsiv(key, iv, aad).encrypt(data);
  },
  async decrypt(key, iv, data, params) {
    if (!iv) throw new Error("IV is required for AES-GCM-SIV");
    const aad = (params?.aad as Uint8Array) || new Uint8Array(0);
    return gcmsiv(key, iv, aad).decrypt(data);
  },
});

// ─── Poly1305 MAC Provider ──────────────────────────────────────

registerProvider({
  type: "mac",
  name: "Poly1305",
  async sign(key, data) {
    if (key.length !== 32) throw new Error("Poly1305 requires a 32-byte key");
    return poly1305(data, key);
  },
  async verify(key, signature, data) {
    const expected = await this.sign(key, data);
    if (signature.length !== expected.length) return false;
    let result = 0;
    for (let i = 0; i < signature.length; i++) result |= signature[i] ^ expected[i];
    return result === 0;
  },
});

// ─── CMAC Provider ──────────────────────────────────────────────

registerProvider({
  type: "mac",
  name: "CMAC",
  async sign(key, data) {
    if (key.length !== 16 && key.length !== 24 && key.length !== 32) {
      throw new Error("CMAC requires a 16/24/32-byte AES key");
    }
    return cmac(data, key);
  },
  async verify(key, signature, data) {
    const expected = await this.sign(key, data);
    if (signature.length !== expected.length) return false;
    let result = 0;
    for (let i = 0; i < signature.length; i++) result |= signature[i] ^ expected[i];
    return result === 0;
  },
});

// ─── Shared helpers (from cipher.ts) ──────────────────────────

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

// ─── Raw AES block cipher helpers (via AES-CBC zero-IV trick) ──

const ZERO_IV = new Uint8Array(16);

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

// ─── AES Provider Factory ──────────────────────────────────────

function makeWebCryptoProvider(
  name: string,
  algoName: string,
  ivSize: number,
  encryptParams: (iv: Uint8Array, aad?: Uint8Array) => Algorithm,
): CipherProvider {
  return {
    type: "cipher",
    name,
    keySizes: [16, 24, 32],
    defaultIvSize: ivSize,
    async encrypt(keyRaw, iv, data, params) {
      const key = await crypto.subtle.importKey(
        "raw",
        ensureBufferSource(keyRaw),
        algoName,
        false,
        ["encrypt"],
      );
      const aad = params?.["aad"] as Uint8Array | undefined;
      return CryptoService.encrypt(encryptParams(iv!, aad), key, data);
    },
    async decrypt(keyRaw, iv, data, params) {
      const key = await crypto.subtle.importKey(
        "raw",
        ensureBufferSource(keyRaw),
        algoName,
        false,
        ["decrypt"],
      );
      const aad = params?.["aad"] as Uint8Array | undefined;
      return CryptoService.decrypt(encryptParams(iv!, aad), key, data);
    },
  };
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

// ─── Register AES Providers ───────────────────────────────────

// Web Crypto modes
registerProvider(
  makeWebCryptoProvider("AES-CBC-PKCS7", "AES-CBC", 16, (iv) => ({ name: "AES-CBC", iv })),
);
registerProvider(
  makeWebCryptoProvider(
    "AES-GCM",
    "AES-GCM",
    16,
    (iv, aad) => ({ name: "AES-GCM", iv, ...(aad ? { additionalData: aad } : {}) }) as Algorithm,
  ),
);
registerProvider(
  makeWebCryptoProvider("AES-CTR", "AES-CTR", 16, (iv) => ({
    name: "AES-CTR",
    counter: iv,
    length: 64,
  })),
);

// Custom ECB / CBC-NoPad / CFB / OFB

// ECB encrypt/decrypt with PKCS7 padding
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

registerProvider(makeCustomBlockProvider("AES-ECB-PKCS7", 0, ecbProcessPKCS7));
registerProvider(makeCustomBlockProvider("AES-ECB-None", 0, ecbProcessNoPad));

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

registerProvider(makeCustomBlockProvider("AES-CBC-None", 16, cbcProcessNoPad));

async function cfbProcess(key: CryptoKey, iv: Uint8Array, data: Uint8Array) {
  // CFB-128: C_i = P_i XOR AES_encrypt(C_{i-1}), C_0 = IV — same for enc and dec
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
  // OFB-128: S_i = AES_encrypt(S_{i-1}), C_i = P_i XOR S_i — same for enc and dec
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

registerProvider(
  makeCustomBlockProvider("AES-CFB", 16, (key, iv, data) => cfbProcess(key, iv!, data)),
);
registerProvider(
  makeCustomBlockProvider("AES-OFB", 16, (key, iv, data) => ofbProcess(key, iv!, data)),
);
