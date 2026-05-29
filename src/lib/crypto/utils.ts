import { utf8ToBytes, b64ToBytes, hexToBytes, type DataFormat } from "./service";
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

// ─── Param Helper with Caching ───────────────────────────────────

const paramCache = new WeakMap<Record<string, any>, Map<string, { raw: string; bytes: Uint8Array }>>();

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
  if (inputs[id]) return inputs[id];

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
