import {
  b64ToBytes,
  hexToBytes,
  getProvider,
  parseBytes,
  type DataFormat,
  type HashProvider,
} from "./service";
import type { CipherProvider } from "./service";
import type { GraphNode, DataValue } from "./types";

export function getProviderHash(name: string): (data: Uint8Array) => Promise<Uint8Array> {
  const provider = getProvider(name) as HashProvider | undefined;
  if (!provider) throw new Error(`Hash provider "${name}" not found`);
  return (data: Uint8Array) => provider.digest(data);
}

export function parseAs(text: string, fmt: DataFormat): any {
  return parseBytes(text, fmt);
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
  inputs: Record<string, any>,
  id: string,
  required = true,
): Uint8Array | undefined {
  // Use escape hatch if using the Proxy from executor, or use inputs directly
  const rawInputs = inputs["__raw"] || inputs;

  // 1. Priority: Wired input
  if (rawInputs[id]) {
    const val = rawInputs[id];
    const dv: DataValue =
      val && typeof val === "object" && "value" in val ? val : { type: "raw", value: val };

    // Case A: It's already bytes
    if (dv.value instanceof Uint8Array) {
      if (dv.value.length > 0) return dv.value;
      if (required) return dv.value;
    }
    // Case B: It's a boolean (convert to 1B)
    if (typeof dv.value === "boolean") {
      return new Uint8Array([dv.value ? 1 : 0]);
    }
    // Case C: It's a string from a Typed node (e.g. Hex node outputting a string)
    if (typeof dv.value === "string") {
      try {
        return parseBytes(dv.value, dv.type as DataFormat);
      } catch {
        // Fallback to trying everything if the type was wrong
      }
    }
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
