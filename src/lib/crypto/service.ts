// CryptoService — Encoding, Hashing, Cipher — byte-oriented.

import base32 from "hi-base32";
import base58_lib from "base-x";
import { md5 } from "@noble/hashes/legacy.js";
import { sha3_256, sha3_384, sha3_512 } from "@noble/hashes/sha3.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { chacha20poly1305 } from "@noble/ciphers/chacha.js";
import { argon2id, argon2i, argon2d } from "@noble/hashes/argon2.js";
import { scrypt } from "@noble/hashes/scrypt.js";

const base58 = base58_lib("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz");

const enc = new TextEncoder();
const dec = new TextDecoder("utf-8", { fatal: false });

/**
 * Ensures a Uint8Array can be used as a BufferSource.
 * If it's a view into a larger buffer, we may need to slice it
 * if the underlying API doesn't respect offset/length.
 */
export function ensureBufferSource(b: Uint8Array): BufferSource {
  if (b.byteOffset === 0 && b.byteLength === b.buffer.byteLength) {
    return b.buffer;
  }
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

export function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/\s+/g, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, "0");
  return s;
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, "").replace(/^0x/i, "");
  if (clean.length % 2 !== 0) throw new Error("Hex length must be even");
  if (!/^[0-9a-fA-F]*$/.test(clean)) throw new Error("Invalid hex characters");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function utf8ToBytes(s: string): Uint8Array {
  return enc.encode(s);
}

export function bytesToUtf8(b: Uint8Array): string {
  return dec.decode(b);
}

export function bytesToB32(bytes: Uint8Array): string {
  return base32.encode(bytes);
}

export function b32ToBytes(str: string): Uint8Array {
  return new Uint8Array(base32.decode.asBytes(str));
}

export function bytesToB58(bytes: Uint8Array): string {
  return base58.encode(bytes);
}

export function b58ToBytes(str: string): Uint8Array {
  return base58.decode(str);
}

export type DataFormat = "utf8" | "hex" | "base64" | "pem" | "base32" | "base58";

export function formatBytes(bytes: Uint8Array, fmt: DataFormat, label?: string): string {
  switch (fmt) {
    case "utf8":
      return bytesToUtf8(bytes);
    case "hex":
      return bytesToHex(bytes);
    case "base64":
      return bytesToB64(bytes);
    case "pem":
      return toPEM(bytes, label ?? "DATA");
    case "base32":
      return bytesToB32(bytes);
    case "base58":
      return bytesToB58(bytes);
  }
}

export function parseBytes(text: string, fmt: DataFormat): Uint8Array {
  switch (fmt) {
    case "utf8":
      return utf8ToBytes(text);
    case "hex":
      return hexToBytes(text);
    case "base32":
      return b32ToBytes(text);
    case "base58":
      return b58ToBytes(text);
    case "base64":
    case "pem":
      // For PEM, we just want to extract the base64 part.
      // A simple way is to remove the header/footer and then parse as B64.
      // But b64ToBytes already ignores whitespace, and atob might handle some extra chars.
      // Let's be a bit more robust for PEM.
      if (fmt === "pem") {
        const cleaned = text.replace(/-----BEGIN [^-]+-----/, "").replace(/-----END [^-]+-----/, "");
        return b64ToBytes(cleaned);
      }
      return b64ToBytes(text);
  }
}

// ─── Algorithm Provider Interfaces ─────────────────────────────────

export interface HashProvider {
  type: "hash";
  name: string;
  digest(data: Uint8Array): Promise<Uint8Array>;
}

export interface CipherProvider {
  type: "cipher";
  name: string;
  keySizes: number[];
  defaultIvSize: number;
  encrypt(
    key: Uint8Array,
    iv: Uint8Array | null,
    data: Uint8Array,
    params?: Record<string, unknown>,
  ): Promise<Uint8Array>;
  decrypt(
    key: Uint8Array,
    iv: Uint8Array | null,
    data: Uint8Array,
    params?: Record<string, unknown>,
  ): Promise<Uint8Array>;
}

export interface RsaProvider {
  type: "rsa";
  name: string; // e.g. "RSA-OAEP"
  encrypt(key: Uint8Array, data: Uint8Array, params?: Record<string, unknown>): Promise<Uint8Array>;
  decrypt(key: Uint8Array, data: Uint8Array, params?: Record<string, unknown>): Promise<Uint8Array>;
}

export interface MacProvider {
  type: "mac";
  name: string;
  sign(key: Uint8Array, data: Uint8Array, params?: Record<string, unknown>): Promise<Uint8Array>;
  verify(key: Uint8Array, signature: Uint8Array, data: Uint8Array, params?: Record<string, unknown>): Promise<boolean>;
}

export interface KdfProvider {
  type: "kdf";
  name: string;
  derive(password: Uint8Array, salt: Uint8Array, length: number, params?: Record<string, unknown>): Promise<Uint8Array>;
}

export type AlgorithmProvider = HashProvider | CipherProvider | RsaProvider | MacProvider | KdfProvider;

const providerRegistry = new Map<string, AlgorithmProvider>();

export function registerProvider(provider: AlgorithmProvider) {
  providerRegistry.set(provider.name, provider);
}

export function getProvider(name: string): AlgorithmProvider | undefined {
  return providerRegistry.get(name);
}

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
      const key = await CryptoService.importKey("raw", keyRaw, { name: "HMAC", hash }, false, ["sign"]);
      return CryptoService.sign({ name: "HMAC" }, key, data);
    },
    async verify(keyRaw, signature, data) {
      const key = await CryptoService.importKey("raw", keyRaw, { name: "HMAC", hash }, false, ["verify"]);
      return CryptoService.verify({ name: "HMAC" }, key, signature, data);
    },
  };
}

registerProvider(makeHmacProvider("SHA-1"));
registerProvider(makeHmacProvider("SHA-256"));
registerProvider(makeHmacProvider("SHA-384"));
registerProvider(makeHmacProvider("SHA-512"));

// ─── AES Providers ────────────────────────────────────────────────

function makeAesProvider(mode: "CBC" | "GCM" | "CTR"): CipherProvider {
  return {
    type: "cipher",
    name: `AES-${mode}`,
    keySizes: [16, 24, 32],
    defaultIvSize: mode === "GCM" ? 12 : 16,
    async encrypt(keyRaw, iv, data) {
      const key = await CryptoService.importKey("raw", keyRaw, { name: `AES-${mode}` }, false, ["encrypt"]);
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
      const key = await CryptoService.importKey("raw", keyRaw, { name: `AES-${mode}` }, false, ["decrypt"]);
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

function makeSignatureProvider(name: "RSASSA-PKCS1-v1_5" | "RSA-PSS" | "ECDSA"): MacProvider {
    return {
        type: "mac",
        name,
        async sign(keyRaw, data, params) {
            const hash = (params?.hash as string) || "SHA-256";
            const isRSA = name.startsWith("RSA");
            const key = isRSA 
                ? await CryptoService.importRSAKey("pkcs8", keyRaw, name, hash, ["sign"])
                : await CryptoService.importECKey("pkcs8", keyRaw, "ECDSA", params?.namedCurve as string, ["sign"]);
            
            const signParams: any = { name, hash };
            if (name === "RSA-PSS") signParams.saltLength = 32;
            
            return CryptoService.sign(signParams, key, data);
        },
        async verify(keyRaw, signature, data, params) {
            const hash = (params?.hash as string) || "SHA-256";
            const isRSA = name.startsWith("RSA");
            const key = isRSA 
                ? await CryptoService.importRSAKey("spki", keyRaw, name, hash, ["verify"])
                : await CryptoService.importECKey("spki", keyRaw, "ECDSA", params?.namedCurve as string, ["verify"]);
            
            const signParams: any = { name, hash };
            if (name === "RSA-PSS") signParams.saltLength = 32;
            
            return CryptoService.verify(signParams, key, signature, data);
        }
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
                hash: (params?.hash as string) || "SHA-256" 
            },
            baseKey,
            length,
        );
    }
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
                hash: (params?.hash as string) || "SHA-256" 
            },
            baseKey,
            length,
        );
    }
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
    }
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
    }
});

// ─── CryptoService — WebCrypto wrapper ────────────────────────────

export const CryptoService = {
  async digest(algo: string, bytes: Uint8Array): Promise<Uint8Array> {
    const h = await crypto.subtle.digest(algo, ensureBufferSource(bytes));
    return new Uint8Array(h);
  },
  async importKey(
    format: "raw" | "spki" | "pkcs8",
    keyData: Uint8Array,
    algorithm: string | HmacImportParams | RsaHashedImportParams | EcKeyImportParams,
    extractable: boolean,
    keyUsages: KeyUsage[],
  ): Promise<CryptoKey> {
    return crypto.subtle.importKey(format as any, ensureBufferSource(keyData), algorithm as any, extractable, keyUsages);
  },
  async encrypt(
    params: Algorithm & { iv?: Uint8Array; counter?: Uint8Array; length?: number },
    key: CryptoKey,
    data: Uint8Array,
  ): Promise<Uint8Array> {
    return new Uint8Array(await crypto.subtle.encrypt(params as Algorithm, key, data as BufferSource));
  },
  async decrypt(
    params: Algorithm & { iv?: Uint8Array; counter?: Uint8Array; length?: number },
    key: CryptoKey,
    data: Uint8Array,
  ): Promise<Uint8Array> {
    return new Uint8Array(await crypto.subtle.decrypt(params as Algorithm, key, data as BufferSource));
  },
  async sign(algorithm: string | RsaPssParams | EcdsaParams | HmacSignParams, key: CryptoKey, data: Uint8Array): Promise<Uint8Array> {
    const sig = await crypto.subtle.sign(algorithm as any, key, data as BufferSource);
    return new Uint8Array(sig);
  },
  async verify(
    algorithm: string | RsaPssParams | EcdsaParams | HmacSignParams,
    key: CryptoKey,
    signature: Uint8Array,
    data: Uint8Array,
  ): Promise<boolean> {
    return crypto.subtle.verify(algorithm as any, key, signature as BufferSource, data as BufferSource);
  },
  async generateRSAKeyPair(
    name: "RSASSA-PKCS1-v1_5" | "RSA-PSS" | "RSA-OAEP",
    modulusLength: number,
    publicExponent: Uint8Array,
    hash: string,
  ): Promise<CryptoKeyPair> {
    return crypto.subtle.generateKey(
      {
        name,
        modulusLength,
        publicExponent,
        hash,
      },
      true,
      name === "RSA-OAEP" ? ["encrypt", "decrypt"] : ["sign", "verify"],
    );
  },
  async exportKey(format: "spki" | "pkcs8" | "raw" | "jwk", key: CryptoKey): Promise<Uint8Array> {
    const exported = await crypto.subtle.exportKey(format as any, key);
    return new Uint8Array(exported as ArrayBuffer);
  },
  async importRSAKey(
    format: "spki" | "pkcs8",
    keyData: Uint8Array,
    algorithm: string,
    hash: string,
    usages: KeyUsage[],
  ): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      format,
      ensureBufferSource(keyData),
      { name: algorithm, hash } as RsaHashedImportParams,
      true,
      usages,
    );
  },
  async deriveBits(
    algorithm: Algorithm | Pbkdf2Params | HkdfParams | EcKeyGenParams,
    baseKey: CryptoKey,
    length: number,
  ): Promise<Uint8Array> {
    const derived = await crypto.subtle.deriveBits(algorithm, baseKey, length);
    return new Uint8Array(derived);
  },
  async generateECKeyPair(
    name: "ECDSA" | "ECDH",
    namedCurve: "P-256" | "P-384" | "P-521",
  ): Promise<CryptoKeyPair> {
    return crypto.subtle.generateKey(
      { name, namedCurve },
      true,
      name === "ECDSA" ? ["sign", "verify"] : ["deriveKey", "deriveBits"],
    );
  },
  async importECKey(
    format: "raw" | "spki" | "pkcs8",
    keyData: Uint8Array,
    algorithm: string,
    namedCurve: string,
    usages: KeyUsage[],
  ): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      format,
      ensureBufferSource(keyData),
      { name: algorithm, namedCurve },
      true,
      usages,
    );
  },
};

export function toPEM(bytes: Uint8Array, label: string): string {
  const b64 = bytesToB64(bytes);
  const lines = b64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
}
