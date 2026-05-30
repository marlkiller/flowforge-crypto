import { utf8ToBytes, b64ToBytes, hexToBytes, type DataFormat } from "./service";
import type { CipherProvider } from "./service";
import type { GraphNode } from "./types";

export function parseAs(text: string, fmt: DataFormat): Uint8Array {
  if (fmt === "utf8") return utf8ToBytes(text);
  if (fmt === "base64") return b64ToBytes(text);
  return hexToBytes(text);
}

export function safeDecode(fn: () => Uint8Array, msg: string): Uint8Array {
  try {
    return fn();
  } catch {
    throw new Error(msg);
  }
}

export function getField(node: GraphNode, id: string, defaultValue = ""): string {
  return (node.data[id] as string) ?? defaultValue;
}

export function getNumberField(node: GraphNode, id: string, defaultValue = 0): number {
  const val = node.data[id];
  if (typeof val === "number") return val;
  return parseInt((val as string) || String(defaultValue), 10);
}

// ─── Validation Helpers ──────────────────────────────────────────

export const isHex = (val: string) => /^[0-9a-fA-F]*$/.test(val.replace(/[:\s]/g, ""));
export const getHexLen = (val: string) => val.replace(/[:\s]/g, "").length / 2;

export const validateHex =
  (expectedLen?: number | number[]) =>
  (val: any): string | null => {
    if (!val || typeof val !== "string") return null;
    const clean = val.trim();
    if (clean === "") return null;

    if (clean.startsWith("-----BEGIN")) return null; // Assume PEM is valid for now

    if (!isHex(clean)) return "Invalid hex";

    const actual = getHexLen(clean);
    if (expectedLen !== undefined) {
      if (Array.isArray(expectedLen)) {
        if (!expectedLen.includes(actual)) return `${actual}B (expected ${expectedLen.join("/")})`;
      } else {
        if (actual !== expectedLen) return `${actual}B (expected ${expectedLen})`;
      }
    }
    return null;
  };

// ─── Param Helper with Caching ───────────────────────────────────

const paramCache = new WeakMap<
  Record<string, any>,
  Map<string, { raw: string; bytes: Uint8Array }>
>();

/**
 * Gets a Uint8Array parameter from either inputs (wires) or node data (fields).
 * Caches the parsed Hex string to avoid repeated work.
 */
export function getParamBytes(
  node: GraphNode,
  inputs: Record<string, Uint8Array>,
  id: string,
  required = true,
): Uint8Array | undefined {
  // 1. Priority: Wired input
  if (inputs[id]) {
    // If input is wired but empty, treat as undefined if not required
    // to allow fallback to node data or internal defaults.
    if (inputs[id].length > 0) return inputs[id];
    if (required) return inputs[id]; // Still return empty if required to let it fail later with better context
  }

  // 2. Secondary: Node data field (Hex string)
  const hex = node.data[id] as string | undefined;
  if (!hex) {
    if (required) throw new Error(`${id} is missing`);
    return undefined;
  }

  // 3. Caching logic
  let nodeCache = paramCache.get(node.data);
  if (!nodeCache) {
    nodeCache = new Map();
    paramCache.set(node.data, nodeCache);
  }

  const cached = nodeCache.get(id);
  if (cached && cached.raw === hex) {
    return cached.bytes;
  }

  try {
    let bytes: Uint8Array;
    const clean = hex.trim();

    if (clean.startsWith("-----BEGIN")) {
      // PEM format
      const body = clean.replace(/-----BEGIN [^-]+-----|-----END [^-]+-----|\s+/g, "");
      bytes = b64ToBytes(body);
    } else if (/^[0-9a-fA-F\s:]+$/.test(clean) && clean.length % 2 === 0) {
      // Hex format (allow spaces/colons)
      bytes = hexToBytes(clean.replace(/[:\s]/g, ""));
    } else {
      // Try Base64
      try {
        bytes = b64ToBytes(clean);
      } catch {
        throw new Error(`${id} must be a valid Hex, Base64, or PEM string`);
      }
    }

    nodeCache.set(id, { raw: hex, bytes });
    return bytes;
  } catch (e) {
    throw new Error(`${id} parsing failed: ${(e as Error).message}`);
  }
}

// ─── Shared Cipher Helpers ─────────────────────────────────────────

export async function cipherEncrypt(
  provider: CipherProvider,
  keyBytes: Uint8Array,
  mainInput: Uint8Array,
  iv: Uint8Array | undefined,
  ivSize: number,
  params?: Record<string, unknown>,
): Promise<Uint8Array> {
  if (ivSize === 0) {
    return provider.encrypt(keyBytes, null, mainInput, params);
  }
  const actualIv = iv ?? crypto.getRandomValues(new Uint8Array(ivSize));
  const ct = await provider.encrypt(keyBytes, actualIv, mainInput, params);
  if (iv) return ct;
  const out = new Uint8Array(actualIv.length + ct.length);
  out.set(actualIv, 0);
  out.set(ct, actualIv.length);
  return out;
}

export async function cipherDecrypt(
  provider: CipherProvider,
  keyBytes: Uint8Array,
  mainInput: Uint8Array,
  iv: Uint8Array | undefined,
  ivSize: number,
  params?: Record<string, unknown>,
): Promise<Uint8Array> {
  if (ivSize === 0) {
    return await provider.decrypt(keyBytes, null, mainInput, params);
  }
  const actualIv = iv ?? mainInput.slice(0, ivSize);
  const ct = iv ? mainInput : mainInput.slice(ivSize);
  return await provider.decrypt(keyBytes, actualIv, ct, params);
}
