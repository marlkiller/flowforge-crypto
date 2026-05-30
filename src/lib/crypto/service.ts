// CryptoService — Encoding, Hashing, Cipher — byte-oriented.

import base32 from "hi-base32";
import base58_lib from "base-x";

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
        const cleaned = text
          .replace(/-----BEGIN [^-]+-----/, "")
          .replace(/-----END [^-]+-----/, "");
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
  verify(
    key: Uint8Array,
    signature: Uint8Array,
    data: Uint8Array,
    params?: Record<string, unknown>,
  ): Promise<boolean>;
}

export interface KdfProvider {
  type: "kdf";
  name: string;
  derive(
    password: Uint8Array,
    salt: Uint8Array,
    length: number,
    params?: Record<string, unknown>,
  ): Promise<Uint8Array>;
}

export type AlgorithmProvider =
  | HashProvider
  | CipherProvider
  | RsaProvider
  | MacProvider
  | KdfProvider;

const providerRegistry = new Map<string, AlgorithmProvider>();

export function registerProvider(provider: AlgorithmProvider) {
  providerRegistry.set(provider.name, provider);
}

export function getProvider(name: string): AlgorithmProvider | undefined {
  return providerRegistry.get(name);
}

/**
 * Loads an external algorithm provider from a URL.
 * The URL should point to a JavaScript module that exports a 'provider' constant
 * or a default export that matches the AlgorithmProvider interface.
 */
export async function loadExternalProvider(url: string): Promise<AlgorithmProvider> {
  try {
    const module = await import(/* @vite-ignore */ url);
    const provider = module.provider || module.default;

    if (!provider || !provider.name || !provider.type) {
      throw new Error("Invalid provider module structure. Expected export 'provider' or default.");
    }

    registerProvider(provider);
    return provider;
  } catch (e) {
    throw e;
  }
}

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
    return crypto.subtle.importKey(
      format as any,
      ensureBufferSource(keyData),
      algorithm as any,
      extractable,
      keyUsages,
    );
  },
  async encrypt(
    params: Algorithm & { iv?: Uint8Array; counter?: Uint8Array; length?: number },
    key: CryptoKey,
    data: Uint8Array,
  ): Promise<Uint8Array> {
    return new Uint8Array(
      await crypto.subtle.encrypt(params as Algorithm, key, data as BufferSource),
    );
  },
  async decrypt(
    params: Algorithm & { iv?: Uint8Array; counter?: Uint8Array; length?: number },
    key: CryptoKey,
    data: Uint8Array,
  ): Promise<Uint8Array> {
    return new Uint8Array(
      await crypto.subtle.decrypt(params as Algorithm, key, data as BufferSource),
    );
  },
  async sign(
    algorithm: string | RsaPssParams | EcdsaParams | HmacSignParams,
    key: CryptoKey,
    data: Uint8Array,
  ): Promise<Uint8Array> {
    const sig = await crypto.subtle.sign(algorithm as any, key, data as BufferSource);
    return new Uint8Array(sig);
  },
  async verify(
    algorithm: string | RsaPssParams | EcdsaParams | HmacSignParams,
    key: CryptoKey,
    signature: Uint8Array,
    data: Uint8Array,
  ): Promise<boolean> {
    return crypto.subtle.verify(
      algorithm as any,
      key,
      signature as BufferSource,
      data as BufferSource,
    );
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
    algorithm: Algorithm | Pbkdf2Params | HkdfParams | EcdhKeyDeriveParams,
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
